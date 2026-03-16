import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import gsap from 'gsap';

interface TreeFlowerProps {
  flowerId: string;
  x: number;
  y: number;
  scale?: number;
  density?: 'dense' | 'medium' | 'sparse';
  branchType?: 'straight' | 'curved' | 'twisted';
  onClick?: () => void;
  captureId?: string;
}

export interface TreeFlowerRef {
  grow: () => void;
  applyWind: (intensity: number) => void;
}

const treeColors: Record<string, { petals: string[]; center: string; stem: string; leaves: string }> = {
  baihuashanbitao: {
    petals: ['#FFF8F0', '#FFF5E6', '#FFEEE0'],
    center: '#FFD700',
    stem: '#4A7C59',
    leaves: '#5A8C69'
  },
  zidingxiang: {
    petals: ['#9B7CB6', '#A68BC7', '#B59DD4'],
    center: '#D4AF37',
    stem: '#4A6741',
    leaves: '#5A7751'
  },
  baidingxiang: {
    petals: ['#FFFAF5', '#FFF8F0', '#FFF5EA'],
    center: '#E8D4A8',
    stem: '#4A6741',
    leaves: '#5A7751'
  },
  huadingxiang: {
    petals: ['#B8A1D1', '#C4B0DA', '#D0C0E3'],
    center: '#C9B896',
    stem: '#4A5D41',
    leaves: '#5A6D51'
  },
  landingxiang: {
    petals: ['#7BA7D9', '#8BB4E3', '#9BC1ED'],
    center: '#F0E68C',
    stem: '#4A6B41',
    leaves: '#5A7B51'
  },
  ziyeli: {
    petals: ['#FFB6C1', '#FFC6D1', '#FFD6E1'],
    center: '#DDA0DD',
    stem: '#8B4789',
    leaves: '#6B2759'
  },
  yuyemei: {
    petals: ['#FFB6C1', '#FFC0CB', '#FFD1DC'],
    center: '#FFD700',
    stem: '#5A4A3A',
    leaves: '#6A5A4A'
  },
  chouli: {
    petals: ['#FFFAF0', '#FFF8F5', '#FFF5F0'],
    center: '#F0E68C',
    stem: '#4A5A41',
    leaves: '#5A6A51'
  }
};

const PeachBlossom = ({ colors, density }: { colors: typeof treeColors['baihuashanbitao']; density: 'dense' | 'medium' | 'sparse' }) => {
  const flowerCount = { dense: 6, medium: 4, sparse: 3 }[density];
  
  return (
    <g>
      <path d="M0,80 Q3,50 0,20" stroke={colors.stem} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M0,50 Q-12,45 -20,35" stroke={colors.stem} strokeWidth="2" fill="none" />
      <path d="M0,45 Q10,40 18,32" stroke={colors.stem} strokeWidth="2" fill="none" />
      <path d="M0,35 Q-5,25 -8,18" stroke={colors.stem} strokeWidth="1.5" fill="none" />
      
      <ellipse cx="-18" cy="38" rx="8" ry="4" fill={colors.leaves} transform="rotate(-30 -18 38)" />
      <ellipse cx="16" cy="34" rx="7" ry="3.5" fill={colors.leaves} transform="rotate(25 16 34)" />
      <ellipse cx="-6" cy="20" rx="6" ry="3" fill={colors.leaves} transform="rotate(-20 -6 20)" />
      
      {Array.from({ length: flowerCount }, (_, i) => {
        const positions = [
          { x: -22, y: 32 }, { x: 18, y: 28 }, { x: -8, y: 15 },
          { x: 10, y: 22 }, { x: -15, y: 40 }, { x: 5, y: 18 }
        ];
        const pos = positions[i] || { x: 0, y: 25 };
        return (
          <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
            {[0, 72, 144, 216, 288].map((angle, j) => (
              <ellipse
                key={j}
                cx={Math.cos((angle * Math.PI) / 180) * 7}
                cy={Math.sin((angle * Math.PI) / 180) * 7}
                rx="5"
                ry="8"
                fill={colors.petals[j % colors.petals.length]}
                transform={`rotate(${angle})`}
                opacity="0.9"
              />
            ))}
            <circle cx="0" cy="0" r="4" fill={colors.center} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a, k) => (
              <line
                key={k}
                x1="0"
                y1="0"
                x2={Math.cos((a * Math.PI) / 180) * 5}
                y2={Math.sin((a * Math.PI) / 180) * 5}
                stroke="#B8860B"
                strokeWidth="0.8"
              />
            ))}
          </g>
        );
      })}
    </g>
  );
};

