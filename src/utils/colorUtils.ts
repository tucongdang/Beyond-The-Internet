export const interpolateTimerColor = (percent: number): string => {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  // Start (100%): Claude Clay #D97757 (217, 119, 87)
  // End (0%): Warm Gray 700 #3D3D3A (61, 61, 58)
  const r = Math.round(61 + (217 - 61) * p);
  const g = Math.round(61 + (119 - 61) * p);
  const b = Math.round(58 + (87 - 58) * p);
  return `rgb(${r}, ${g}, ${b})`;
};
