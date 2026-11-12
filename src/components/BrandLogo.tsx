import React from 'react';

export interface BrandLogoProps {
  variant?: 'landscape' | 'square';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withBackground?: boolean;
}

/**
 * Official Beyond The Internet 2027 Brand Logo component.
 * Uses the exact vector SVG files provided by the user:
 * - /logo-landscape.svg
 * - /logo-square.svg
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'landscape',
  size = 'md',
  className = '',
  withBackground = false,
}) => {
  if (variant === 'square') {
    const squareSizeMap = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8 sm:w-9 sm:h-9',
      md: 'w-10 h-10 sm:w-11 sm:h-11',
      lg: 'w-14 h-14 sm:w-16 sm:h-16',
      xl: 'w-20 h-20 sm:w-24 sm:h-24',
    };

    return (
      <img
        src="/logo-square.svg?v=2027"
        alt="Beyond The Internet 2027"
        draggable={false}
        className={`object-contain select-none shrink-0 drop-shadow-[0_2px_12px_rgba(247,202,201,0.22)] ${
          withBackground ? 'bg-black rounded-lg p-1' : ''
        } ${squareSizeMap[size]} ${className}`}
      />
    );
  }

  // LANDSCAPE VARIANT
  const landscapeHeightMap = {
    xs: 'h-5 sm:h-6',
    sm: 'h-6 sm:h-7',
    md: 'h-8 sm:h-9',
    lg: 'h-10 sm:h-12',
    xl: 'h-12 sm:h-14 md:h-16',
  };

  return (
    <img
      src="/logo-landscape.svg?v=2027"
      alt="Beyond The Internet 2027"
      draggable={false}
      className={`w-auto object-contain select-none shrink-0 drop-shadow-[0_2px_14px_rgba(247,202,201,0.22)] ${
        withBackground ? 'bg-black rounded-lg p-1' : ''
      } ${landscapeHeightMap[size]} ${className}`}
    />
  );
};
