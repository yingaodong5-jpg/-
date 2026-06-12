/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Leaf, 
  RotateCcw, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Video, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Monitor
} from 'lucide-react';
import { SceneState, Sunflower, TrackedHand } from './types';
import ArtCanvas from './components/ArtCanvas';
import CameraDetector from './components/CameraDetector';
// @ts-ignore
import wastelandBgImg from './assets/images/wasteland_bg_1781142029934.png';
// @ts-ignore
import sunflowerImgAsset from './assets/images/sunflower_asset_1781143850977.png';

// Process loaded sunflower image to make its white background perfectly transparent
function makeWhiteTransparent(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];

    const minChannelVal = Math.min(r, g, b);

    if (minChannelVal > 200) {
      data[i+3] = 0;
    } else if (minChannelVal > 175) {
      const blendFactor = (200 - minChannelVal) / (200 - 175);
      data[i+3] = Math.max(0, Math.min(255, Math.floor(data[i+3] * blendFactor)));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Global constants for "左手右手" (Left Hand Right Hand) melody
const FREQ: Record<string, number> = {
  'L5': 196.00, // Low 5 (G3)
  'L6': 220.00, // Low 6 (A3)
  '1': 261.63,  // C4
  '2': 293.66,  // D4
  '3': 329.63,  // E4
  '4': 349.23,  // F4
  '5': 392.00,  // G4
  '6': 440.00,  // A4
  '7': 493.88,  // B4
  'H1': 523.25, // High 1 (C5)
  'H2': 587.33, // High 2 (D5)
  'H3': 659.25, // High 3 (E5)
  'H5': 783.99, // High 5 (G5)
};

interface MelodyNote {
  note: string;
  duration: number; // beats
}

const LEFT_HAND_RIGHT_HAND_MELODY: MelodyNote[] = [
  // 1. 给你我的手
  { note: '3', duration: 0.5 },
  { note: '5', duration: 0.5 },
  { note: '5', duration: 1 },
  { note: 'H1', duration: 1 },
  { note: '6', duration: 2 },
  
  // 2. 像温柔暖流
  { note: '5', duration: 0.5 },
  { note: '6', duration: 0.5 },
  { note: '5', duration: 1 },
  { note: '3', duration: 1 },
  { note: '2', duration: 2 },
  
  // 3. 当你要飞的时候
  { note: '3', duration: 0.5 },
  { note: '5', duration: 0.5 },
  { note: '5', duration: 1 },
  { note: 'H1', duration: 1 },
  { note: '6', duration: 1 },
  { note: 'H2', duration: 1 },
  { note: 'H1', duration: 2 },
  
  // 4. 我在你左右
  { note: 'H2', duration: 0.5 },
  { note: 'H1', duration: 0.5 },
  { note: '7', duration: 1 },
  { note: '6', duration: 1 },
  { note: '5', duration: 2 },
  
  // 5. 给你我的手
  { note: '3', duration: 0.5 },
  { note: '5', duration: 0.5 },
  { note: '5', duration: 1 },
  { note: 'H1', duration: 1 },
  { note: '6', duration: 2 },
  
  // 6. 像温柔暖流
  { note: '5', duration: 0.5 },
  { note: '6', duration: 0.5 },
  { note: '5', duration: 1 },
  { note: '3', duration: 1 },
  { note: '2', duration: 2 },
  
  // 7. 我们一直向前走
  { note: '1', duration: 0.5 },
  { note: '2', duration: 0.5 },
  { note: '3', duration: 1 },
  { note: '5', duration: 1 },
  { note: '6', duration: 1 },
  { note: 'H1', duration: 1 },
  
  // 8. 绝不回头 / 最美的以后
  { note: 'H2', duration: 1 },
  { note: 'H3', duration: 1 },
  { note: 'H2', duration: 1 },
  { note: 'H1', duration: 3 },
  
  // Rest break
  { note: '0', duration: 2 },
];

// Custom Web Audio API synthesizer for instant responsive audio feedback without external file links
class SoundSynth {
  ctx: AudioContext | null = null;
  isEnabled: boolean = true;
  melodyTimeoutId: any = null;
  nextNoteIndex: number = 0;
  nextNoteTime: number = 0;
  tempoBPM: number = 105; // Light storytelling rhythm
  sceneState: 'wasteland' | 'modern_city' = 'wasteland';

  init() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      this.ctx = new AudioCtx();
      this.nextNoteTime = this.ctx.currentTime + 0.15;
      
      // Kickoff the beautiful background music loop
      this.scheduleMelody();
    } catch (e) {
      console.warn('Web Audio Context initialization blocked or failed', e);
    }
  }

  // Look-ahead synthesizer scheduler supporting zero timing sync drifts or lags
  scheduleMelody() {
    if (!this.ctx) return;
    
    try {
      // Handle page pauses/backgrounding neatly by skipping elapsed time frames
      if (this.nextNoteTime < this.ctx.currentTime) {
        this.nextNoteTime = this.ctx.currentTime + 0.05;
      }

      const lookAheadTime = 0.25; // 250ms schedule window
      const beatDuration = 60 / this.tempoBPM;

      while (this.nextNoteTime < this.ctx.currentTime + lookAheadTime && this.isEnabled) {
        const item = LEFT_HAND_RIGHT_HAND_MELODY[this.nextNoteIndex];
        const freq = FREQ[item.note] || 0;
        const noteDuration = item.duration * beatDuration;

        // Play main melody notes
        if (freq > 0) {
          this.playMelodyNote(freq, this.nextNoteTime, noteDuration);
        }

        // Play gentle support chords on important block transition indices
        if (this.nextNoteIndex === 0) {
          // Bar 1: C Major (C3=130.81, E3=164.81, G3=196.00)
          this.playChord([130.81, 164.81, 196.00], this.nextNoteTime, 5 * beatDuration);
        } else if (this.nextNoteIndex === 5) {
          // Bar 2: G Major (G2=98.00, B2=123.47, D3=146.83)
          this.playChord([98.00, 123.47, 146.83], this.nextNoteTime, 5 * beatDuration);
        } else if (this.nextNoteIndex === 10) {
          // Bar 3: Am (A2=110.00, C3=130.81, E3=164.81)
          this.playChord([110.00, 130.81, 164.81], this.nextNoteTime, 7 * beatDuration);
        } else if (this.nextNoteIndex === 17) {
          // Bar 4: G Major (G2=98.00, B2=123.47, D3=146.83)
          this.playChord([98.00, 123.47, 146.83], this.nextNoteTime, 5 * beatDuration);
        } else if (this.nextNoteIndex === 22) {
          // Bar 5: C Major
          this.playChord([130.81, 164.81, 196.00], this.nextNoteTime, 5 * beatDuration);
        } else if (this.nextNoteIndex === 27) {
          // Bar 6: G Major
          this.playChord([98.00, 123.47, 146.83], this.nextNoteTime, 5 * beatDuration);
        } else if (this.nextNoteIndex === 32) {
          // Bar 7: F Major (F2=87.31, A2=110.00, C3=130.81)
          this.playChord([87.31, 110.00, 130.81], this.nextNoteTime, 6 * beatDuration);
        } else if (this.nextNoteIndex === 38) {
          // Bar 8: C Major
          this.playChord([130.81, 164.81, 196.00], this.nextNoteTime, 6 * beatDuration);
        }

        this.nextNoteTime += noteDuration;
        this.nextNoteIndex = (this.nextNoteIndex + 1) % LEFT_HAND_RIGHT_HAND_MELODY.length;
      }
    } catch (e) {
      console.error('BGM Scheduling error:', e);
    }

    // Call look-ahead checker every 60ms
    this.melodyTimeoutId = setTimeout(() => this.scheduleMelody(), 60);
  }

  // Play beautiful, custom synthesised ambient bell chime logic
  playMelodyNote(freq: number, startTime: number, duration: number) {
    if (!this.ctx || !this.isEnabled) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Dynamic synthesis style shift depending on the current world restoration state
      if (this.sceneState === 'modern_city') {
        // Bright crystal bell chime
        osc.type = 'triangle';
        
        // Add double octave high-bell shimmer
        const shimmerOsc = this.ctx.createOscillator();
        const shimmerGain = this.ctx.createGain();
        shimmerOsc.type = 'sine';
        shimmerOsc.frequency.setValueAtTime(freq * 2, startTime);
        
        shimmerGain.gain.setValueAtTime(0, startTime);
        shimmerGain.gain.linearRampToValueAtTime(0.012, startTime + 0.01);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4);
        
        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(this.ctx.destination);
        shimmerOsc.start(startTime);
        shimmerOsc.stop(startTime + duration + 0.1);
      } else {
        // Soft cinematic ambient whistle
        osc.type = 'sine';
      }

      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope: gentle clickless rise followed by natural sweet ring
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.035, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.012, startTime + duration * 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    } catch (err) {}
  }

  // Play rich, low, soft major progression anchor chords
  playChord(chordNotes: number[], startTime: number, duration: number) {
    if (!this.ctx || !this.isEnabled) return;

    try {
      chordNotes.forEach(freq => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.012, startTime + 0.4); // extremely faint cozy bed
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
      });
    } catch (err) {}
  }

  setDroneState(scene: 'wasteland' | 'modern_city') {
    this.sceneState = scene;
  }

  playSproutSound() {
    if (!this.ctx || !this.isEnabled || this.ctx.state === 'suspended') return;
    const t = this.ctx.currentTime;
    try {
      // Cozy rising magical sprout sound matching Left Hand Right Hand major pentatonic (C Major chord)
      const notes = [261.63, 329.63, 392.00, 523.25]; // C-E-G-C arpeggio cascade
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + index * 0.06);
        
        gain.gain.setValueAtTime(0.02, t + index * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + index * 0.06 + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + index * 0.06);
        osc.stop(t + index * 0.06 + 0.4);
      });
    } catch (e) {}
  }

  playHandshakeSound() {
    if (!this.ctx || !this.isEnabled || this.ctx.state === 'suspended') return;
    const t = this.ctx.currentTime;
    try {
      // 1. Blinding white noise filter boom representing reconstruction
      const bufferSize = this.ctx.sampleRate * 2.0;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(120, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.6);
      filter.Q.setValueAtTime(3.5, t);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.12, t);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      noise.start();

      // 2. High cascading celestial bells representing utopian solar city success
      const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // Beautiful C Major pentatonic scale cascade
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const chimeGain = this.ctx!.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + index * 0.08);
        
        chimeGain.gain.setValueAtTime(0.04, t + index * 0.08);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, t + index * 0.08 + 1.5);
        
        osc.connect(chimeGain);
        chimeGain.connect(this.ctx!.destination);
        osc.start(t + index * 0.08);
        osc.stop(t + index * 0.08 + 1.6);
      });
    } catch (e) {}
  }

  setMuted(muted: boolean) {
    this.isEnabled = !muted;
    if (this.ctx) {
      if (muted) {
        this.ctx.suspend();
      } else {
        this.ctx.resume();
      }
    }
  }

  destroy() {
    try {
      if (this.melodyTimeoutId) clearTimeout(this.melodyTimeoutId);
      if (this.ctx) this.ctx.close();
    } catch (e) {}
  }
}

