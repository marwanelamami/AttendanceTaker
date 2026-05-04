/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { AudioSender, AudioReceiver, ReceiveEvent } from './lib/modem';
import { Users, User, Radio, Mic, CheckCircle2, ChevronLeft, Laptop, Smartphone, MapPin } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {role && (
              <button 
                onClick={() => setRole(null)} 
                className="mr-2 p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-400" />
              </button>
            )}
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <MapPin size={20} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-white leading-tight">Proximity Verify</h1>
              <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase opacity-80">AirDrop Attendance</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {!role && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto space-y-6">
            <div className="text-center mb-10 space-y-3">
              <h2 className="text-3xl font-bold text-white tracking-tight">Select your role</h2>
              <p className="text-slate-400">Join a class or start verifying attendance using physical proximity via ultrasonic sound.</p>
            </div>
            
            <button 
              onClick={() => setRole('teacher')}
              className="w-full bg-slate-900 border border-white/10 hover:border-indigo-500/50 p-6 rounded-2xl flex items-center gap-6 group transition-all hover:bg-slate-800/80 shadow-lg"
            >
              <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Laptop size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white mb-1">I am a Teacher</h3>
                <p className="text-sm text-slate-400">Broadcast your classroom beacon to verify student attendance nearby.</p>
              </div>
            </button>

            <button 
              onClick={() => setRole('student')}
              className="w-full bg-slate-900 border border-white/10 hover:border-cyan-500/50 p-6 rounded-2xl flex items-center gap-6 group transition-all hover:bg-slate-800/80 shadow-lg"
            >
              <div className="w-16 h-16 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Smartphone size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white mb-1">I am a Student</h3>
                <p className="text-sm text-slate-400">Scan for your professor's nearby device to prove you are in the classroom.</p>
              </div>
            </button>
          </div>
        )}

        {role === 'teacher' && <TeacherMode />}
        {role === 'student' && <StudentMode />}
      </main>
    </div>
  );
}

