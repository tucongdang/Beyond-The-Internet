export const interpolateTimerColor = (percent: number): string => {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  // Start (100%): Rose Quartz #F7CAC9 (247, 202, 201)
  // End (0%): Urgent Red #EF4444 (239, 68, 68)
  const r = Math.round(239 + (247 - 239) * p);
  const g = Math.round(68 + (202 - 68) * p);
  const b = Math.round(68 + (201 - 68) * p);
  return `rgb(${r}, ${g}, ${b})`;
};

