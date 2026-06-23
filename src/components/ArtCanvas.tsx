/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, Dispatch, SetStateAction, useMemo, PointerEvent } from 'react';
import { SceneState, Sunflower, TrackedHand, Particle, HopeSeed } from '../types';
import { drawWasteland, drawModernCity, drawSunflower, drawHandTracker, drawGreyBackground, drawPrayerHalos } from '../utils/drawing';

interface ArtCanvasProps {
  trackedHands: TrackedHand[];
  sceneState: SceneState;
  onSceneStateChange: (state: SceneState) => void;
  seedsCollected: number;
  setSeedsCollected: Dispatch<SetStateAction<number>>;
  sunflowers: Sunflower[];
  setSunflowers: Dispatch<SetStateAction<Sunflower[]>>;
  onHandshakeTriggered: () => void;
  onSeedCollected: () => void;
  loadedBgImage: HTMLImageElement | null;
  loadedWastelandBgImages: HTMLImageElement[];
  loadedCollectingSeedsBgImage?: HTMLImageElement | null;
  loadedModernCityBgImage?: HTMLImageElement | null;
  loadedSunflowerImage: HTMLCanvasElement | null;
  triggerWastelandTransition: boolean;
}

export default function ArtCanvas({
  trackedHands,
  sceneState,
  onSceneStateChange,
  seedsCollected,
  setSeedsCollected,
  sunflowers,
  setSunflowers,
  onHandshakeTriggered,
  onSeedCollected,
  loadedBgImage,
  loadedWastelandBgImages,
  loadedCollectingSeedsBgImage,
  loadedModernCityBgImage,
  loadedSunflowerImage,
  triggerWastelandTransition,
}: ArtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulated pointer positions for backup mouse and touch operation
  const [simulatedPointers, setSimulatedPointers] = useState<{ x: number; y: number; isRight: boolean; id: number }[]>([]);

  // Convert raw screen pointers to a beautiful skeletal simulated hand
  const effectiveHands = useMemo(() => {
    if (trackedHands && trackedHands.length > 0) {
      return trackedHands;
    }

    return simulatedPointers.map(p => {
      const rx = 1 - p.x; // Counter-mirror adjustment so our click X aligns with canvas X
      const ry = p.y;
      
      const landmarks = Array.from({ length: 21 }, (_, i) => {
        let dx = 0;
        let dy = 0;
        if (i >= 1 && i <= 4) { // Thumb
          dx = -0.045 + (i * 0.012);
          dy = 0.015 - (i * 0.008);
        } else if (i >= 5 && i <= 8) { // Index
          dx = -0.012;
          dy = -0.02 - ((i - 5) * 0.022);
        } else if (i >= 9 && i <= 12) { // Middle
          dx = 0.0;
          dy = -0.028 - ((i - 9) * 0.024);
        } else if (i >= 13 && i <= 16) { // Ring
          dx = 0.012;
          dy = -0.024 - ((i - 13) * 0.022);
        } else if (i >= 17 && i <= 20) { // Pinky
          dx = 0.024;
          dy = -0.015 - ((i - 17) * 0.02);
        }
        if (p.isRight) {
          dx = -dx;
        }
        return { x: rx + dx, y: ry + dy, z: 0 };
      });

      return {
        label: p.isRight ? 'Right' : 'Left',
        score: 0.99,
        landmarks
      } as TrackedHand;
    });
  }, [trackedHands, simulatedPointers]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') {
      try { e.preventDefault(); } catch (err) {}
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const isRight = x > 0.5;

    setSimulatedPointers(prev => {
      const filtered = prev.filter(p => p.id !== e.pointerId);
      return [...filtered, { x, y, isRight, id: e.pointerId }];
    });
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setSimulatedPointers(prev => {
      const found = prev.some(p => p.id === e.pointerId);
      if (found) {
        return prev.map(p => p.id === e.pointerId ? { ...p, x, y, isRight: x > 0.5 } : p);
      } else {
        // Track hover movement for desktop mice automatically
        if (e.pointerType === 'mouse') {
          return [{ x, y, isRight: x > 0.5, id: e.pointerId }];
        }
        return prev;
      }
    });
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setSimulatedPointers(prev => prev.filter(p => p.id !== e.pointerId));
  };

  const handlePointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    // Clear cursor simulation only when pointer fully exits the workspace
    setSimulatedPointers(prev => prev.filter(p => p.id !== e.pointerId));
  };

  // Canvas context and animation states
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [activeSeed, setActiveSeed] = useState<HopeSeed | null>(null);

  const spawnRandomSeed = () => {
    return {
      x: 0.2 + Math.random() * 0.6, // Keep within center 60% of screen width for easy camera reach
      y: 0.2 + Math.random() * 0.4, // Keep within center 40% of screen height for natural arm range
      size: 14,
      pulsePhase: Math.random() * Math.PI * 2,
      color: ['#ffd700', '#f59e0b', '#facc15', '#fde047'][Math.floor(Math.random() * 4)],
    };
  };

  useEffect(() => {
    if (sceneState === 'collecting_seeds' && seedsCollected < 10) {
      if (!activeSeed) {
        setActiveSeed(spawnRandomSeed());
      }
    } else {
      setActiveSeed(null);
    }
  }, [sceneState, activeSeed, seedsCollected]);
  const particlesRef = useRef<Particle[]>([]);
  const handshakeFrameCounterRef = useRef<number>(0);
  const transitionProgressRef = useRef<number>(0); // 0 (start) to 1 (complete)
  const transitionEndedRef = useRef<boolean>(false);
  
  // Transition between seed stage and wasteland stage
  const seedTransitionActiveRef = useRef<boolean>(false);
  const seedTransitionProgressRef = useRef<number>(0);

  // Listener to trigger smooth cross-dissolve when interlude cover action is pressed
  useEffect(() => {
    if (triggerWastelandTransition && !seedTransitionActiveRef.current) {
      seedTransitionActiveRef.current = true;
      seedTransitionProgressRef.current = 0.01; // Begin!
      onHandshakeTriggered(); // plays satisfying high celestial bells
      spawnTransitionExplosionParticles(dimensions.width, dimensions.height);
    }
  }, [triggerWastelandTransition, dimensions.width, dimensions.height]);

  // 1. Dynamic Window sizing Observer (ResizeObserver ensures no static innerWidth calculations)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.floor(width),
          height: Math.floor(height),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize and spawn ambient particles on scene changes
  useEffect(() => {
    const particles: Particle[] = [];
    const count = sceneState === 'wasteland' ? 40 : 60;
    
    for (let i = 0; i < count; i++) {
      particles.push(spawnAmbientParticle(dimensions.width, dimensions.height, sceneState));
    }
    particlesRef.current = particles;
  }, [sceneState, dimensions.width]);

  // Utility to create ambient floaties
  const spawnAmbientParticle = (w: number, h: number, state: SceneState): Particle => {
    const isWasteland = state === 'wasteland';
    const isSeeds = state === 'collecting_seeds';
    
    let vx = (Math.random() - 0.5) * 0.8;
    let vy = isWasteland ? -(0.2 + Math.random() * 0.5) : -(0.4 + Math.random() * 0.8);
    let size = Math.random() * (isWasteland ? 3 : 4) + 1;
    let alpha = Math.random() * 0.6 + 0.15;
    let color = '';
    let maxLife = 200 + Math.random() * 300;
    
    let isMetallic = false;
    let angle = 0;
    let spinSpeed = 0;

    if (isSeeds) {
      // Heavy metal floating particles: cool steel, iron, silver and carbon shades
      const colors = ['#8e8e93', '#7c7c82', '#aeaea3', '#d1d1d6', '#48484a', '#a1a1aa'];
      color = colors[Math.floor(Math.random() * colors.length)];
      vx = (Math.random() - 0.5) * 0.6;
      vy = -(0.15 + Math.random() * 0.4); // Slow heavy suspension
      size = Math.random() * 5.5 + 2.5; // Bigger metallic chunks
      alpha = Math.random() * 0.5 + 0.25;
      isMetallic = true;
      angle = Math.random() * Math.PI * 2;
      spinSpeed = (Math.random() - 0.5) * 0.05;
      maxLife = 280 + Math.random() * 350;
    } else if (isWasteland) {
      color = ['#5c4a45', '#3c3a44', '#7c685b'][Math.floor(Math.random() * 3)];
    } else {
      color = ['#ffe066', '#ffd633', '#e6eeff', '#66cc8a'][Math.floor(Math.random() * 4)];
    }

    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx,
      vy,
      size,
      alpha,
      color,
      life: 0,
      maxLife,
      isMetallic,
      angle,
      spinSpeed,
    };
  };

  // Trigger bursts during golden transition
  const spawnTransitionExplosionParticles = (w: number, h: number) => {
    const centerParts: Particle[] = [];
    // Spawn 150 bright glowing particles erupting from screen center
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      centerParts.push({
        x: w / 2,
        y: h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 2,
        alpha: 1.0,
        color: ['#ffffff', '#ffeb60', '#ffc125', '#ffa500'][Math.floor(Math.random() * 4)],
        life: 0,
        maxLife: 80 + Math.random() * 60,
      });
    }
    particlesRef.current = [...particlesRef.current, ...centerParts];
  };

  // 2. Continuous Hand Detection and logic processing
  useEffect(() => {
    if (sceneState === 'modern_city') return; // Once transitioned, do no more processing

    // --- HOPE SEEDS COLLECTION COLLISION CHECK ---
    if (sceneState === 'collecting_seeds' && seedsCollected < 10) {
      if (!activeSeed || effectiveHands.length === 0) return;

      const seedX = activeSeed.x * dimensions.width;
      const seedY = activeSeed.y * dimensions.height;

      let wasTouched = false;
      for (const hand of effectiveHands) {
        for (const pt of hand.landmarks) {
          // Flip horizontally to match canvas graphics
          const px = (1 - pt.x) * dimensions.width;
          const py = pt.y * dimensions.height;

          const dist = Math.sqrt(Math.pow(px - seedX, 2) + Math.pow(py - seedY, 2));
          // If any joint touches the seed (radius 34px is perfect for touch interaction)
          if (dist < 34) {
            wasTouched = true;
            break;
          }
        }
        if (wasTouched) break;
      }

      if (wasTouched) {
        // Satisfaction neon particle bursts
        const burst: Particle[] = [];
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.2 + Math.random() * 4.0;
          burst.push({
            x: seedX,
            y: seedY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 4.5 + 1.5,
            alpha: 1.0,
            color: activeSeed.color,
            life: 0,
            maxLife: 40 + Math.random() * 25,
          });
        }
        particlesRef.current = [...particlesRef.current, ...burst];

        // Trigger synthesis chime
        onSeedCollected();

        const newCount = seedsCollected + 1;
        setSeedsCollected(newCount);

        if (newCount >= 10) {
          // Complete! Hide the active seed. The poetic interlude cover will show, and transition is triggered via prop button
          setActiveSeed(null);
        } else {
          setActiveSeed(spawnRandomSeed());
        }
      }
      return;
    }

    // Active gesture detection logic
    if (effectiveHands.length === 1) {
      handshakeFrameCounterRef.current = 0;
      
      // 1 hand → grow first sunflower
      setSunflowers((prev) => {
        if (prev.length === 0) {
          // Initialize first sunflower at relative position
          const firstFlower: Sunflower = {
            id: 'flower_1',
            x: dimensions.width * 0.35,
            y: dimensions.height * (0.78 + Math.random() * 0.08),
            size: 45 + Math.random() * 10,
            growthPercent: 0.01,
            growthSpeed: 0.012,
            swaySpeed: 0.0015 + Math.random() * 0.001,
            swayAmplitude: 0.12 + Math.random() * 0.08,
            phase: Math.random() * 100,
          };
          return [firstFlower];
        } else {
          // Accelerate growth of already spawned item
          return prev.map((f) => {
            if (f.id === 'flower_1') {
              return { ...f, growthPercent: Math.min(1.0, f.growthPercent + f.growthSpeed) };
            }
            return f;
          });
        }
      });

    } else if (effectiveHands.length === 2) {
      // 2 hands → grow/verify second sunflower, AND check for handshake
      setSunflowers((prev) => {
        let updated = [...prev];
        // Ensure flower 1 exists
        if (!updated.some(f => f.id === 'flower_1')) {
          updated.push({
            id: 'flower_1',
            x: dimensions.width * 0.35,
            y: dimensions.height * 0.82,
            size: 50,
            growthPercent: 0.01,
            growthSpeed: 0.012,
            swaySpeed: 0.002,
            swayAmplitude: 0.15,
            phase: Math.random() * 100,
          });
        }
        // Ensure flower 2 exists
        if (!updated.some(f => f.id === 'flower_2')) {
          updated.push({
            id: 'flower_2',
            x: dimensions.width * 0.65,
            y: dimensions.height * (0.80 + Math.random() * 0.06),
            size: 44 + Math.random() * 8,
            growthPercent: 0.01,
            growthSpeed: 0.012,
            swaySpeed: 0.0018 + Math.random() * 0.0008,
            swayAmplitude: 0.14 + Math.random() * 0.06,
            phase: Math.random() * 100,
          });
        }

        // Apply progressive growth
        return updated.map((f) => {
          if (f.id === 'flower_1' || f.id === 'flower_2') {
            return { ...f, growthPercent: Math.min(1.0, f.growthPercent + f.growthSpeed) };
          }
          return f;
        });
      });

      // --- FINGERTIPS TOUCHING RECOGNITION (双手指尖相触 - FINGERTIPS CONNECTED) ---
      const handA = effectiveHands[0];
      const handB = effectiveHands[1];

      // Wrist keypoint is 0. Fingertips are 4 (Thumb), 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky).
      const indexA = handA.landmarks[8];
      const indexB = handB.landmarks[8];

      const middleA = handA.landmarks[12];
      const middleB = handB.landmarks[12];

      const thumbA = handA.landmarks[4];
      const thumbB = handB.landmarks[4];

      // Calculate distances between corresponding tips
      const distIndex = Math.sqrt(
        Math.pow(indexA.x - indexB.x, 2) + Math.pow(indexA.y - indexB.y, 2)
      );

      const distMiddle = Math.sqrt(
        Math.pow(middleA.x - middleB.x, 2) + Math.pow(middleA.y - middleB.y, 2)
      );

      const distThumb = Math.sqrt(
        Math.pow(thumbA.x - thumbB.x, 2) + Math.pow(thumbA.y - thumbB.y, 2)
      );

      // Trigger if any major fingertips (index, middle, or thumb) are touching or extremely close (< 0.09)
      const isClasping = distIndex < 0.09 || distMiddle < 0.09 || distThumb < 0.09;

      if (isClasping) {
        handshakeFrameCounterRef.current += 1;
        // Require persistent action for 12 frames (~200ms) to filter tracking noise
        if (handshakeFrameCounterRef.current >= 12 && sceneState === 'wasteland') {
          // Trigger transition!
          onSceneStateChange('transition');
          onHandshakeTriggered();
          spawnTransitionExplosionParticles(dimensions.width, dimensions.height);
        }
      } else {
        handshakeFrameCounterRef.current = Math.max(0, handshakeFrameCounterRef.current - 1);
      }
    } else {
      // 0 hands
      handshakeFrameCounterRef.current = 0;
    }
  }, [
    effectiveHands, 
    dimensions.width, 
    dimensions.height, 
    sceneState, 
    activeSeed, 
    seedsCollected, 
    setSeedsCollected, 
    onSeedCollected, 
    onSceneStateChange, 
    onHandshakeTriggered
  ]);

  // Handle automatic progressive growth of transition-bloomed sunflowers
  useEffect(() => {
    if (sceneState !== 'modern_city') return;

    // In modern city state, make sure all random field sunflowers grow to 100%
    const interval = setInterval(() => {
      setSunflowers((prev) => {
        const fullyGrown = prev.every((f) => f.growthPercent >= 1.0);
        if (fullyGrown) {
          clearInterval(interval);
          return prev;
        }
        return prev.map((f) => ({
          ...f,
          growthPercent: Math.min(1.0, f.growthPercent + 0.02),
        }));
      });
    }, 40);

    return () => clearInterval(interval);
  }, [sceneState]);

  // 3. Core Canvas Render Animation loop (React state triggers canvas paint with high precision)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const time = Date.now();
      const { width, height } = dimensions;

      // Ensure crisp canvas resolutions
      canvas.width = width;
      canvas.height = height;

      // A) --- BACKGROUND DRAWING STAGE ---
      if (sceneState === 'collecting_seeds') {
        if (seedTransitionActiveRef.current) {
          // Progress from 0 to 1
          seedTransitionProgressRef.current = Math.min(1.0, seedTransitionProgressRef.current + 0.012); // smooth 1-second transition
          const p = seedTransitionProgressRef.current;
          
          // Draw grey background base with slideshow
          drawGreyBackground(ctx, width, height, time, null, loadedWastelandBgImages);
          
          // Overlap wasteland background with alpha p
          ctx.save();
          ctx.globalAlpha = p;
          drawWasteland(ctx, width, height, time, null, loadedWastelandBgImages);
          ctx.restore();
          
          if (p >= 1.0) {
            seedTransitionActiveRef.current = false;
            seedTransitionProgressRef.current = 0;
            onSceneStateChange('wasteland');
          }
        } else {
          drawGreyBackground(ctx, width, height, time, null, loadedWastelandBgImages);
        }
      } else if (sceneState === 'wasteland') {
        drawWasteland(ctx, width, height, time, null, loadedWastelandBgImages);
      } else if (sceneState === 'modern_city') {
        drawModernCity(ctx, width, height, time, loadedModernCityBgImage);
      } else if (sceneState === 'transition') {
        // Linear interpolation blend of wastewater and modern city
        // We'll update the progress bar ref
        transitionProgressRef.current = Math.min(1.0, transitionProgressRef.current + 0.01);
        const p = transitionProgressRef.current;

        // Draw wasteland base
        drawWasteland(ctx, width, height, time, null, loadedWastelandBgImages);

        // Draw modern city overlaid with gradual transparency alpha
        ctx.save();
        ctx.globalAlpha = p;
        drawModernCity(ctx, width, height, time, loadedModernCityBgImage);
        ctx.restore();

        // Check if transition sequence has completed (after 2.5 seconds or 100 frames)
        if (p >= 1.0 && !transitionEndedRef.current) {
          transitionEndedRef.current = true;
          // Transition complete. Shift state permanently.
          onSceneStateChange('modern_city');
          
          // Generate beautiful massive sunflower fields scattered over the clean paved ground!
          const fieldSunflowers: Sunflower[] = [];
          
          // Carry over the first 2 grown flowers
          const initialFlowers = sunflowers.filter(f => f.id === 'flower_1' || f.id === 'flower_2');
          
          // Spawn another 25 radiant sunflower units on the floor randomly
          for (let s = 0; s < 25; s++) {
            const ratioX = 0.05 + (s * 0.038) + (Math.random() * 0.03); // Distributed left-to-right
            fieldSunflowers.push({
              id: `field_flower_${s}`,
              x: width * ratioX,
              y: height * (0.75 + Math.random() * 0.16),
              size: 28 + Math.random() * 20,
              growthPercent: 0.1, // Initiates quick bloom animation in modern city
              growthSpeed: 0.01 + Math.random() * 0.015,
              swaySpeed: 0.001 + Math.random() * 0.0012,
              swayAmplitude: 0.1 + Math.random() * 0.08,
              phase: Math.random() * 100,
            });
          }

          setSunflowers([...initialFlowers, ...fieldSunflowers]);
        }
      }

      // B) --- SUNFLOWERS RENDERING STAGE ---
      sunflowers.forEach((flower) => {
        // Send actual pixel values for max stem heights matching canvas proportions
        const maxStemHeight = flower.id === 'flower_1' || flower.id === 'flower_2' 
          ? height * 0.32 
          : height * (0.15 + (flower.size / 100)); // Dynamic matching sizes

        drawSunflower(ctx, { ...flower, maxStemHeight }, time, loadedSunflowerImage);
      });

      // C) --- DYNAMIC PARTICLES SYSTEM (Pollen floating, rust floating, explosion dust) ---
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Apply slight turbulence wiggles
        p.vx += (Math.random() - 0.5) * 0.15;

        // Render shape
        ctx.save();
        ctx.globalAlpha = p.alpha * (1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        
        ctx.shadowBlur = (sceneState === 'wasteland' || sceneState === 'collecting_seeds') ? 0 : 5;
        ctx.shadowColor = p.color;

        if (p.isMetallic) {
          // Update rotation angle
          if (p.angle !== undefined && p.spinSpeed !== undefined) {
            p.angle += p.spinSpeed;
          }
          const angle = p.angle || 0;
          
          // Draw a shiny metallic diamond shard
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          
          ctx.beginPath();
          // Diamond or parallelogram shape for metallic shards
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.7, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.7, 0);
          ctx.closePath();
          ctx.fill();
          
          // Draw metallic reflection highlight line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-p.size * 0.4, 0);
          ctx.lineTo(p.size * 0.4, 0);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        return p.life < p.maxLife && p.y > 0 && p.x > 0 && p.x < width;
      });

      // Top up ambient drifting particles if active counts decay
      const expectedAmbientCount = sceneState === 'wasteland' ? 40 : 60;
      const currentAmbient = particlesRef.current.filter(p => Math.abs(p.vx) < 1.5).length;
      if (currentAmbient < expectedAmbientCount) {
        particlesRef.current.push(spawnAmbientParticle(width, height, sceneState));
      }

      // D) --- HIGH INTENSITY TRANSITION GOLDEN GLOW EFFECT ---
      if (sceneState === 'transition') {
        const p = transitionProgressRef.current;
        if (p < 0.6) {
          // Giant central expanding blast dome during first half of transition sequence
          const blastRadius = width * 1.5 * (p / 0.6);
          const flashGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, blastRadius);
          
          flashGrad.addColorStop(0, 'rgba(255, 246, 215, 0.95)');
          flashGrad.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
          flashGrad.addColorStop(0.7, 'rgba(255, 140, 0, 0.25)');
          flashGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, blastRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Full screen blinding flash peak at p = 0.5, then fade back to clear
        let flashAlpha = 0;
        if (p < 0.5) {
          flashAlpha = p * 2; // linear fade in
        } else {
          flashAlpha = 2 - p * 2; // linear fade out
        }

        if (flashAlpha > 0.01) {
          ctx.fillStyle = `rgba(255, 253, 240, ${flashAlpha * 0.9})`;
          ctx.fillRect(0, 0, width, height);
        }
      }

      // E) --- CYBERNETIC HAND OVERLAYS (Only display tracked pointers in heavy-metal wasteland stage for HUD looks) ---
      if (sceneState === 'collecting_seeds' || sceneState === 'wasteland') {
        effectiveHands.forEach((hand) => {
          drawHandTracker(ctx, hand, width, height, hand.label === 'Left');
        });
      }

      // F) --- HOPE SEED DRAWING STAGE ---
      if (sceneState === 'collecting_seeds' && activeSeed && seedsCollected < 10) {
        const seedX = activeSeed.x * width;
        const seedY = activeSeed.y * height;
        const pulse = Math.sin((time / 150) + activeSeed.pulsePhase) * 3;
        const baseRadius = 8 + pulse;

        ctx.save();
        // Soft aura background glow
        const glowGrad = ctx.createRadialGradient(seedX, seedY, 1, seedX, seedY, baseRadius * 3.5);
        glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
        glowGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.5)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(seedX, seedY, baseRadius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Teardrop central seedling core
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#facc15';

        ctx.beginPath();
        ctx.moveTo(seedX, seedY - baseRadius * 1.3);
        ctx.bezierCurveTo(seedX + baseRadius, seedY - baseRadius * 0.1, seedX + baseRadius, seedY + baseRadius, seedX, seedY + baseRadius);
        ctx.bezierCurveTo(seedX - baseRadius, seedY + baseRadius, seedX - baseRadius, seedY - baseRadius * 0.1, seedX, seedY - baseRadius * 1.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3 floating stellar satellites looping around
        const speedFactor = time * 0.0035;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
        for (let i = 0; i < 3; i++) {
          const angle = speedFactor + (i * (Math.PI * 2 / 3));
          const orbitX = seedX + Math.cos(angle) * (baseRadius * 1.8);
          const orbitY = seedY + Math.sin(angle) * (baseRadius * 1.8);
          ctx.beginPath();
          ctx.arc(orbitX, orbitY, 2.5 + Math.sin(time * 0.008 + i) * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // D) --- FOREGROUND PRAYER HALOS (foreground layering over sunflowers/particles) ---
      if (sceneState === 'modern_city' || sceneState === 'transition') {
        const transAlpha = sceneState === 'transition' ? transitionProgressRef.current : 1.0;
        ctx.save();
        ctx.globalAlpha = transAlpha;
        drawPrayerHalos(ctx, width, height, time);
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [dimensions, sceneState, sunflowers, effectiveHands, activeSeed, loadedBgImage, loadedWastelandBgImages, loadedCollectingSeedsBgImage, loadedModernCityBgImage, loadedSunflowerImage]);

  // Make sure we reset transition progress counters on resets
  useEffect(() => {
    if (sceneState === 'collecting_seeds') {
      seedTransitionActiveRef.current = false;
      seedTransitionProgressRef.current = 0;
      transitionEndedRef.current = false;
    } else if (sceneState === 'wasteland') {
      transitionProgressRef.current = 0;
      transitionEndedRef.current = false;
    }
  }, [sceneState]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-neutral-950 overflow-hidden touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
    >
      <canvas ref={canvasRef} className="block w-full h-full" id="art-installation-canvas" />
    </div>
  );
}
