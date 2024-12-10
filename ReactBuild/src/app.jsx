import React, { useEffect, useState } from 'react';
import './main.css'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function App() {
    const [packets, setPackets] = useState([]);
    const [packetCount, setPacketCount] = useState(0);
    const [newPackets, setNewPackets] = useState(0);
    const [monitorEnabled, setMonitorEnabled] = useState(false);
    const [paused, setPaused] = useState(false);
    const [access, setAccess] = useState(false);

    useEffect(() => {
        if(!access){
            const username = localStorage.getItem('username');
            const hashkey = localStorage.getItem('hashkey');
            if (username && hashkey) {
                fetch('/verify/', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({ username: username, hashkey: hashkey })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success === true) {
                        setAccess(true);
                        console.log("data")
                        
                    } else{
                        window.location.replace("/")
                    }
                })
                .catch(error => console.error('Error:', error));
                }
        }

        if(paused){
            return;
        }

        setTimeout(() => {
            fetch('/monitor')
                .then(response => response.json())
                .then(data => setPackets(data.packets))
                .catch(error => console.error('Error fetching packets:', error));

            if(packets.length > 0){
                if(packets.length > packetCount){
                    setNewPackets(packets.length - packetCount);
                    setPacketCount(packets.length);
                }
                setMonitorEnabled(true);
            }else{
                setMonitorEnabled(false)
            }
        }, 1000);
    });

    const handleClear = () => {
        fetch('/clear_monitor');
        setPackets([]);
        setPacketCount(0);
        setNewPackets(0);
        if(!paused){
            setPaused(true);
            setTimeout(() => {
                setPacketCount(0);
                setPaused(false);
            }, 5000);
        }
    }

    const handlePause = () => {
        setPaused(!paused);
        fetch('/pause_monitor');
    }

    const data = [
        { name: 'TCP', value: packets.filter(packet => packet.proto === 'TCP').length + 1},
        { name: 'UDP', value: packets.filter(packet => packet.proto === 'UDP').length + 1 },
        { name: 'ARP', value: packets.filter(packet => packet.proto === 'ARP').length + 1 },
        { name: 'Other', value: packets.filter(packet => packet.proto === 'Ethernet').length + 1}
    ]

    const colours = [
        '#0088FE',
        '#00C49F',
        '#FFBB28',
        '#FF8042'
    ]

    return (
        <div>
            <h1>Monitor {monitorEnabled ? "Online" : "Offline"}</h1>
            <button id="pauseButton" onClick={handlePause}>{paused ? "Unpause" : "Pause"} Monitor</button>
            <button id="clearButton" onClick={handleClear}>Clear Data</button>
            <div className='stats'>
                <div>
                    <h3>Packets per minute</h3>
                    <p>{monitorEnabled ? newPackets : 0}</p>
                </div>
                <div>
                    <h3>Total packets</h3>
                    <p>{monitorEnabled ? packetCount : 0}</p>
                </div>
                <div>
                    <h3>TCP packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'TCP').length : 0}</p>
                </div>
                <div>
                    <h3>UDP packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'UDP').length : 0}</p>
                </div>
                <div>
                    <h3>ARP packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'ARP').length : 0}</p>
                </div>
                <div>
                    <h3>Other packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'Ethernet').length : 0}</p>
                </div>
            </div>
            <div>
                <div></div>
                <div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie dataKey="value" isAnimationActive={true} data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={80} fill="#8884d8" label >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colours[index % colours.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <ul>
                {monitorEnabled ?
                    packets.slice().reverse().map((packet, index) => (
                        <li key={index}>
                            {packet.src} - {packet.sport} - {packet.dst} - {packet.dport} - {packet.proto}
                        </li>
                    ))
                    :
                    "no items"
                }
            </ul>
        </div>
    );
}

export default App;
