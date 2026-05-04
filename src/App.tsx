import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, MapPin, CheckCircle2, Radar, User, Radio, Smartphone, AlertTriangle, Users, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signIn, logOut, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, doc, setDoc, updateDoc, 
  serverTimestamp, deleteDoc 
} from 'firebase/firestore';

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
  ownerId: string;
  active: boolean;
  updatedAt: any;
}

interface CheckInRequest {
  id: string;
  beaconId: string;
  studentId: string;
  studentName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function App() {
  const [role, setRole] = useState<'beacon' | 'student' | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Radar className="text-indigo-500 animate-pulse" size={48} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
         <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center backdrop-blur-xl">
           <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Radar size={40} />
           </div>
           <h1 className="text-3xl font-bold text-white mb-2">DropSync</h1>
           <p className="text-slate-400 mb-8">Production-grade event proximity and attendance Network, powered by Firebase.</p>
           
           <button 
             onClick={signIn}
             className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-3"
           >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#4CAF50" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBC02D" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#E53935" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
             </svg>
             Continue with Google
           </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden relative">
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
          
          <button onClick={logOut} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
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
                    Automatically discover nearby event beacons and check in securely.
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
                    <p className="text-sm text-slate-400 leading-relaxed max-w-[250px] mx-auto">Act as a discovery node for a specific zone (e.g. Main Stage).</p>
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
                    <p className="text-sm text-slate-400 leading-relaxed max-w-[250px] mx-auto">Open your radar to discover nearby zones and check in.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {role === 'beacon' && <BeaconMode key="beacon" user={currentUser} />}
          {role === 'student' && <StudentMode key="student" user={currentUser} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BeaconMode({ user }: { user: any }) {
  const [beaconName, setBeaconName] = useState("Main Stage");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRequest[]>([]);
  const beaconId = user.uid; // One beacon per user for simplicity

  useEffect(() => {
    if (!isBroadcasting) return;

    // Listen to checkIns
    const path = `beacons/${beaconId}/checkIns`;
    const q = query(collection(db, path));
    const unsub = onSnapshot(q, (snapshot) => {
       const results: CheckInRequest[] = [];
       snapshot.forEach(doc => {
         results.push({ id: doc.id, ...doc.data() } as CheckInRequest);
       });
       setCheckIns(results);
    }, (err) => {
       handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsub();
  }, [isBroadcasting, beaconId]);

  useEffect(() => {
    let interval: any;
    if (isBroadcasting) {
      const updateBeacon = async () => {
         try {
           const path = `beacons/${beaconId}`;
           await updateDoc(doc(db, path), {
             updatedAt: serverTimestamp()
           });
         } catch(e) {
           handleFirestoreError(e, OperationType.UPDATE, `beacons/${beaconId}`);
         }
      };
      
      // Ping every 5 seconds to keep it "active" to clients
      interval = setInterval(updateBeacon, 5000);
    }
    return () => clearInterval(interval);
  }, [isBroadcasting, beaconId]);

  const toggleBroadcast = async () => {
    if (!isBroadcasting) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
           setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
           try {
             await setDoc(doc(db, `beacons/${beaconId}`), {
               name: beaconName,
               lat: pos.coords.latitude,
               lng: pos.coords.longitude,
               ownerId: user.uid,
               active: true,
               createdAt: serverTimestamp(),
               updatedAt: serverTimestamp()
             });
             setIsBroadcasting(true);
           } catch (e) {
             handleFirestoreError(e, OperationType.CREATE, `beacons/${beaconId}`);
           }
        },
        (err) => {
           console.error("Geo error, using mock coords", err);
           alert("Please enable location services to start a beacon.");
        }
      );
    } else {
      setIsBroadcasting(false);
      try {
        await deleteDoc(doc(db, `beacons/${beaconId}`));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `beacons/${beaconId}`);
      }
    }
  };
  
  useEffect(() => {
    return () => {
       if (isBroadcasting) {
          deleteDoc(doc(db, `beacons/${beaconId}`)).catch(()=> {});
       }
    };
  }, [isBroadcasting, beaconId]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="m-auto w-full max-w-3xl grid md:grid-cols-2 gap-8 px-4"
    >
      <div className="flex flex-col items-center justify-center space-y-8 bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md relative overflow-hidden">
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
            {isBroadcasting ? 'Stop Ping' : 'Start Station'}
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
              {checkIns.map((ci) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={ci.id} 
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

function StudentMode({ user }: { user: any }) {
  const [studentInfo, setStudentInfo] = useState({ name: user.displayName || 'Jane Doe', id: 'STU' + Math.floor(Math.random() * 9000 + 1000) });
  const [isScanning, setIsScanning] = useState(false);
  const [beacons, setBeacons] = useState<Map<string, BeaconNode>>(new Map());
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [selectedBeacon, setSelectedBeacon] = useState<BeaconNode | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkedInBeacons, setCheckedInBeacons] = useState<string[]>([]);

  useEffect(() => {
    if (!isScanning) return;
    
    // Query active beacons
    const q = query(collection(db, 'beacons'), where("active", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
       setBeacons(prev => {
          const map = new Map(prev);
          snapshot.docs.forEach(doc => {
            const data = doc.data() as BeaconNode;
            data.id = doc.id;
            map.set(doc.id, data);
          });
          // Remove deleted ones
          snapshot.docChanges().forEach(change => {
            if (change.type === 'removed') {
              map.delete(change.doc.id);
            }
          });
          return map;
       });
    }, (err) => {
       handleFirestoreError(err, OperationType.LIST, 'beacons');
    });

    return () => unsub();
  }, [isScanning]);

  const handleStartScan = () => {
    if (!studentInfo.name.trim()) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
         console.error("Geo error");
         alert("Location is required to verify your proximity.");
      }
    );
    setIsScanning(true);
  };

  const handleTapNode = (beacon: BeaconNode) => {
    if (checkedInBeacons.includes(beacon.id)) return;
    setSelectedBeacon(beacon);
  };

  const confirmCheckIn = async () => {
    if (!selectedBeacon || !coords) return;
    setIsCheckingIn(true);
    
    try {
      const checkInId = `${user.uid}_${Date.now()}`;
      const path = `beacons/${selectedBeacon.id}/checkIns/${checkInId}`;
      await setDoc(doc(db, path), {
        studentId: studentInfo.id,
        studentName: studentInfo.name,
        studentUid: user.uid,
        userLat: coords.lat,
        userLng: coords.lng,
        beaconOwnerId: selectedBeacon.ownerId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      setCheckedInBeacons(prev => [...prev, selectedBeacon.id]);
      setSelectedBeacon(null);
    } catch(e) {
      handleFirestoreError(e, OperationType.CREATE, `beacons/${selectedBeacon.id}/checkIns`);
    } finally {
      setIsCheckingIn(false);
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
                maxLength={100}
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
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[10vh] h-[10vh] rounded-full border border-cyan-500/10" />
        <div className="absolute w-[30vh] h-[30vh] rounded-full border border-cyan-500/20 shadow-[inset_0_0_50px_rgba(6,182,212,0.05)]" />
        <div className="absolute w-[60vh] h-[60vh] rounded-full border border-cyan-500/10" />
        <div className="absolute w-[90vh] h-[90vh] rounded-full border border-cyan-500/5" />
        
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, ease: "linear", repeat: Infinity }}
          className="absolute w-[90vh] h-[90vh] rounded-full origin-center"
          style={{ background: 'conic-gradient(from 0deg, transparent 75%, rgba(6,182,212,0.15) 100%)' }}
        />
      </div>

      <div className="relative z-10 w-24 h-24 bg-slate-900 border border-cyan-500/50 rounded-full flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
        <User size={32} className="text-cyan-400" />
        <span className="absolute -bottom-8 whitespace-nowrap text-xs font-bold text-slate-300 px-3 py-1 bg-black/60 rounded-full backdrop-blur-md">
           {studentInfo.name}
        </span>
      </div>

      <AnimatePresence>
        {Array.from(beacons.values()).map((beacon) => {
           // We filter out stale beacons visually if their updatedAt is old, but firestore handles active=true mostly
           // For realism, let distance dictate ring layer
           let dist = 100;
           if (coords) {
             dist = getDistance(coords.lat, coords.lng, beacon.lat, beacon.lng);
           }
           
           const hash = Array.from(beacon.name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
           const angle = (hash * 47) % 360;
           
           // If far away, put on outer ring, etc.
           let radiusStr = `30vh`;
           if (dist < 10) radiusStr = `15vh`;
           if (dist > 50) radiusStr = `45vh`;
           
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
                    style={{ rotate: -angle }}
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
      
      <div className="absolute top-6 flex flex-col items-center z-20">
        <span className="text-slate-400 text-sm font-medium animate-pulse mb-1">Scanning event space...</span>
        <span className="text-blue-400 text-xs font-mono bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
           {beacons.size} beacon{beacons.size !== 1 ? 's' : ''} found
        </span>
      </div>
      
    </div>
  );
}
