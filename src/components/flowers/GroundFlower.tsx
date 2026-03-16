import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import gsap from 'gsap';

interface GroundFlowerProps {
  flowerId: string;
  x: number;
  y: number;
  scale?: number;
  onClick?: () => void;
  captureId?: string;
}

export interface GroundFlowerRef {
  grow: () => void;
}

const groundColors: Record<string, { petals: string[]; center: string; stem: string; leaves: string }> = {
  zhugecai: {
    petals: ['#9B8BC7', '#A89BD4', '#B8ABE0'],
    center: '#F0E8D8',
    stem: '#6A8A6A',
    leaves: '#7A9A7A'
  },
  fudicai: {
    petals: ['#7BA7D9', '#8BB4E3', '#9BC1ED'],
    center: '#F5E6C8',
    stem: '#5A8A5A',
    leaves: '#6A9A6A'
  }
};

const Zhugecai = ({ colors }: { colors: typeof groundColors['zhugecai'] }) => {
  return (
    <g>
      <path d="M0,50 Q2,35 0,20" stroke={colors.stem} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      
      <ellipse cx="-6" cy="42" rx="5" ry="2.5" fill={colors.leaves} transform="rotate(-25)" opacity="0.8" />
      <ellipse cx="7" cy="44" rx="4" ry="2" fill={colors.leaves} transform="rotate(20)" opacity="0.8" />
      
      <g transform="translate(0, 18)">
        {[0, 90, 180, 270].map((angle, i) => (
          <ellipse
            key={i}
            cx={Math.cos((angle * Math.PI) / 180) * 6}
            cy={Math.sin((angle * Math.PI) / 180) * 6}
            rx="4.5"
            ry="7"
            fill={colors.petals[i % colors.petals.length]}
            transform={`rotate(${angle})`}
            opacity="0.95"
          />
        ))}
        <circle cx="0" cy="0" r="3" fill={colors.center} />
      </g>
      
      <g transform="translate(5, 32)">
        {[0, 90, 180, 270].map((angle, i) => (
          <ellipse
            key={i}
            cx={Math.cos((angle * Math.PI) / 180) * 4}
            cy={Math.sin((angle * Math.PI) / 180) * 4}
            rx="3.5"
            ry="5.5"
            fill={colors.petals[i % colors.petals.length]}
            transform={`rotate(${angle})`}
            opacity="0.9"
          />
        ))}
        <circle cx="0" cy="0" r="2" fill={colors.center} />
      </g>
    </g>
  );
};

const Fudicai = ({ colors }: { colors: typeof groundColors['fudicai'] }) => {
  return (
    <g>
      <path d="M0,40 Q1,28 0,18" stroke={colors.stem} strokeWidth="1" fill="none" strokeLinecap="round" />
      
      <ellipse cx="-3" cy="32" rx="3" ry="1.5" fill={colors.leaves} transform="rotate(-15)" opacity="0.7" />
      <ellipse cx="4" cy="30" rx="2.5" ry="1.2" fill={colors.leaves} transform="rotate(15)" opacity="0.7" />
      
      <g transform="translate(0, 16)">
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <ellipse
            key={i}
            cx={Math.cos((angle * Math.PI) / 180) * 3}
            cy={Math.sin((angle * Math.PI) / 180) * 3}
            rx="2.5"
            ry="4"
            fill={colors.petals[i % colors.petals.length]}
            transform={`rotate(${angle})`}
            opacity="0.9"
          />
        ))}
        <circle cx="0" cy="0" r="2" fill={colors.center} />
      </g>
    </g>
  );
};

export const GroundFlower = forwardRef<GroundFlowerRef, GroundFlowerProps>(({
  flowerId,
  x,
  y,
  scale = 1,
  onClick,
  captureId
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const baseScaleRef = useRef(scale);
  
  const colors = groundColors[flowerId] || groundColors.zhugecai;
  
  // Expose grow method via ref
  useImperativeHandle(ref, () => ({
    grow: () => {
      if (groupRef.current) {
        // Limit max scale to 2.5x original
        const MAX_SCALE = 2.5;
        const currentScale = baseScaleRef.current;
        if (currentScale < MAX_SCALE * scale) {
          const newScale = Math.min(currentScale * 1.3, MAX_SCALE * scale);
          baseScaleRef.current = newScale;
          gsap.to(groupRef.current, {
            scale: newScale,
            duration: 0.5,
            ease: 'back.out(1.5)'
          });
        }
      }
    }
  }));
  
  useEffect(() => {
    if (groupRef.current) {
      gsap.fromTo(groupRef.current, 
        { scale: 0, opacity: 0 },
        { scale: scale, opacity: 1, duration: 0.6, ease: 'back.out(1.3)', delay: 0.1 }
      );
      
      gsap.to(groupRef.current, {
        rotation: 4,
        duration: 2.5 + Math.random() * 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.8
      });
    }
  }, []);

  return (
    <svg
      ref={svgRef}
      width={40 * scale}
      height={55 * scale}
      viewBox="-20 0 40 55"
      style={{
        position: 'absolute',
        left: x - (20 * scale),
        top: y - (55 * scale),
        pointerEvents: 'auto',
        cursor: 'pointer',
        overflow: 'visible'
      }}
      data-capture-plant="true"
      data-capture-id={captureId}
      onClick={onClick}
    >
      <g ref={groupRef} style={{ transformOrigin: '50% 100%' }}>
        {flowerId === 'fudicai' ? (
          <Fudicai colors={colors} />
        ) : (
          <Zhugecai colors={colors} />
        )}
      </g>
    </svg>
  );
});

GroundFlower.displayName = 'GroundFlower';

export default GroundFlower;
