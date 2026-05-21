"use client";

import { useEffect, useRef } from "react";

interface Props {
  type?: string;
}

export default function CardAnimations({ type }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!type || type === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fixed internal buffer — CSS stretches it visually to fill the card
    // This is the key: we don't rely on offsetWidth/ResizeObserver at all
    const W = 480;
    const H = 360;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    // ─── MATRIX ──────────────────────────────────────────────────────
    if (type === "matrix") {
      const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
      const FS = 13;
      const cols = Math.ceil(W / FS);
      const drops = new Array<number>(cols).fill(1);
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#00FF41";
        ctx.font = `${FS}px monospace`;
        for (let i = 0; i < cols; i++) {
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FS, drops[i] * FS);
          if (drops[i] * FS > H && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── RUNES ───────────────────────────────────────────────────────
    else if (type === "runes") {
      const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛟᛞ".split("");
      interface P { x: number; y: number; ch: string; sp: number; op: number }
      const pts: P[] = Array.from({ length: 22 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        ch: RUNES[Math.floor(Math.random() * RUNES.length)],
        sp: 0.3 + Math.random() * 0.5,
        op: 0.15 + Math.random() * 0.5,
      }));
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.font = "17px monospace";
        for (const p of pts) {
          ctx.fillStyle = `rgba(0,255,65,${p.op})`;
          ctx.fillText(p.ch, p.x, p.y);
          p.y -= p.sp;
          if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── GLITCH ──────────────────────────────────────────────────────
    else if (type === "glitch") {
      let t = 0;
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.07)";
        ctx.fillRect(0, 0, W, H);
        if (t % 4 === 0) {
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,255,65,0.3)" : "rgba(255,0,255,0.2)";
            ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * W * 0.7, 1 + Math.random() * 5);
          }
        }
        t++;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── GRID ────────────────────────────────────────────────────────
    else if (type === "grid") {
      let off = 0;
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.14)";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0,255,65,0.25)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x < W; x += 28) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (let y = off % 28; y < H; y += 28) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
        off += 0.4;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── STARFIELD ───────────────────────────────────────────────────
    else if (type === "starfield") {
      interface Star { x: number; y: number; s: number }
      const stars: Star[] = Array.from({ length: 70 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 0.5 + Math.random() * 1.8,
      }));
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        for (const st of stars) {
          ctx.fillRect(st.x, st.y, st.s, st.s);
          st.y += st.s * 0.4;
          if (st.y > H) { st.y = 0; st.x = Math.random() * W; }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── HEXAGONS ────────────────────────────────────────────────────
    else if (type === "hexagons") {
      let time = 0;
      const drawHex = (cx: number, cy: number, r: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
          else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        ctx.closePath();
        ctx.stroke();
      };
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.07)";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = `rgba(0,255,65,${0.08 + Math.abs(Math.sin(time)) * 0.1})`;
        ctx.lineWidth = 0.8;
        const r = 20;
        const rh = r * Math.sqrt(3);
        for (let c = 0, x = 0; x < W + r * 2; c++, x += r * 1.5) {
          for (let y = 0; y < H + rh; y += rh) {
            drawHex(x, y + (c % 2 === 1 ? rh / 2 : 0), r);
          }
        }
        time += 0.035;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── BINARY ──────────────────────────────────────────────────────
    else if (type === "binary") {
      const FS = 11;
      const cols = Math.ceil(W / FS);
      const drops = new Array<number>(cols).fill(1);
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(0,255,65,0.6)";
        ctx.font = `${FS}px monospace`;
        for (let i = 0; i < cols; i++) {
          ctx.fillText(Math.random() > 0.5 ? "1" : "0", i * FS, drops[i] * FS);
          if (drops[i] * FS > H && Math.random() > 0.95) drops[i] = 0;
          drops[i]++;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── RADAR ───────────────────────────────────────────────────────
    else if (type === "radar") {
      let angle = 0;
      const cx = W / 2;
      const cy = H / 2;
      const r = Math.min(cx, cy) * 0.85;
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0,255,65,0.2)";
        ctx.lineWidth = 0.7;
        for (const f of [1, 0.66, 0.33]) {
          ctx.beginPath();
          ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.strokeStyle = "rgba(0,255,65,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        angle += 0.035;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── NEBULA ──────────────────────────────────────────────────────
    else if (type === "nebula") {
      let t = 0;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        const gx = W / 2 + Math.sin(t) * W * 0.2;
        const gy = H / 2 + Math.cos(t * 0.7) * H * 0.2;
        const g = ctx.createRadialGradient(gx, gy, 0, W / 2, H / 2, Math.max(W, H) * 0.85);
        g.addColorStop(0, "rgba(0,255,65,0.22)");
        g.addColorStop(0.4, "rgba(0,80,255,0.08)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        t += 0.018;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ─── PLASMA ──────────────────────────────────────────────────────
    else if (type === "plasma") {
      let t = 0;
      const STEP = 16;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        for (let x = 0; x < W; x += STEP) {
          for (let y = 0; y < H; y += STEP) {
            const v = (Math.sin(x / 40 + t) + Math.cos(y / 40 + t)) / 2;
            const alpha = Math.max(0, 0.03 + v * 0.08);
            ctx.fillStyle = `rgba(0,255,65,${alpha})`;
            ctx.fillRect(x, y, STEP, STEP);
          }
        }
        t += 0.04;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [type]);

  if (!type || type === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: 0.5,
        pointerEvents: "none",
        zIndex: 0,
        display: "block",
      }}
    />
  );
}
