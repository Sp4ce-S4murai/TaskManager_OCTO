"use client";

import { useEffect, useRef } from "react";

interface CardAnimationsProps {
  type?: string;
  className?: string;
}

export default function CardAnimations({ type, className = "" }: CardAnimationsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!type || type === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let running = true;

    // Use ResizeObserver to set canvas size correctly when element becomes visible
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    });
    ro.observe(canvas);

    // Initial size — may be 0 on first render
    if (canvas.offsetWidth > 0) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    const getW = () => canvas.width || 400;
    const getH = () => canvas.height || 300;

    if (type === "matrix") {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
      const fontSize = 14;
      const drops: number[] = Array.from({ length: 300 }).fill(1) as number[];
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#00FF41";
        ctx.font = fontSize + "px monospace";
        const cols = Math.ceil(W / fontSize);
        for (let i = 0; i < cols; i++) {
          const text = letters[Math.floor(Math.random() * letters.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > H && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "runes") {
      const runes = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ","ᛇ","ᛈ","ᛉ","ᛊ","ᛏ","ᛒ","ᛖ","ᛗ","ᛚ","ᛜ","ᛟ","ᛞ"];
      type Particle = { x: number; y: number; char: string; speed: number; opacity: number };
      const particles: Particle[] = Array.from({ length: 25 }, () => ({
        x: Math.random() * 400,
        y: Math.random() * 300,
        char: runes[Math.floor(Math.random() * runes.length)],
        speed: 0.3 + Math.random() * 0.6,
        opacity: 0.15 + Math.random() * 0.5
      }));
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.clearRect(0, 0, W, H);
        ctx.font = "18px monospace";
        particles.forEach(p => {
          ctx.fillStyle = `rgba(0,255,65,${p.opacity})`;
          ctx.fillText(p.char, p.x % W, p.y);
          p.y -= p.speed;
          if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        });
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "glitch") {
      let t = 0;
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(0, 0, W, H);
        if (t % 3 === 0) {
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,255,65,0.25)" : "rgba(255,0,255,0.15)";
            ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 120, 2 + Math.random() * 6);
          }
        }
        t++;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "grid") {
      let offset = 0;
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0,255,65,0.25)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x < W; x += 30) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (let y = offset % 30; y < H; y += 30) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
        offset += 0.4;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "starfield") {
      type Star = { x: number; y: number; z: number };
      const stars: Star[] = Array.from({ length: 80 }, () => ({
        x: Math.random() * 400, y: Math.random() * 300, z: 0.3 + Math.random() * 1.8
      }));
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        stars.forEach(s => {
          const sx = s.x % W; const sy = s.y % H;
          ctx.fillRect(sx, sy, s.z, s.z);
          s.y += s.z * 0.4;
          if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        });
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "hexagons") {
      let time = 0;
      const drawHex = (x: number, y: number, r: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
                  : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
        }
        ctx.closePath();
        ctx.stroke();
      };
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(0, 0, W, H);
        const alpha = 0.08 + Math.abs(Math.sin(time)) * 0.08;
        ctx.strokeStyle = `rgba(0,255,65,${alpha})`;
        ctx.lineWidth = 0.8;
        const r = 22; const rowH = r * Math.sqrt(3);
        for (let row = 0, y = 0; y < H + rowH; row++, y += rowH) {
          for (let col = 0, x = 0; x < W + r * 2; col++, x += r * 1.5) {
            drawHex(x, y + (col % 2 === 1 ? rowH / 2 : 0), r);
          }
        }
        time += 0.04;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "binary") {
      const fontSize = 11;
      const drops: number[] = Array.from({ length: 300 }).fill(1) as number[];
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(0,255,65,0.6)";
        ctx.font = fontSize + "px monospace";
        const cols = Math.ceil(W / fontSize);
        for (let i = 0; i < cols; i++) {
          ctx.fillText(Math.random() > 0.5 ? "1" : "0", i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > H && Math.random() > 0.95) drops[i] = 0;
          drops[i]++;
        }
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "radar") {
      let angle = 0;
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        const cx = W / 2; const cy = H / 2;
        const r = Math.min(cx, cy) * 0.85;
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0,255,65,0.25)";
        ctx.lineWidth = 0.8;
        [1, 0.66, 0.33].forEach(frac => {
          ctx.beginPath(); ctx.arc(cx, cy, r * frac, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.strokeStyle = "rgba(0,255,65,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        angle += 0.04;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "nebula") {
      let time = 0;
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.clearRect(0, 0, W, H);
        const x0 = W / 2 + Math.sin(time) * W * 0.15;
        const y0 = H / 2 + Math.cos(time * 0.7) * H * 0.15;
        const grad = ctx.createRadialGradient(x0, y0, 0, W / 2, H / 2, Math.max(W, H));
        grad.addColorStop(0, "rgba(0,255,65,0.18)");
        grad.addColorStop(0.5, "rgba(0,100,255,0.06)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        time += 0.018;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === "plasma") {
      let time = 0;
      const draw = () => {
        if (!running) return;
        const W = getW(); const H = getH();
        ctx.clearRect(0, 0, W, H);
        const step = 18;
        for (let x = 0; x < W; x += step) {
          for (let y = 0; y < H; y += step) {
            const v = (Math.sin(x / 45 + time) + Math.cos(y / 45 + time)) / 2;
            const alpha = 0.04 + v * 0.06;
            ctx.fillStyle = `rgba(0,255,65,${Math.max(0, alpha)})`;
            ctx.fillRect(x, y, step, step);
          }
        }
        time += 0.04;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      running = false;
      ro.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [type]);

  if (!type || type === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${className}`}
      style={{ opacity: 0.45 }}
    />
  );
}
