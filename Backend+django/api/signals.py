from django.db.models.signals import post_save
from django.dispatch import receiver 
from .models import ProjectStatus , Responsibility
import json

@receiver(post_save,sender=ProjectStatus)
def log_project_status_change(sender,instance,created,**kwargs):
    action= 'Created' if created else 'Updated'
    print(f"Project Status {action}: {instance.project.code} on {instance.status_date}")

@receiver(post_save,sender=Responsibility)
def log_responsibility_change(sender,instance,**kwargs):
    changes=[]
    if instance.tracker.has_changed('status'):
        changes.append(f"Status: {instance.tracker.previous('status')} → {instance.status}")
    if instance.tracker.has_changed('needs_escalation'):
        changes.append(f"Escalation: {instance.tracker.previous('needs_escalation')} → {instance.needs_escalation}")
    
    if changes:
        print(f"Responsibility updated: {instance.title} in {instance.project_status.project.code}")
        print("Changes: " + ", ".join(changes))