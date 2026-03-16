import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface TearDropProps {
  id: string;
  startX: number;
  startY: number;
  onHitFlower?: (id: string, x: number, y: number) => void;
}

export const TearDrop = ({ id, startX, startY, onHitFlower }: TearDropProps) => {
  const tearRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: startX, y: startY });

  useEffect(() => {
    if (!tearRef.current) return;

    const tear = tearRef.current;
    const targetY = window.innerHeight - 50;
    const duration = 1.5 + Math.random() * 0.5;
    
    // Animate tear falling with visible trail
    const tween = gsap.fromTo(tear,
      { 
        y: startY, 
        x: startX,
        opacity: 1,
        scale: 1 
      },
      { 
        y: targetY,
        x: startX + (Math.random() - 0.5) * 30, // Slight drift
        opacity: 0.3,
        scale: 0.8,
        duration: duration,
        ease: 'power1.in',
        onUpdate: function() {
          // Track position for collision detection
          if (tear) {
            const transform = tear.style.transform;
            const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            if (match) {
              positionRef.current = {
                x: parseFloat(match[1]) + 8, // Adjust for center offset
                y: parseFloat(match[2])
              };
            }
          }
        },
        onComplete: () => {
          if (onHitFlower) {
            onHitFlower(id, positionRef.current.x, positionRef.current.y);
          }
        }
      }
    );

    return () => {
      tween.kill();
    };
  }, [id, startX, startY, onHitFlower]);

  return (
    <div
      ref={tearRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '16px',
        height: '24px',
        background: 'radial-gradient(ellipse at 35% 25%, rgba(220, 240, 255, 1), rgba(100, 160, 220, 0.9))',
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        pointerEvents: 'none',
        zIndex: 100,
        boxShadow: `
          0 0 10px rgba(150, 200, 255, 0.8),
          0 0 20px rgba(100, 180, 255, 0.5),
          inset -2px -2px 4px rgba(0, 0, 0, 0.2)
        `,
        transform: `translate(${startX - 8}px, ${startY}px)`
      }}
    />
  );
};

export default TearDrop;
