from rest_framework import permissions
from .models import Responsibility

class IsProjectManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['PM', 'ADMIN']

class IsResponsibleOrDeputy(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if hasattr(obj, 'responsible') and hasattr(obj, 'deputy'):
            return user in [obj.responsible, obj.deputy]

        if hasattr(obj, 'project'):
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