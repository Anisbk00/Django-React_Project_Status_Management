import logging
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Q, F
from django.utils import timezone
from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import secrets
from .models import PasswordResetToken

from .models import CustomUser, Project, ProjectStatus, Responsibility, Escalation
from .serializers import (
    UserSerializer,
    ProjectSerializer,
    ProjectStatusSerializer,
    ResponsibilitySerializer,
    EscalationSerializer,
)
from .permissions import IsProjectManager, IsResponsibleOrDeputy, IsEscalationManager

logger = logging.getLogger(__name__)


class CreateUserView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class ProjectFilter(filters.FilterSet):
    code = filters.CharFilter(lookup_expr='icontains')
    name = filters.CharFilter(lookup_expr='icontains')
    phase = filters.CharFilter(field_name='statuses__phase')

    class Meta:
        model = Project
        fields = ['code', 'name', 'phase']


class EscalationFilter(filters.FilterSet):
    resolved = filters.BooleanFilter()
    project = filters.CharFilter(field_name='responsibility__project_status__project__code')

    class Meta:
        model = Escalation
        fields = ['resolved', 'project']


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    filterset_fields = ['code', 'name', 'current_phase']
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['PM', 'ADMIN']:
            return super().get_queryset()
        return Project.objects.filter(
            Q(statuses__responsibilities__responsible=user) |
            Q(statuses__responsibilities__deputy=user)
        ).distinct()

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        project = self.get_object()
        latest_status = project.statuses.order_by('-status_date').first()
        serializer = ProjectStatusSerializer(latest_status)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='check-code')
    def check_code(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'Code parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        exists = Project.objects.filter(code=code).exists()
        return Response({'exists': exists})


class ProjectStatusViewSet(viewsets.ModelViewSet):
    queryset = ProjectStatus.objects.all().order_by('-status_date')
    serializer_class = ProjectStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsResponsibleOrDeputy]
    filterset_fields = ['project', 'phase', 'is_baseline', 'is_final']

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return ProjectStatus.objects.filter(project_id=project_id)
        return super().get_queryset()

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        project.current_phase = serializer.validated_data['phase']
        project.save()

        # Determine if this is the first status for the project
        existing_count = ProjectStatus.objects.filter(project=project).count()
        with transaction.atomic():
            status = serializer.save(
                created_by=self.request.user,
                status_date=timezone.now().date()
            )
            if existing_count == 0:
                self.create_default_responsibilities(status)

    def create_default_responsibilities(self, project_status):
        default_titles = [
            "Project Estimate",
            "Resource Allocation",
            "Risk Management",
            "Quality Assurance",
            "Timeline Compliance"
        ]
        for title in default_titles:
            Responsibility.objects.create(
                project_status=project_status,
                title=title,
                responsible=self.request.user
            )

    @action(detail=True, methods=['post'])
    def save_baseline(self, request, pk=None):
        status = self.get_object()
        status.is_baseline = True
        status.save()
        return Response({'status': 'baseline saved'})

    @action(detail=True, methods=['post'])
    def save_final(self, request, pk=None):
        status = self.get_object()
        status.is_final = True
        status.save()
        return Response({'status': 'final status saved'})

    @action(detail=True, methods=['post'])
    def clone_previous(self, request, pk=None):
        current_status = self.get_object()
        previous = current_status.project.statuses.filter(
            status_date__lt=current_status.status_date
        ).order_by('-status_date').first()
        if not previous:
            return Response({'error': 'No previous status found'}, status=status.HTTP_400_BAD_REQUEST)
        for resp in previous.responsibilities.all():
            Responsibility.objects.create(
                project_status=current_status,
                title=resp.title,
                responsible=resp.responsible,
                deputy=resp.deputy,
                status=resp.status,
                progress=resp.progress,
                comments=f"Cloned from {previous.status_date}"
            )
        return Response({'status': 'previous responsibilities cloned'})


