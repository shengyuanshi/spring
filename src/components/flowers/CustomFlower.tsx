import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import gsap from 'gsap';

interface CustomFlowerProps {
  svgMarkup: string;
  x: number;
  y: number;
  scale?: number;
  onClick?: () => void;
  captureId?: string;
}

export interface CustomFlowerRef {
  grow: () => void;
  applyWind: (intensity: number) => void;
}

const extractViewBox = (svgMarkup: string) => {
  const viewBoxMatch = svgMarkup.match(/viewBox=["']([^"']+)["']/i);
  return viewBoxMatch?.[1] || '0 0 120 140';
};

const extractSvgContent = (svgMarkup: string) => {
  const contentMatch = svgMarkup.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  return contentMatch?.[1] || svgMarkup;
};

export const CustomFlower = forwardRef<CustomFlowerRef, CustomFlowerProps>(({
  svgMarkup,
  x,
  y,
  scale = 1,
  onClick,
  captureId,
}, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const baseScaleRef = useRef(scale);
  const windTweenRef = useRef<gsap.core.Tween | null>(null);

  const viewBox = useMemo(() => extractViewBox(svgMarkup), [svgMarkup]);
  const svgContent = useMemo(() => extractSvgContent(svgMarkup), [svgMarkup]);

  useImperativeHandle(ref, () => ({
    grow: () => {
      if (!wrapperRef.current) return;

      const nextScale = Math.min(baseScaleRef.current * 1.24, scale * 2.4);
      baseScaleRef.current = nextScale;

      gsap.to(wrapperRef.current, {
        scale: nextScale,
        duration: 0.45,
        ease: 'back.out(1.4)',
      });
    },
    applyWind: (intensity: number) => {
      if (!wrapperRef.current || intensity <= 0.2) return;

      windTweenRef.current?.kill();
      windTweenRef.current = gsap.to(wrapperRef.current, {
        rotation: (Math.random() > 0.5 ? 1 : -1) * intensity * 12,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: () => {
          if (!wrapperRef.current) return;
          gsap.to(wrapperRef.current, {
            rotation: 0,
            duration: 0.55,
            ease: 'elastic.out(1, 0.45)',
          });
        },
      });
    },
  }));

  useEffect(() => {
    if (!wrapperRef.current) return;

    gsap.fromTo(
      wrapperRef.current,
      { scale: 0, opacity: 0, rotation: -8 },
      { scale, opacity: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.4)' },
    );
  }, [scale]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        left: x - 50 * scale,
        top: y - 110 * scale,
        width: 100 * scale,
        height: 120 * scale,
        transformOrigin: '50% 100%',
        cursor: 'pointer',
      }}
      data-capture-plant="true"
      data-capture-id={captureId}
      onClick={onClick}
    >
      <svg
        data-capture-plant="true"
        data-capture-id={captureId}
        viewBox={viewBox}
        width="100%"
        height="100%"
        style={{ overflow: 'visible', pointerEvents: 'none' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
});

CustomFlower.displayName = 'CustomFlower';
