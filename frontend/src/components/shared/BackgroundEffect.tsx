import { useEffect, useRef } from "react";
import { useSettings } from "../../context/SettingsContext";

// ── Dark mode: starfield canvas ───────────────────────────────────────────────

function StarfieldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const STAR_COUNT = 160;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.4 + 0.3,
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));

    interface ShootingStar {
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; active: boolean;
    }
    const shoots: ShootingStar[] = Array.from({ length: 4 }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, active: false,
    }));

    function spawnShoot() {
      const s = shoots.find(s => !s.active);
      if (!s || !canvas) return;
      s.x = Math.random() * canvas.width * 0.7;
      s.y = Math.random() * canvas.height * 0.5;
      const angle = (Math.random() * 20 + 15) * (Math.PI / 180);
      const speed = Math.random() * 6 + 5;
      s.vx = Math.cos(angle) * speed;
      s.vy = Math.sin(angle) * speed;
      s.maxLife = Math.random() * 40 + 30;
      s.life = 0;
      s.active = true;
    }

    let shootTimer = 0;
    let t = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t++;

      for (const star of stars) {
        const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.96
          ? `rgba(244,172,183,${a})`
          : `rgba(255,255,255,${a})`;
        ctx.fill();
      }

      shootTimer++;
      if (shootTimer > 90 + Math.random() * 120) { spawnShoot(); shootTimer = 0; }

      for (const s of shoots) {
        if (!s.active) continue;
        const progress = s.life / s.maxLife;
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
        const tailLen = 14;
        const grad = ctx.createLinearGradient(
          s.x - s.vx * tailLen, s.y - s.vy * tailLen, s.x, s.y
        );
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.9})`);
        ctx.beginPath();
        ctx.moveTo(s.x - s.vx * tailLen, s.y - s.vy * tailLen);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        s.x += s.vx; s.y += s.vy; s.life++;
        if (s.life >= s.maxLife) s.active = false;
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={ref} style={{
      position: "fixed", inset: 0, zIndex: 0,
      width: "100%", height: "100%", pointerEvents: "none",
    }} />
  );
}

// ── Light mode: cursor trail + click burst ────────────────────────────────────

function TrailCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; decay: number; color: string;
    }
    const particles: Particle[] = [];
    const COLORS = ["244,172,183", "255,202,212", "216,226,220", "157,129,137", "244,172,183"];

    function spawnTrail(x: number, y: number) {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 1.4,
          vy: (Math.random() - 0.5) * 1.4 - 0.4,
          r:     Math.random() * 3 + 1.5,
          alpha: 0.65 + Math.random() * 0.25,
          decay: 0.018 + Math.random() * 0.012,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    function spawnBurst(x: number, y: number) {
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r:     Math.random() * 5 + 2,
          alpha: 0.85,
          decay: 0.022 + Math.random() * 0.015,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    const onMove  = (e: MouseEvent) => spawnTrail(e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => spawnBurst(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.05;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas ref={ref} style={{
      position: "fixed", inset: 0, zIndex: 0,
      width: "100%", height: "100%", pointerEvents: "none",
    }} />
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function BackgroundEffect() {
  const { settings } = useSettings();
  return settings.darkMode ? <StarfieldCanvas /> : <TrailCanvas />;
}