class ResponsibilityViewSet(viewsets.ModelViewSet):
    queryset = Responsibility.objects.all()
    serializer_class = ResponsibilitySerializer
    permission_classes = [permissions.IsAuthenticated, IsResponsibleOrDeputy]
    filterset_fields = ['project_status', 'status', 'needs_escalation']

    def perform_update(self, serializer):
        instance = serializer.save()
        self._check_escalation(instance)

    def _check_escalation(self, responsibility):
        if responsibility.tracker.has_changed('status') or responsibility.tracker.has_changed('needs_escalation'):
            if responsibility.status in ['Y', 'R'] or responsibility.needs_escalation:
                self._trigger_escalation(responsibility)

    def _trigger_escalation(self, responsibility):
        escalation = Escalation.objects.create(
            responsibility=responsibility,
            reason=f"Automatic escalation triggered for {responsibility.title}",
            created_by=self.request.user
        )
        recipients = [responsibility.responsible.email]
        if responsibility.deputy:
            recipients.append(responsibility.deputy.email)
        subject = f"ESCALATION: {responsibility.project_status.project.name}"
        message = (
            f"Project: {responsibility.project_status.project.code} - "
            f"{responsibility.project_status.project.name}\n"
            f"Responsibility: {responsibility.title}\n"
            f"Status: {responsibility.get_status_display()}\n"
            f"Reason: {escalation.reason}\n"
            f"Please review: http://yourdomain.com/status/{responsibility.project_status.id}/"
        )
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipients,
            fail_silently=False,
        )


class EscalationViewSet(viewsets.ModelViewSet):
    queryset = Escalation.objects.all().order_by('-created_at')
    serializer_class = EscalationSerializer
    permission_classes = [permissions.IsAuthenticated, IsEscalationManager]
    filterset_fields = ['resolved', 'responsibility__project_status__project']

    @action(detail=True, methods=['post'])
    def resolve_escalation(self, request, pk=None):
        escalation = self.get_object()
        escalation.resolve(request.user)
        return Response({'status': 'escalation resolved'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class ReportingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]

    def list(self, request):
        return Response({
            "project_summary": "GET /api/reports/project_summary/",
            "user_responsibilities": "GET /api/reports/user_responsibilities/?user_id=...",
            "escalation_report": "GET /api/reports/escalation_report/"
        })

    @action(detail=False, methods=['get'])
    def project_summary(self, request):
        total = Project.objects.count()
        in_production = Project.objects.filter(statuses__phase='PROD').distinct().count()
        escalated = Responsibility.objects.filter(
            Q(status='Y') | Q(status='R') | Q(needs_escalation=True)
        ).values('project_status__project').distinct().count()
        return Response({
            'total_projects': total,
            'in_production': in_production,
            'escalated_projects': escalated,
            'escalation_rate': round((escalated / total) * 100, 2) if total else 0
        })

    @action(detail=False, methods=['get'])
    def user_responsibilities(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        responsibilities = Responsibility.objects.filter(
            Q(responsible_id=user_id) | Q(deputy_id=user_id)
        ).annotate(
            project_code=F('project_status__project__code'),
            project_name=F('project_status__project__name'),
            status_date=F('project_status__status_date')
        ).values(
            'id', 'title', 'status', 'needs_escalation',
            'project_code', 'project_name', 'status_date'
        )
        return Response(list(responsibilities))

    @action(detail=False, methods=['get'])
    def escalation_report(self, request):
        escalations = Escalation.objects.filter(resolved=False).annotate(
            project_code=F('responsibility__project_status__project__code'),
            responsibility_title=F('responsibility__title'),
            created_by_name=F('created_by__username')
        ).values(
            'id', 'reason', 'created_at',
            'project_code', 'responsibility_title', 'created_by_name'
        )
        return Response(list(escalations))
    
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=400)

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'message': 'If the email exists, a reset link will be sent.'}, status=200)

        # Create or update token
        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.update_or_create(user=user, defaults={'token': token})

        reset_link = f'http://localhost:5173/reset-password?token={token}'

        send_mail(
            'Password Reset Request',
            f'Click the link to reset your password:\n{reset_link}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
        )

        return Response({'message': 'If the email exists, a reset link will be sent.'}, status=200)

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('password')

        if not token or not new_password:
            return Response({'error': 'Token and new password are required.'}, status=400)

        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token.'}, status=400)

        if reset_token.is_expired():
            reset_token.delete()
            return Response({'error': 'Token has expired.'}, status=400)

        user = reset_token.user
        user.set_password(new_password)
        user.save()

        reset_token.delete()

        return Response({'message': 'Password reset successful.'}, status=200)
