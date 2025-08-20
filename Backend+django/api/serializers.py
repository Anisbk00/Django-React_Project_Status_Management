from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
import re

from .models import Project, ProjectStatus, Responsibility, Escalation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    User serializer. Password is write-only and will be hashed on create/update.
    """
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'department', 'is_active', 'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)


class ResponsibilitySerializer(serializers.ModelSerializer):
    """
    Responsibility serializer with nested read-only user info for responsible and deputy.
    """
    responsible_details = UserSerializer(source='responsible', read_only=True)
    deputy_details = UserSerializer(source='deputy', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Responsibility
        # Expose fields explicitly for clarity; adjust if you add/remove model fields
        fields = [
            'id', 'project_status', 'title', 'responsible', 'responsible_details',
            'deputy', 'deputy_details', 'status', 'status_display', 'needs_escalation',
            'last_updated', 'progress', 'comments'
        ]

    def validate_progress(self, value):
        if value is None:
            return value
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Progress must be an integer between 0 and 100.")
        return value


class ProjectSerializer(serializers.ModelSerializer):
    """
    Project serializer:
    - `manager` is writeable (PK).
    - `manager_details` provides nested read-only info.
    - validates code pattern and date order.
    """
    manager_details = UserSerializer(source='manager', read_only=True)
    progress = serializers.ReadOnlyField()
    phase_display = serializers.CharField(source='get_current_phase_display', read_only=True)

    manager = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Project
        fields = [
            'id', 'code', 'name', 'description', 'manager', 'manager_details',
            'start_date', 'end_date', 'current_phase', 'phase_display',
            'created_at', 'updated_at', 'progress'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'progress', 'phase_display', 'manager_details']

    CODE_REGEX = re.compile(r'^100000000\d+-01S$')

    def validate_code(self, value):
        if not self.CODE_REGEX.match(value):
            raise serializers.ValidationError("Code must match pattern 100000000<number>-01S (e.g. 1000000002-01S).")
        return value

    def validate(self, attrs):
        # When updating, instance may exist; handle that gracefully
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))

        if start and end and start > end:
            raise serializers.ValidationError({"end_date": "End date must be the same or after start date."})
        return super().validate(attrs)


class ProjectStatusSerializer(serializers.ModelSerializer):
    """
    ProjectStatus serializer with nested responsibilities and creator details.
    """
    responsibilities = ResponsibilitySerializer(many=True, read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    phase_display = serializers.CharField(source='get_phase_display', read_only=True)

    class Meta:
        model = ProjectStatus
        fields = [
            'id', 'project', 'status_date', 'phase', 'phase_display',
            'notes', 'is_baseline', 'is_final', 'created_by', 'created_by_details',
            'created_at', 'responsibilities'
        ]
        read_only_fields = ['id', 'created_at', 'created_by_details', 'responsibilities', 'phase_display']


class EscalationSerializer(serializers.ModelSerializer):
    """
    Escalation serializer with nested read-only responsibility and user details.
    """
    responsibility_details = ResponsibilitySerializer(source='responsibility', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    resolved_by_details = UserSerializer(source='resolved_by', read_only=True)

    class Meta:
        model = Escalation
        fields = [
            'id', 'responsibility', 'responsibility_details', 'reason',
            'created_by', 'created_by_details', 'created_at',
            'resolved', 'resolved_at', 'resolved_by', 'resolved_by_details'
        ]
        read_only_fields = ['id', 'created_at', 'created_by_details', 'responsibility_details', 'resolved_by_details']


from rest_framework import serializers

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_new_password(self, value):
        # add extra password validators here if needed (e.g. django.contrib.auth.password_validation)
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value