import { useEffect, useRef } from 'react';
import type { HandData } from '../hooks/useMediaPipe';

interface HandSkeletonProps {
  handData: HandData | null;
  isTouching: boolean;
  gardenWidth: number;
  gardenHeight: number;
}

// MediaPipe hand landmark connections
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17]
];

export const HandSkeleton = ({ handData, isTouching, gardenWidth, gardenHeight }: HandSkeletonProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !handData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { landmarks } = handData;
    const lineColor = isTouching ? 'rgba(196, 165, 116, 0.52)' : 'rgba(250, 248, 245, 0.24)';
    const jointColor = isTouching ? 'rgba(196, 165, 116, 0.72)' : 'rgba(250, 248, 245, 0.4)';
    const cursorColor = isTouching ? 'rgba(196, 165, 116, 0.95)' : 'rgba(250, 248, 245, 0.65)';

    // Draw connections (bones)
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = isTouching ? 2.2 : 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = isTouching ? 'rgba(196, 165, 116, 0.25)' : 'rgba(255, 255, 255, 0.1)';
    ctx.shadowBlur = isTouching ? 10 : 4;

    HAND_CONNECTIONS.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(
          (1 - startPoint.x) * gardenWidth,  // Mirror X
          startPoint.y * gardenHeight
        );
        ctx.lineTo(
          (1 - endPoint.x) * gardenWidth,    // Mirror X
          endPoint.y * gardenHeight
        );
        ctx.stroke();
      }
    });
    ctx.shadowBlur = 0;

    // Draw joints (landmarks)
    landmarks.forEach((landmark, index) => {
      const x = (1 - landmark.x) * gardenWidth;  // Mirror X
      const y = landmark.y * gardenHeight;

      // Different sizes for different joints
      const isTip = [4, 8, 12, 16, 20].includes(index);
      const isIndexTip = index === 8;

      ctx.beginPath();
      ctx.arc(x, y, isTip ? 4 : 2.5, 0, Math.PI * 2);
      
      if (isIndexTip) {
        ctx.fillStyle = cursorColor;
        ctx.shadowColor = cursorColor;
        ctx.shadowBlur = isTouching ? 14 : 8;
      } else {
        ctx.fillStyle = jointColor;
        ctx.shadowBlur = 0;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    });

    // Draw cursor crosshair at index finger tip
    const indexTip = landmarks[8];
    if (indexTip) {
      const cx = (1 - indexTip.x) * gardenWidth;
      const cy = indexTip.y * gardenHeight;
      
      ctx.strokeStyle = cursorColor;
      ctx.lineWidth = isTouching ? 1.6 : 1.1;
      ctx.shadowColor = isTouching ? 'rgba(196, 165, 116, 0.28)' : 'rgba(255, 255, 255, 0.08)';
      ctx.shadowBlur = isTouching ? 12 : 6;
      
      // Circle around cursor
      ctx.beginPath();
      ctx.arc(cx, cy, isTouching ? 18 : 10, 0, Math.PI * 2);
      ctx.setLineDash(isTouching ? [] : [3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      if (isTouching) {
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(196, 165, 116, 0.9)';
        ctx.fill();
      }
    }

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

export default HandSkeleton;
