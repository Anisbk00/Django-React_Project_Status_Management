from django.contrib import admin
from .models import CustomUser, Project, ProjectStatus, Responsibility,Escalation
from django.contrib.auth.admin import UserAdmin

admin.site.site_header = "Project Management Admin"
admin.site.site_title = "Project Management Admin Portal"
admin.site.index_title = "Welcome to the Project Management Admin Portal"


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    fieldsets = (
        (None, {'fields': ('username', 'password')}),  # default first section
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Additional info', {'fields': ('role', 'phone', 'department')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser',
                                    'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'phone', 'department'),
        }),
    )

    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'created_at', 'updated_at')
    search_fields = ('code', 'name')
    ordering = ('-created_at',)


@admin.register(ProjectStatus)
class ProjectStatusAdmin(admin.ModelAdmin):
    list_display = ('project', 'status_date', 'phase', 'is_baseline', 'is_final', 'created_by', 'created_at')
    search_fields = ('project__code', 'phase')
    list_filter = ('phase', 'is_baseline', 'is_final')
    ordering = ('-status_date',)

@admin.register(Responsibility)
class ResponsibilityAdmin(admin.ModelAdmin):
    list_display = ('title', 'project_status', 'responsible', 'status', 'last_updated')
    search_fields = ('title', 'project_status__project__code', 'responsible__username')
    list_filter = ('status', 'project_status__phase')
    ordering = ('-last_updated',)

@admin.register(Escalation)
class EscalationAdmin(admin.ModelAdmin):
    list_display = ('responsibility', 'reason', 'created_by', 'created_at', 'resolved')
    search_fields = ('responsibility__title', 'created_by__username')
    list_filter = ('resolved',)
    ordering = ('-created_at',)
# Register your models here.
