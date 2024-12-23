import React, { useEffect, useState } from 'react';
import './main.css'
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

function App() {
    const [packets, setPackets] = useState([]);
    const [packetCount, setPacketCount] = useState(0);
    const [newPackets, setNewPackets] = useState(0);
    const [monitorEnabled, setMonitorEnabled] = useState(false);
    const [paused, setPaused] = useState(true);
    const [access, setAccess] = useState(false);
    const [packetFilter, setPacketFilter] = useState("any");
    const [chartData, setChartData] = useState([]);

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

        const interval = setTimeout(() => {
            fetch('/monitor')
                .then(response => response.json())
                .then(data => setPackets(data.packets))
                .catch(error => console.error('Error fetching packets:', error));

            if(packets.length > 0){
                setNewPackets(0);
                if(packets.length > packetCount && packetCount > 10){
                    setNewPackets(packets.length - packetCount);
                }
                setPacketCount(packets.length);
                setMonitorEnabled(true);
                createData();
            }else{
                setNewPackets(0);
                setMonitorEnabled(false)
            }
        }, 1000);

        return () => clearTimeout(interval);
    }, [packets, packetCount, paused, access]);

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
        setPacketCount(0);
    }

    const handleFilterChange = ({filterType}) => {
        console.log(packetFilter);
        if(filterType !== packetFilter){
            setPacketFilter(filterType);
        } else{
            setPacketFilter("any");
        }
    }

    const handleDownload = () => {
        if(packets.length > 0){
            let packetData = {}
            for(let i = 0; i < packets.length; i++){
                if(packets[i].proto === packetFilter || packetFilter === "any"){
                    packetData[`packet-${i+1}`] = {
                        sourceIP: packets[i].src,
                        sourcePort: packets[i].sport,
                        destinationIP: packets[i].dst,
                        destinationPort: packets[i].dport,
                        protocol: packets[i].proto === "Ethernet" ? "Other" : packets[i].proto
                    }
                }
            }

            const element = document.createElement("a");
            const file = new Blob([JSON.stringify(packetData, null, 2)], {type: 'application/json'});
            element.href = URL.createObjectURL(file);
            element.download = "packet_data.json";
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
        else{
            alert("No data to download");
        }
    }

    const handlePause = () => {
        setPaused(!paused);
        fetch('/pause_monitor');
    }

    const pieData = [
        { name: 'TCP', value: packets.filter(packet => packet.proto === 'TCP').length },
        { name: 'UDP', value: packets.filter(packet => packet.proto === 'UDP').length  },
        { name: 'ARP', value: packets.filter(packet => packet.proto === 'ARP').length },
        { name: 'Other', value: packets.filter(packet => packet.proto === 'Ethernet').length }
    ]

    const createData = () => {
        const newData = {
                time: new Date().toLocaleTimeString(),
                newPackets: newPackets
            }

        setChartData(prevData => {
            const updatedData = [...prevData, newData];
            if(updatedData.length > 10){
                updatedData.shift();
            }
            return updatedData;
        });
    }

    const colours = [
        '#0088FE',
        '#00C49F',
        '#FFBB28',
        '#FF8042'
    ]

    return (
        <div>
            <div style={{display:'flex', justifyContent:"space-between", marginTop:'10px', marginLeft:"10px"}}>
                <h1 style={{transform: 'translateY(-10px)'}}>Monitor {monitorEnabled ? "Online" : "Offline"}</h1>
                <div>
                    <button id="pauseButton" onClick={handlePause}>{paused ? "Start" : "Stop"} Monitor</button>
                    <button id="downloadButton" onClick={handleDownload}>Download{packetFilter === "any" ? "" : packetFilter === "Ethernet" ? " Other" : ` ${packetFilter}`} Data</button>
                    <button id="clearButton" onClick={handleClear}>Clear Data</button>
                </div>
            </div>
            <div className='stats'>
                <div>
                    <h3>Packets per minute</h3>
                    <p>{monitorEnabled ? newPackets : 0}</p>
                </div>
                <div>
                    <h3>Total packets</h3>
                    <p>{monitorEnabled ? packetCount : 0}</p>
                </div>
                <div 
                onClick={() => handleFilterChange({filterType: "TCP"})}
                style={{ backgroundColor: packetFilter === "TCP" ? "#c4c4c4" : "" }}
                    >
                    <h3>TCP packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'TCP').length : 0}</p>
                </div>
                <div 
                onClick={() => handleFilterChange({filterType: "UDP"})}
                style={{ backgroundColor: packetFilter === "UDP" ? "#c4c4c4" : "" }}
                >
                    <h3>UDP packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'UDP').length : 0}</p>
                </div>
                <div 
                onClick={() => handleFilterChange({filterType: "ARP"})}
                style={{ backgroundColor: packetFilter === "ARP" ? "#c4c4c4" : "" }}
                >
                    <h3>ARP packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'ARP').length : 0}</p>
                </div>
                <div 
                onClick={() => handleFilterChange({filterType: "Ethernet"})}
                style={{ backgroundColor: packetFilter === "Ethernet" ? "#c4c4c4" : "" }}
                >
                    <h3>Other packets</h3>
                    <p>{monitorEnabled ? packets.filter(packet => packet.proto === 'Ethernet').length : 0}</p>
                </div>
            </div>
            <div id='Charts'>
                <div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 20, right: 0, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" interval={0} angle={-45} textAnchor='end' />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="newPackets" stroke="#8884d8" fill="#8884d8" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie dataKey="value" isAnimationActive={true} data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} fill="#8884d8" label >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colours[index % colours.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className='feed'>
                <div className='feedTitle'>SRC</div>
                <div className='feedTitle'>SRC PORT</div>
                <div className='feedTitle'>DST</div>
                <div className='feedTitle'>DST PORT</div>
                <div className='feedTitle'>Protocol</div>
                {monitorEnabled ?
                    packets.slice().reverse().map((packet, index) => (
                        (packet.proto === packetFilter || packetFilter === "any") ? 
                            <div className='feedData' key={index}>
                                <div className='srcIP'>{packet.src}</div>
                                <div className='srcPORT'>{packet.sport}</div>
                                <div className='dstIP'>{packet.dst}</div>
                                <div className='dstPORT'>{packet.dport}</div>
                                <div className='proto'>{packet.proto === "Ethernet" ? "Other" : packet.proto}</div>
                            </div>
                        : null
                    ))
                    :
                    "no items"
                }
            </div>
        </div>
    );
}

export default App;
