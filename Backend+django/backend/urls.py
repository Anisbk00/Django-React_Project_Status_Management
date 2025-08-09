from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from api.views import ApiRootView

from api.views import (
    CreateUserView,
    ProjectViewSet,
    ProjectStatusViewSet,
    ResponsibilityViewSet,
    EscalationViewSet,
    UserViewSet,
    ReportingViewSet,
)

schema_view = get_schema_view(
    openapi.Info(
        title="Project Status API",
        default_version='v1',
        description="API for project status tracking system",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'status', ProjectStatusViewSet)
router.register(r'responsibilities', ResponsibilityViewSet)
router.register(r'escalations', EscalationViewSet)
router.register(r'users', UserViewSet)
router.register(r'reports', ReportingViewSet, basename='report')


urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path('admin/', admin.site.urls),
    path('api/register/', CreateUserView.as_view(), name='user-register'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/', include(router.urls)),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
