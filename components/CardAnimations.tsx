"use client";

import { useEffect, useRef } from "react";

type AnimationType =
  | "matrix" | "runes" | "glitch" | "grid" | "starfield"
  | "hexagons" | "binary" | "radar" | "nebula" | "plasma"
  | "none";

interface Props {
  type?: AnimationType | string;
}

export default function CardAnimations({ type }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!type || type === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    let started = false;

    function startAnimation(W: number, H: number) {
      if (started) return;
      started = true;
      const ctx = canvas!.getContext("2d")!;

      // ─── MATRIX ───────────────────────────────────────────────────
      if (type === "matrix") {
        const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
        const FS = 13;
        const cols = Math.ceil(W / FS);
        const drops = new Array(cols).fill(1);
        function tick() {
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(0, 0, canvas!.width, canvas!.height);
          ctx.fillStyle = "#00FF41";
          ctx.font = `${FS}px monospace`;
          for (let i = 0; i < drops.length; i++) {
            ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FS, drops[i] * FS);
            if (drops[i] * FS > canvas!.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
          }
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── RUNES ────────────────────────────────────────────────────
      else if (type === "runes") {
        const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛟᛞ".split("");
        const pts = Array.from({ length: 22 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          ch: RUNES[Math.floor(Math.random() * RUNES.length)],
          sp: 0.25 + Math.random() * 0.5,
          op: 0.15 + Math.random() * 0.45,
        }));
        function tick() {
          ctx.clearRect(0, 0, canvas!.width, canvas!.height);
          ctx.font = "17px monospace";
          for (const p of pts) {
            ctx.fillStyle = `rgba(0,255,65,${p.op})`;
            ctx.fillText(p.ch, p.x, p.y);
            p.y -= p.sp;
            if (p.y < -20) { p.y = canvas!.height + 20; p.x = Math.random() * canvas!.width; }
          }
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── GLITCH ───────────────────────────────────────────────────
      else if (type === "glitch") {
        let t = 0;
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          ctx.fillStyle = "rgba(0,0,0,0.07)";
          ctx.fillRect(0, 0, cw, ch);
          if (t % 4 === 0) {
            for (let i = 0; i < 5; i++) {
              ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,255,65,0.3)" : "rgba(255,0,255,0.18)";
              ctx.fillRect(Math.random() * cw, Math.random() * ch, Math.random() * cw * 0.6, 1 + Math.random() * 5);
            }
          }
          t++;
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── GRID ─────────────────────────────────────────────────────
      else if (type === "grid") {
        let off = 0;
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          ctx.fillStyle = "rgba(0,0,0,0.14)";
          ctx.fillRect(0, 0, cw, ch);
          ctx.strokeStyle = "rgba(0,255,65,0.22)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let x = 0; x < cw; x += 28) { ctx.moveTo(x, 0); ctx.lineTo(x, ch); }
          for (let y = off % 28; y < ch; y += 28) { ctx.moveTo(0, y); ctx.lineTo(cw, y); }
          ctx.stroke();
          off += 0.35;
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── STARFIELD ────────────────────────────────────────────────
      else if (type === "starfield") {
        const stars = Array.from({ length: 70 }, () => ({
          x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.6,
        }));
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          for (const st of stars) {
            ctx.fillRect(st.x, st.y, st.s, st.s);
            st.y += st.s * 0.35;
            if (st.y > ch) { st.y = 0; st.x = Math.random() * cw; }
          }
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── HEXAGONS ─────────────────────────────────────────────────
      else if (type === "hexagons") {
        let time = 0;
        function hex(cx: number, cy: number, r: number) {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            i === 0
              ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
              : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
          }
          ctx.closePath(); ctx.stroke();
        }
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          ctx.fillStyle = "rgba(0,0,0,0.07)";
          ctx.fillRect(0, 0, cw, ch);
          ctx.strokeStyle = `rgba(0,255,65,${0.07 + Math.abs(Math.sin(time)) * 0.1})`;
          ctx.lineWidth = 0.7;
          const r = 20; const rh = r * Math.sqrt(3);
          for (let c = 0, x = 0; x < cw + r * 2; c++, x += r * 1.5)
            for (let y = 0; y < ch + rh; y += rh)
              hex(x, y + (c % 2 === 1 ? rh / 2 : 0), r);
          time += 0.035;
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── BINARY ───────────────────────────────────────────────────
      else if (type === "binary") {
        const FS = 11;
        const cols = Math.ceil(W / FS);
        const drops = new Array(cols).fill(1);
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = "rgba(0,255,65,0.55)";
          ctx.font = `${FS}px monospace`;
          for (let i = 0; i < drops.length; i++) {
            ctx.fillText(Math.random() > 0.5 ? "1" : "0", i * FS, drops[i] * FS);
            if (drops[i] * FS > ch && Math.random() > 0.95) drops[i] = 0;
            drops[i]++;
          }
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── RADAR ────────────────────────────────────────────────────
      else if (type === "radar") {
        let angle = 0;
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          const cx = cw / 2; const cy = ch / 2;
          const r = Math.min(cx, cy) * 0.82;
          ctx.fillStyle = "rgba(0,0,0,0.11)";
          ctx.fillRect(0, 0, cw, ch);
          ctx.strokeStyle = "rgba(0,255,65,0.2)";
          ctx.lineWidth = 0.7;
          for (const f of [1, 0.66, 0.33]) {
            ctx.beginPath(); ctx.arc(cx, cy, r * f, 0, Math.PI * 2); ctx.stroke();
          }
          // sweep line
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
          ctx.strokeStyle = "rgba(0,255,65,0.65)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          angle += 0.035;
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── NEBULA ───────────────────────────────────────────────────
      else if (type === "nebula") {
        let t = 0;
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          ctx.clearRect(0, 0, cw, ch);
          const gx = cw / 2 + Math.sin(t) * cw * 0.18;
          const gy = ch / 2 + Math.cos(t * 0.7) * ch * 0.18;
          const g = ctx.createRadialGradient(gx, gy, 0, cw / 2, ch / 2, Math.max(cw, ch) * 0.9);
          g.addColorStop(0, "rgba(0,255,65,0.2)");
          g.addColorStop(0.45, "rgba(0,80,255,0.07)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, cw, ch);
          t += 0.016;
          raf = requestAnimationFrame(tick);
        }
        tick();
      }

      // ─── PLASMA ───────────────────────────────────────────────────
      else if (type === "plasma") {
        let t = 0;
        const STEP = 16;
        function tick() {
          const cw = canvas!.width; const ch = canvas!.height;
          ctx.clearRect(0, 0, cw, ch);
          for (let x = 0; x < cw; x += STEP) {
            for (let y = 0; y < ch; y += STEP) {
              const v = (Math.sin(x / 40 + t) + Math.cos(y / 40 + t)) / 2;
              const alpha = Math.max(0, 0.03 + v * 0.07);
              ctx.fillStyle = `rgba(0,255,65,${alpha})`;
              ctx.fillRect(x, y, STEP, STEP);
            }
          }
          t += 0.04;
          raf = requestAnimationFrame(tick);
        }
        tick();
      }
    }

    // Watch for when the canvas gets real dimensions via ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        startAnimation(canvas.width, canvas.height);
      }
    });
    ro.observe(canvas);

    // Also try immediately in case element is already laid out
    if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      startAnimation(canvas.width, canvas.height);
    }

    return () => {
      started = true; // prevent late start
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [type]);

  if (!type || type === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
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
