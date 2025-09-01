from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.core.validators import RegexValidator
from model_utils import FieldTracker
from datetime import timedelta


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('PM', 'Project Manager'),
        ('RESP', 'Responsible'),
        ('DEP', 'Deputy'),
        ('EM', 'Escalation Manager'),
        ('ADMIN', 'Administrator'),
    ]
    role = models.CharField(max_length=5, choices=ROLE_CHOICES, default='RESP')
    phone = models.CharField(max_length=20, blank=True)
    email=models.EmailField()
    department = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Project(models.Model):
    PHASE_CHOICES = [
        ('PLAN', 'Planning'),
        ('DEV', 'Development'),
        ('TEST', 'Testing'),
        ('PROD', 'Serial Production'),
        ('COMP', 'Completed'),
    ]
    code_validator = RegexValidator(
        regex=r'^100000000\d+-01S$', 
        message='Code must match the pattern 100000000<number>-01S, e.g. 1000000002-01S'
    )
    code = models.CharField(max_length=20, unique=True,validators=[code_validator])  # e.g. 1000000002-01S
    name = models.CharField(max_length=255)  # e.g. BMW_BMW_G2X Europe
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    manager = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='managed_projects')
    start_date = models.DateField()
    end_date = models.DateField()
    current_phase = models.CharField(max_length=5, choices=PHASE_CHOICES, default='PLAN')
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def progress(self):
        # Calculate project progress based on phases
        phases = ['PLAN', 'DEV', 'TEST', 'PROD', 'COMP']
        try:
            return (phases.index(self.current_phase) * 25)
        except ValueError:
            return 0

class ProjectStatus(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='statuses')
    status_date = models.DateField(default=timezone.now)
    phase = models.CharField(max_length=5, choices=Project.PHASE_CHOICES)
    notes = models.TextField(blank=True)
    is_baseline = models.BooleanField(default=False)
    is_final = models.BooleanField(default=False)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-status_date']
        verbose_name_plural = "Project Statuses"
        #unique_together = ['project', 'status_date']
    
    def __str__(self):
        return f"{self.project.code} Status - {self.status_date}"

class Responsibility(models.Model):
    STATUS_CHOICES = [
        ('G', 'Green'),
        ('Y', 'Yellow'),
        ('R', 'Red'),
    ]
    
    project_status = models.ForeignKey(ProjectStatus, on_delete=models.CASCADE, related_name='responsibilities')
    title = models.CharField(max_length=255)  # e.g. "Project Estimate"
    responsible = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='primary_responsibilities')
    deputy = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='deputy_responsibilities')
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='G')
    needs_escalation = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)
    progress = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    tracker = FieldTracker(fields=['status', 'needs_escalation'])
    comments = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = "Responsibilities"
    
    def __str__(self):
        return f"{self.title} - {self.project_status.project.code}"

class Escalation(models.Model):
    responsibility = models.ForeignKey(Responsibility, on_delete=models.CASCADE, related_name='escalations')
    reason = models.TextField()
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_escalations')
    
    def __str__(self):
        return f"Escalation for {self.responsibility.title}"
    
    def resolve(self, user):
        self.resolved = True
        self.resolved_at = timezone.now()
        self.resolved_by = user
        self.save()

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('ESCALATION', 'Escalation'),
        ('RESP_UPDATE', 'Responsibility Update'),
        ('STATUS_UPDATE', 'Status Update'),
        ('SYSTEM', 'System'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    related_link = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.user.username}"
    

    
class PasswordResetToken(models.Model):
    user = models.OneToOneField('CustomUser', on_delete=models.CASCADE, related_name='password_reset_token')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        # Token expires after 1 day
        expiration_time = self.created_at + timedelta(days=1)
        return timezone.now() > expiration_time

    def __str__(self):
        return f"PasswordResetToken(user={self.user.email}, token={self.token})"
