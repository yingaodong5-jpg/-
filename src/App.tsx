/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Monitor,
  Hand
} from 'lucide-react';
import { SceneState, Sunflower, TrackedHand } from './types';
import ArtCanvas from './components/ArtCanvas';
import CameraDetector from './components/CameraDetector';
// @ts-ignore
// Imported background assets resolved properly by Vite builder for cross-platform deployments (e.g., Cloudflare Pages)
import wastelandBgImg from './assets/images/wasteland_scene_1_1782041611411.jpg';
// @ts-ignore
import wastelandBgImg1 from './assets/images/wasteland_scene_1_1782041611411.jpg';
// @ts-ignore
import wastelandBgImg2 from './assets/images/wasteland_scene_2_1782041628748.jpg';
// @ts-ignore
import wastelandBgImg3 from './assets/images/wasteland_scene_3_1782041648344.jpg';
// @ts-ignore
import wastelandBgImg4 from './assets/images/wasteland_scene_4_1782041666571.jpg';
// @ts-ignore
import wastelandBgImg5 from './assets/images/wasteland_scene_5_1782041685259.jpg';
// @ts-ignore
import modernCityBgImg from './assets/images/wasteland_sunrays_new_1782042349832.jpg';
// @ts-ignore
import collectingSeedsBgImg from './assets/images/collecting_seeds_bg_1781744195771.jpg';
// @ts-ignore
import sunflowerImgAsset from './assets/images/sunflower_asset_1782040614935.jpg';

