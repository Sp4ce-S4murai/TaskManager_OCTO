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

    // ─── 3. GRID ─────────────────────────────────────────────────────
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

    // ─── 4. STARFIELD ────────────────────────────────────────────────
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

    // ─── 5. BINARY ───────────────────────────────────────────────────
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

    // ─── 6. RADAR ────────────────────────────────────────────────────
    else if (type === "radar") {
      let angle = 0;
      const cx = W / 2;
      const cy = H / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // Radar targets (blips)
      interface Blip { x: number; y: number; angle: number; intensity: number; size: number }
      const blips: Blip[] = [
        { x: cx + radius * 0.4, y: cy - radius * 0.3, angle: 0, intensity: 0, size: 4 },
        { x: cx - radius * 0.5, y: cy - radius * 0.2, angle: 0, intensity: 0, size: 5 },
        { x: cx + radius * 0.3, y: cy + radius * 0.5, angle: 0, intensity: 0, size: 3 },
        { x: cx - radius * 0.2, y: cy + radius * 0.4, angle: 0, intensity: 0, size: 4 }
      ];

      // Calculate the angle of each target from the center
      for (const b of blips) {
        let a = Math.atan2(b.y - cy, b.x - cx);
        if (a < 0) a += Math.PI * 2;
        b.angle = a;
      }

      const tick = () => {
        ctx.clearRect(0, 0, W, H);

        // 1. Draw outer compass circle and degree ticks
        ctx.strokeStyle = "rgba(0, 255, 65, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Draw degree tick marks
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) { // every 10 degrees
          const x1 = cx + radius * Math.cos(a);
          const y1 = cy + radius * Math.sin(a);
          const x2 = cx + (radius - 5) * Math.cos(a);
          const y2 = cy + (radius - 5) * Math.sin(a);
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = "rgba(0, 255, 65, 0.2)";
        ctx.stroke();

        // 3. Draw concentric grid circles
        ctx.strokeStyle = "rgba(0, 255, 65, 0.06)";
        for (let r = radius * 0.25; r < radius; r += radius * 0.25) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 4. Draw crosshairs lines
        ctx.strokeStyle = "rgba(0, 255, 65, 0.08)";
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // 5. Draw sweep trail (gradient pie slice)
        const trailSlices = 35;
        const sliceAngle = 0.015;
        for (let i = 0; i < trailSlices; i++) {
          const sliceAlpha = 0.22 * Math.pow(1 - i / trailSlices, 1.8);
          ctx.fillStyle = `rgba(0, 255, 65, ${sliceAlpha})`;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          const a1 = angle - i * sliceAngle;
          const a2 = angle - (i + 1) * sliceAngle;
          ctx.lineTo(cx + radius * Math.cos(a1), cy + radius * Math.sin(a1));
          ctx.lineTo(cx + radius * Math.cos(a2), cy + radius * Math.sin(a2));
          ctx.closePath();
          ctx.fill();
        }

        // 6. Draw main radar sweeping line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.strokeStyle = "rgba(0, 255, 65, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 7. Render and fade targets (blips) based on sweep line position
        for (const b of blips) {
          let diff = angle - b.angle;
          while (diff < 0) diff += Math.PI * 2;
          while (diff >= Math.PI * 2) diff -= Math.PI * 2;

          if (diff < 0.08) {
            b.intensity = 1.0;
          } else {
            b.intensity = Math.max(0, b.intensity - 0.006);
          }

          if (b.intensity > 0) {
            // Target blip glowing circle
            ctx.fillStyle = `rgba(0, 255, 65, ${b.intensity * 0.8})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();

            // Outward expanding ping wave
            ctx.strokeStyle = `rgba(0, 255, 65, ${b.intensity * 0.35 * (1 - b.intensity)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size + (1 - b.intensity) * 20, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // 8. Cyberpunk telemetry overlay texts
        ctx.fillStyle = "rgba(0, 255, 65, 0.4)";
        ctx.font = "8px monospace";
        ctx.fillText("SYS.LOC: ACTIVE", 12, 18);
        ctx.fillText(`SCAN.DEG: ${Math.round((angle * 180) / Math.PI) % 360}°`, 12, 28);
        ctx.fillText(`TRK.CNT: ${blips.filter(b => b.intensity > 0).length}`, W - 75, 18);
        ctx.fillText("SIG.TYPE: NEURAL", W - 75, 28);

        angle += 0.02;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 7. NEBULA ───────────────────────────────────────────────────
    else if (type === "nebula") {
      let t = 0;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        
        // Multi-layered moving nebulas
        const gx1 = W / 2 + Math.sin(t) * W * 0.25;
        const gy1 = H / 2 + Math.cos(t * 0.7) * H * 0.25;
        const g1 = ctx.createRadialGradient(gx1, gy1, 0, gx1, gy1, Math.max(W, H) * 0.6);
        g1.addColorStop(0, "rgba(0, 255, 65, 0.45)"); // Intense Green center
        g1.addColorStop(0.5, "rgba(0, 120, 255, 0.15)"); // Blends into Blue
        g1.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        const gx2 = W / 2 + Math.cos(t * 0.9) * W * 0.25;
        const gy2 = H / 2 + Math.sin(t * 0.5) * H * 0.25;
        const g2 = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, Math.max(W, H) * 0.5);
        g2.addColorStop(0, "rgba(0, 255, 255, 0.35)"); // Intense Cyan center
        g2.addColorStop(0.6, "rgba(0, 255, 65, 0.1)");
        g2.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, W, H);
        
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, W, H);
        
        t += 0.008;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── 8. PLASMA ───────────────────────────────────────────────────
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
