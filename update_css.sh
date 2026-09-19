#!/bin/bash
# Remove from line 300 to 325 (which covers the old backdrop-blur overrides)
sed -i '299,325d' src/index.css

# Insert new overrides at line 299
sed -i '298a\
/* Upgrade existing backdrop-blur classes to Fluent UI v2 aesthetics */\
[class*="backdrop-blur-md"],\
[class*="backdrop-blur-lg"],\
[class*="backdrop-blur-xl"],\
[class*="backdrop-blur-2xl"],\
[class*="backdrop-blur-[24px]"] {\
  backdrop-filter: blur(80px) saturate(200%) !important;\
  -webkit-backdrop-filter: blur(80px) saturate(200%) !important;\
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.3) !important;\
  position: relative;\
  isolation: isolate;\
}\
\
[class*="backdrop-blur-md"]::before,\
[class*="backdrop-blur-lg"]::before,\
[class*="backdrop-blur-xl"]::before,\
[class*="backdrop-blur-2xl"]::before,\
[class*="backdrop-blur-[24px]"]::before {\
  content: "";\
  position: absolute;\
  inset: 0;\
  border-radius: inherit;\
  pointer-events: none;\
  background-image: url("data:image/svg+xml,%3Csvg viewBox=\\x270 0 200 200\\x27 xmlns=\\x27http://www.w3.org/2000/svg\\x27%3E%3Cfilter id=\\x27noiseFilter\\x27%3E%3CfeTurbulence type=\\x27fractalNoise\\x27 baseFrequency=\\x270.85\\x27 numOctaves=\\x273\\x27 stitchTiles=\\x27stitch\\x27/%3E%3C/filter%3E%3Crect width=\\x27100%25\\x27 height=\\x27100%25\\x27 filter=\\x27url(%23noiseFilter)\\x27 opacity=\\x270.05\\x27/%3E%3C/svg%3E");\
  mix-blend-mode: overlay;\
  z-index: -1;\
}\
\
/* Adjust specific modal/popover contexts to act like Fluent Acrylic (Z-index >= 40) */\
.z-40[class*="backdrop-blur"],\
.z-50[class*="backdrop-blur"],\
.z-\\[60\\][class*="backdrop-blur"],\
.z-\\[100\\][class*="backdrop-blur"] {\
   box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 48px rgba(0, 0, 0, 0.5) !important;\
}\
\
/* Make the root mica layer (the background itself) thicker */\
.mica-bg-layer {\
  backdrop-filter: blur(120px) saturate(140%) !important;\
  -webkit-backdrop-filter: blur(120px) saturate(140%) !important;\
  box-shadow: none !important;\
}' src/index.css
