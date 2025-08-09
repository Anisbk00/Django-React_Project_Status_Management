from rest_framework import permissions
from .models import Responsibility

class IsProjectManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['PM', 'ADMIN']

class IsResponsibleOrDeputy(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        # For responsibility instances
        if isinstance(obj, Responsibility):
            return user in [obj.responsible, obj.deputy]

        # For project status instances
        from .models import ProjectStatus
        if hasattr(obj, 'project_status') or hasattr(obj, 'statuses'):
            # obj is ProjectStatus
            return Responsibility.objects.filter(
                project_status=obj,
                responsible=user
            ).exists() or Responsibility.objects.filter(
                project_status=obj,
                deputy=user
            ).exists()

        return False

class IsEscalationManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['EM', 'ADMIN']