export default function App() {
  // Navigation & Interactive states
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [trackedHands, setTrackedHands] = useState<TrackedHand[]>([]);
  const [sceneState, setSceneState] = useState<SceneState>('wasteland');
  const [sunflowers, setSunflowers] = useState<Sunflower[]>([]);
  
  // Preloading image assets immediately at app startup
  const [loadedBgImage, setLoadedBgImage] = useState<HTMLImageElement | null>(null);
  const [loadedSunflowerImage, setLoadedSunflowerImage] = useState<HTMLCanvasElement | null>(null);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(true);

  // Buffer assets immediately on mount
  useEffect(() => {
    let bgReady = false;
    let sfReady = false;

    const img = new Image();
    img.src = wastelandBgImg;
    img.onload = () => {
      setLoadedBgImage(img);
      bgReady = true;
      if (sfReady) setLoadingAssets(false);
    };
    img.onerror = () => {
      console.error('Failed preloading background.');
      bgReady = true; // prevent blocking forever on error
      if (sfReady) setLoadingAssets(false);
    };

    const sfImg = new Image();
    sfImg.src = sunflowerImgAsset;
    sfImg.onload = () => {
      const processed = makeWhiteTransparent(sfImg);
      setLoadedSunflowerImage(processed);
      sfReady = true;
      if (bgReady) setLoadingAssets(false);
    };
    sfImg.onerror = () => {
      console.error('Failed preloading sunflower.');
      sfReady = true; // prevent blocking forever on error
      if (bgReady) setLoadingAssets(false);
    };
  }, []);

  // UI Panels states
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  
  // Synthesizer Reference
  const synthRef = useRef<SoundSynth | null>(null);

  // Growth Sound Trigger Locks
  const spawnedSunflowerCountRef = useRef<number>(0);

  // Initialize Synthesizer upon user interaction trigger (prevents autoplay restrictions)
  const handleEnterGallery = () => {
    const synth = new SoundSynth();
    synth.init();
    synthRef.current = synth;
    setHasEntered(true);
  };

  // Play a beautiful sprout sound when new sunflowers appear in wasteland
  useEffect(() => {
    if (sceneState !== 'wasteland' || !synthRef.current) return;
    if (sunflowers.length > spawnedSunflowerCountRef.current) {
      synthRef.current.playSproutSound();
      spawnedSunflowerCountRef.current = sunflowers.length;
    } else if (sunflowers.length < spawnedSunflowerCountRef.current) {
      spawnedSunflowerCountRef.current = sunflowers.length;
    }
  }, [sunflowers.length, sceneState]);

  // Sync drone sound characteristics with visual shifts
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setDroneState(sceneState === 'modern_city' ? 'modern_city' : 'wasteland');
    }
  }, [sceneState]);

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (synthRef.current) {
      synthRef.current.setMuted(nextMuted);
    }
  };

  // Safe reset function (clears all sunflower records, state nodes, tracking frame offsets)
  const handleReset = () => {
    setSceneState('wasteland');
    setSunflowers([]);
    setTrackedHands([]);
    spawnedSunflowerCountRef.current = 0;
    if (synthRef.current) {
      synthRef.current.setDroneState('wasteland');
    }
  };

  const handleHandshakeTriggered = () => {
    if (synthRef.current) {
      synthRef.current.playHandshakeSound();
    }
  };

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-stone-950 overflow-hidden select-none select-none text-stone-100 flex flex-col font-sans">
      
      {/* 1. IMMERSIVE SPLASH SCREEN (Gallery Entrance Modal) */}
      {!hasEntered && (
        <div className="absolute inset-0 z-50 bg-radial from-stone-900 to-black flex items-center justify-center p-4">
          {/* Moving background details */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none animate-pulse" />

          <div className="relative max-w-xl w-full text-center p-8 bg-stone-900/60 backdrop-blur-xl border border-stone-800/80 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Top thematic visual decor */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-1px bg-gradient-to-r from-transparent to-stone-500" />
              <div className="text-stone-400 text-xs font-mono tracking-widest">ECO-ART INSTALLATION</div>
              <div className="w-10 h-1px bg-gradient-to-l from-transparent to-stone-500" />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-stone-100 heading-font">
              废墟与盛绽
            </h1>
            <p className="text-yellow-400 text-sm font-mono tracking-wider mb-6">
              RUINS &amp; BLOOMING
            </p>

            <p className="text-stone-400 text-sm md:text-base leading-relaxed mb-8 max-w-md mx-auto">
              这是一个基于 MediaPipe 的手势交互艺术装置。
              一曲未来重金属废墟下的生态挽歌：当冷硬的钢铁遇到温暖的碰触，绿色生命将在这里萌发、盛绽并重建美好的明天。
            </p>

            {/* Instruction cards inside splash */}
            <div className="grid grid-cols-3 gap-3 text-left mb-8 max-w-lg mx-auto">
              <div className="bg-black/30 border border-stone-800/50 p-3.5 rounded-lg text-center">
                <div className="w-8 h-8 rounded-full bg-stone-800/50 flex items-center justify-center mx-auto mb-2 text-teal-400 text-xs font-bold">1</div>
                <div className="text-[11px] font-semibold text-stone-200">伸出一只手</div>
                <div className="text-[9px] text-stone-500 mt-1">地面萌生第一朵嫩绿向日葵</div>
              </div>
              <div className="bg-black/30 border border-stone-800/50 p-3.5 rounded-lg text-center">
                <div className="w-8 h-8 rounded-full bg-stone-800/50 flex items-center justify-center mx-auto mb-2 text-teal-400 text-xs font-bold">2</div>
                <div className="text-[11px] font-semibold text-stone-200">伸出双手</div>
                <div className="text-[9px] text-stone-500 mt-1">孕育出另一朵金色向日葵</div>
              </div>
              <div className="bg-black/30 border border-stone-800/50 p-3.5 rounded-lg text-center">
                <div className="w-8 h-8 rounded-full bg-stone-800/50 flex items-center justify-center mx-auto mb-2 text-yellow-400 text-xs font-bold">3</div>
                <div className="text-[11px] font-semibold text-stone-200">双手指尖相触</div>
                <div className="text-[9px] text-stone-500 mt-1">金色光华爆发，重塑现代绿城</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={handleEnterGallery}
                disabled={loadingAssets}
                className="group py-3 px-8 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-stone-950 rounded-xl font-bold text-sm tracking-wider transition-all shadow-xl shadow-yellow-500/10 hover:shadow-yellow-500/20 active:scale-95 flex items-center gap-2 disabled:from-stone-800 disabled:to-stone-700 disabled:text-stone-500 disabled:shadow-none disabled:cursor-not-allowed"
                id="enter-gallery-btn"
              >
                {loadingAssets ? '艺术资源载入中...' : '开启互动画廊'}
                {!loadingAssets && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </div>

            <div className="mt-8 text-[10px] text-stone-500 leading-normal">
              本装置需要访问您的摄像头以识别手势变化。
              <br />
              所有处理均在浏览器本地安全运行，不上传任何图像数据。
            </div>
          </div>
        </div>
      )}

      {/* 2. CORE ART VIEW (Full Screen Canvas with Controls) */}
      <div className="relative flex-1 w-full h-full">
        
        {/* The procedurally drawn canvas scene */}
        <ArtCanvas
          trackedHands={trackedHands}
          sceneState={sceneState}
          onSceneStateChange={setSceneState}
          sunflowers={sunflowers}
          setSunflowers={setSunflowers}
          onHandshakeTriggered={handleHandshakeTriggered}
          loadedBgImage={loadedBgImage}
          loadedSunflowerImage={loadedSunflowerImage}
        />

        {/* MediaPipe Hands webcam driver */}
        {hasEntered && (
          <CameraDetector 
            onHandsDetected={setTrackedHands} 
            isActive={hasEntered} 
          />
        )}

        {/* HUD OVERLAY - SCENE BRANDING HEADER */}
        <div className="absolute top-6 left-6 z-30 pointer-events-none">
          <div className="bg-stone-900/60 backdrop-blur-md border border-stone-800/60 p-4 rounded-xl flex flex-col pointer-events-auto shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
              <div className="text-stone-400 text-[10px] font-mono tracking-widest">GALLERY DEVICE #01</div>
            </div>
            <h2 className="text-xl font-bold tracking-wider text-stone-100 flex items-center gap-1.5 mt-1">
              废墟与盛绽 <span className="text-xs text-stone-400 font-mono">/ V1.0</span>
            </h2>
            <div className="text-stone-400 text-xs mt-1 font-mono">
              场景: {' '}
              {sceneState === 'wasteland' && <span className="text-rose-400">未来机械废墟 (Heavy Industrial Waste)</span>}
              {sceneState === 'transition' && <span className="text-amber-400 animate-pulse">生态重置中 (Transition Resetting...)</span>}
              {sceneState === 'modern_city' && <span className="text-green-400 neon-glow">现代阳光城市 (Modern Solar Paradise)</span>}
            </div>
          </div>
        </div>

        {/* HUD OVERLAY - INTERACTION INSTRUCTION OVERLAY PANEL (Togglable) */}
        {showGuide && (
          <div className="absolute top-6 right-6 z-30 w-72 pointer-events-none animate-fade-in">
            <div className="bg-stone-950/85 backdrop-blur-md border border-stone-800/80 p-4 rounded-xl shadow-xl pointer-events-auto">
              <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
                <span className="text-[#a8a29e] text-xs font-semibold tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                  互动指引手册
                </span>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-stone-500 hover:text-stone-300 text-xs px-1.5 py-0.5 rounded transition-colors"
                >
                  隐藏
                </button>
              </div>

              <div className="space-y-3.5 text-[11.5px] leading-relaxed text-stone-300">
                <div className={`p-2 rounded transition-colors ${trackedHands.length === 0 && sceneState === 'wasteland' ? 'bg-teal-950/30 border border-teal-500/20' : ''}`}>
                  <span className="text-teal-400 font-bold font-mono">1. 探索复苏：</span>
                  在废墟中央举起{" "}<span className="text-stone-100 font-semibold px-1 rounded bg-stone-800">1只手</span>，
                  地面会感应出第一朵向日葵，发出翠绿嫩芽并伴有悠扬音效。
                </div>
                <div className={`p-2 rounded transition-colors ${trackedHands.length === 1 && sceneState === 'wasteland' ? 'bg-teal-950/30 border border-teal-500/20' : ''}`}>
                  <span className="text-teal-400 font-bold font-mono">2. 共生繁茂：</span>
                  同时张开{" "}<span className="text-stone-100 font-semibold px-1 rounded bg-stone-800">2只手</span>，
                  即可促成互补，激发第2朵金色向日葵在废墟的右侧缓缓抽丝成长。
                </div>
                <div className={`p-2 rounded transition-colors ${trackedHands.length === 2 && sceneState === 'wasteland' ? 'bg-yellow-950/30 border border-yellow-500/20 animate-pulse' : ''}`}>
                  <span className="text-yellow-400 font-bold font-mono">3. 惊蛰新生：</span>
                  让两只双手在镜头前{" "}<span className="text-yellow-400 font-semibold px-1 rounded bg-stone-800">指尖相触 (两手食指或中指指尖贴近)</span>。
                  感应后将触发特写，大地震颤，金色极光爆发，世界重建为阳光生态绿城。
                </div>
              </div>

              {sceneState === 'modern_city' && (
                <div className="mt-4 p-2.5 bg-green-950/30 border border-green-500/20 rounded text-center text-xs text-green-300 animate-pulse">
                  ✨ 恭喜重塑美好阳光净化之城！
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bring back instructions floating link if closed */}
        {!showGuide && (
          <button
            onClick={() => setShowGuide(true)}
            className="absolute top-6 right-6 z-30 bg-stone-900/80 backdrop-blur-sm hover:bg-stone-800 border border-stone-800 hover:border-teal-500/50 p-2.5 rounded-lg shadow-lg text-stone-400 hover:text-stone-200 transition-all flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-teal-400" />
            <span className="text-xs">说明书</span>
          </button>
        )}

        {/* SYSTEM STATUS DIAGNOSTICS DECK - Cyber-display showing tracking coords overlay */}
        {sceneState === 'wasteland' && (
          <div className="absolute top-44 left-6 z-30 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm border border-stone-800/40 px-3 py-2 rounded-lg text-[10px] font-mono text-stone-400 flex flex-col gap-1">
              <div className="flex justify-between gap-10">
                <span>跟踪手部:</span>
                <span className="text-teal-400 font-bold font-sans">
                  {trackedHands.length} {' '} (Max: 2)
                </span>
              </div>
              <div className="flex justify-between">
                <span>渲染向日葵:</span>
                <span className="text-yellow-400 font-sans">{sunflowers.length} 朵</span>
              </div>
              {trackedHands.length > 0 && (
                <div className="border-t border-stone-800/70 pt-1 mt-1 text-[9px] text-[#78716c] flex flex-col gap-0.5">
                  {trackedHands.map((h, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span>[{h.label}] Wrist:</span>
                      <span className="text-stone-300">
                        X: {Math.round((1 - h.landmarks[0].x) * 100)}, Y: {Math.round(h.landmarks[0].y * 100)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM-LEFT UTILITY CORNER: CLEAR SCENE / RESET BUTTON */}
        <div className="absolute bottom-6 left-6 z-30 flex items-center gap-2">
          {/* Reset installer button */}
          <button
            onClick={handleReset}
            className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-orange-500/40 rounded-xl shadow-lg text-stone-400 hover:text-orange-400 transition-all focus:outline-none flex items-center gap-2"
            title="重置装置至初始状态"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs font-semibold">重置装置</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleMuteToggle}
            className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl shadow-lg text-stone-400 hover:text-stone-200 transition-all focus:outline-none"
            title={isMuted ? "开启声道音效" : "静音声道音效"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Status signal bulb */}
          <div className="bg-stone-900/80 backdrop-blur-sm border border-stone-800 px-3 py-2 rounded-xl text-[10px] font-mono text-stone-400 flex items-center gap-2 h-[42px]">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sceneState === 'modern_city' ? 'bg-green-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${sceneState === 'modern_city' ? 'bg-green-500' : 'bg-rose-500'}`}></span>
            </span>
            <span>SYSTEM_ONLINE</span>
          </div>
        </div>

        {/* BOTTOM-CENTER INTERACTION STATUS TICKER */}
        {sceneState === 'wasteland' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block">
            <div className="bg-stone-950/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-stone-800 shadow-xl flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
              <div className="text-xs text-stone-300 font-mono tracking-wider">
                {trackedHands.length === 0 && "⌛ 等待访客入场并向镜头展示手掌..."}
                {trackedHands.length === 1 && "🌱 发现生命信号：首支向日葵已破土而出！展露第二只手..."}
                {trackedHands.length === 2 && "👉 完美信号谐振：请让双手指尖相互触碰，唤起金色阳光风暴..."}
              </div>
            </div>
          </div>
        )}

        {/* GOLDEN MODERN GARDEN METAPHOR OVERLAY PANEL */}
        {sceneState === 'modern_city' && (
          <div className="absolute bottom-24 left-6 z-30 max-w-sm pointer-events-none animate-float">
            <div className="bg-stone-950/85 backdrop-blur-xl border border-green-500/20 p-5 rounded-xl shadow-2xl pointer-events-auto">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Leaf className="w-5 h-5" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase">恢复生态成功</span>
              </div>
              <h4 className="text-base font-bold text-stone-100 flex items-center gap-1.5 leading-snug">
                未来的绿色奇迹已经显现
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed mt-2">
                曾经破败的未来工业金属废墟，在您充满善意的手部合鸣中焕然如新。
                满屏盛绽的向日葵作为大自然的先行使者，将持续沐浴在澄明和煦的柔光下，滋养着未来纯净明亮的可持续之城。
              </p>
              <button
                onClick={handleReset}
                className="mt-4 w-full py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                重新体验这场艺术旅程
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
