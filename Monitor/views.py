from django.shortcuts import render
from django.http import JsonResponse
from scapy.all import sniff, Ether, IP, TCP, ARP, UDP
from Monitor.models import Packet, User
import threading
import datetime
import json

sniff_event = threading.Event()
sniff_event.set()

def app(request):
    return render(request, 'index.html')

def main(request):
    return render(request, 'monitor.html')

def verify(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        user = User.objects.filter(username=data.get('username'), storedHash=data.get('hashkey'))
        if user:
            return JsonResponse({"success": True, "message": "User authenticated"})
        else:
            return JsonResponse({"success": False, "message": "User not authenticated"})
    except:
        return JsonResponse({"success": False, "message": "Error authenticating user"})

def register(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        user = User.objects.filter(username=data.get('username'))
        if not user:
            newHash = hash(f"{data.get('username')}{data.get('password')}{datetime.datetime.now().strftime('%f')}")
            user = User.objects.create(username=data.get('username'), password=data.get('password'), storedHash=f"{newHash}")
            return JsonResponse({"success": True, "message": "User registered", "hashkey": user.storedHash})
        else:
            return JsonResponse({"success": False, "message": "Username is taken"})
    except:
        return JsonResponse({"success": False, "message": "Error creating user"})

def login(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        user = User.objects.get(username=data.get('username'))
        if user and user.password == data.get('password'):
            newHash = hash(f"{data.get('username')}{data.get('password')}{datetime.datetime.now().strftime('%f')}")
            user.storedHash = f"{newHash}"
            user.save()
            return JsonResponse({"success": True, "message": "Login successful", "hashkey": user.storedHash})
        else:
            return JsonResponse({"success": False, "message": "Login failed"})
    except:
        return JsonResponse({"success": False, "message": "Error authenticating user"})

def clear_monitor(request):
    Packet.objects.all().delete()
    return JsonResponse({"message": "Monitor cleared"})

def pause_monitor(request):
    if sniff_event.is_set():
        sniff_event.clear()
        return JsonResponse({"message": "Monitor paused"})
    else:
        sniff_event.set()
        return JsonResponse({"message": "Monitor resumed"})

def monitor(request):
    if not hasattr(monitor, 'sniff_thread') or not monitor.sniff_thread.is_alive():
        monitor.sniff_thread = threading.Thread(target=start_sniff)
        monitor.sniff_thread.daemon = True
        monitor.sniff_thread.start()

    Packets = Packet.objects.all()
    packet_list = []
    for packet in Packets:
        packet_list.append({
            "src": packet.src,
            "dst": packet.dst,
            "sport": packet.sport,
            "dport": packet.dport,
            "proto": packet.proto,
        })

    return JsonResponse({"packets": packet_list})

def start_sniff():
    sniff(prn=packet_manager, store=0, stop_filter=lambda x: not sniff_event.is_set())

def packet_manager(packet):
    # https://stackoverflow.com/questions/19776807/scapy-how-to-check-packet-type-of-sniffed-packets
        if ARP in packet:
            Packet.objects.create(src = packet[ARP].psrc, dst = packet[ARP].pdst, proto="ARP")
        if IP in packet:
            if TCP in packet:
                Packet.objects.create(src = packet[IP].src, dst = packet[IP].dst, sport = packet[IP].sport, dport = packet[IP].dport, proto="TCP")
            elif UDP in packet:
                Packet.objects.create(src = packet[IP].src, dst = packet[IP].dst, sport = packet[IP].sport, dport = packet[IP].dport, proto="UDP")
        else:
            Packet.objects.create(src = packet[Ether].src, dst = packet[Ether].dst, proto="Ethernet")