// Process loaded sunflower image to make its white background perfectly transparent
function makeWhiteTransparent(img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width || 100;
  canvas.height = img.height || 100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img;

  try {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
  } catch (e) {
    console.warn("Soft sandbox / CORS warning on getImageData, using raw image element directly:", e);
    return img;
  }
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
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    
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
    if (!this.ctx || !this.isEnabled) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
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
    if (!this.ctx || !this.isEnabled) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
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

  playSeedPickupSound() {
    if (!this.ctx || !this.isEnabled) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const t = this.ctx.currentTime;
    try {
      // Bright, satisfying rising acoustic arpeggio (C5 -> E5 -> G5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + index * 0.05);

        gain.gain.setValueAtTime(0.045, t + index * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + index * 0.05 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + index * 0.05);
        osc.stop(t + index * 0.05 + 0.22);
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

const COVER_POEM_LINES = [
  "核冬天的第73年。",
  "地面的辐射早已杀死了所有破土的芽。",
  "最后一朵向日葵，在枯萎前把全部的光，凝成了10颗希望的种子。",
  "它们不敢落地，只能在寂静的高空漂流。",
  "等待一双手，接住它们。"
];

const ENDING_POEM_LINES = [
  "废墟不是世界的终点",
  "阳光会记得",
  "是你伸出的手，接住了人类的明天"
];

export default function App() {
  // Navigation & Interactive states
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [poetryIndex, setPoetryIndex] = useState<number>(0);
  const [endingPoetryIndex, setEndingPoetryIndex] = useState<number>(-1);
  const [trackedHands, setTrackedHands] = useState<TrackedHand[]>([]);
  const [sceneState, setSceneState] = useState<SceneState>('collecting_seeds');
  const [seedsCollected, setSeedsCollected] = useState<number>(0);
  const [sunflowers, setSunflowers] = useState<Sunflower[]>([]);
  const [cameraDetectorStatus, setCameraDetectorStatus] = useState<{
    permissionState: 'pending' | 'allowed' | 'denied';
    errorMessage: string;
    isInitializing: boolean;
    loadingStatusText: string;
  } | null>(null);

  // Cover background slideshow cycle
  const [coverBgIndex, setCoverBgIndex] = useState<number>(0);

  useEffect(() => {
    if (hasEntered) return;
    const interval = setInterval(() => {
      setCoverBgIndex((prev) => (prev + 1) % 5);
    }, 6000);
    return () => clearInterval(interval);
  }, [hasEntered]);
  
  // Transition flow state between interaction stages
  const [triggerWastelandTransition, setTriggerWastelandTransition] = useState<boolean>(false);
  const [showInterlude, setShowInterlude] = useState<boolean>(false);

  // Hand waving detection state for activating from the cover screen
  const [waveProgress, setWaveProgress] = useState<number>(0);
  const lastHandXRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastActiveTimeRef = useRef<number>(0);
  const lastPointerXRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasEntered || poetryIndex < 5) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActiveTimeRef.current > 600) {
        setWaveProgress((prev) => Math.max(0, prev - 0.8));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [hasEntered, poetryIndex]);

  useEffect(() => {
    if (hasEntered || poetryIndex < 5) {
      setWaveProgress(0);
      lastHandXRef.current = null;
      return;
    }

    if (trackedHands.length === 0) {
      return;
    }

    const hand = trackedHands[0];
    const wrist = hand.landmarks[9]; // Middle finger base is a stable pivot
    if (!wrist) return;

    const currentX = wrist.x;
    const now = Date.now();

    if (lastHandXRef.current !== null) {
      const dx = currentX - lastHandXRef.current;
      // Filter out micro-jittering to prevent idle triggering
      if (Math.abs(dx) > 0.007) {
        lastActiveTimeRef.current = now;
        setWaveProgress((prev) => {
          const increment = Math.abs(dx) * 650; // calibrated for energetic naturally-paced physical waving
          const nextProg = Math.min(100, prev + increment);
          if (nextProg >= 100) {
            // Automatically transitions to interactive mode
            setTimeout(() => {
              handleEnterGallery();
            }, 50);
          }
          return nextProg;
        });
      }
    }

    lastHandXRef.current = currentX;
    lastTimeRef.current = now;
  }, [trackedHands, hasEntered, poetryIndex]);

  const handleCoverPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hasEntered || poetryIndex < 5) return;
    const currentX = e.clientX;
    if (lastPointerXRef.current !== null) {
      const dx = Math.abs(currentX - lastPointerXRef.current);
      if (dx > 2) {
        lastActiveTimeRef.current = Date.now();
        setWaveProgress((prev) => {
          const normalizedDx = dx / window.innerWidth;
          const increment = normalizedDx * 750; // VERY responsive and satisfying pointer speed!
          const nextProg = Math.min(100, prev + increment);
          if (nextProg >= 100) {
            setTimeout(() => {
              handleEnterGallery();
            }, 50);
          }
          return nextProg;
        });
      }
    }
    lastPointerXRef.current = currentX;
  };

  const handleCoverPointerLeaveOrUp = () => {
    lastPointerXRef.current = null;
  };

  // Hand waving detection state for activating from the interlude screen
  const [interludeWaveProgress, setInterludeWaveProgress] = useState<number>(0);
  const lastInterludeHandXRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showInterlude) {
      setInterludeWaveProgress(0);
      lastInterludeHandXRef.current = null;
      return;
    }

    if (trackedHands.length === 0) {
      // Decay progress gracefully if hand leaves camera view
      const interval = setInterval(() => {
        setInterludeWaveProgress((prev) => Math.max(0, prev - 1.2));
      }, 80);
      return () => clearInterval(interval);
    }

    const hand = trackedHands[0];
    const wrist = hand.landmarks[9]; // Middle finger base is a stable pivot
    if (!wrist) return;

    const currentX = wrist.x;

    if (lastInterludeHandXRef.current !== null) {
      const dx = currentX - lastInterludeHandXRef.current;
      // Filter out micro-jittering to prevent idle triggering
      if (Math.abs(dx) > 0.007) {
        setInterludeWaveProgress((prev) => {
          const increment = Math.abs(dx) * 650; // calibrated for energetic naturally-paced physical waving
          const nextProg = Math.min(100, prev + increment);
          if (nextProg >= 100) {
            // Automatically transitions to wasteland stage
            setTimeout(() => {
              handleStartWastelandTransition();
            }, 50);
          }
          return nextProg;
        });
      } else {
        // Slow decay if holding hand stationary
        setInterludeWaveProgress((prev) => Math.max(0, prev - 0.8));
      }
    }

    lastInterludeHandXRef.current = currentX;
  }, [trackedHands, showInterlude]);

  useEffect(() => {
    if (hasEntered) return;
    const interval = setInterval(() => {
      setPoetryIndex((prev) => {
        if (prev < COVER_POEM_LINES.length) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [hasEntered]);

  const [isWhiteScreenSolid, setIsWhiteScreenSolid] = useState<boolean>(false);

  // Start ending sequence when arriving at modern_city
  useEffect(() => {
    let timerId: any;
    if (sceneState === 'modern_city') {
      // Delay starting the transition by 3500ms so the user can watch the sunflowers grow and sway fully
      timerId = setTimeout(() => {
        setEndingPoetryIndex(0);
      }, 3500);
    } else {
      setEndingPoetryIndex(-1);
      setIsWhiteScreenSolid(false);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [sceneState]);

  // Handle fading to white and advancing poetry lines sequentially
  useEffect(() => {
    if (endingPoetryIndex === 0) {
      const tBg = setTimeout(() => {
        setIsWhiteScreenSolid(true);
      }, 50);

      const tNext = setTimeout(() => {
        setEndingPoetryIndex(1);
      }, 2500);

      return () => {
        clearTimeout(tBg);
        clearTimeout(tNext);
      };
    }

    if (endingPoetryIndex >= 1 && endingPoetryIndex < 4) {
      const tLabel = setTimeout(() => {
        setEndingPoetryIndex((prev) => prev + 1);
      }, 2800);

      return () => clearTimeout(tLabel);
    }
  }, [endingPoetryIndex]);
  
  // Trigger poetic cover when exactly 10 seeds are collected in stage 1
  useEffect(() => {
    if (seedsCollected >= 10 && sceneState === 'collecting_seeds') {
      setShowInterlude(true);
    }
  }, [seedsCollected, sceneState]);

  // Clean transition flags upon arriving at stage 2
  useEffect(() => {
    if (sceneState === 'wasteland') {
      setTriggerWastelandTransition(false);
    }
  }, [sceneState]);

  const handleStartWastelandTransition = () => {
    setShowInterlude(false);
    setTriggerWastelandTransition(true);
  };
  
  // Preloading image assets immediately at app startup
  const [loadedBgImage, setLoadedBgImage] = useState<HTMLImageElement | null>(null);
  const [loadedCollectingSeedsBgImage, setLoadedCollectingSeedsBgImage] = useState<HTMLImageElement | null>(null);
  const [loadedModernCityBgImage, setLoadedModernCityBgImage] = useState<HTMLImageElement | null>(null);
  const [loadedSunflowerImage, setLoadedSunflowerImage] = useState<HTMLCanvasElement | HTMLImageElement | null>(null);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(true);

  // Buffer assets immediately on mount
  useEffect(() => {
    let bgReady = false;
    let clBgReady = false;
    let mcBgReady = false;
    let sfReady = false;

    // Safety timeout: If preloading takes more than 3.5 seconds, enter the application anyway.
    // This totally eliminates the risk of an infinite loading screen.
    const safetyTimeoutId = setTimeout(() => {
      console.warn('Asset loading took more than 3.5s. Bypassing preloader to enter application.');
      setLoadingAssets(false);
    }, 3500);

    const checkAllLoaded = () => {
      if (bgReady && clBgReady && mcBgReady && sfReady) {
        setLoadingAssets(false);
        clearTimeout(safetyTimeoutId);
      }
    };

    const img = new Image();
    img.onload = () => {
      setLoadedBgImage(img);
      bgReady = true;
      checkAllLoaded();
    };
    img.onerror = () => {
      console.warn('Failed preloading local background. Trying high-quality CDN fallback...');
      const fallback = new Image();
      fallback.onload = () => {
        setLoadedBgImage(fallback);
        bgReady = true;
        checkAllLoaded();
      };
      fallback.onerror = () => {
        bgReady = true; // prevent blocking forever
        checkAllLoaded();
      };
      fallback.crossOrigin = 'anonymous'; // support cross-origin manipulations
      fallback.src = 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1600&auto=format&fit=crop';
    };
    img.src = wastelandBgImg;

    const clImg = new Image();
    clImg.onload = () => {
      setLoadedCollectingSeedsBgImage(clImg);
      clBgReady = true;
      checkAllLoaded();
    };
    clImg.onerror = () => {
      console.warn('Failed preloading local seed collecting background. Trying high-quality CDN fallback...');
      const fallback = new Image();
      fallback.onload = () => {
        setLoadedCollectingSeedsBgImage(fallback);
        clBgReady = true;
        checkAllLoaded();
      };
      fallback.onerror = () => {
        clBgReady = true;
        checkAllLoaded();
      };
      fallback.crossOrigin = 'anonymous';
      fallback.src = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1600&auto=format&fit=crop';
    };
    clImg.src = collectingSeedsBgImg;

    const mcImg = new Image();
    mcImg.onload = () => {
      setLoadedModernCityBgImage(mcImg);
      mcBgReady = true;
      checkAllLoaded();
    };
    mcImg.onerror = () => {
      console.warn('Failed preloading local modern city background. Trying high-quality CDN fallback...');
      const fallback = new Image();
      fallback.onload = () => {
        setLoadedModernCityBgImage(fallback);
        mcBgReady = true;
        checkAllLoaded();
      };
      fallback.onerror = () => {
        mcBgReady = true;
        checkAllLoaded();
      };
      fallback.crossOrigin = 'anonymous';
      fallback.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop';
    };
    mcImg.src = modernCityBgImg;

    const sfImg = new Image();
    sfImg.onload = () => {
      const processed = makeWhiteTransparent(sfImg);
      setLoadedSunflowerImage(processed);
      sfReady = true;
      checkAllLoaded();
    };
    sfImg.onerror = () => {
      console.warn('Failed preloading local sunflower asset. Trying high-quality CDN fallback...');
      const fallback = new Image();
      fallback.onload = () => {
        const processed = makeWhiteTransparent(fallback);
        setLoadedSunflowerImage(processed);
        sfReady = true;
        checkAllLoaded();
      };
      fallback.onerror = () => {
        sfReady = true; // prevent blocking forever on error
        checkAllLoaded();
      };
      fallback.crossOrigin = 'anonymous';
      fallback.src = 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=800&auto=format&fit=crop';
    };
    sfImg.src = sunflowerImgAsset;

    return () => {
      clearTimeout(safetyTimeoutId);
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
    setHasEntered(false);
    setPoetryIndex(0);
    setEndingPoetryIndex(-1);
    setSceneState('collecting_seeds');
    setSeedsCollected(0);
    setSunflowers([]);
    setTrackedHands([]);
    setTriggerWastelandTransition(false);
    setShowInterlude(false);
    setInterludeWaveProgress(0);
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
      
      {/* 1. IMMERSIVE SPLASH SCREEN (Gallery Entrance - Welcomes visitor with poetic prophecy) */}
      {!hasEntered && (
        <div 
          className="absolute inset-0 z-50 bg-[#050507] flex flex-col items-center justify-center p-6 text-stone-100 transition-colors duration-1000 touch-none"
          onPointerMove={handleCoverPointerMove}
          onPointerLeave={handleCoverPointerLeaveOrUp}
          onPointerUp={handleCoverPointerLeaveOrUp}
          onPointerCancel={handleCoverPointerLeaveOrUp}
        >
          
          {/* Background Slideshow (crossfade sequentially with 55% opacity for perfect readability) */}
          <div className="absolute inset-0 select-none overflow-hidden pointer-events-none z-0">
            <img 
               src={wastelandBgImg1} 
              alt="Nuclear winter scene 1" 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: coverBgIndex === 0 ? 0.55 : 0 }}
              referrerPolicy="no-referrer"
            />
            <img 
               src={wastelandBgImg2} 
              alt="Nuclear winter scene 2" 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: coverBgIndex === 1 ? 0.55 : 0 }}
              referrerPolicy="no-referrer"
            />
            <img 
               src={wastelandBgImg3} 
              alt="Nuclear winter scene 3" 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: coverBgIndex === 2 ? 0.55 : 0 }}
              referrerPolicy="no-referrer"
            />
            <img 
               src={wastelandBgImg4} 
              alt="Nuclear winter scene 4" 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: coverBgIndex === 3 ? 0.55 : 0 }}
              referrerPolicy="no-referrer"
            />
            <img 
               src={wastelandBgImg5} 
              alt="Nuclear winter scene 5" 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: coverBgIndex === 4 ? 0.55 : 0 }}
              referrerPolicy="no-referrer"
            />
            {/* Ambient vignette background blur & soft dark gradient over the image for perfect readability without washing out details */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/50 via-transparent to-[#050507]/75 backdrop-blur-[1px]" />
          </div>

          {/* Poetry Slideshow Stage (poetryIndex < 5) */}
          {poetryIndex < 5 ? (
            <div className="relative flex flex-col items-center justify-center min-h-[300px] z-10">
              {/* Skip Intro button */}
              <button 
                onClick={() => setPoetryIndex(5)} 
                className="absolute top-[-80px] text-stone-600 hover:text-stone-400 text-xs tracking-widest uppercase px-3 py-1 border border-stone-800/40 rounded bg-stone-900/10 transition-colors pointer-events-auto select-none"
              >
                跳过故事 SKIP
              </button>

              <div 
                key={poetryIndex} 
                className="text-white text-base md:text-lg font-light tracking-[0.2em] leading-loose text-center select-none animate-poetry max-w-xl px-4 font-sans whitespace-pre-line"
              >
                {COVER_POEM_LINES[poetryIndex]}
              </div>
            </div>
          ) : (
            /* Interactive Activation Stage (poetryIndex >= 5) */
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
              {/* Background amber sparks drifting upwards representing hope drifting listless in the dark sky */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => {
                  const left = `${Math.random() * 90 + 5}%`;
                  const size = `${Math.random() * 4 + 2}px`;
                  const duration = `${10 + Math.random() * 8}s`;
                  const driftX = `${(Math.random() - 0.5) * 100}px`;
                  const delay = `${-Math.random() * 14}s`;
                  return (
                    <div
                      key={i}
                      className="absolute bottom-0 rounded-full bg-amber-500/45 blur-[1px] animate-spark"
                      style={{
                        left,
                        width: size,
                        height: size,
                        '--drift-duration': duration,
                        '--drift-x': driftX,
                        animationDelay: delay,
                      } as any}
                    />
                  );
                })}
              </div>

              {/* Gentle ambient light aura */}
              <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none animate-pulse" />

              <div className="relative max-w-xl w-full text-center p-8 bg-[#131317]/55 backdrop-blur-xl border border-stone-800/40 rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col items-center">
                {/* Visual leaf seed representing the 10 seeds waiting for the hand */}
                <div className="relative w-24 h-24 my-4 flex items-center justify-center animate-float">
                  <div className="absolute w-16 h-16 rounded-full bg-amber-500/10 blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-10 h-10 rounded-full border border-amber-500/15 animate-ping opacity-25" style={{ animationDuration: '4s' }} />
                  <div className="w-6 h-10 bg-gradient-to-b from-stone-50 via-amber-200 to-amber-500 rounded-b-full rounded-t-full shadow-[0_0_15px_rgba(245,158,11,0.5)] relative flex items-center justify-center">
                    <div className="absolute inset-y-1 w-[1px] bg-[#ffffff]/60" />
                  </div>
                </div>

                {/* Ambient instructions */}
                <p className="text-stone-300 text-xs md:text-sm leading-relaxed mb-6 max-w-md mx-auto tracking-wide">
                  这是一个基于手势感应的生态交互艺术装置。
                  <br />
                  请授权摄像头并伸展双手，用掌心温度感应并捕获高空漂流的 <span className="text-yellow-400 font-semibold">10 粒破晓之种</span>。
                </p>

                {/* Animated progress bar wave interface */}
                <div className="w-full bg-[#1b1b23]/80 border border-stone-800/80 rounded-2xl p-5 mb-6 flex flex-col items-center gap-3">
                  {/* Visual Hand Scanner Wave Feedback icon loop */}
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    {/* Pulsing radar waves */}
                    <div 
                      className={`absolute inset-0 rounded-full border border-amber-500/20 transition-all duration-300 ${
                        trackedHands.length > 0 ? 'scale-110 border-teal-500/40 animate-ping' : 'scale-100 animate-pulse'
                      }`} 
                    />
                    
                    {/* Glowing background */}
                    <div 
                      className={`absolute inset-1.5 rounded-full blur-md transition-all duration-500 ${
                        trackedHands.length > 0 ? 'bg-teal-500/10' : 'bg-amber-500/5'
                      }`} 
                    />

                    {/* Modern icon indicating hand wave gestures */}
                    <Hand className={`w-7 h-7 z-10 transition-all duration-300 ${
                      trackedHands.length > 0 
                        ? 'text-teal-400 scale-110 rotate-[-12deg]' 
                        : 'text-amber-500/60 animate-bounce'
                    }`} />
                  </div>

                  {/* Realtime Detection status text */}
                  <div className="text-center space-y-1.5 px-3">
                    <p className={`text-xs font-mono uppercase tracking-widest font-semibold transition-colors duration-300 ${
                      trackedHands.length > 0 
                        ? 'text-teal-400 font-bold' 
                        : cameraDetectorStatus?.permissionState === 'denied' 
                        ? 'text-red-400 font-bold animate-pulse'
                        : cameraDetectorStatus?.isInitializing
                        ? 'text-amber-400 font-bold animate-pulse'
                        : 'text-amber-500/80 animate-pulse'
                    }`}>
                      {trackedHands.length > 0 
                        ? '● 已捕获姿势轮廓，请在镜头前挥手' 
                        : cameraDetectorStatus?.permissionState === 'denied'
                        ? '⚠️ 摄像头启动受限（已为您自动切换指尖点拨）'
                        : cameraDetectorStatus?.isInitializing
                        ? `⚡ 正在联机神经网络 (${cameraDetectorStatus.loadingStatusText || '准备启动中'})`
                        : '○ 传感器待机中... 请在镜头前挥动掌心'}
                    </p>
                    <p className="text-[10px] text-stone-400 max-w-sm mx-auto font-sans leading-normal">
                      {trackedHands.length > 0 
                        ? '感应到您的大气共振，正在积蓄生命气流能量' 
                        : cameraDetectorStatus?.permissionState === 'denied'
                        ? '支持双重智智联：免摄像头！请在当前画面上，单指滑动触控或游动鼠标，同样能瞬间填满共鸣条！'
                        : cameraDetectorStatus?.isInitializing
                        ? '正在预热 MediaPipe 网络镜像。在等待期间，您可随时在屏幕上以光标或手指划动提前唤醒互动！'
                        : '支持双重感应：请把双手置于摄像头前，亦可在当前界面触屏滑动/鼠标滑过提前免摄像头进入。'}
                    </p>
                  </div>

                  {/* Progress slide bar representing hand wave power accumulated */}
                  <div className="w-full space-y-1.5 mt-1">
                    <div className="flex justify-between items-center text-[9px] font-mono tracking-wider">
                      <span className="text-stone-500 uppercase">Resonance Activation Index</span>
                      <span className={`font-semibold ${waveProgress > 50 ? 'text-teal-400 font-bold' : 'text-amber-500/80'}`}>
                        {Math.round(waveProgress)}%
                      </span>
                    </div>
                    
                    <div className="w-full h-2.5 bg-stone-900 border border-stone-800 rounded-full overflow-hidden p-[1.5px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-100 ease-out ${
                          waveProgress > 60 
                            ? 'bg-gradient-to-r from-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(20,184,166,0.5)]' 
                            : 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        }`}
                        style={{ width: `${waveProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Backup alternative manual click action */}
                <div className="flex flex-col gap-1.5 items-center">
                  <span className="text-[9px] text-stone-500 uppercase tracking-widest font-light">
                    若无摄像头，亦可随时极速手动进入
                  </span>
                  <button
                    onClick={handleEnterGallery}
                    className="group py-1.5 px-4 bg-stone-900/40 border border-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 rounded-lg text-[10px] tracking-widest uppercase transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                    id="enter-gallery-btn"
                  >
                    手动备份点拨开启
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="mt-8 text-[9px] text-stone-500 leading-normal font-mono uppercase tracking-widest">
                  AI-POWERED SIGHT SENSOR • MULTI-MODAL HAND TRACKING • DATA PRIVATE
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2.5 POETIC OUTRO / ENDING COVER (Triggered after scene state transitions to modern_city) */}
      {endingPoetryIndex >= 0 && (
        <div 
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 transition-all duration-[2500ms] ease-in-out select-none text-stone-900"
          style={{
            backgroundColor: isWhiteScreenSolid ? '#fefefe' : 'rgba(13, 13, 16, 0)',
          }}
        >
          {/* Subtle slow drifting amber pollen sparks for ecological warmth */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => {
              const left = `${Math.random() * 90 + 5}%`;
              const size = `${Math.random() * 4 + 2}px`;
              const duration = `${12 + Math.random() * 8}s`;
              const driftX = `${(Math.random() - 0.5) * 60}px`;
              const delay = `${-Math.random() * 12}s`;
              return (
                <div
                  key={i}
                  className="absolute bottom-0 rounded-full bg-amber-500/10 blur-[1px] animate-spark"
                  style={{
                    left,
                    width: size,
                    height: size,
                    '--drift-duration': duration,
                    '--drift-x': driftX,
                    animationDelay: delay,
                  } as any}
                />
              );
            })}
          </div>

          <div className="relative max-w-xl w-full text-center flex flex-col items-center justify-center min-h-[300px] z-10 transition-opacity duration-1000">
            {endingPoetryIndex === 0 ? (
              // Empty element during pure-white transition phase to prevent early text layout rendering
              <div className="h-2" />
            ) : endingPoetryIndex >= 1 && endingPoetryIndex <= 3 ? (
              <div 
                key={endingPoetryIndex}
                className="text-stone-900 text-lg md:text-xl font-light tracking-[0.25em] leading-loose text-center select-none animate-poetry-slow max-w-xl px-4 font-sans whitespace-pre-line"
              >
                {ENDING_POEM_LINES[endingPoetryIndex - 1]}
              </div>
            ) : (
              /* Final state: Show all lines stacked beautifully with premium gallery aesthetics and a minimalist design */
              <div className="animate-fade-in flex flex-col items-center max-w-lg">
                {/* Seed bloom design elements */}
                <div className="w-16 h-[1.5px] bg-stone-300 mb-8" />
                
                <div className="space-y-6 text-base md:text-lg font-light tracking-[0.22em] leading-relaxed text-stone-800 mb-12 select-none">
                  <p className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>废墟不是世界的终点</p>
                  <p className="animate-fade-in" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>阳光会记得</p>
                  <p className="text-stone-950 font-medium animate-fade-in text-lg md:text-xl" style={{ animationDelay: '2.2s', animationFillMode: 'both' }}>
                    是你伸出的手，接住了人类的明天
                  </p>
                </div>

                <div className="w-16 h-[1.5px] bg-stone-300 mb-10" />

                <button
                  onClick={handleReset}
                  className="group py-3.5 px-8 bg-stone-900 border border-stone-800 text-stone-50 hover:bg-stone-950 hover:border-black rounded-xl font-semibold text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95 flex items-center gap-2 animate-fade-in"
                  style={{ animationDelay: '3.2s', animationFillMode: 'both' }}
                >
                  <RotateCcw className="w-4 h-4 transition-transform group-hover:rotate-[-45deg]" />
                  重新体验本场交互装置
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1.5 POETIC INTERLUDE COVER (Triggered after 10 seeds are collected, between stage 1 and stage 2) */}
      {showInterlude && (
        <div className="absolute inset-0 z-50 bg-[#0d0d10] flex items-center justify-center p-4">
          {/* Subtle slow floating background ambient spots */}
          <div className="absolute inset-0 bg-radial from-stone-900 via-[#0a0a0c] to-black opacity-80 pointer-events-none" />
          <div className="absolute top-[25%] left-[20%] w-80 h-80 rounded-full bg-teal-500/5 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[25%] right-[20%] w-80 h-80 rounded-full bg-stone-700/10 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

          <div className="relative max-w-xl w-full text-center p-8 bg-[#131317]/50 backdrop-blur-xl border border-stone-800/40 rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col items-center">
            {/* Top thematic visual decor */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-1px bg-gradient-to-r from-transparent to-stone-500" />
              <div className="text-stone-400 text-xs font-mono tracking-widest">ECO-ART TRANSITION</div>
              <div className="w-10 h-1px bg-gradient-to-l from-transparent to-stone-500" />
            </div>

            {/* Standard Welcome Titles */}
            <div className="space-y-4 mb-8 select-none">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-[0.2em] mb-4 text-stone-100 heading-font">
                废墟与盛绽
              </h1>
              <div className="w-8 h-0.5 bg-teal-500/40 mx-auto" />
              <p className="text-stone-400 text-xs font-mono tracking-widest uppercase animate-pulse">
                RUINS &amp; BLOOMING / SEED REAWAKENING
              </p>
            </div>

            <p className="text-stone-300 text-xs md:text-sm leading-relaxed mb-6 max-w-md mx-auto tracking-wide">
              十粒微光，十颗希望之种已收纳完毕。
              <br />
              当冷硬的重工业废墟遇到人类指尖的温度，生命将在这里重新发芽。
              <br />
              请在镜头前伸出双手并<span className="text-teal-400 font-semibold">左右挥手掌心</span>，唤醒废墟之下的生机萌发。
            </p>

            {/* Hand wave radar detector and progress bar */}
            <div className="w-full bg-[#1b1b23]/80 border border-stone-800/80 rounded-2xl p-5 mb-6 flex flex-col items-center gap-3">
              <div className="relative w-14 h-14 flex items-center justify-center">
                {/* Pulsing radar waves */}
                <div 
                  className={`absolute inset-0 rounded-full border border-teal-500/20 transition-all duration-300 ${
                    trackedHands.length > 0 ? 'scale-110 border-teal-500/40 animate-ping' : 'scale-100 animate-pulse'
                  }`} 
                />
                
                {/* Glowing background */}
                <div 
                  className={`absolute inset-1.5 rounded-full blur-md transition-all duration-500 ${
                    trackedHands.length > 0 ? 'bg-teal-500/10' : 'bg-teal-500/5'
                  }`} 
                />

                {/* Modern symbol representing gesture wave recognition */}
                <Hand className={`w-7 h-7 z-10 transition-all duration-300 ${
                  trackedHands.length > 0 
                    ? 'text-teal-400 scale-110 rotate-[-12deg]' 
                    : 'text-stone-400/60 animate-bounce'
                }`} />
              </div>

              {/* Live signal label */}
              <div className="text-center space-y-1">
                <p className={`text-xs font-mono uppercase tracking-widest font-semibold transition-colors duration-300 ${
                  trackedHands.length > 0 ? 'text-teal-400 font-bold' : 'text-stone-500 animate-pulse'
                }`}>
                  {trackedHands.length > 0 
                    ? '● 已捕捉手势，请开始左右挥手' 
                    : '○ 传感器就绪... 请在镜头前挥动掌心'}
                </p>
                <p className="text-[10px] text-stone-400 max-w-xs mx-auto font-sans leading-normal">
                  {trackedHands.length > 0 
                    ? '感应到大气环境气流变化，生命正在快速复苏' 
                    : '左右挥手，加速土壤下休眠向日葵球茎的根系温热'}
                </p>
              </div>

              {/* Progress activation slider */}
              <div className="w-full space-y-1.5 mt-1">
                <div className="flex justify-between items-center text-[9px] font-mono tracking-wider">
                  <span className="text-stone-500 uppercase">Eco Awake Syndrome Rate</span>
                  <span className={`font-semibold ${interludeWaveProgress > 50 ? 'text-teal-400 font-bold' : 'text-stone-400'}`}>
                    {Math.round(interludeWaveProgress)}%
                  </span>
                </div>
                
                <div className="w-full h-2.5 bg-stone-900 border border-stone-800 rounded-full overflow-hidden p-[1.5px]">
                  <div 
                    className={`h-full rounded-full transition-all duration-100 ease-out bg-gradient-to-r from-teal-500 to-emerald-500 ${
                      interludeWaveProgress > 60 ? 'shadow-[0_0_8px_rgba(20,184,166,0.5)]' : ''
                    }`}
                    style={{ width: `${interludeWaveProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Manual override button for accessibility fallback */}
            <div className="flex flex-col gap-1.5 items-center">
              <span className="text-[9px] text-stone-500 uppercase tracking-widest font-light">
                选项：亦可直接备份手动唤醒
              </span>
              <button
                onClick={handleStartWastelandTransition}
                className="group py-1.5 px-4 bg-stone-900/40 border border-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 rounded-lg text-[10px] tracking-widest uppercase transition-all shadow-md active:scale-95 flex items-center gap-1"
                id="awaken-hope-btn"
              >
                备份温控唤醒
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="mt-8 text-[9px] text-stone-500 leading-normal font-mono uppercase tracking-widest">
              STEP 1 COMPLETE • HARVEST STAGE OVER
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
          seedsCollected={seedsCollected}
          setSeedsCollected={setSeedsCollected}
          sunflowers={sunflowers}
          setSunflowers={setSunflowers}
          onHandshakeTriggered={handleHandshakeTriggered}
          onSeedCollected={() => {
            if (synthRef.current) {
              synthRef.current.playSeedPickupSound();
            }
          }}
          loadedBgImage={loadedBgImage}
          loadedCollectingSeedsBgImage={loadedCollectingSeedsBgImage}
          loadedModernCityBgImage={loadedModernCityBgImage}
          loadedSunflowerImage={loadedSunflowerImage}
          triggerWastelandTransition={triggerWastelandTransition}
        />

        {/* MediaPipe Hands webcam driver */}
        {(hasEntered || (!hasEntered && poetryIndex >= 5)) && (
          <CameraDetector 
            onHandsDetected={setTrackedHands} 
            isActive={hasEntered || (!hasEntered && poetryIndex >= 5)} 
            onStatusChange={setCameraDetectorStatus}
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
              {sceneState === 'collecting_seeds' && <span className="text-purple-400 animate-pulse">① 生机复苏：收集希望种子 ({seedsCollected}/10)</span>}
              {sceneState === 'wasteland' && <span className="text-rose-400">② 废墟繁育：阳光向日葵生机长成</span>}
              {sceneState === 'transition' && <span className="text-amber-400 animate-pulse">生态重置中 (Transition Resetting...)</span>}
              {sceneState === 'modern_city' && <span className="text-green-400 neon-glow">③ 现代阳光城市 (Modern Solar Paradise)</span>}
            </div>
          </div>
        </div>

        {/* HUD OVERLAY - INTERACTION INSTRUCTION OVERLAY PANEL (Togglable) */}
        {showGuide && (
          <div className="absolute top-6 right-6 z-30 w-80 pointer-events-none animate-fade-in">
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

              {sceneState === 'collecting_seeds' ? (
                <div className="space-y-3.5 text-[11.5px] leading-relaxed text-stone-300">
                  <div className="p-2 bg-amber-950/30 border border-amber-500/20 rounded">
                    <span className="text-amber-400 font-bold font-mono">第1步 · 收集希望种子：</span>
                    由于地面遭酸蚀，您需要先在空中收集 <span className="text-yellow-400 font-bold">10 颗漂浮的破晓种子</span>。
                  </div>
                  <div className="p-2 rounded bg-stone-900 border border-stone-800">
                    <span className="text-teal-400 font-bold font-mono">● 双重智控交互:</span>
                    本装置支持 <strong>【手势感应】</strong> 与 <strong>【极速触控/鼠标】</strong>：在没有摄像头时，您可以直接用手指在屏幕上触碰滑动，也可以用鼠标游走掠过，全息手势将跟随您的指尖或光标快速收集种子！
                  </div>

                  <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg shadow-inner flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-amber-400 font-mono font-bold tracking-wider">希望能量注入圈:</span>
                      <span className="text-stone-100 font-sans font-bold">{seedsCollected} / 10 粒</span>
                    </div>
                    <div className="w-full bg-stone-950 border border-stone-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${seedsCollected * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-[11.5px] leading-relaxed text-stone-300">
                  <div className="p-2 rounded bg-stone-900/80 border border-stone-800">
                    <span className="text-teal-400 font-bold font-mono">● 双重触手激活:</span>
                    在摄像头前张开双臂，或<strong>直接在屏幕上单指/双指触控滑动、甚至同时用鼠标点击或滑动</strong>，均能感应出对应的生态造物！
                  </div>
                  <div className="p-2 rounded transition-colors bg-stone-900/40 border border-stone-800/50">
                    <span className="text-teal-400 font-bold font-mono">2. 嫩芽一触：</span>
                    触碰一侧或张开 <strong>1只手</strong> 激发地面感应，繁育第一朵翠绿向日葵嫩芽。
                  </div>
                  <div className="p-2 rounded transition-colors bg-stone-900/40 border border-stone-800/50">
                    <span className="text-teal-400 font-bold font-mono">3. 辉芒共生：</span>
                    双指同时点击/滑动或张开 <strong>2只手</strong>，激发共生，生长第二朵金色向日葵。
                  </div>
                  <div className="p-2 rounded transition-colors bg-yellow-950/20 border border-yellow-500/20">
                    <span className="text-yellow-400 font-bold font-mono">4. 双指贴合/指尖聚拢：</span>
                    两只手的中指食指指尖靠拢（或<strong>在屏幕上做出用双指捏合贴近的手势/鼠标两点快速掠过</strong>），将立刻惊蛰爆发，重组现代阳光生态净化城！
                  </div>
                </div>
              )}

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
        {(sceneState === 'collecting_seeds' || sceneState === 'wasteland') && (
          <div className="absolute top-44 left-6 z-30 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm border border-stone-800/40 px-3 py-2 rounded-lg text-[10px] font-mono text-stone-400 flex flex-col gap-1">
              <div className="flex justify-between gap-10">
                <span>跟踪手部:</span>
                <span className="text-teal-400 font-bold font-sans">
                  {trackedHands.length} {' '} (Max: 2)
                </span>
              </div>
              <div className="flex justify-between">
                <span>收集种子:</span>
                <span className="text-amber-400 font-sans">{seedsCollected} / 10</span>
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
        {sceneState === 'collecting_seeds' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block">
            <div className="bg-stone-950/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-stone-800 shadow-xl flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="text-xs text-stone-300 font-mono tracking-wider">
                {trackedHands.length === 0 && "⌛ 等待访客挥动人手，开启末日环境感应器..."}
                {trackedHands.length > 0 && `✨ 同步成功：请移动手部圆点去触摸发光的“希望种子” (${seedsCollected}/10)`}
              </div>
            </div>
          </div>
        )}

        {sceneState === 'wasteland' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block">
            <div className="bg-stone-950/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-stone-800 shadow-xl flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
              <div className="text-xs text-stone-300 font-mono tracking-wider">
                {trackedHands.length === 0 && "⌛ 能量充盈完毕！等待访客举起单掌，触发阳光向日葵生长..."}
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
