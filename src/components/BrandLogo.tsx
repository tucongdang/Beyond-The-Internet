import React from 'react';

export interface BrandLogoProps {
  variant?: 'square' | 'landscape';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withBackground?: boolean;
}

/**
 * Official Beyond The Internet 2027 Brand Logo component.
 * Features 100% cropped tight viewBox (excess whitespace removed)
 * and enlarged square stacked vector SVG logo layout by default.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'square',
  size = 'md',
  className = '',
  withBackground = false,
}) => {
  if (variant === 'square') {
    const squareSizeMap = {
      xs: 'w-8 h-auto',
      sm: 'w-12 sm:w-14 h-auto',
      md: 'w-16 sm:w-20 h-auto',
      lg: 'w-28 sm:w-32 h-auto',
      xl: 'w-44 sm:w-52 md:w-60 h-auto',
    };

    return (
      <img
        src="/logo-square.svg?v=2027_cropped"
        alt="Beyond The Internet 2027"
        draggable={false}
        className={`object-contain select-none shrink-0 drop-shadow-[0_2px_14px_rgba(247,202,201,0.3)] ${
          withBackground ? 'bg-black rounded-lg p-1.5' : ''
        } ${squareSizeMap[size]} ${className}`}
      />
    );
  }

  // LANDSCAPE VARIANT
  const landscapeHeightMap = {
    xs: 'h-6 sm:h-7',
    sm: 'h-8 sm:h-10',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-16 sm:h-20 md:h-24',
  };

  return (
    <img
      src="/logo-landscape.svg?v=2027_cropped"
      alt="Beyond The Internet 2027"
      draggable={false}
      className={`w-auto object-contain select-none shrink-0 drop-shadow-[0_2px_14px_rgba(247,202,201,0.3)] ${
        withBackground ? 'bg-black rounded-lg p-1.5' : ''
      } ${landscapeHeightMap[size]} ${className}`}
    />
  );
};
