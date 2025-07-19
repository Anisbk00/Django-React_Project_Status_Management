from venv import logger
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CustomUser, Project, ProjectStatus, Responsibility, Escalation
from .serializers import EscalationSerializer, ProjectSerializer, ProjectStatusSerializer, ResponsibilitySerializer, UserSerializer
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from .permissions import IsProjectManager, IsResponsibleOrDeputy, IsEscalationManager
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django_filters import rest_framework as filters
from django.db.models import Count, Q, F
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from rest_framework import generics
from django.contrib.auth import get_user_model
from .serializers import UserSerializer



class CreateUserView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
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
        # Allow project managers to see all projects, others only see projects they're involved in
        user = self.request.user
        if user.role in ['PM', 'ADMIN']:
            return super().get_queryset()
        
        # For other users, show projects where they're responsible or deputy
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

class ProjectStatusViewSet(viewsets.ModelViewSet):
    queryset = ProjectStatus.objects.all().order_by('-status_date')
    serializer_class = ProjectStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsResponsibleOrDeputy]
    filterset_fields = ['project', 'phase', 'is_baseline', 'is_final']

    def get_queryset(self):
        # Filter by project if project_id is provided
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return ProjectStatus.objects.filter(project_id=project_id)
        return super().get_queryset()

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        project.current_phase = serializer.validated_data['phase']
        project.save()
        
        with transaction.atomic():
            status = serializer.save(
                created_by=self.request.user, 
                status_date=timezone.now().date()
            )
            
            # Create default responsibilities if this is the first status
            if not project.statuses.exists():
                self.create_default_responsibilities(status)

    def create_default_responsibilities(self, project_status):
        # Create default responsibilities for a new project
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
        previous_status = current_status.project.statuses.filter(
            status_date__lt=current_status.status_date
        ).order_by('-status_date').first()
        
        if not previous_status:
            return Response({'error': 'No previous status found'}, status=400)
        
        # Clone responsibilities from previous status
        for resp in previous_status.responsibilities.all():
            Responsibility.objects.create(
                project_status=current_status,
                title=resp.title,
                responsible=resp.responsible,
                deputy=resp.deputy,
                status=resp.status,
                progress=resp.progress,
                comments=f"Cloned from {previous_status.status_date}"
            )
        
        return Response({'status': 'previous responsibilities cloned'})

class ResponsibilityViewSet(viewsets.ModelViewSet):
    queryset = Responsibility.objects.all()
    serializer_class = ResponsibilitySerializer
    permission_classes = [permissions.IsAuthenticated, IsResponsibleOrDeputy]
    filterset_fields = ['project_status', 'status', 'needs_escalation']

    def perform_update(self, serializer):
        instance = serializer.save()
        self.check_escalation(instance)
    
    def check_escalation(self, responsibility):
        # Only trigger escalation if status changed to yellow/red or escalation flag set
        if responsibility.tracker.has_changed('status') or responsibility.tracker.has_changed('needs_escalation'):
            if responsibility.status in ['Y', 'R'] or responsibility.needs_escalation:
                self.trigger_escalation(responsibility)
    def trigger_escalation(self, responsibility):
        # Create escalation record
        escalation = Escalation.objects.create(
            responsibility=responsibility,
            reason=f"Automatic escalation triggered for {responsibility.title}",
            created_by=self.request.user
        )
        
        # Send email notification
        recipients = [responsibility.responsible.email]
        if responsibility.deputy:
            recipients.append(responsibility.deputy.email)
            
        subject = f"ESCALATION: {responsibility.project_status.project.name}"
        message = f"""
        Project: {responsibility.project_status.project.code} - {responsibility.project_status.project.name}
        Responsibility: {responsibility.title}
        Status: {responsibility.get_status_display()}
        Reason: {escalation.reason}
        
        Please review: http://yourdomain.com/status/{responsibility.project_status.id}/
        """
        
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
            return Response({'error': 'user_id parameter required'}, status=400)
        
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