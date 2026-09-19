#!/bin/bash
# Remove dangerous global overrides
sed -i '296,430d' src/index.css

# Insert safe, scoped utility classes
cat << 'CSS' >> src/index.css

/* BTI Custom Fluent UI Styles */
/* ============================================================ */

/* Scoped Mica & Acrylic surfaces - Opt-in only */
.fluent-acrylic-surface {
  background-color: rgba(15, 10, 25, 0.45) !important;
  backdrop-filter: blur(80px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(80px) saturate(200%) !important;
  position: relative;
  isolation: isolate;
  box-shadow: 
    inset 0 1px 1px rgba(255, 255, 255, 0.15), 
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 16px 48px rgba(0, 0, 0, 0.5) !important;
}

.fluent-acrylic-surface::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  z-index: -1;
}

/* Scoped Button Animation (Use .bti-btn explicitly if needed) */
.bti-btn {
  transition: transform 0.15s cubic-bezier(0.55, 0.085, 0.68, 0.53), background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.bti-btn:active:not(:disabled) {
  transform: scale(0.96);
}

/* Make the root mica layer (the background itself) thicker */
.mica-bg-layer {
  backdrop-filter: blur(120px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(120px) saturate(140%) !important;
  box-shadow: none !important;
}

/* Windows 11 Fluent Scrollbars */
::-webkit-scrollbar {
  width: 14px;
  height: 14px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-clip: padding-box;
  border: 4px solid transparent;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.4);
  border-width: 2px;
}
CSS
