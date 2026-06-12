/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
import { SceneState, Sunflower, TrackedHand, Particle } from '../types';
import { drawWasteland, drawModernCity, drawSunflower, drawHandTracker } from '../utils/drawing';

interface ArtCanvasProps {
  trackedHands: TrackedHand[];
  sceneState: SceneState;
  onSceneStateChange: (state: SceneState) => void;
  sunflowers: Sunflower[];
  setSunflowers: Dispatch<SetStateAction<Sunflower[]>>;
  onHandshakeTriggered: () => void;
  loadedBgImage: HTMLImageElement | null;
  loadedSunflowerImage: HTMLCanvasElement | null;
}

export default function ArtCanvas({
  trackedHands,
  sceneState,
  onSceneStateChange,
  sunflowers,
  setSunflowers,
  onHandshakeTriggered,
  loadedBgImage,
  loadedSunflowerImage,
}: ArtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas context and animation states
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const particlesRef = useRef<Particle[]>([]);
  const handshakeFrameCounterRef = useRef<number>(0);
  const transitionProgressRef = useRef<number>(0); // 0 (start) to 1 (complete)

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
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.8,
      vy: isWasteland ? -(0.2 + Math.random() * 0.5) : -(0.4 + Math.random() * 0.8), // Floating upwards
      size: Math.random() * (isWasteland ? 3 : 4) + 1,
      alpha: Math.random() * 0.6 + 0.1,
      color: isWasteland 
        ? ['#5c4a45', '#3c3a44', '#7c685b'][Math.floor(Math.random() * 3)] // Greyscale / rust particles
        : ['#ffe066', '#ffd633', '#e6eeff', '#66cc8a'][Math.floor(Math.random() * 4)], // Gold and green flower pollen
      life: 0,
      maxLife: 200 + Math.random() * 300,
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

    // Active gesture detection logic
    if (trackedHands.length === 1) {
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

    } else if (trackedHands.length === 2) {
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
      const handA = trackedHands[0];
      const handB = trackedHands[1];

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
  }, [trackedHands, dimensions.width, dimensions.height, sceneState]);

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
      if (sceneState === 'wasteland') {
        drawWasteland(ctx, width, height, time, loadedBgImage);
      } else if (sceneState === 'modern_city') {
        drawModernCity(ctx, width, height, time);
      } else if (sceneState === 'transition') {
        // Linear interpolation blend of wastewater and modern city
        // We'll update the progress bar ref
        transitionProgressRef.current = Math.min(1.0, transitionProgressRef.current + 0.01);
        const p = transitionProgressRef.current;

        // Draw wasteland base
        drawWasteland(ctx, width, height, time, loadedBgImage);

        // Draw modern city overlaid with gradual transparency alpha
        ctx.save();
        ctx.globalAlpha = p;
        drawModernCity(ctx, width, height, time);
        ctx.restore();

        // Check if transition sequence has completed (after 2.5 seconds or 100 frames)
        if (p >= 1.0) {
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
        p.vx += (Math.random() - 0.5) * 0.1;

        // Render shape
        ctx.save();
        ctx.globalAlpha = p.alpha * (1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        
        ctx.shadowBlur = sceneState === 'wasteland' ? 0 : 5;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
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
      if (sceneState === 'wasteland') {
        trackedHands.forEach((hand) => {
          drawHandTracker(ctx, hand, width, height, hand.label === 'Left');
        });
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [dimensions, sceneState, sunflowers, trackedHands]);

  // Make sure we reset transition progress counters when state goes back to wasteland
  useEffect(() => {
    if (sceneState === 'wasteland') {
      transitionProgressRef.current = 0;
    }
  }, [sceneState]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-neutral-950 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" id="art-installation-canvas" />
    </div>
  );
}
