from django.urls import path
from . import views

urlpatterns = [
    path("", views.app, name="app"),
    path("main/", views.main, name="main"),
    path("verify/", views.verify, name="verify"),
    path("register/", views.register, name="register"),
    path("login/", views.login, name="login"),
    path("monitor/", views.monitor, name="monitor"),
    path("clear_monitor/", views.clear_monitor, name="clear_monitor"),
    path('pause_monitor/', views.pause_monitor, name='pause_monitor'),
]