const Lilac = ({ colors, density }: { colors: typeof treeColors['zidingxiang']; density: 'dense' | 'medium' | 'sparse' }) => {
  const clusterCount = { dense: 4, medium: 3, sparse: 2 }[density];
  const flowersPerCluster = { dense: 6, medium: 4, sparse: 3 }[density];
  
  return (
    <g>
      <path d="M0,90 Q-2,60 0,30" stroke={colors.stem} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M0,55 Q-10,50 -18,42" stroke={colors.stem} strokeWidth="2.5" fill="none" />
      <path d="M0,50 Q12,45 20,38" stroke={colors.stem} strokeWidth="2.5" fill="none" />
      <path d="M0,40 Q-5,30 -8,22" stroke={colors.stem} strokeWidth="2" fill="none" />
      
      <ellipse cx="-18" cy="45" rx="10" ry="5" fill={colors.leaves} transform="rotate(-40 -18 45)" />
      <ellipse cx="20" cy="40" rx="9" ry="4.5" fill={colors.leaves} transform="rotate(35 20 40)" />
      
      {Array.from({ length: clusterCount }, (_, i) => {
        const positions = [{ x: -18, y: 38 }, { x: 20, y: 34 }, { x: -6, y: 18 }, { x: 8, y: 25 }];
        const pos = positions[i] || { x: 0, y: 30 };
        return (
          <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
            {Array.from({ length: flowersPerCluster }, (_, j) => {
              const fx = Math.cos((j * 60 * Math.PI) / 180) * 5;
              const fy = Math.sin((j * 60 * Math.PI) / 180) * 4;
              return (
                <g key={j} transform={`translate(${fx}, ${fy})`}>
                  {[0, 90, 180, 270].map((angle, k) => (
                    <ellipse
                      key={k}
                      cx={Math.cos((angle * Math.PI) / 180) * 3}
                      cy={Math.sin((angle * Math.PI) / 180) * 3}
                      rx="2.5"
                      ry="4"
                      fill={colors.petals[k % colors.petals.length]}
                      transform={`rotate(${angle})`}
                      opacity="0.85"
                    />
                  ))}
                  <circle cx="0" cy="0" r="2" fill={colors.center} />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

const PurpleLeafPlum = ({ colors }: { colors: typeof treeColors['ziyeli'] }) => {
  return (
    <g>
      <path d="M0,85 Q-4,55 -6,30" stroke={colors.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M-5,55 Q-15,48 -22,40" stroke={colors.stem} strokeWidth="2" fill="none" />
      <path d="M-5,50 Q8,44 15,36" stroke={colors.stem} strokeWidth="2" fill="none" />
      
      <ellipse cx="-20" cy="42" rx="9" ry="4.5" fill={colors.leaves} transform="rotate(-35 -20 42)" />
      <ellipse cx="14" cy="36" rx="8" ry="4" fill={colors.leaves} transform="rotate(30 14 36)" />
      <ellipse cx="-6" cy="25" rx="7" ry="3.5" fill={colors.leaves} transform="rotate(-20 -6 25)" />
      
      {[
        { x: -22, y: 35 }, { x: 14, y: 30 }, { x: -5, y: 18 },
        { x: 6, y: 25 }, { x: -12, y: 45 }
      ].map((pos, i) => (
        <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
          {[0, 72, 144, 216, 288].map((angle, j) => (
            <ellipse
              key={j}
              cx={Math.cos((angle * Math.PI) / 180) * 5}
              cy={Math.sin((angle * Math.PI) / 180) * 5}
              rx="4"
              ry="6.5"
              fill={colors.petals[j % colors.petals.length]}
              transform={`rotate(${angle})`}
              opacity="0.9"
            />
          ))}
          <circle cx="0" cy="0" r="2.5" fill={colors.center} />
        </g>
      ))}
    </g>
  );
};

const DoublePlum = ({ colors }: { colors: typeof treeColors['yuyemei'] }) => {
  return (
    <g>
      <path d="M0,80 Q3,55 0,30" stroke={colors.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M0,50 Q-12,45 -18,38" stroke={colors.stem} strokeWidth="2.5" fill="none" />
      <path d="M0,45 Q12,40 18,33" stroke={colors.stem} strokeWidth="2.5" fill="none" />
      
      <ellipse cx="-16" cy="40" rx="10" ry="5" fill={colors.leaves} transform="rotate(-30 -16 40)" />
      <ellipse cx="16" cy="35" rx="9" ry="4.5" fill={colors.leaves} transform="rotate(25 16 35)" />
      
      {[
        { x: -16, y: 32 }, { x: 16, y: 27 }, { x: -3, y: 18 }, { x: 8, y: 24 }
      ].map((pos, i) => (
        <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
          {[0, 60, 120, 180, 240, 300].map((angle, j) => (
            <ellipse
              key={j}
              cx={Math.cos((angle * Math.PI) / 180) * 8}
              cy={Math.sin((angle * Math.PI) / 180) * 8}
              rx="5.5"
              ry="9"
              fill={colors.petals[0]}
              transform={`rotate(${angle})`}
              opacity="0.8"
            />
          ))}
          {[30, 90, 150, 210, 270, 330].map((angle, j) => (
            <ellipse
              key={j}
              cx={Math.cos((angle * Math.PI) / 180) * 5}
              cy={Math.sin((angle * Math.PI) / 180) * 5}
              rx="4"
              ry="6.5"
              fill={colors.petals[1]}
              transform={`rotate(${angle})`}
              opacity="0.9"
            />
          ))}
          <circle cx="0" cy="0" r="3.5" fill={colors.center} />
        </g>
      ))}
    </g>
  );
};

const BirdCherry = ({ colors }: { colors: typeof treeColors['chouli'] }) => {
  return (
    <g>
      <path d="M0,90 Q-1,60 0,35" stroke={colors.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M0,55 Q-10,50 -15,44" stroke={colors.stem} strokeWidth="2" fill="none" />
      <path d="M0,50 Q10,45 15,40" stroke={colors.stem} strokeWidth="2" fill="none" />
      
      <ellipse cx="-14" cy="46" rx="9" ry="4.5" fill={colors.leaves} transform="rotate(-30 -14 46)" />
      <ellipse cx="14" cy="42" rx="8" ry="4" fill={colors.leaves} transform="rotate(25 14 42)" />
      
      <g transform="translate(-2, 10)">
        {Array.from({ length: 10 }, (_, i) => {
          const y = i * 5;
          const x = Math.sin(i * 0.5) * 3;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              {[0, 72, 144, 216, 288].map((angle, j) => (
                <ellipse
                  key={j}
                  cx={Math.cos((angle * Math.PI) / 180) * 2.5}
                  cy={Math.sin((angle * Math.PI) / 180) * 2.5}
                  rx="2"
                  ry="3.5"
                  fill={colors.petals[j % colors.petals.length]}
                  transform={`rotate(${angle})`}
                  opacity="0.9"
                />
              ))}
              <circle cx="0" cy="0" r="1.5" fill={colors.center} />
            </g>
          );
        })}
      </g>
    </g>
  );
};

export const TreeFlower = forwardRef<TreeFlowerRef, TreeFlowerProps>(({
  flowerId,
  x,
  y,
  scale = 1,
  density = 'medium',
  branchType,
  onClick,
  captureId
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const windTweenRef = useRef<gsap.core.Tween | null>(null);
  const baseScaleRef = useRef(scale);
  
  const colors = treeColors[flowerId] || treeColors.baihuashanbitao;
  
  // Expose methods via ref
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
    },
    applyWind: (intensity: number) => {
      if (groupRef.current && intensity > 0.3) {
        // Kill existing wind animation
        if (windTweenRef.current) {
          windTweenRef.current.kill();
        }
        
        // Apply wind sway
        const direction = Math.random() > 0.5 ? 1 : -1;
        windTweenRef.current = gsap.to(groupRef.current, {
          rotation: direction * intensity * 15,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(groupRef.current, {
              rotation: 0,
              duration: 0.5,
              ease: 'elastic.out(1, 0.5)'
            });
          }
        });
      }
    }
  }));
  
  useEffect(() => {
    if (groupRef.current) {
      // Initial growth animation
      gsap.fromTo(groupRef.current, 
        { scale: 0, opacity: 0 },
        { scale: scale, opacity: 1, duration: 0.8, ease: 'back.out(1.4)', delay: 0.1 }
      );
      
      // Gentle idle sway
      const swayAmount = branchType === 'twisted' ? 3 : branchType === 'curved' ? 2 : 1.5;
      gsap.to(groupRef.current, {
        rotation: swayAmount,
        duration: 3 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1
      });
    }
  }, []);

  const renderFlower = () => {
    switch (flowerId) {
      case 'baihuashanbitao':
        return <PeachBlossom colors={colors} density={density} />;
      case 'zidingxiang':
      case 'baidingxiang':
      case 'huadingxiang':
      case 'landingxiang':
        return <Lilac colors={colors} density={density} />;
      case 'ziyeli':
        return <PurpleLeafPlum colors={colors} />;
      case 'yuyemei':
        return <DoublePlum colors={colors} />;
      case 'chouli':
        return <BirdCherry colors={colors} />;
      default:
        return <PeachBlossom colors={colors} density={density} />;
    }
  };

  return (
    <svg
      ref={svgRef}
      width={80 * scale}
      height={100 * scale}
      viewBox="-40 0 80 100"
      style={{
        position: 'absolute',
        left: x - (40 * scale),
        top: y - (100 * scale),
        pointerEvents: 'auto',
        cursor: 'pointer',
        overflow: 'visible'
      }}
      data-capture-plant="true"
      data-capture-id={captureId}
      onClick={onClick}
    >
      <g ref={groupRef} style={{ transformOrigin: '50% 100%' }}>
        {renderFlower()}
      </g>
    </svg>
  );
});

TreeFlower.displayName = 'TreeFlower';

export default TreeFlower;
