"use client";

import { useEffect, useRef } from "react";

interface CardAnimationsProps {
  type?: string;
  className?: string;
}

export default function CardAnimations({ type, className = "" }: CardAnimationsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!type || type === "none" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const checkResize = () => {
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };
    window.addEventListener("resize", checkResize);
    checkResize();

    // 1. Matrix
    if (type === "matrix") {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
      const fontSize = 14;
      const columns = 200; // max expected width
      const drops: number[] = Array.from({ length: columns }).fill(1) as number[];

      const draw = () => {
        checkResize();
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00FF41";
        ctx.font = fontSize + "px monospace";

        const currentColumns = Math.ceil(canvas.width / fontSize);
        for (let i = 0; i < currentColumns; i++) {
          const text = letters[Math.floor(Math.random() * letters.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 2. Runes
    else if (type === "runes") {
      const runes = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛟ", "ᛞ"];
      const particles: any[] = [];
      for(let i = 0; i < 20; i++) {
        particles.push({
          x: Math.random() * 2000,
          y: Math.random() * 2000,
          char: runes[Math.floor(Math.random() * runes.length)],
          speed: 0.2 + Math.random() * 0.5,
          opacity: Math.random() * 0.5 + 0.1
        });
      }
      
      const draw = () => {
        checkResize();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "20px monospace";
        particles.forEach(p => {
          ctx.fillStyle = `rgba(0, 255, 65, ${p.opacity})`;
          ctx.fillText(p.char, p.x % canvas.width, p.y);
          p.y -= p.speed;
          if (p.y < -20) {
            p.y = canvas.height + 20;
            p.x = Math.random() * canvas.width;
          }
        });
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 3. Glitch
    else if (type === "glitch") {
      const draw = () => {
        checkResize();
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for(let i=0; i<5; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,255,65,0.2)" : "rgba(255,0,255,0.1)";
          ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 100, Math.random() * 5);
        }
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 4. Grid
    else if (type === "grid") {
      let offset = 0;
      const draw = () => {
        checkResize();
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(0, 255, 65, 0.3)";
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        for(let x = 0; x < canvas.width; x += 30) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        for(let y = (offset % 30); y < canvas.height; y += 30) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
        offset += 0.5;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 5. Starfield
    else if (type === "starfield") {
      const stars = Array.from({length: 100}).map(() => ({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        z: Math.random() * 2
      }));
      
      const draw = () => {
        checkResize();
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        stars.forEach(s => {
          ctx.fillRect(s.x % canvas.width, s.y, s.z, s.z);
          s.y += s.z * 0.5;
          if(s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        });
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 6. Hexagons
    else if (type === "hexagons") {
      let time = 0;
      const drawHex = (x: number, y: number, r: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = 2 * Math.PI / 6 * i;
          ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();
      };
      
      const draw = () => {
        checkResize();
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.strokeStyle = `rgba(0, 255, 65, ${0.1 + Math.sin(time)*0.05})`;
        ctx.lineWidth = 1;
        const r = 20;
        const h = r * Math.sqrt(3);
        for(let y = 0; y < canvas.height + h; y += h) {
          for(let x = 0, j=0; x < canvas.width + r*3; x += r*1.5, j++) {
            drawHex(x, y + (j%2 === 1 ? h/2 : 0), r);
          }
        }
        time += 0.05;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 7. Binary
    else if (type === "binary") {
      const fontSize = 12;
      const columns = 200;
      const drops: number[] = Array.from({ length: columns }).fill(1) as number[];
      const draw = () => {
        checkResize();
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0, 255, 65, 0.5)";
        ctx.font = fontSize + "px monospace";
        const currentColumns = Math.ceil(canvas.width / fontSize);
        for (let i = 0; i < currentColumns; i++) {
          const text = Math.random() > 0.5 ? "0" : "1";
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) drops[i] = 0;
          drops[i]++;
        }
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 8. Radar
    else if (type === "radar") {
      let angle = 0;
      const draw = () => {
        checkResize();
        const cx = canvas.width/2;
        const cy = canvas.height/2;
        const r = Math.min(cx, cy) * 0.8;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = "rgba(0, 255, 65, 0.3)";
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r*0.66, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r*0.33, 0, Math.PI*2); ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.strokeStyle = "rgba(0, 255, 65, 0.8)";
        ctx.stroke();
        
        angle += 0.05;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 9. Nebula (Simple gradient particles)
    else if (type === "nebula") {
      let time = 0;
      const draw = () => {
        checkResize();
        ctx.clearRect(0,0,canvas.width, canvas.height);
        const gradient = ctx.createRadialGradient(
          canvas.width/2 + Math.sin(time)*50, canvas.height/2 + Math.cos(time*0.8)*50, 0,
          canvas.width/2, canvas.height/2, canvas.width
        );
        gradient.addColorStop(0, "rgba(0, 255, 65, 0.1)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0,0,canvas.width, canvas.height);
        time += 0.02;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    // 10. Plasma
    else if (type === "plasma") {
      let time = 0;
      const draw = () => {
        checkResize();
        ctx.clearRect(0,0,canvas.width, canvas.height);
        for(let x=0; x<canvas.width; x+=20) {
          for(let y=0; y<canvas.height; y+=20) {
            const v = Math.sin(x/50 + time) + Math.cos(y/50 + time);
            ctx.fillStyle = `rgba(0, 255, 65, ${0.05 + v*0.05})`;
            ctx.fillRect(x, y, 20, 20);
          }
        }
        time += 0.05;
        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      window.removeEventListener("resize", checkResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [type]);

  if (!type || type === "none") return null;

  return (
    <canvas 
      ref={canvasRef} 
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 ${className}`} 
    />
  );
}
