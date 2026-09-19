export const interpolateTimerColor = (percent: number): string => {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  // Start (100%): Pink #F7CAC9 (247, 202, 201)
  // End (0%): Dark Purple #4C1D95 (76, 29, 149)
  const r = Math.round(76 + (247 - 76) * p);
  const g = Math.round(29 + (202 - 29) * p);
  const b = Math.round(149 + (201 - 149) * p);
  return `rgb(${r}, ${g}, ${b})`;
};
