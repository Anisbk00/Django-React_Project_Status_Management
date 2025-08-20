# api/views.py
import logging
import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone

from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import ValidationError

from django_filters import rest_framework as filters

from .models import (
    CustomUser,
    Project,
    ProjectStatus,
    Responsibility,
    Escalation,
    PasswordResetToken,
)
from .serializers import (
    ChangePasswordSerializer,
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
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['code', 'name', 'current_phase']

    def get_queryset(self):
        user = self.request.user

        # Admins / PMs see everything
        if user.role in ['PM', 'ADMIN']:
            return super().get_queryset()

        # Deputies: projects where they are deputy
        if user.role == 'DEPUTY':
            return Project.objects.filter(statuses__responsibilities__deputy=user).distinct()

        # Responsible: projects where they are responsible
        if user.role == 'RESP':
            return Project.objects.filter(statuses__responsibilities__responsible=user).distinct()

        # Fallback: show projects where user is either responsible or deputy
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
        # eager load responsibilities + user relations for performance
        qs = qs.prefetch_related('responsibilities__responsible', 'responsibilities__deputy')
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by('-status_date')

    def get_permissions(self):
        # restrict write actions to project managers/admins (IsProjectManager permission)
        if self.action in [
            'create', 'update', 'partial_update', 'destroy',
            'save_baseline', 'save_final', 'clone_previous'
        ]:
            return [permissions.IsAuthenticated(), IsProjectManager()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        """
        Create ProjectStatus:
        - project inferred from ?project_id or request.data['project']
        - created_by set to request.user
        - status_date default to today if not provided
        """
        project_id = self.request.query_params.get('project_id') or self.request.data.get('project')
        if not project_id:
            raise ValidationError({'project_id': 'project_id query parameter is required.'})

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise ValidationError({'project_id': 'Project not found.'})

        provided_status_date = serializer.validated_data.get('status_date', None)
        status_date = provided_status_date if provided_status_date else timezone.now().date()

        with transaction.atomic():
            serializer.save(project=project, created_by=self.request.user, status_date=status_date)

    @action(detail=True, methods=['post'])
    def save_baseline(self, request, pk=None):
        status_obj = self.get_object()
        status_obj.is_baseline = True
        status_obj.save()
        return Response({'status': 'baseline saved'})

    @action(detail=True, methods=['post'])
    def save_final(self, request, pk=None):
        status_obj = self.get_object()
        status_obj.is_final = True
        status_obj.save()
        return Response({'status': 'final status saved'})

    @action(detail=True, methods=['post'])
    def clone_previous(self, request, pk=None):
        current_status = self.get_object()
        previous = current_status.project.statuses.filter(
            status_date__lt=current_status.status_date
        ).order_by('-status_date').first()

        if not previous:
            return Response({'error': 'No previous status found'}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
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
            created_count += 1

        return Response({'status': 'previous responsibilities cloned', 'created': created_count})


class ResponsibilityViewSet(viewsets.ModelViewSet):
    queryset = Responsibility.objects.all()
    serializer_class = ResponsibilitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['project_status', 'status', 'needs_escalation']

    def perform_update(self, serializer):
        instance = serializer.save()
        self._check_escalation(instance)

    def _check_escalation(self, responsibility):
        # relies on modeltracker / django-simple-history or similar to detect changes
        try:
            changed_status = getattr(responsibility, 'tracker', None) and responsibility.tracker.has_changed('status')
            changed_escalation_flag = getattr(responsibility, 'tracker', None) and responsibility.tracker.has_changed('needs_escalation')
            if changed_status or changed_escalation_flag:
                if responsibility.status in ['Y', 'R'] or responsibility.needs_escalation:
                    self._trigger_escalation(responsibility)
        except Exception:
            # fail safe: still try to trigger if conditions appear set
            if responsibility.status in ['Y', 'R'] or responsibility.needs_escalation:
                self._trigger_escalation(responsibility)

    def _trigger_escalation(self, responsibility):
        escalation = Escalation.objects.create(
            responsibility=responsibility,
            reason=f"Automatic escalation triggered for {responsibility.title}",
            created_by=self.request.user
        )

        recipients = []
        if responsibility.responsible and getattr(responsibility.responsible, 'email', None):
            recipients.append(responsibility.responsible.email)
        if responsibility.deputy and getattr(responsibility.deputy, 'email', None):
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
        if recipients:
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=False)
            except Exception:
                logger.exception("Failed to send escalation email")


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
        project_q = request.query_params.get('project')
        if not project_q:
            return Response({"detail": "project query param required"}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset()
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

        resp = request.query_params.get('responsibility')
        if resp:
            qs = qs.filter(responsibility__id=resp)

        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # list & retrieve allowed for authenticated; other mutating actions limited to admins
        if self.action in ['list', 'retrieve', 'me']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['put'], permission_classes=[permissions.IsAuthenticated], url_path='update_password')
    def update_password(self, request):
        """
        PUT /api/users/update_password/
        { current_password, new_password }
        """
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        current_password = serializer.validated_data['current_password']
        new_password = serializer.validated_data['new_password']

        if not user.check_password(current_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


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
         - resolved / include_resolved (true|false)
         - project (id or code)
         - date_from, date_to (YYYY-MM-DD)
         - responsibility (id)
        Returns paginated results when pagination is configured.
        """
        try:
            qs = Escalation.objects.select_related(
                'responsibility__project_status__project',
                'created_by',
                'resolved_by'
            ).order_by('-created_at')

            # resolved / include_resolved
            resolved_param = request.query_params.get('resolved') or request.query_params.get('include_resolved')
            if resolved_param is not None:
                if str(resolved_param).lower() in ('true', '1'):
                    qs = qs.filter(resolved=True)
                elif str(resolved_param).lower() in ('false', '0'):
                    qs = qs.filter(resolved=False)

            # project filter
            project_q = request.query_params.get('project')
            if project_q:
                if str(project_q).isdigit():
                    qs = qs.filter(responsibility__project_status__project__id=project_q)
                else:
                    qs = qs.filter(responsibility__project_status__project__code=project_q)

            # date range
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

            # responsibility passthrough
            resp = request.query_params.get('responsibility')
            if resp:
                qs = qs.filter(responsibility__id=resp)

            logger.debug("escalation_report query built; count=%d", qs.count())

            paginator = PageNumberPagination()
            page = paginator.paginate_queryset(qs, request, view=self)
            if page is not None:
                serializer = EscalationSerializer(page, many=True, context={'request': request})
                return paginator.get_paginated_response(serializer.data)

            serializer = EscalationSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception:
            logger.exception("Failed to build escalation report")
            return Response({'detail': 'Server error while building escalation report'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            # Do not reveal existence of email
            return Response({'message': 'If the email exists, a reset link will be sent.'}, status=status.HTTP_200_OK)

        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.update_or_create(user=user, defaults={'token': token})

        reset_link = f'http://localhost:5173/reset-password?token={token}'

        try:
            send_mail(
                'Password Reset Request',
                f'Click the link to reset your password:\n{reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
            )
        except Exception:
            logger.exception("Failed to send password reset email")

        return Response({'message': 'If the email exists, a reset link will be sent.'}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('password')

        if not token or not new_password:
            return Response({'error': 'Token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        if reset_token.is_expired():
            reset_token.delete()
            return Response({'error': 'Token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        user.set_password(new_password)
        user.save()

        reset_token.delete()
        return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
