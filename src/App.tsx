/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, MapPin, CheckCircle2, Radar, User, Radio, Smartphone, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CHANNEL_NAME = 'airdrop_attendance_channel';

// Haversine distance formula (returns distance in meters)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

interface BeaconNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  timestamp: number;
}

interface CheckInRequest {
  beaconId: string;
  studentId: string;
  studentName: string;
}

export default function App() {
  const [role, setRole] = useState<'beacon' | 'student' | null>(null);
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none" />

      <header className="relative z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {role && (
              <button 
                onClick={() => setRole(null)} 
                className="mr-2 p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                title="Go Back"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Radar size={22} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-white leading-tight">DropSync</h1>
              <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-semibold text-opacity-80">Proximity Network</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
        <AnimatePresence mode="wait">
          {!role && (
            <motion.div 
              key="role-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="m-auto w-full max-w-3xl px-4 py-8"
            >
              <div className="text-center mb-12 space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Event Proximity</h2>
                <p className="text-slate-400 text-lg max-w-xl mx-auto">
                  Automatically discover nearby event beacons and check in instantly, just like AirDrop. Works cross-device.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <button 
                  onClick={() => setRole('beacon')}
                  className="bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 p-8 rounded-[2rem] flex flex-col items-center text-center gap-6 group transition-all backdrop-blur-sm"
                >
                  <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <Radio size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">Setup Beacon</h3>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-[250px] mx-auto">Act as a discovery node for a specific zone (e.g. VIP Entrance, Main Stage).</p>
                  </div>
                </button>

                <button 
                  onClick={() => setRole('student')}
                  className="bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 p-8 rounded-[2rem] flex flex-col items-center text-center gap-6 group transition-all backdrop-blur-sm"
                >
                  <div className="w-20 h-20 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    <Smartphone size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">Attendee Radar</h3>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-[250px] mx-auto">Open your radar to discover nearby zones and verify your presence.</p>
                  </div>
                </button>
              </div>
              
              <div className="mt-12 text-center">
                <p className="text-xs text-slate-500 font-mono tracking-wide uppercase">
                  Tip: Open this app in two tabs side-by-side to test the AirDrop effect!
                </p>
              </div>
            </motion.div>
          )}

          {role === 'beacon' && <BeaconMode key="beacon" />}
          {role === 'student' && <StudentMode key="student" />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BeaconMode() {
  const [beaconName, setBeaconName] = useState("Main Stage");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRequest[]>([]);
  
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    
    channelRef.current.onmessage = (event) => {
      if (event.data.type === 'CHECK_IN' && event.data.beaconId === beaconName) {
        setCheckIns(prev => [event.data, ...prev]);
        // Send ACK
        setTimeout(() => {
          channelRef.current?.postMessage({
            type: 'CHECK_IN_ACK',
            studentId: event.data.studentId,
            beaconId: beaconName
          });
        }, 500);
      }
    };

    return () => {
      channelRef.current?.close();
    };
  }, [beaconName]);

  useEffect(() => {
    let interval: any;
    if (isBroadcasting) {
      // Announce heartbeat
      interval = setInterval(() => {
        channelRef.current?.postMessage({
          type: 'BEACON_ANNOUNCE',
          id: beaconName, // using name as ID for demo
          name: beaconName,
          lat: coords?.lat || 0,
          lng: coords?.lng || 0,
          timestamp: Date.now()
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isBroadcasting, beaconName, coords]);

  const toggleBroadcast = () => {
    if (!isBroadcasting) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Geo error, using mock coords", err)
      );
    }
    setIsBroadcasting(!isBroadcasting);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="m-auto w-full max-w-3xl grid md:grid-cols-2 gap-8 px-4"
    >
      <div className="flex flex-col items-center justify-center space-y-8 bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md relative overflow-hidden">
        {/* Radar Ping Background */}
        {isBroadcasting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
             <div className="w-[200%] aspect-square rounded-full border border-indigo-500/50 animate-[ping_4s_linear_infinite]" />
             <div className="absolute w-[150%] aspect-square rounded-full border border-indigo-500/40 animate-[ping_4s_linear_infinite_1s]" />
          </div>
        )}

        <div className="relative z-10 w-full">
          <label className="block text-sm font-semibold text-slate-400 mb-2 text-center">Zone/Beacon Name</label>
          <input 
            type="text"
            value={beaconName}
            onChange={e => setBeaconName(e.target.value)}
            className="w-full bg-black/50 border border-white/10 focus:border-indigo-500/50 rounded-2xl p-4 text-center text-2xl text-white font-bold transition-all outline-none"
            disabled={isBroadcasting}
          />
        </div>
        
        <button 
          onClick={toggleBroadcast}
          className={`relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-500 
            ${isBroadcasting 
              ? 'bg-rose-500/20 text-rose-400 border-[8px] border-rose-500/30' 
              : 'bg-indigo-500 text-white border-[8px] border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-105'}`}
        >
          <Radio size={48} className={isBroadcasting ? "animate-pulse" : ""} />
          <span className="font-bold tracking-wider uppercase text-sm">
            {isBroadcasting ? 'Stop Ping' : 'Simulate Station'}
          </span>
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md flex flex-col h-[500px]">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Users className="text-indigo-400" />
          Recent Connections ({checkIns.length})
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {checkIns.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
               <Radar size={40} className="mb-4 opacity-50" />
               <p>Waiting for attendees...</p>
            </div>
          ) : (
            <AnimatePresence>
              {checkIns.map((ci, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white leading-tight">{ci.studentName}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">ID: {ci.studentId}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StudentMode() {
  const [studentInfo, setStudentInfo] = useState({ name: 'Jane Doe', id: 'STU' + Math.floor(Math.random() * 9000 + 1000) });
  const [isScanning, setIsScanning] = useState(false);
  const [beacons, setBeacons] = useState<Map<string, BeaconNode>>(new Map());
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [selectedBeacon, setSelectedBeacon] = useState<BeaconNode | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkedInBeacons, setCheckedInBeacons] = useState<string[]>([]);

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    
    channelRef.current.onmessage = (event) => {
      // 1. Listen for heartbeats
      if (event.data.type === 'BEACON_ANNOUNCE') {
         setBeacons(prev => {
           const map = new Map(prev);
           map.set(event.data.id, event.data as BeaconNode);
           return map;
         });
      }
      
      // 2. Listen for Check-In ACKs
      if (event.data.type === 'CHECK_IN_ACK' && event.data.studentId === studentInfo.id) {
         setIsCheckingIn(false);
         setCheckedInBeacons(prev => [...prev, event.data.beaconId]);
         setSelectedBeacon(null);
      }
    };

    return () => {
      channelRef.current?.close();
    };
  }, [studentInfo.id]);

  useEffect(() => {
    if (!isScanning) return;
    
    // Inject a fake demo beacon if nothing is found after 4s to ensure the UI can be tested easily by 1 person
    const demoTimer = setTimeout(() => {
      setBeacons(prev => {
         if (prev.size === 0) {
           const map = new Map(prev);
           map.set('mock', { id: 'mock', name: 'VIP Lounge (Demo)', lat: 0, lng: 0, timestamp: Date.now() });
           return map;
         }
         return prev;
      });
    }, 4000);

    // Garbage collect stale beacons
    const gcInterval = setInterval(() => {
      const now = Date.now();
      setBeacons(prev => {
        const map = new Map(prev);
        let changed = false;
        map.forEach((value, key) => {
          if (now - value.timestamp > 8000 && key !== 'mock') { // keep mock alive longer for demo
            map.delete(key);
            changed = true;
          }
        });
        return changed ? map : prev;
      });
    }, 2000);

    return () => {
      clearTimeout(demoTimer);
      clearInterval(gcInterval);
    };
  }, [isScanning]);

  const handleStartScan = () => {
    if (!studentInfo.name.trim()) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.log("Geo error")
    );
    setIsScanning(true);
  };

  const handleTapNode = (beacon: BeaconNode) => {
    if (checkedInBeacons.includes(beacon.id)) return;
    setSelectedBeacon(beacon);
  };

  const confirmCheckIn = () => {
    if (!selectedBeacon) return;
    setIsCheckingIn(true);
    
    // Send check-in payload
    channelRef.current?.postMessage({
      type: 'CHECK_IN',
      beaconId: selectedBeacon.id,
      studentId: studentInfo.id,
      studentName: studentInfo.name,
      userLat: coords?.lat,
      userLng: coords?.lng
    });
    
    // Fallback success for the demo mock beacon
    if (selectedBeacon.id === 'mock') {
      setTimeout(() => {
        setIsCheckingIn(false);
        setCheckedInBeacons(prev => [...prev, selectedBeacon.id]);
        setSelectedBeacon(null);
      }, 1000);
    }
  };

  if (!isScanning) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="m-auto w-full max-w-sm bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl"
      >
         <h2 className="text-2xl font-bold text-center mb-8">Your Identity</h2>
         <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2">Display Name</label>
              <input 
                type="text"
                value={studentInfo.name}
                onChange={e => setStudentInfo({...studentInfo, name: e.target.value})}
                className="w-full bg-black/50 border border-white/10 focus:border-cyan-500/50 rounded-xl p-4 text-white font-medium outline-none transition-colors"
              />
            </div>
            
            <button 
              onClick={handleStartScan}
              disabled={!studentInfo.name}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all active:scale-95"
            >
              Open Radar
            </button>
         </div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Radar Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[10vh] h-[10vh] rounded-full border border-cyan-500/10" />
        <div className="absolute w-[30vh] h-[30vh] rounded-full border border-cyan-500/20 shadow-[inset_0_0_50px_rgba(6,182,212,0.05)]" />
        <div className="absolute w-[60vh] h-[60vh] rounded-full border border-cyan-500/10" />
        <div className="absolute w-[90vh] h-[90vh] rounded-full border border-cyan-500/5" />
        
        {/* Sweep effect */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, ease: "linear", repeat: Infinity }}
          className="absolute w-[90vh] h-[90vh] rounded-full origin-center"
          style={{ background: 'conic-gradient(from 0deg, transparent 75%, rgba(6,182,212,0.15) 100%)' }}
        />
      </div>

      {/* Center Device Profile */}
      <div className="relative z-10 w-24 h-24 bg-slate-900 border border-cyan-500/50 rounded-full flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
        <User size={32} className="text-cyan-400" />
        <span className="absolute -bottom-8 whitespace-nowrap text-xs font-bold text-slate-300 px-3 py-1 bg-black/60 rounded-full backdrop-blur-md">
           {studentInfo.name}
        </span>
      </div>

      {/* Discovered Beacons mapped onto the radar */}
      <AnimatePresence>
        {Array.from(beacons.values()).map((beacon, idx) => {
           // Create a completely stable deterministic pseudo-random angle based on beacon name
           const hash = Array.from(beacon.name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
           const angle = (hash * 47) % 360;
           const radiusStr = `30vh`; // Place them on the middle ring
           
           const isCheckedIn = checkedInBeacons.includes(beacon.id);

           return (
             <motion.div
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1, opacity: 1, rotate: angle }}
               exit={{ scale: 0, opacity: 0 }}
               key={beacon.id}
               className="absolute w-0 h-0 flex items-center justify-center z-20"
             >
                <div 
                  className="absolute" 
                  style={{ transform: `translateY(-${radiusStr})` }}
                >
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTapNode(beacon)}
                    style={{ rotate: -angle }} // counter-rotate so it stays upright
                    className="flex flex-col items-center group cursor-pointer"
                  >
                     <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-2 transition-colors duration-300
                       ${isCheckedIn 
                         ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' 
                         : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/40 hover:border-indigo-400'}`}
                     >
                        {isCheckedIn ? <CheckCircle2 size={28} /> : <MapPin size={28} />}
                     </div>
                     <span className="mt-2 text-sm font-semibold text-white px-3 py-1 bg-black/40 rounded-full backdrop-blur-md whitespace-nowrap border border-white/5">
                        {beacon.name}
                     </span>
                  </motion.button>
                </div>
             </motion.div>
           );
        })}
      </AnimatePresence>

      {/* Selection Modal Bottom Sheet */}
      <AnimatePresence>
        {selectedBeacon && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-6 w-full max-w-sm z-50 px-4"
          >
            <div className="bg-slate-800/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-4">
                  <MapPin size={32} />
               </div>
               <h3 className="text-xl font-bold mb-1">{selectedBeacon.name}</h3>
               <p className="text-sm border border-slate-700 bg-slate-900 px-3 py-1 rounded-full text-slate-400 font-mono mb-6">
                 ~ {coords ? Math.round(getDistance(coords.lat, coords.lng, selectedBeacon.lat, selectedBeacon.lng)) : '< 20'} meters away
               </p>

               <div className="w-full flex gap-3">
                 <button 
                   onClick={() => setSelectedBeacon(null)}
                   disabled={isCheckingIn}
                   className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmCheckIn}
                   disabled={isCheckingIn}
                   className="flex-[2] flex items-center justify-center px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {isCheckingIn ? 'Connecting...' : 'Request Check-In'}
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Status */}
      <div className="absolute top-6 flex flex-col items-center z-20">
        <span className="text-slate-400 text-sm font-medium animate-pulse mb-1">Scanning event space...</span>
        <span className="text-blue-400 text-xs font-mono bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
           {beacons.size} beacon{beacons.size !== 1 ? 's' : ''} found
        </span>
      </div>
      
    </div>
  );
}