function TeacherMode() {
  const [classCode, setClassCode] = useState("CS50");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const audioContextReady = useRef(false);
  
  useEffect(() => {
    let active = true;
    let timeout: any;
    
    const broadcastLoop = async () => {
      if (!active) return;
      try {
        const sender = new AudioSender();
        // Send a clean padded command string
        await sender.send(`+${classCode.padEnd(4, ' ')}+`);
      } catch (e) {
         console.error("Broadcast failed", e);
      }
      
      if (active) {
        // Wait 1.5 seconds between pings so students can lock on
        timeout = setTimeout(broadcastLoop, 1500);
      }
    };

    if (isBroadcasting) {
      broadcastLoop();
    }
    
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isBroadcasting, classCode]);

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-2xl font-bold text-white">Teacher Dashboard</h2>
        <p className="text-slate-400 text-sm">Your device will act as a proximity beacon.</p>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Radar Effect Background when broadcasting */}
        {isBroadcasting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <div className="w-64 h-64 rounded-full border-[2px] border-indigo-500 animate-[ping_3s_linear_infinite]" />
             <div className="absolute w-96 h-96 rounded-full border border-indigo-500 animate-[ping_3s_linear_infinite_1s]" />
             <div className="absolute w-[32rem] h-[32rem] rounded-full border border-indigo-500 animate-[ping_3s_linear_infinite_2s]" />
          </div>
        )}

        <div className="relative z-10 space-y-8">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 text-center">Enter Class Code (Max 4 characters)</label>
            <input 
              type="text"
              value={classCode}
              maxLength={4}
              onChange={e => setClassCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              className="w-full max-w-[200px] mx-auto block bg-slate-950 border border-slate-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 rounded-xl p-4 text-center text-3xl text-indigo-400 font-mono font-bold transition-all outline-none"
              disabled={isBroadcasting}
            />
          </div>
          
          <button 
            onClick={() => setIsBroadcasting(!isBroadcasting)}
            disabled={!classCode}
            className={`w-full relative overflow-hidden flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg transition-all 
              ${isBroadcasting 
                ? 'bg-slate-800 text-red-400 border border-red-900/50 hover:bg-slate-700' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)]'}`}
          >
            {isBroadcasting ? (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span>Stop Broadcasting</span>
              </>
            ) : (
              <>
                <Radio size={24} />
                <span>Make Discoverable</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-5 text-sm text-indigo-200/80">
        <strong className="text-indigo-400 block mb-1">How it works:</strong>
        <p>This broadcasts a high-frequency (ultrasonic) invisible pulse from your speakers. Students must be physically in the same room to receive it on their phones, mimicking an AirDrop discovery.</p>
        <p className="mt-2 opacity-70">Make sure your laptop speakers are unmuted and moderately loud.</p>
      </div>
    </div>
  );
}

function StudentMode() {
  const [isScanning, setIsScanning] = useState(false);
  const [foundClass, setFoundClass] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [statusText, setStatusText] = useState("Turn up volume & allow microphone.");
  
  const receiverRef = useRef<AudioReceiver | null>(null);

  const startScanning = async () => {
    setIsScanning(true);
    setFoundClass(null);
    setIsConfirmed(false);
    setStatusText("Scanning nearby devices...");
    
    try {
      const receiver = new AudioReceiver();
      receiverRef.current = receiver;
      
      await receiver.start((event: ReceiveEvent) => {
        if (event.type === 'receiving') {
           setStatusText("Incoming signal detected...");
        } else if (event.type === 'complete') {
           let decoded = event.text.replace(/[^A-Z0-9+]/g, '');
           
           // We padded our broadcast with + to prevent noise errors
           // e.g. "+CS50+"
           if (decoded.includes('+')) {
              const parts = decoded.split('+');
              const code = parts[1] || parts[0]; // naive extraction
              if (code && code.trim().length > 0) {
                 setFoundClass(code.trim());
                 setStatusText("Classroom device found!");
                 receiver.stop(); // Stop scanning once found
                 setIsScanning(false);
              }
           } else {
             setStatusText("Scanning nearby devices..."); // keep scanning
           }
        }
      });
    } catch (e) {
      console.error(e);
      setStatusText("Microphone permission denied.");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    receiverRef.current?.stop();
    setIsScanning(false);
    setStatusText("Scanning cancelled.");
  };

  useEffect(() => {
    return () => receiverRef.current?.stop();
  }, []);

  const handleConfirm = () => {
    // In a real app, this sends a POST to your database
    setIsConfirmed(true);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-2xl font-bold text-white">Student Check-in</h2>
        <p className="text-slate-400 text-sm">{statusText}</p>
      </div>

      <div className="relative min-h-[400px] bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
        
        {/* Radar UI */}
        {isScanning && !foundClass && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="w-32 h-32 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-[ping_2s_ease-out_infinite]" />
            <div className="absolute w-64 h-64 rounded-full bg-cyan-500/5 border border-cyan-500/20 animate-[ping_2s_ease-out_infinite_0.5s]" />
            <div className="absolute w-96 h-96 rounded-full border border-cyan-500/10 animate-[ping_2s_ease-out_infinite_1s]" />
            <div className="absolute w-[32rem] h-[32rem] rounded-full border border-cyan-500/5 animate-[ping_2s_ease-out_infinite_1.5s]" />
            
            <div className="relative z-10 w-20 h-20 bg-slate-800 rounded-full border border-cyan-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
               <Smartphone size={32} className="text-cyan-400 animate-pulse" />
            </div>
          </div>
        )}

        {/* Found a Device! */}
        {foundClass && !isConfirmed && (
          <div className="animate-in zoom-in-95 duration-300 w-full relative z-10 flex flex-col items-center">
             <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl mb-6 ring-4 ring-indigo-500/30">
               <Laptop size={40} className="text-white" />
             </div>
             
             <h3 className="text-base font-medium text-slate-400 mb-1">Teacher's Device Found</h3>
             <p className="text-3xl font-bold text-white font-mono tracking-widest mb-8">{foundClass}</p>

             <button 
               onClick={handleConfirm}
               className="w-full max-w-sm bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
             >
               Tap to Record Attendance
             </button>
          </div>
        )}

        {/* Success */}
        {isConfirmed && (
          <div className="animate-in zoom-in-95 duration-500 relative z-10 flex flex-col items-center">
             <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
               <CheckCircle2 size={64} className="text-emerald-400" />
             </div>
             <h3 className="text-2xl font-bold text-white mb-2">You're Checked In</h3>
             <p className="text-slate-400">Your physical presence in {foundClass} has been verified.</p>
          </div>
        )}

        {/* Initial / Default States */}
        {!isScanning && !foundClass && !isConfirmed && (
          <div className="w-full flex flex-col items-center justify-center relative z-10">
             <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-8 border border-white/5">
                <Mic size={36} className="text-slate-500" />
             </div>
             <button 
               onClick={startScanning}
               className="w-full max-w-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-transform active:scale-95"
             >
               Scan for Classroom
             </button>
             <p className="text-xs text-slate-500 mt-6 text-center max-w-xs">
               Uses inaudible ultrasonic sound from the professor's device to verify you are currently in the room.
             </p>
          </div>
        )}

        {isScanning && !foundClass && (
          <button 
            onClick={stopScanning}
            className="absolute bottom-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium z-20 border border-white/10 transition-colors"
          >
            Cancel Scan
          </button>
        )}
      </div>
    </div>
  );
}


