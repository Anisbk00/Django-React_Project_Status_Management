from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

from .models import ProjectStatus, Responsibility

logger = logging.getLogger(__name__)

@receiver(post_save, sender=ProjectStatus)
def log_project_status_change(sender, instance, created, **kwargs):
    action = 'Created' if created else 'Updated'
    logger.info(f"Project Status {action}: {instance.project.code} on {instance.status_date}")

@receiver(post_save, sender=Responsibility)
def log_responsibility_change(sender, instance, **kwargs):
    changes = []
    if instance.tracker.has_changed('status'):
        prev = instance.tracker.previous('status')
        changes.append(f"Status: {prev} → {instance.status}")
    if instance.tracker.has_changed('needs_escalation'):
        prev = instance.tracker.previous('needs_escalation')
        changes.append(f"Escalation: {prev} → {instance.needs_escalation}")

    if changes:
        logger.info(
            f"Responsibility updated: {instance.title} in {instance.project_status.project.code}. "
            f"Changes: {', '.join(changes)}"
        )
