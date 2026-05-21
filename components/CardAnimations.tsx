"use client";

import { useEffect, useRef } from "react";

interface Props {
  type?: string;
}

export default function CardAnimations({ type }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fixed internal buffer — CSS stretches it visually to fill the card
    const W = 480;
    const H = 360;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!type || type === "none") {
      ctx.clearRect(0, 0, W, H);
      return;
    }

    let raf = 0;

    // ─── 1. MATRIX ───────────────────────────────────────────────────
    if (type === "matrix") {
      const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*".split("");
      const FS = 12;
      const cols = Math.ceil(W / FS);
      const drops = new Array<number>(cols).fill(1);
      const tick = () => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // trail fade
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#00FF41";
        ctx.font = `bold ${FS}px monospace`;
        for (let i = 0; i < cols; i++) {
          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillText(char, i * FS, drops[i] * FS);
          if (drops[i] * FS > H && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 2. RUNES ────────────────────────────────────────────────────
    else if (type === "runes") {
      const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛟᛞ".split("");
      interface Rune {
        x: number;
        y: number;
        char: string;
        speed: number;
        size: number;
        alpha: number;
        dAlpha: number;
      }
      const list: Rune[] = Array.from({ length: 20 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        char: RUNES[Math.floor(Math.random() * RUNES.length)],
        speed: 0.2 + Math.random() * 0.4,
        size: 12 + Math.random() * 6,
        alpha: Math.random() * 0.5 + 0.1,
        dAlpha: (Math.random() > 0.5 ? 1 : -1) * (0.005 + Math.random() * 0.01)
      }));

      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        for (const r of list) {
          ctx.fillStyle = `rgba(0, 255, 65, ${r.alpha})`;
          ctx.font = `${r.size}px monospace`;
          ctx.fillText(r.char, r.x, r.y);
          r.y -= r.speed;
          r.alpha += r.dAlpha;
          if (r.alpha < 0.1 || r.alpha > 0.7) r.dAlpha = -r.dAlpha;
          if (r.y < -20) {
            r.y = H + 20;
            r.x = Math.random() * W;
            r.char = RUNES[Math.floor(Math.random() * RUNES.length)];
          }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 3. GLITCH ───────────────────────────────────────────────────
    else if (type === "glitch") {
      let frame = 0;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        
        // Background scanlines
        ctx.fillStyle = "rgba(0, 255, 65, 0.03)";
        for (let y = 0; y < H; y += 4) {
          ctx.fillRect(0, y, W, 1);
        }

        // Draw random glitch bars
        if (frame % 8 === 0) {
          const numBars = Math.floor(Math.random() * 4);
          for (let i = 0; i < numBars; i++) {
            ctx.fillStyle = Math.random() > 0.3 ? "rgba(0, 255, 65, 0.15)" : "rgba(255, 0, 100, 0.08)";
            const barW = 50 + Math.random() * 200;
            const barH = 2 + Math.random() * 8;
            const barX = Math.random() * (W - barW);
            const barY = Math.random() * (H - barH);
            ctx.fillRect(barX, barY, barW, barH);
          }
        }

        frame++;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 4. GRID ─────────────────────────────────────────────────────
    else if (type === "grid") {
      let offset = 0;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0, 255, 65, 0.15)";
        ctx.lineWidth = 1;

        // Draw 3D perspective lines
        const vanishingPointX = W / 2;
        const vanishingPointY = H * 0.3; // 30% from the top
        
        // Horizontal grid lines
        const numHoriz = 12;
        for (let i = 0; i < numHoriz; i++) {
          const progress = ((i + offset) / numHoriz) % 1;
          const y = vanishingPointY + (H - vanishingPointY) * Math.pow(progress, 2);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // Perspective vertical lines
        const numVert = 16;
        for (let i = 0; i <= numVert; i++) {
          const xStart = (i / numVert) * W;
          ctx.beginPath();
          ctx.moveTo(vanishingPointX, vanishingPointY);
          ctx.lineTo(xStart, H);
          ctx.stroke();
        }

        offset += 0.015;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 5. STARFIELD ────────────────────────────────────────────────
    else if (type === "starfield") {
      interface Star {
        x: number;
        y: number;
        z: number;
      }
      const numStars = 60;
      const stars: Star[] = Array.from({ length: numStars }, () => ({
        x: (Math.random() - 0.5) * W,
        y: (Math.random() - 0.5) * H,
        z: Math.random() * W,
      }));

      const tick = () => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(0, 0, W, H);

        for (const st of stars) {
          st.z -= 2;
          if (st.z <= 0) {
            st.z = W;
            st.x = (Math.random() - 0.5) * W;
            st.y = (Math.random() - 0.5) * H;
          }

          const k = 120 / st.z;
          const px = W / 2 + st.x * k;
          const py = H / 2 + st.y * k;
          const size = Math.max(0.5, (1 - st.z / W) * 3);

          if (px >= 0 && px < W && py >= 0 && py < H) {
            ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(1, 1 - st.z / W)})`;
            ctx.fillRect(px, py, size, size);
          }
        }

        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 6. HEXAGONS ─────────────────────────────────────────────────
    else if (type === "hexagons") {
      let time = 0;
      const size = 20;
      const h = size * Math.sqrt(3);

      const drawHex = (cx: number, cy: number, r: number, alpha: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
        ctx.stroke();
      };

      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 0.8;

        for (let x = 0; x < W + size * 2; x += size * 1.5) {
          for (let y = 0; y < H + h; y += h) {
            const isOdd = Math.round(x / (size * 1.5)) % 2 === 1;
            const cy = y + (isOdd ? h / 2 : 0);

            const dist = Math.sqrt(Math.pow(x - W/2, 2) + Math.pow(cy - H/2, 2));
            const pulse = Math.sin(time - dist * 0.008) * 0.5 + 0.5;
            const alpha = 0.02 + pulse * 0.12;

            drawHex(x, cy, size - 1, alpha);
          }
        }

        time += 0.04;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 7. BINARY ───────────────────────────────────────────────────
    else if (type === "binary") {
      const FS = 11;
      const cols = Math.ceil(W / FS);
      const drops = new Array<number>(cols).fill(1);
      const tick = () => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // trail fade
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(0, 255, 65, 0.75)";
        ctx.font = `bold ${FS}px monospace`;
        for (let i = 0; i < cols; i++) {
          const char = Math.random() > 0.5 ? "1" : "0";
          ctx.fillText(char, i * FS, drops[i] * FS);
          if (drops[i] * FS > H && Math.random() > 0.95) {
            drops[i] = 0;
          }
          drops[i]++;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 8. RADAR ────────────────────────────────────────────────────
    else if (type === "radar") {
      let angle = 0;
      const cx = W / 2;
      const cy = H / 2;
      const radius = Math.min(cx, cy) * 0.9;
      
      const tick = () => {
        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(0, 255, 65, 0.08)";
        ctx.lineWidth = 0.8;
        for (let r = radius / 3; r <= radius; r += radius / 3) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const endX = cx + radius * Math.cos(angle);
        const endY = cy + radius * Math.sin(angle);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = "rgba(0, 255, 65, 0.6)";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, "rgba(0, 255, 65, 0.03)");
        gradient.addColorStop(1, "rgba(0, 255, 65, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, angle - 0.25, angle);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        angle += 0.025;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 9. NEBULA ───────────────────────────────────────────────────
    else if (type === "nebula") {
      let t = 0;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        
        const gx = W / 2 + Math.sin(t) * W * 0.15;
        const gy = H / 2 + Math.cos(t * 0.8) * H * 0.15;
        const g = ctx.createRadialGradient(gx, gy, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
        g.addColorStop(0, "rgba(0, 255, 65, 0.25)");
        g.addColorStop(0.5, "rgba(0, 180, 255, 0.08)");
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        
        t += 0.012;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 10. PLASMA ──────────────────────────────────────────────────
    else if (type === "plasma") {
      let t = 0;
      const STEP = 16;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        for (let x = 0; x < W; x += STEP) {
          for (let y = 0; y < H; y += STEP) {
            const cx = x / 50;
            const cy = y / 50;
            const v = Math.sin(cx + t) + Math.sin(1.2 * (cy + t)) + Math.sin(Math.sqrt(Math.pow(cx - W/100, 2) + Math.pow(cy - H/100, 2)) + t);
            const intensity = (v + 3) / 6;
            const alpha = 0.02 + intensity * 0.14;
            
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx.fillRect(x, y, STEP, STEP);
          }
        }
        t += 0.03;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [type]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: type === "none" ? 0 : 0.6,
        pointerEvents: "none",
        zIndex: 0,
        display: type === "none" ? "none" : "block",
      }}
    />
  );
}
