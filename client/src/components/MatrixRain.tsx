import { useEffect, useRef } from 'react';
import '@/components/MatrixRain.scss';

const GLYPHS = 'アイウエオカキクケコ0123456789<>/{}[]#';
const FONT_SIZE = 18;
const FALL_SPEED = 8;

const randGlyph = (): string =>
  GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let [width, height, columns, frameId, lastTime, drops] = [
      0, 0, 0, 0, 0, [] as number[],
    ];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / FONT_SIZE);
      drops = Array.from(
        { length: columns },
        () => Math.floor(Math.random() * (-height / FONT_SIZE)),
      );
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
    };

    resize();

    const draw = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      context.fillStyle = 'rgba(0, 0, 0, 0.08)';
      context.fillRect(0, 0, width, height);
      context.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < columns; i++) {
        const glyph = randGlyph();
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        if (Math.random() > 0.975) {
          context.fillStyle = '#b4ffb4';
          context.fillText(glyph, x, y - FONT_SIZE);
        }

        context.fillStyle = '#00ff41';
        context.fillText(glyph, x, y);

        if (y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += delta * FALL_SPEED;
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-rain" />;
};

export default MatrixRain;