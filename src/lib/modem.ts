const START_FREQ = 18500;
const FREQ_0 = 19000;
const FREQ_1 = 19500;
const END_FREQ = 20000;
const BIT_DURATION_MS = 100; // Faster 100ms bit duration for quicker AirDrop-style discovery
const BIT_DURATION_SEC = BIT_DURATION_MS / 1000;

export class AudioSender {
  private ctx: AudioContext | null = null;

  async send(text: string) {
    // Convert to binary string
    // Let's frame it: 8 bits per character
    const binary = text.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    
    // Fallback to older webkitAudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    let now = this.ctx.currentTime;
    
    // start bit (longer to sync)
    osc.frequency.setValueAtTime(START_FREQ, now);
    now += BIT_DURATION_SEC * 3;
    
    for (let i = 0; i < binary.length; i++) {
      const bit = binary[i];
      const freq = bit === '0' ? FREQ_0 : FREQ_1;
      
      // We could add a tiny gap between bits so they don't smear, but let's try direct FSK
      osc.frequency.setValueAtTime(freq, now);
      now += BIT_DURATION_SEC;
    }
    
    // end sequence
    osc.frequency.setValueAtTime(END_FREQ, now);
    now += BIT_DURATION_SEC * 2;
    
    // Envelope for stopping to prevent click
    gainNode.gain.setValueAtTime(1, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
    
    osc.start(this.ctx.currentTime);
    osc.stop(now + 0.05);
    
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        if (this.ctx) this.ctx.close();
        resolve();
      }, (now - this.ctx!.currentTime + 0.1) * 1000);
    });
  }
}

export type ReceiveEvent = 
  | { type: 'connecting' }
  | { type: 'receiving', bits: string }
  | { type: 'complete', text: string }
  | { type: 'debug', freq: number, magnitude: number };

export class AudioReceiver {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrame: number | null = null;
  
  async start(onEvent: (event: ReceiveEvent) => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048; 
      
      const source = this.ctx.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      
      // Calculate frequency bins
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      const sampleRate = this.ctx.sampleRate;
      
      type State = 'WAITING' | 'SYNCING' | 'RECEIVING';
      let state: State = 'WAITING';
      
      let syncStartTime = 0;
      let receivingStartTime = 0;
      
      let bits = '';
      
      const loop = () => {
        if (!this.analyser) return;
        this.analyser.getFloatFrequencyData(dataArray);
        
        let maxMag = -Infinity;
        let maxIndex = -1;
        // Search only in our frequency bands of interest (18000Hz to 21000Hz)
        // bin freq = i * sampleRate / fftSize
        const minBin = Math.floor(18000 * this.analyser.fftSize / sampleRate);
        const maxBin = Math.ceil(21000 * this.analyser.fftSize / sampleRate);
        
        for (let i = minBin; i <= maxBin; i++) {
          if (dataArray[i] > maxMag) {
            maxMag = dataArray[i];
            maxIndex = i;
          }
        }
        
        const domFreq = maxIndex * sampleRate / this.analyser.fftSize;
        
        // Use a threshold to ignore background noise
        if (maxMag > -60) {
          onEvent({ type: 'debug', freq: domFreq, magnitude: maxMag });
          
          const now = performance.now();
          
          if (state === 'WAITING') {
            // Check if frequency is close to START_FREQ
            if (Math.abs(domFreq - START_FREQ) < 200) {
              state = 'SYNCING';
              syncStartTime = now;
            }
          } else if (state === 'SYNCING') {
            // Wait for it to drop from START_FREQ
            if (Math.abs(domFreq - START_FREQ) > 300) {
              // It shifted! 
              // Verify we synced for at least a bit amount to avoid false positive
              if (now - syncStartTime > BIT_DURATION_MS * 1.5) {
                state = 'RECEIVING';
                receivingStartTime = now;
                bits = '';
              } else {
                state = 'WAITING';
              }
            }
          } else if (state === 'RECEIVING') {
            // Check if we hit END_FREQ
            if (Math.abs(domFreq - END_FREQ) < 200) {
               state = 'WAITING';
               onEvent({ type: 'complete', text: this.decodeBits(bits) });
            } else {
              // We sample the bit based on time since receiving started
              // We want to sample in the middle of each bit duration
              const timeElapsed = now - receivingStartTime;
              const bitIndex = Math.floor(timeElapsed / BIT_DURATION_MS);
              
              if (bits.length <= bitIndex) {
                 // We are in a new bit window! Wait until we are past 40% of the window to sample.
                 const timeInWindow = timeElapsed % BIT_DURATION_MS;
                 if (timeInWindow > BIT_DURATION_MS * 0.4) {
                    const is0 = Math.abs(domFreq - FREQ_0) < Math.abs(domFreq - FREQ_1);
                    bits += is0 ? '0' : '1';
                    onEvent({ type: 'receiving', bits });
                 }
              }
            }
          }
        } else {
           onEvent({ type: 'debug', freq: 0, magnitude: -100 });
        }
        
        this.animationFrame = requestAnimationFrame(loop);
      };
      
      this.animationFrame = requestAnimationFrame(loop);
      
    } catch (e) {
      console.error("Microphone error", e);
      throw e;
    }
  }

  private decodeBits(bits: string) {
    let text = "";
    // Ensure we have multiple of 8
    const cleanBits = bits.substring(0, Math.floor(bits.length / 8) * 8);
    for (let i = 0; i < cleanBits.length; i += 8) {
      const byte = cleanBits.substring(i, i + 8);
      text += String.fromCharCode(parseInt(byte, 2));
    }
    return text;
  }

  stop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.ctx) {
      this.ctx.close();
    }
  }
}
