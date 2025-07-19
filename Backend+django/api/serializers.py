from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Project, ProjectStatus, Responsibility, Escalation
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'role', 'phone', 'department', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)

class ProjectSerializer(serializers.ModelSerializer):
    manager_details = UserSerializer(source='manager', read_only=True)
    progress = serializers.ReadOnlyField()
    
    class Meta:
        model = Project
        fields = '__all__'

class ResponsibilitySerializer(serializers.ModelSerializer):
    responsible_details = UserSerializer(source='responsible', read_only=True)
    deputy_details = UserSerializer(source='deputy', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Responsibility
        fields = '__all__'

class ProjectStatusSerializer(serializers.ModelSerializer):
    responsibilities = ResponsibilitySerializer(many=True, read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    phase_display = serializers.CharField(source='get_phase_display', read_only=True)
    
    class Meta:
        model = ProjectStatus
        fields = '__all__'

class EscalationSerializer(serializers.ModelSerializer):
    responsibility_details = ResponsibilitySerializer(source='responsibility', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    resolved_by_details = UserSerializer(source='resolved_by', read_only=True)
    
    class Meta:
        model = Escalation
        fields = '__all__'