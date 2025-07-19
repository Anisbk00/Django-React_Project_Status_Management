from django.test import TestCase
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import Project, ProjectStatus, Responsibility

class ProjectStatusAPITests(TestCase):
    def setUp(self):
        # Create users
        self.user1 = User.objects.create_user(
            username='user1', email='user1@example.com', password='user1pass'
        )
        self.user2 = User.objects.create_user(
            username='user2', email='user2@example.com', password='user2pass'
        )
        
        # Create projects
        self.project1 = Project.objects.create(
            code='P1001', name='Project Alpha'
        )
        self.project2 = Project.objects.create(
            code='P1002', name='Project Beta'
        )
        
        # Create statuses
        self.status1 = ProjectStatus.objects.create(
            project=self.project1,
            status_date='2025-07-01',
            phase='DEV',
            created_by=self.admin
        )
        
        # Create responsibilities
        self.responsibility1 = Responsibility.objects.create(
            project_status=self.status1,
            title='Frontend Development',
            responsible=self.user1,
            deputy=self.user2,
            status='G'
        )
        
        # API client
        self.client = APIClient()

    def test_unique_project_code(self):
        """Test project code uniqueness validation"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse('project-list'),
            {'code': 'P1001', 'name': 'Duplicate Project'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)
        self.assertEqual(response.data['code'][0], 'project with this code already exists.')

    def test_permission_restrictions(self):
        """Test authentication requirements"""
        # Unauthenticated access
        endpoints = [
            reverse('project-list'),
            reverse('projectstatus-list'),
            reverse('responsibility-list')
        ]
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Regular user access to projects
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse('project-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Regular user trying to create project (should fail if permissions are set)
        response = self.client.post(
            reverse('project-list'),
            {'code': 'P1003', 'name': 'New Project'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_crud_operations(self):
        """Test full CRUD lifecycle for Project"""
        self.client.force_authenticate(user=self.admin)
        
        # Create
        response = self.client.post(
            reverse('project-list'),
            {'code': 'P1003', 'name': 'Project Gamma'}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project_id = response.data['id']
        
        # Read
        response = self.client.get(reverse('project-detail', args=[project_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Project Gamma')
        
        # Update
        response = self.client.patch(
            reverse('project-detail', args=[project_id]),
            {'name': 'Project Gamma Updated'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Project Gamma Updated')
        
        # Delete
        response = self.client.delete(reverse('project-detail', args=[project_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_edge_cases(self):
        """Test various edge cases"""
        self.client.force_authenticate(user=self.admin)
        
        # Empty fields
        response = self.client.post(
            reverse('project-list'),
            {'code': '', 'name': ''}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)
        self.assertIn('name', response.data)
        
        # Invalid IDs
        response = self.client.get(reverse('project-detail', args=[999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Invalid date format
        response = self.client.post(
            reverse('projectstatus-list'),
            {
                'project': self.project1.id,
                'status_date': '2025-13-01',  # Invalid month
                'phase': 'DEV'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status_date', response.data)

    def test_deputy_functionality(self):
        """Test deputy can update responsibility"""
        # Deputy (user2) updates responsibility
        self.client.force_authenticate(user=self.user2)
        response = self.client.patch(
            reverse('responsibility-detail', args=[self.responsibility1.id]),
            {'status': 'Y'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'Y')
        
        # Non-deputy user tries to update (should fail)
        user3 = User.objects.create_user(
            username='user3', password='user3pass'
        )
        self.client.force_authenticate(user=user3)
        response = self.client.patch(
            reverse('responsibility-detail', args=[self.responsibility1.id]),
            {'status': 'R'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_escalation(self):
        """Test escalation triggers email to multiple recipients"""
        # Setup email backend for testing
        from django.core import mail
        self.client.force_authenticate(user=self.admin)
        
        # Create additional deputy
        user3 = User.objects.create_user(
            username='user3', email='user3@example.com', password='user3pass'
        )
        self.responsibility1.deputy = user3
        self.responsibility1.save()
        
        # Trigger escalation
        response = self.client.patch(
            reverse('responsibility-detail', args=[self.responsibility1.id]),
            {'status': 'Y'}  # Yellow status triggers escalation
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.subject, f"ESCALATION: {self.project1.name}")
        self.assertEqual(len(email.to), 3)  # Responsible + 2 deputies
        self.assertIn(self.user1.email, email.to)
        self.assertIn(self.user2.email, email.to)
        self.assertIn(user3.email, email.to)
        
        # Check escalation record created
        self.assertEqual(self.responsibility1.escalations.count(), 1)
        escalation = self.responsibility1.escalations.first()
        self.assertEqual(escalation.created_by, self.admin)
        self.assertFalse(escalation.resolved)
        
        # Test checkbox escalation
        mail.outbox = []  # Clear email outbox
        response = self.client.patch(
            reverse('responsibility-detail', args=[self.responsibility1.id]),
            {'needs_escalation': True}
        )
        self.assertEqual(len(mail.outbox), 1)  # New email sent

    def test_status_save_actions(self):
        """Test save baseline and final status actions"""
        self.client.force_authenticate(user=self.admin)
        
        # Save baseline
        response = self.client.post(
            reverse('projectstatus-save-baseline', args=[self.status1.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.status1.refresh_from_db()
        self.assertTrue(self.status1.is_baseline)
        
        # Save final status
        response = self.client.post(
            reverse('projectstatus-save-final', args=[self.status1.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.status1.refresh_from_db()
        self.assertTrue(self.status1.is_final)

    def test_automatic_status_date_update(self):
        """Test status_date updates automatically"""
        self.client.force_authenticate(user=self.admin)
        
        # Create new status without date
        response = self.client.post(
            reverse('projectstatus-list'),
            {
                'project': self.project1.id,
                'phase': 'PROD'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data['status_date'])
        
        # Update status should not change date
        status_id = response.data['id']
        original_date = response.data['status_date']
        response = self.client.patch(
            reverse('projectstatus-detail', args=[status_id]),
            {'phase': 'COMP'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status_date'], original_date)
# Create your tests here.
