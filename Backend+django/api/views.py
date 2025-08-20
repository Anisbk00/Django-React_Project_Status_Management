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
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination


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
    permission_classes = [permissions.IsAuthenticated,]
    filterset_fields = ['code', 'name', 'current_phase']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['PM', 'ADMIN']:
            return super().get_queryset()

        if user.role == 'DEPUTY':
            return Project.objects.filter(
                statuses__responsibilities__deputy=user
            ).distinct()

        if user.role == 'RESP':
            return Project.objects.filter(statuses__responsibilities__responsible=user).distinct()

        # Fallback: show projects where the user is either responsible or deputy
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
    queryset = ProjectStatus.objects.all()   
    serializer_class = ProjectStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['project', 'phase', 'is_baseline', 'is_final']

    def get_queryset(self):
        qs = ProjectStatus.objects.all()
        # Always bring responsibilities along
        qs = qs.prefetch_related('responsibilities__responsible', 'responsibilities__deputy')
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by('-status_date')

    def get_permissions(self):
        # keep read operations broadly available, restrict write to project managers / admins
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'save_baseline', 'save_final', 'clone_previous']:
            return [permissions.IsAuthenticated(), IsProjectManager()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        """
        Create a ProjectStatus where:
        - `project` is inferred from request.query_params['project_id']
        - `created_by` is taken from request.user (no need for frontend to pass)
        - `status_date` will be taken from the serializer data if provided, otherwise defaults to today
        """
        project_id = self.request.query_params.get('project_id') or self.request.data.get('project')
        if not project_id:
            raise ValidationError({'project_id': 'project_id query parameter is required.'})

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise ValidationError({'project_id': 'Project not found.'})

        # Let user pass status_date if desired; otherwise default to today.
        provided_status_date = serializer.validated_data.get('status_date', None)
        status_date = provided_status_date if provided_status_date else timezone.now().date()

        with transaction.atomic():
            # We pass project and created_by explicitly to serializer.save()
            status_obj = serializer.save(project=project, created_by=self.request.user, status_date=status_date)

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
    permission_classes = [permissions.IsAuthenticated,]
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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['resolved', 'responsibility__project_status__project']

    @action(detail=True, methods=['post'])
    def resolve_escalation(self, request, pk=None):
        escalation = self.get_object()
        escalation.resolve(request.user)
        return Response({'status': 'escalation resolved'})
    
    @action(detail=False, methods=['get'])
    def by_project(self, request):
        """
        GET /api/escalations/by_project/?project=<id_or_code>&resolved=true|false

        - `project` may be the numeric PK (id) or the project.code string.
        - `resolved` optional filter accepts true/false (or 1/0).
        - Supports DRF pagination if configured.
        """
        project_q = request.query_params.get('project')
        if not project_q:
            return Response({"detail": "project query param required"}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset()

        # If numeric, treat as project id, otherwise treat as project.code
        if str(project_q).isdigit():
            qs = qs.filter(responsibility__project_status__project__id=project_q)
        else:
            qs = qs.filter(responsibility__project_status__project__code=project_q)

        resolved = request.query_params.get('resolved')
        if resolved is not None:
            if str(resolved).lower() in ('true', '1'):
                qs = qs.filter(resolved=True)
            elif str(resolved).lower() in ('false', '0'):
                qs = qs.filter(resolved=False)

        # optional responsibility filter passthrough
        resp = request.query_params.get('responsibility')
        if resp:
            qs = qs.filter(responsibility__id=resp)

        # pagination-aware response
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


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
    permission_classes = [permissions.IsAuthenticated]

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
        """
        Escalation report:
        Query params supported:
          - resolved=true|false (filter on Escalation.resolved)
          - include_resolved=true|false (alias for resolved)
          - project=<id_or_code>
          - date_from=YYYY-MM-DD (created_at >= date_from)
          - date_to=YYYY-MM-DD (created_at <= date_to)
          - responsibility=<responsibility_id>

        Returns paginated response when pagination is enabled.
        """
        try:
            qs = Escalation.objects.select_related(
                'responsibility__project_status__project',
                'created_by',
                'resolved_by'
            ).order_by('-created_at')

            # resolved / include_resolved: accept either param
            resolved_param = request.query_params.get('resolved')
            if resolved_param is None:
                resolved_param = request.query_params.get('include_resolved')

            if resolved_param is not None:
                if str(resolved_param).lower() in ('true', '1'):
                    qs = qs.filter(resolved=True)
                elif str(resolved_param).lower() in ('false', '0'):
                    qs = qs.filter(resolved=False)

            # project filter: numeric id or project.code
            project_q = request.query_params.get('project')
            if project_q:
                if str(project_q).isdigit():
                    qs = qs.filter(responsibility__project_status__project__id=project_q)
                else:
                    qs = qs.filter(responsibility__project_status__project__code=project_q)

            # date range filters for created_at (expects YYYY-MM-DD)
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            try:
                if date_from:
                    qs = qs.filter(created_at__date__gte=date_from)
                if date_to:
                    qs = qs.filter(created_at__date__lte=date_to)
            except Exception:
                return Response({"detail": "Invalid date_from or date_to. Use YYYY-MM-DD."},
                                status=status.HTTP_400_BAD_REQUEST)

            # optional responsibility passthrough
            resp = request.query_params.get('responsibility')
            if resp:
                qs = qs.filter(responsibility__id=resp)

            # LOG: show how many rows matching filters (helpful for debugging)
            logger.debug("escalation_report query built; count = %d", qs.count())

            # Use DRF paginator + serializer for consistent output
            paginator = PageNumberPagination()
            page = paginator.paginate_queryset(qs, request, view=self)
            if page is not None:
                serializer = EscalationSerializer(page, many=True, context={'request': request})
                return paginator.get_paginated_response(serializer.data)

            serializer = EscalationSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        except Exception:
            logger.exception("Failed to build or return escalation_report")
            return Response({'detail': 'Server error while building escalation report'}, status=500)

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