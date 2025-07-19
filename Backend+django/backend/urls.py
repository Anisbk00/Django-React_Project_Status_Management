from django.contrib import admin
from django.urls import path,include
from api.views import CreateUserView, EscalationViewSet, UserViewSet
from rest_framework.routers import DefaultRouter
from api.views import ProjectViewSet, ProjectStatusViewSet, ResponsibilityViewSet
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView
from api.views import ReportingViewSet,ProjectViewSet, ProjectStatusViewSet, ResponsibilityViewSet, EscalationViewSet,UserViewSet,ReportingViewSet
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions


schema_view=get_schema_view(openapi.Info(
    title="Project Status API",
    default_version='v1',
    description="API for project status tracking system"

    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)



router =DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'status', ProjectStatusViewSet)
router.register(r'responsibilities', ResponsibilityViewSet)
router.register(r'escalations', EscalationViewSet)
router.register(r'users', UserViewSet)
router.register(r'reports', ReportingViewSet, basename='report')
urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', CreateUserView.as_view(), name='user-register'),
    path("api/user/register/",CreateUserView.as_view(),name="register"),

    #JWT TOKENS
    path("api/token/",TokenObtainPairView.as_view(),name="token_obtain_pair"),
    path("api/token/refresh/",TokenRefreshView.as_view(),name="token_refresh"),
    path('api/auth/', include('rest_framework.urls', namespace='rest_framework')),

    #API endpoints
    path('api/', include(router.urls)),

    #drf_yasg docs for the front-end
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

]
