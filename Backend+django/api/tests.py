import os
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from api.models import Project, ProjectStatus, Responsibility, Escalation

User = get_user_model()

class BaseTestCase(APITestCase):
    def setUp(self):
        # Create users with different roles
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN', email='admin@example.com'
        )
        self.pm = User.objects.create_user(
            username='pm', password='pmpass', role='PM', email='pm@example.com'
        )
        self.resp = User.objects.create_user(
            username='resp', password='resppass', role='RESP', email='resp@example.com'
        )
        self.em = User.objects.create_user(
            username='em', password='empass', role='EM', email='em@example.com'
        )

        # Initialize client
        self.client = APIClient()

    def authenticate(self, user):
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': user.username, 'password': user.username + 'pass'}
        )
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

class ProjectTests(BaseTestCase):
    def test_create_project_as_pm(self):
        self.authenticate(self.pm)
        url = reverse('project-list')
        data = {
            'code': '1000000001-01S',
            'name': 'Test Project',
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'manager': self.pm.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 1)

    def test_create_project_as_resp_forbidden(self):
        self.authenticate(self.resp)
        url = reverse('project-list')
        data = {
            'code': '1000000002-01S',
            'name': 'Forbidden Project',
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'manager': self.resp.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_projects_visibility(self):
        # PM creates two projects
        Project.objects.create(code='1000000003-01S', name='P1', start_date='2025-01-01', end_date='2025-02-01', manager=self.pm)
        proj2 = Project.objects.create(code='1000000004-01S', name='P2', start_date='2025-01-01', end_date='2025-02-01', manager=self.pm)
        # Add resp responsibility to one
        status_obj = ProjectStatus.objects.create(project=proj2, phase='PLAN', created_by=self.pm)
        Responsibility.objects.create(project_status=status_obj, title='Task', responsible=self.resp)

        # RESP sees only proj2
        self.authenticate(self.resp)
        url = reverse('project-list')
        response = self.client.get(url)
        self.assertEqual(len(response.data), 1)

class StatusTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.pm)
        self.project = Project.objects.create(
            code='1000000005-01S', name='PStatus', start_date='2025-01-01', end_date='2025-12-31', manager=self.pm
        )

    def test_baseline_and_final_save(self):
        url = reverse('status-list')
        data = {'project': self.project.id, 'phase': 'PLAN'}
        response = self.client.post(url, data, format='json')
        status_id = response.data['id']
        # Save as baseline
        baseline_url = reverse('status-save-baseline', args=[status_id])
        resp1 = self.client.post(baseline_url)
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        # Save as final
        final_url = reverse('status-save-final', args=[status_id])
        resp2 = self.client.post(final_url)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

    def test_clone_previous(self):
        # Create two statuses
        status1 = ProjectStatus.objects.create(project=self.project, phase='PLAN', created_by=self.pm)
        status2 = ProjectStatus.objects.create(project=self.project, phase='DEV', created_by=self.pm)
        # Add responsibility to first
        Responsibility.objects.create(project_status=status1, title='T1', responsible=self.pm)
        self.authenticate(self.pm)
        clone_url = reverse('status-clone-previous', args=[status2.id])
        resp = self.client.post(clone_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Check responsibilities cloned
        self.assertTrue(status2.responsibilities.filter(title='T1').exists())

class ResponsibilityTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.pm)
        self.project = Project.objects.create(
            code='1000000006-01S', name='PResp', start_date='2025-01-01', end_date='2025-12-31', manager=self.pm
        )
        self.status_obj = ProjectStatus.objects.create(project=self.project, phase='PLAN', created_by=self.pm)
        self.resp_obj = Responsibility.objects.create(
            project_status=self.status_obj, title='T2', responsible=self.resp
        )

    def test_manual_escalation_flag(self):
        self.authenticate(self.resp)
        url = reverse('responsibility-detail', args=[self.resp_obj.id])
        update_data = {'needs_escalation': True}
        response = self.client.patch(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Escalation.objects.filter(responsibility=self.resp_obj).exists())

    def test_resolve_escalation_as_em(self):
        # Trigger escalation
        esc = Escalation.objects.create(responsibility=self.resp_obj, reason='Test', created_by=self.resp)
        self.authenticate(self.em)
        url = reverse('escalation-resolve-escalation', args=[esc.id])
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        esc.refresh_from_db()
        self.assertTrue(esc.resolved)

class ReportingTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.authenticate(self.pm)
        # Create sample project and responsibilities
        proj = Project.objects.create(code='1000000007-01S', name='Pr', start_date='2025-01-01', end_date='2025-12-31', manager=self.pm)
        st = ProjectStatus.objects.create(project=proj, phase='PLAN', created_by=self.pm)
        Responsibility.objects.create(project_status=st, title='R', responsible=self.resp)

    def test_project_summary(self):
        url = reverse('report-project-summary')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_projects', resp.data)

    def test_user_responsibilities(self):
        url = f"{reverse('report-user-responsibilities')}?user_id={self.resp.id}"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(resp.data, list))

    def test_escalation_report(self):
        url = reverse('report-escalation-report')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(resp.data, list))
