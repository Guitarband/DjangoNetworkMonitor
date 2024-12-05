from django.shortcuts import render
from django.http import JsonResponse
from scapy.all import sniff, Ether, IP, TCP, ARP, UDP
from Monitor.models import Packet
import threading

sniff_event = threading.Event()
sniff_event.set()

def app(request):
    return render(request, 'monitor.html')

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
    sniff(prn=packet_manager, store=0)

def packet_manager(packet):
    if sniff_event.is_set():
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
    else:
        pass