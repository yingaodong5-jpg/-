/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SceneState = 'wasteland' | 'transition' | 'modern_city';

export interface Sunflower {
  id: string;
  x: number; // Ratio 0 to 1 based on canvas width
  y: number; // Ratio 0 to 1 based on canvas height, typically close to ground (e.g. 0.7 to 0.9)
  size: number; // Target face size
  growthPercent: number; // 0.0 to 1.0
  growthSpeed: number;
  swaySpeed: number;
  swayAmplitude: number;
  phase: number; // For swaying trig offsets
  maxStemHeight?: number; // Optional height parameter populated before rendering
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface TrackedHand {
  label: 'Left' | 'Right' | 'Unknown';
  score: number;
  landmarks: HandLandmark[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}
