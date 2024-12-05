from django.db import models

# Create your models here.
class Packet(models.Model):
    src = models.CharField(max_length=255)
    dst = models.CharField(max_length=255)
    sport = models.IntegerField(default=0)
    dport = models.IntegerField(default=0)
    proto = models.CharField(max_length=50)