/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sunflower, Particle } from '../types';

// Procedure to draw the futurist heavy metal ruins (wasteland)
export function drawWasteland(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, bgImage?: HTMLImageElement | null) {
  if (bgImage) {
    // 1. Maintain object-fit: cover aspect ratio scaling on the canvas
    const imgRatio = bgImage.width / bgImage.height;
    const canvasRatio = width / height;
    let sWidth, sHeight, sx, sy;

    if (canvasRatio > imgRatio) {
      sWidth = bgImage.width;
      sHeight = bgImage.width / canvasRatio;
      sx = 0;
      sy = (bgImage.height - sHeight) / 2;
    } else {
      sWidth = bgImage.height * canvasRatio;
      sHeight = bgImage.height;
      sx = (bgImage.width - sWidth) / 2;
      sy = 0;
    }

    ctx.drawImage(bgImage, sx, sy, sWidth, sHeight, 0, 0, width, height);

    // 2. Add a cinematic vignette filter
    const vignette = ctx.createRadialGradient(
      width / 2, 
      height / 2, 
      width * 0.2, 
      width / 2, 
      height / 2, 
      width * 0.72
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // 3. Keep drawing animated rising smoke overlay to add extra dynamic motion to the heavy-metal ruins
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 3; i++) {
      const x = (width * 0.25) + i * (width * 0.3) + Math.sin(time * 0.0004 + i) * 25;
      const smokeGrad = ctx.createRadialGradient(x, height * 0.35, 12, x - 15, height * 0.25, 140);
      smokeGrad.addColorStop(0, 'rgba(40, 30, 25, 0.7)');
      smokeGrad.addColorStop(0.6, 'rgba(15, 15, 18, 0.35)');
      smokeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(x, height * 0.35, 180, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    return;
  }

  // Fallback elegant dark background if image hasn't loaded yet
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#131110');
  skyGrad.addColorStop(1, '#090807');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);
}

// Procedure to draw the modern glass-and-sunshine city (paradise)
export function drawModernCity(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  // 1. Sky: Vibrant sky blue with warm gold setting sun/glorious sun center
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#5fa7e8');   // Energetic sky blue
  skyGrad.addColorStop(0.3, '#cae3fc'); // Lighter horizon
  skyGrad.addColorStop(0.7, '#fff2db'); // Soft golden hue
  skyGrad.addColorStop(1, '#dbf7df');   // Green ecological ground bloom
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw high glass skyscraper silhouettes with linear transparency and window matrix grids
  ctx.save();
  // Distant buildings
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(width * 0.05, height * 0.35, width * 0.15, height * 0.5);
  ctx.fillRect(width * 0.3, height * 0.28, width * 0.18, height * 0.6);
  ctx.fillRect(width * 0.65, height * 0.42, width * 0.12, height * 0.45);

  // Sleek midground eco-skyscrapers with reflecting glass gradients
  const buildingGrad1 = ctx.createLinearGradient(width * 0.15, 0, width * 0.35, 0);
  buildingGrad1.addColorStop(0, 'rgba(197, 227, 255, 0.85)');
  buildingGrad1.addColorStop(0.5, 'rgba(235, 245, 255, 0.9)');
  buildingGrad1.addColorStop(1, 'rgba(168, 208, 245, 0.85)');

  ctx.fillStyle = buildingGrad1;
  ctx.beginPath();
  // Sleek organic design curved modern tower on the left
  ctx.moveTo(width * 0.15, height * 0.8);
  ctx.quadraticCurveTo(width * 0.18, height * 0.2, width * 0.28, height * 0.15);
  ctx.lineTo(width * 0.33, height * 0.15);
  ctx.lineTo(width * 0.33, height * 0.8);
  ctx.closePath();
  ctx.fill();

  // Glass highlights for building 1
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width * 0.2, height * 0.78);
  ctx.quadraticCurveTo(width * 0.22, height * 0.28, width * 0.28, height * 0.19);
  ctx.stroke();

  // Draw sleek building 2 on the right
  const buildingGrad2 = ctx.createLinearGradient(width * 0.52, 0, width * 0.75, 0);
  buildingGrad2.addColorStop(0, 'rgba(172, 219, 255, 0.85)');
  buildingGrad2.addColorStop(0.5, 'rgba(215, 248, 225, 0.9)'); // Eco green hue reflections
  buildingGrad2.addColorStop(1, 'rgba(128, 191, 247, 0.85)');

  ctx.fillStyle = buildingGrad2;
  ctx.beginPath();
  // Angled geometric tower
  ctx.moveTo(width * 0.52, height * 0.8);
  ctx.lineTo(width * 0.52, height * 0.3);
  ctx.lineTo(width * 0.65, height * 0.1);
  ctx.lineTo(width * 0.72, height * 0.15);
  ctx.lineTo(width * 0.72, height * 0.8);
  ctx.closePath();
  ctx.fill();

  // Vertical glass panel highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let xOffset = 0.55; xOffset < 0.7; xOffset += 0.04) {
    ctx.moveTo(width * xOffset, height * 0.78);
    ctx.lineTo(width * xOffset, height * (0.35 - (xOffset - 0.52) * 1.1));
  }
  ctx.stroke();

  // Gentle white fluffy clouds floating
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  const cloudX = (width * 0.45) + Math.cos(time * 0.0001) * 35;
  ctx.arc(cloudX, height * 0.22, 35, 0, Math.PI * 2);
  ctx.arc(cloudX + 25, height * 0.2, 45, 0, Math.PI * 2);
  ctx.arc(cloudX + 55, height * 0.22, 35, 0, Math.PI * 2);
  ctx.arc(cloudX + 25, height * 0.25, 35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 3. Clean paved plaza ground with lush green tree groves
  const groundGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
  groundGrad.addColorStop(0, '#f2f8f3'); // Clean ecological granite
  groundGrad.addColorStop(0.3, '#e5efe6');
  groundGrad.addColorStop(1, '#c0ddc5'); // Flourishing grass tint base
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.72, width, height - height * 0.72);

  // Draw perspective tiles on clean street
  ctx.strokeStyle = 'rgba(125,180,140,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let tx = -width * 0.2; tx < width * 1.2; tx += width * 0.1) {
    ctx.moveTo(tx, height * 0.72);
    ctx.lineTo(tx + (tx - width / 2) * 1.5, height);
  }
  ctx.stroke();

  // 4. Draw lush eco trees in the foreground/midground sides
  ctx.save();
  // Left side trees
  drawParkTree(ctx, width * 0.08, height * 0.74, 55);
  drawParkTree(ctx, width * 0.14, height * 0.75, 40);

  // Right side trees
  drawParkTree(ctx, width * 0.85, height * 0.73, 60);
  drawParkTree(ctx, width * 0.92, height * 0.75, 45);
  ctx.restore();

  // Sun flare effect in top center-right
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sunX = width * 0.8;
  const sunY = height * 0.18;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 250);
  sunGlow.addColorStop(0, 'rgba(255, 235, 180, 0.4)');
  sunGlow.addColorStop(0.2, 'rgba(255, 210, 120, 0.18)');
  sunGlow.addColorStop(0.6, 'rgba(255, 180, 100, 0.05)');
  sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParkTree(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
  ctx.save();
  // Trunk
  ctx.fillStyle = '#4c3f38';
  ctx.fillRect(x - 5, y - height, 10, height);

  // Foliage shapes (overlapping lush green circles)
  const foliages = [
    { dx: 0, dy: -height, r: height * 0.6, c: '#51ab66' },
    { dx: -height * 0.35, dy: -height * 0.95, r: height * 0.45, c: '#439b57' },
    { dx: height * 0.35, dy: -height * 0.95, r: height * 0.45, c: '#61bb76' },
    { dx: 0, dy: -height * 1.3, r: height * 0.5, c: '#79cf8e' }
  ];

  foliages.forEach(fol => {
    ctx.fillStyle = fol.c;
    ctx.beginPath();
    ctx.arc(x + fol.dx, y + fol.dy, fol.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// Procedure to draw a beautifully animated Sunflower
export function drawSunflower(ctx: CanvasRenderingContext2D, flower: Sunflower, time: number, flowerImage?: HTMLCanvasElement | HTMLImageElement | null) {
  const maxStemHeight = flower.maxStemHeight ?? 180;
  const currentHeight = maxStemHeight * flower.growthPercent;
  const currentSize = flower.size * flower.growthPercent;

  if (currentHeight < 5) return; // Too small to render

  // Calculate swaying angle
  const swayAngle = Math.sin(time * flower.swaySpeed + flower.phase) * flower.swayAmplitude * flower.growthPercent;

  // Use the high-fidelity style image provided if loaded successfully
  if (flowerImage && flowerImage.width > 0) {
    ctx.save();
    // Translate to ground position
    ctx.translate(flower.x, flower.y);
    
    // Sway the entire flower organically from the base
    ctx.rotate(swayAngle * 0.45);

    // Maintain natural aspect ratio of the style image when scaling with growth
    const imgRatio = flowerImage.width / flowerImage.height;
    const drawHeight = currentHeight;
    const drawWidth = drawHeight * imgRatio;

    // Center bottom-middle of drawing bounding box on (0, 0)
    ctx.drawImage(flowerImage, -drawWidth / 2, -drawHeight, drawWidth, drawHeight);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(flower.x, flower.y);

  // Draw the green organic stem with curves
  ctx.strokeStyle = '#2d8c3e'; // Beautiful vibrant green for stem
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, 8 * flower.growthPercent);

  ctx.beginPath();
  ctx.moveTo(0, 0); // Ground position

  // Draw curved stem based on sway angle
  const controlX = swayAngle * currentHeight * 0.4;
  const targetX = swayAngle * currentHeight;
  const targetY = -currentHeight;

  ctx.quadraticCurveTo(controlX, -currentHeight * 0.5, targetX, targetY);
  ctx.stroke();

  // Draw leaves along the stem
  const numLeaves = 2;
  const leafGreen = '#37a74a';
  for (let i = 1; i <= numLeaves; i++) {
    const leafRatio = i * 0.4; // Positions along the stem
    if (flower.growthPercent >= leafRatio) {
      ctx.save();
      // Estimate position along quadratic curve at ratio
      const t = leafRatio;
      const lx = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * controlX + t * t * targetX;
      const ly = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (-currentHeight * 0.5) + t * t * targetY;
      
      ctx.translate(lx, ly);
      ctx.rotate(swayAngle + (i % 2 === 0 ? Math.PI / 4 : -Math.PI / 4));
      
      // Draw almond shaped leaf
      ctx.fillStyle = leafGreen;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16 * flower.growthPercent, 7 * flower.growthPercent, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1d6e2a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Translate to the head of the sunflower
  ctx.translate(targetX, targetY);
  ctx.rotate(swayAngle * 0.4); // Subtle independent rotation of flower face

  // Draw outer yellow petals (Layer 1 - deep orange-yellow, Layer 2 - bright sunflower-yellow)
  const numPetals = 20;
  const innerRadius = currentSize * 0.28;
  const outerRadius = currentSize * 0.95;

  ctx.shadowBlur = 4;
  ctx.shadowColor = 'rgba(230, 130, 0, 0.4)';

  // Layer 1 Petals
  ctx.fillStyle = '#ffaa00'; // Warm rich orange-yellow
  for (let p = 0; p < numPetals; p++) {
    const angle = (p * Math.PI * 2) / numPetals;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-currentSize * 0.15, innerRadius, 0, outerRadius);
    ctx.quadraticCurveTo(currentSize * 0.15, innerRadius, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  // Layer 2 Petals (Offset in angle and smaller)
  ctx.fillStyle = '#ffea00'; // Bright luminous yellow
  for (let p = 0; p < numPetals; p++) {
    const angle = ((p + 0.5) * Math.PI * 2) / numPetals;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-currentSize * 0.12, innerRadius * 1.1, 0, outerRadius * 0.88);
    ctx.quadraticCurveTo(currentSize * 0.12, innerRadius * 1.1, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowBlur = 0; // Reset shadows

  // Draw the dark brown center seed disk (textured concentric structure)
  ctx.fillStyle = '#3a2107'; // Deep brown core
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#221202';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rich inner textured rings (orange-brown fuzz/fertile florets)
  ctx.strokeStyle = '#ca730a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#e6ab03';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius * 0.4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Draw hand overlay UI (Sleek sci-fi tracker coordinates line matching the heavy-metal vibe)
export function drawHandTracker(
  ctx: CanvasRenderingContext2D,
  hand: any,
  canvasWidth: number,
  canvasHeight: number,
  isLeft: boolean
) {
  ctx.save();
  
  // Design color palette
  const accentColor = isLeft ? 'rgba(0, 240, 255, 0.85)' : 'rgba(255, 90, 180, 0.85)';
  const glowColor = isLeft ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 90, 180, 0.3)';
  
  ctx.strokeStyle = accentColor;
  ctx.fillStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const landmarks = hand.landmarks;

  // Render tracking joint connections (Bones)
  const connections = [
    [0, 1, 2, 3, 4],       // Thumb
    [0, 5, 8], [5, 6, 7, 8], // Index
    [9, 10, 11, 12],       // Middle
    [13, 14, 15, 16],      // Ring
    [0, 17, 18, 19, 20],   // Pinky
    [5, 9], [9, 13], [13, 17] // Palm bridge
  ];

  // Draw fingers path
  connections.forEach((path) => {
    ctx.beginPath();
    path.forEach((ptIndex, idx) => {
      // Coordinate conversions: landmarks are relative 0..1 from top-left, with flipped horizontal for camera mirror
      const pt = landmarks[ptIndex];
      const px = (1 - pt.x) * canvasWidth;
      const py = pt.y * canvasHeight;
      if (idx === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();
  });

  // Render tracking nodes (Joints)
  landmarks.forEach((pt: any, idx: number) => {
    const px = (1 - pt.x) * canvasWidth;
    const py = pt.y * canvasHeight;

    // Special tips size
    const isTip = [4, 8, 12, 16, 20].includes(idx);
    const radius = isTip ? 6 : 4;

    ctx.shadowBlur = 8;
    ctx.shadowColor = glowColor;

    ctx.fillStyle = isTip ? '#ffffff' : accentColor;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    if (isTip) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // Clean shadow settings
  ctx.shadowBlur = 0;

  // Draw identification text overlay beside wrist
  const wrist = landmarks[0];
  const wx = (1 - wrist.x) * canvasWidth;
  const wy = wrist.y * canvasHeight + 25;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${hand.label === 'Left' ? 'LEFT' : 'RIGHT'} TASK - CONF: ${Math.round(hand.score * 100)}%`, wx, wy);

  ctx.restore();
}
