import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SVGFlowerProps {
  flowerId: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  onClick?: () => void;
}

// Flower color palettes
const flowerColors: Record<string, { petals: string[]; center: string; stem: string; leaves: string }> = {
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
  zhugecai: {
    petals: ['#8B7BB8', '#9B8BC8', '#AB9BD8'],
    center: '#E8DCC8',
    stem: '#5A7A51',
    leaves: '#6A8A61'
  },
  fudicai: {
    petals: ['#6B8DD9', '#7B9DE9', '#8BADF9'],
    center: '#F5E6C8',
    stem: '#4A7A41',
    leaves: '#5A8A51'
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

// SVG Flower Components
const PeachBlossom = ({ colors }: { colors: typeof flowerColors['baihuashanbitao'] }) => (
  <g>
    {/* Stem */}
    <path
      d="M0,0 Q5,30 0,80"
      stroke={colors.stem}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Leaves */}
    <ellipse cx="-15" cy="50" rx="12" ry="6" fill={colors.leaves} transform="rotate(-30 -15 50)" />
    <ellipse cx="18" cy="60" rx="10" ry="5" fill={colors.leaves} transform="rotate(30 18 60)" />
    {/* Flower petals - double layered */}
    {[0, 72, 144, 216, 288].map((angle, i) => (
      <g key={i} transform={`rotate(${angle})`}>
        <ellipse cx="0" cy="-18" rx="10" ry="18" fill={colors.petals[0]} opacity="0.9" />
        <ellipse cx="0" cy="-15" rx="8" ry="14" fill={colors.petals[1]} opacity="0.8" />
      </g>
    ))}
    {/* Center */}
    <circle cx="0" cy="0" r="8" fill={colors.center} />
    {/* Stamens */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
      <line
        key={i}
        x1="0"
        y1="0"
        x2={Math.cos((angle * Math.PI) / 180) * 6}
        y2={Math.sin((angle * Math.PI) / 180) * 6}
        stroke="#B8860B"
        strokeWidth="1"
      />
    ))}
  </g>
);

