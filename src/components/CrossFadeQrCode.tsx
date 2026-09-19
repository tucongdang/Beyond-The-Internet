import React, { useState, useEffect, useRef } from 'react';

interface CrossFadeQrCodeProps {
  dataUrl: string;
  alt?: string;
  className?: string;
  sizeClass?: string;
  style?: React.CSSProperties;
  loadingFallback?: React.ReactNode;
}

/**
 * CrossFadeQrCode
 * Provides a seamless optical cross-dissolve animation between QR code images
 * when the encoded URL or color palette changes, eliminating raster flickering.
 */
export const CrossFadeQrCode: React.FC<CrossFadeQrCodeProps> = ({
  dataUrl,
  alt = 'Mã QR Quét Tham Gia',
  className = '',
  sizeClass = 'w-48 h-48 sm:w-52 sm:h-52',
  style,
  loadingFallback
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>(dataUrl);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [isFading, setIsFading] = useState<boolean>(false);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!dataUrl) return;

    // First load
    if (!currentUrl) {
      setCurrentUrl(dataUrl);
      return;
    }

    // When the dataUrl changes (due to palette or link change)
    if (dataUrl !== currentUrl) {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }

      setPrevUrl(currentUrl);
      setCurrentUrl(dataUrl);
      setIsFading(true);

      // Double requestAnimationFrame ensures the browser paints the starting frame before animating
      const frame1 = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          setIsFading(false);
        });
        cleanupTimerRef.current = setTimeout(() => {
          setPrevUrl(null);
        }, 320);
      });

      return () => {
        cancelAnimationFrame(frame1);
        if (cleanupTimerRef.current) {
          clearTimeout(cleanupTimerRef.current);
        }
      };
    }
  }, [dataUrl, currentUrl]);

  if (!currentUrl && !dataUrl) {
    return (
      <div 
        className={`relative ${sizeClass} flex items-center justify-center ${className}`}
        style={style}
      >
        {loadingFallback || (
          <div className="w-full h-full bg-slate-100/5 rounded-[2px] flex items-center justify-center text-xs text-white/40 font-mono">
            Đang tạo QR...
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClass} overflow-hidden rounded-[2px] aspect-square select-none ${className}`}
      style={{ isolation: 'isolate', ...style }}
    >
      {/* Background/Previous QR Image Layer (Holds previous raster during cross-dissolve) */}
      {prevUrl && (
        <img
          src={prevUrl}
          alt={alt}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300 ease-in-out opacity-80 scale-100"
          style={{ willChange: 'opacity' }}
        />
      )}

      {/* Foreground/Current QR Image Layer (Smoothly fades in on palette swap) */}
      <img
        src={currentUrl || dataUrl}
        alt={alt}
        className={`w-full h-full object-contain transition-all duration-300 ease-out ${
          isFading ? 'opacity-0 scale-98 blur-[0.5px]' : 'opacity-100 scale-100 blur-0'
        }`}
        style={{ willChange: 'opacity, transform' }}
      />
    </div>
  );
};
