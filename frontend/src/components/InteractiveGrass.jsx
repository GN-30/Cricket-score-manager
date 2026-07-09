import React, { useEffect, useRef } from 'react';

export default function InteractiveGrass() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    let animationFrameId;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const BLADE_COUNT = Math.min(Math.floor((width * height) / 300), 6000); // Dense but extremely performant with batching
    const blades = [];

    // Mouse state
    let mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
    let lastMouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e) => {
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.vx = mouse.x - lastMouse.x;
      mouse.vy = mouse.y - lastMouse.y;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initBlades();
    };
    window.addEventListener('resize', handleResize);

    const initBlades = () => {
      blades.length = 0;
      for (let i = 0; i < BLADE_COUNT; i++) {
        blades.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: 5 + Math.random() * 8,
          angle: Math.random() * Math.PI * 2, // Top down random orientation
          baseAngle: Math.random() * Math.PI * 2,
          stiffness: 0.05 + Math.random() * 0.1,
          targetAngle: 0,
          colorIndex: Math.floor(Math.random() * 3) // 3 color buckets
        });
      }
    };

    initBlades();

    let time = 0;
    const colors = ['#1e5c2d', '#236b34', '#194d26'];

    const render = () => {
      time += 0.02;
      
      // Deep green dirt/base grass background
      ctx.fillStyle = '#113318';
      ctx.fillRect(0, 0, width, height);

      ctx.lineCap = 'round';
      ctx.lineWidth = 1.5;

      // Update physics
      for (let i = 0; i < BLADE_COUNT; i++) {
        const b = blades[i];

        // Global wind effect (sine waves based on position)
        const wind = Math.sin(time + b.x * 0.01 + b.y * 0.01) * 0.2;

        // Mouse interaction
        const dx = mouse.x - b.x;
        const dy = mouse.y - b.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < 10000) { // equivalent to dist < 100
          // Calculate angle away from mouse
          const angleToMouse = Math.atan2(dy, dx);
          b.targetAngle = angleToMouse + Math.PI; // Bend away
        } else {
          b.targetAngle = b.baseAngle + wind; // Return to base + wind
        }

        // Spring physics for smooth shaking/bending
        const angleDiff = b.targetAngle - b.angle;
        b.angle += angleDiff * b.stiffness;
      }

      // Draw in batched passes by color (massive performance gain)
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.strokeStyle = colors[c];
        for (let i = 0; i < BLADE_COUNT; i++) {
          const b = blades[i];
          if (b.colorIndex === c) {
            const tipX = b.x + Math.cos(b.angle) * b.length;
            const tipY = b.y + Math.sin(b.angle) * b.length;
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(tipX, tipY);
          }
        }
        ctx.stroke();
      }

      // Decay mouse velocity
      mouse.vx *= 0.9;
      mouse.vy *= 0.9;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-50"
      style={{ background: '#113318' }}
    />
  );
}
