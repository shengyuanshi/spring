import { useEffect, useRef } from 'react';
import type { HandData } from '../hooks/useMediaPipe';

interface SimpleHandCursorProps {
  handData: HandData | null;
  isTouching: boolean;
  gardenWidth: number;
  gardenHeight: number;
}

export const SimpleHandCursor = ({ handData, isTouching, gardenWidth, gardenHeight }: SimpleHandCursorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !handData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { landmarks } = handData;
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    if (!indexTip) return;

    const cx = (1 - indexTip.x) * gardenWidth;
    const cy = indexTip.y * gardenHeight;

    // Very subtle, elegant cursor
    ctx.strokeStyle = isTouching ? 'rgba(139, 115, 85, 0.4)' : 'rgba(139, 115, 85, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Small crosshair only
    const size = isTouching ? 12 : 8;
    
    ctx.beginPath();
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
    ctx.stroke();

    // Tiny center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = isTouching ? 'rgba(139, 115, 85, 0.5)' : 'rgba(139, 115, 85, 0.3)';
    ctx.fill();

    // Optional: subtle line from thumb to index when pinching
    if (thumbTip && isTouching) {
      const tx = (1 - thumbTip.x) * gardenWidth;
      const ty = thumbTip.y * gardenHeight;
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = 'rgba(139, 115, 85, 0.15)';
      ctx.setLineDash([]);
      ctx.stroke();
    }

    ctx.setLineDash([]);

  }, [handData, isTouching, gardenWidth, gardenHeight]);

  if (!handData) return null;

  return (
    <canvas
      ref={canvasRef}
      width={gardenWidth}
      height={gardenHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 50
      }}
    />
  );
};

export default SimpleHandCursor;