const Lilac = ({ colors }: { colors: typeof flowerColors['zidingxiang'] }) => (
  <g>
    {/* Stem */}
    <path
      d="M0,0 Q-3,40 0,100"
      stroke={colors.stem}
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
    />
    {/* Leaves */}
    <ellipse cx="-20" cy="60" rx="15" ry="8" fill={colors.leaves} transform="rotate(-45 -20 60)" />
    <ellipse cx="22" cy="70" rx="14" ry="7" fill={colors.leaves} transform="rotate(45 22 70)" />
    {/* Flower clusters */}
    {[-30, -10, 10, 30].map((y, i) => (
      <g key={i} transform={`translate(${Math.sin(i * 1.5) * 8}, ${y})`}>
        {[0, 60, 120, 180, 240, 300].map((angle, j) => (
          <ellipse
            key={j}
            cx={Math.cos((angle * Math.PI) / 180) * 6}
            cy={Math.sin((angle * Math.PI) / 180) * 6}
            rx="5"
            ry="8"
            fill={colors.petals[j % colors.petals.length]}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="0" cy="0" r="3" fill={colors.center} />
      </g>
    ))}
  </g>
);

const SmallFlower = ({ colors }: { colors: typeof flowerColors['fudicai'] }) => (
  <g>
    {/* Stem */}
    <path
      d="M0,0 Q2,20 0,50"
      stroke={colors.stem}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    {/* Small leaves */}
    <ellipse cx="-8" cy="30" rx="6" ry="3" fill={colors.leaves} transform="rotate(-20 -8 30)" />
    <ellipse cx="10" cy="35" rx="5" ry="2.5" fill={colors.leaves} transform="rotate(20 10 35)" />
    {/* Tiny flower */}
    {[0, 90, 180, 270].map((angle, i) => (
      <ellipse
        key={i}
        cx={Math.cos((angle * Math.PI) / 180) * 5}
        cy={Math.sin((angle * Math.PI) / 180) * 5}
        rx="4"
        ry="6"
        fill={colors.petals[0]}
        transform={`rotate(${angle})`}
      />
    ))}
    <circle cx="0" cy="0" r="3" fill={colors.center} />
  </g>
);

const PurpleLeafPlum = ({ colors }: { colors: typeof flowerColors['ziyeli'] }) => (
  <g>
    {/* Branch */}
    <path
      d="M0,0 Q-5,30 -10,60"
      stroke={colors.stem}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Purple leaves */}
    <ellipse cx="-15" cy="40" rx="12" ry="6" fill={colors.leaves} transform="rotate(-40 -15 40)" />
    <ellipse cx="-8" cy="50" rx="10" ry="5" fill={colors.leaves} transform="rotate(-30 -8 50)" />
    <ellipse cx="5" cy="45" rx="11" ry="5.5" fill={colors.leaves} transform="rotate(20 5 45)" />
    {/* Small pink flowers */}
    {[-20, 0, 15].map((y, i) => (
      <g key={i} transform={`translate(${Math.sin(i) * 12}, ${y})`}>
        {[0, 72, 144, 216, 288].map((angle, j) => (
          <ellipse
            key={j}
            cx={Math.cos((angle * Math.PI) / 180) * 5}
            cy={Math.sin((angle * Math.PI) / 180) * 5}
            rx="4"
            ry="7"
            fill={colors.petals[0]}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="0" cy="0" r="2.5" fill={colors.center} />
      </g>
    ))}
  </g>
);

const DoubleFlowerPlum = ({ colors }: { colors: typeof flowerColors['yuyemei'] }) => (
  <g>
    {/* Stem */}
    <path
      d="M0,0 Q3,35 0,70"
      stroke={colors.stem}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Characteristic elm-like leaves with deep veins */}
    <g transform="translate(-18, 45)">
      <ellipse cx="0" cy="0" rx="14" ry="7" fill={colors.leaves} />
      <path d="M-10,0 L10,0 M-7,-3 L7,3 M-7,3 L7,-3" stroke="#4A3A2A" strokeWidth="0.5" opacity="0.5" />
    </g>
    <g transform="translate(20, 55) rotate(30)">
      <ellipse cx="0" cy="0" rx="12" ry="6" fill={colors.leaves} />
      <path d="M-8,0 L8,0 M-5,-2 L5,2 M-5,2 L5,-2" stroke="#4A3A2A" strokeWidth="0.5" opacity="0.5" />
    </g>
    {/* Large double-petaled flower */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
      <g key={i} transform={`rotate(${angle})`}>
        <ellipse cx="0" cy="-20" rx="12" ry="20" fill={colors.petals[0]} opacity="0.85" />
        <ellipse cx="0" cy="-16" rx="9" ry="15" fill={colors.petals[1]} opacity="0.9" />
        <ellipse cx="0" cy="-12" rx="6" ry="10" fill={colors.petals[2] || colors.petals[0]} opacity="0.95" />
      </g>
    ))}
    {/* Center */}
    <circle cx="0" cy="0" r="10" fill={colors.center} />
    {/* Many stamens */}
    {Array.from({ length: 16 }, (_, i) => i * 22.5).map((angle, i) => (
      <line
        key={i}
        x1="0"
        y1="0"
        x2={Math.cos((angle * Math.PI) / 180) * 8}
        y2={Math.sin((angle * Math.PI) / 180) * 8}
        stroke="#B8860B"
        strokeWidth="1"
      />
    ))}
  </g>
);

const BirdCherry = ({ colors }: { colors: typeof flowerColors['chouli'] }) => (
  <g>
    {/* Stem */}
    <path
      d="M0,0 Q-2,40 0,90"
      stroke={colors.stem}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Leaves */}
    <ellipse cx="-16" cy="55" rx="13" ry="6" fill={colors.leaves} transform="rotate(-35 -16 55)" />
    <ellipse cx="18" cy="65" rx="12" ry="5.5" fill={colors.leaves} transform="rotate(35 18 65)" />
    {/* Long flower cluster */}
    {Array.from({ length: 12 }, (_, i) => (
      <g key={i} transform={`translate(${Math.sin(i * 0.8) * 6}, ${-35 + i * 6})`}>
        {[0, 90, 180, 270].map((angle, j) => (
          <ellipse
            key={j}
            cx={Math.cos((angle * Math.PI) / 180) * 4}
            cy={Math.sin((angle * Math.PI) / 180) * 4}
            rx="3.5"
            ry="5"
            fill={colors.petals[0]}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="0" cy="0" r="2" fill={colors.center} />
      </g>
    ))}
  </g>
);

const FieldFlower = ({ colors }: { colors: typeof flowerColors['zhugecai'] }) => (
  <g>
    {/* Stem */}
    <path
      d="M0,0 Q1,25 0,55"
      stroke={colors.stem}
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Leaves */}
    <ellipse cx="-10" cy="35" rx="9" ry="4" fill={colors.leaves} transform="rotate(-25 -10 35)" />
    <ellipse cx="12" cy="40" rx="8" ry="3.5" fill={colors.leaves} transform="rotate(25 12 40)" />
    {/* Four-petaled cross-shaped flower */}
    {[0, 90, 180, 270].map((angle, i) => (
      <ellipse
        key={i}
        cx={Math.cos((angle * Math.PI) / 180) * 8}
        cy={Math.sin((angle * Math.PI) / 180) * 8}
        rx="6"
        ry="10"
        fill={colors.petals[i % colors.petals.length]}
        transform={`rotate(${angle})`}
      />
    ))}
    {/* Center */}
    <circle cx="0" cy="0" r="4" fill={colors.center} />
  </g>
);

export const SVGFlower = ({ flowerId, x, y, scale = 1, rotation = 0, onClick }: SVGFlowerProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  
  const colors = flowerColors[flowerId] || flowerColors.baihuashanbitao;
  
  useEffect(() => {
    if (groupRef.current) {
      // Growth animation
      const tl = gsap.timeline();
      
      // Start from seed
      tl.fromTo(groupRef.current, 
        { scale: 0, rotation: rotation - 180, opacity: 0, transformOrigin: '0 80px' },
        { scale: scale, rotation: rotation, opacity: 1, duration: 1.2, ease: 'back.out(1.7)' }
      );
      
      // Gentle sway after growth
      gsap.to(groupRef.current, {
        rotation: rotation + 3,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.2
      });
    }
  }, [scale, rotation]);

  const renderFlower = () => {
    switch (flowerId) {
      case 'baihuashanbitao':
        return <PeachBlossom colors={colors} />;
      case 'zidingxiang':
      case 'baidingxiang':
      case 'huadingxiang':
      case 'landingxiang':
        return <Lilac colors={colors} />;
      case 'fudicai':
        return <SmallFlower colors={colors} />;
      case 'ziyeli':
        return <PurpleLeafPlum colors={colors} />;
      case 'yuyemei':
        return <DoubleFlowerPlum colors={colors} />;
      case 'chouli':
        return <BirdCherry colors={colors} />;
      case 'zhugecai':
        return <FieldFlower colors={colors} />;
      default:
        return <PeachBlossom colors={colors} />;
    }
  };

  return (
    <svg
      ref={svgRef}
      width="120"
      height="150"
      viewBox="-60 -40 120 150"
      style={{
        position: 'absolute',
        left: x - 60,
        top: y - 110,
        pointerEvents: 'auto',
        cursor: 'pointer',
        overflow: 'visible'
      }}
      onClick={onClick}
    >
      <g ref={groupRef}>
        {renderFlower()}
      </g>
    </svg>
  );
};

export default SVGFlower;
