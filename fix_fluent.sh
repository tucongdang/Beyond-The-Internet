#!/bin/bash

# Update Corner Radiuses for Cards and Dialogs to 8px
sed -i -E 's/border-radius: 4px; \/\* fluent-card/border-radius: 8px; \/\* fluent-card/g' src/index.css

# Make sure all .fluent-card and .fluent-box have border-radius 8px
sed -i '/\.fluent-box \{/,/\}/ s/border-radius: 4px;/border-radius: 8px;/' src/index.css
sed -i '/\.fluent-card \{/,/\}/ s/border-radius: 4px;/border-radius: 8px;/' src/index.css
sed -i '/\.fluent-dialog \{/,/\}/ s/border-radius: 4px;/border-radius: 8px;/' src/index.css
sed -i '/\.fluent-toast \{/,/\}/ s/border-radius: 4px;/border-radius: 8px;/' src/index.css
sed -i '/\.fluent-question-box \{/,/\}/ s/border-radius: 4px;/border-radius: 8px;/' src/index.css
sed -i '/\.fluent-action-group \{/,/\}/ s/border-radius: 4px;/border-radius: 8px;/' src/index.css

# Standardize Button / Control border radiuses to 4px (they already are 4px mostly)

# Harmonize Borders (1px solid rgba(255, 255, 255, 0.08))
# Wait, it's easier to just do a global replace for the slightly different border colors.
# rgba(255, 255, 255, 0.12) -> rgba(255, 255, 255, 0.08)
sed -i 's/rgba(255, 255, 255, 0.12)/rgba(255, 255, 255, 0.08)/g' src/index.css
sed -i 's/rgba(255, 255, 255, 0.14)/rgba(255, 255, 255, 0.08)/g' src/index.css
sed -i 's/rgba(255, 255, 255, 0.15)/rgba(255, 255, 255, 0.08)/g' src/index.css
sed -i 's/rgba(255, 255, 255, 0.1)/rgba(255, 255, 255, 0.08)/g' src/index.css

# Hover border colors to 0.16
sed -i 's/border-color: rgba(255, 255, 255, 0.2);/border-color: rgba(255, 255, 255, 0.16);/g' src/index.css

# Harmonize Inner Shadows (simulate top edge lighting)
# inset 0 1px 0 rgba(255, 255, 255, 0.05), 0.06, 0.08, etc. -> 0.08
sed -i 's/inset 0 1px 0 rgba(255, 255, 255, 0.05)/inset 0 1px 0 rgba(255, 255, 255, 0.08)/g' src/index.css
sed -i 's/inset 0 1px 0 rgba(255, 255, 255, 0.06)/inset 0 1px 0 rgba(255, 255, 255, 0.08)/g' src/index.css
sed -i 's/inset 0 1px 0 rgba(255, 255, 255, 0.04)/inset 0 1px 0 rgba(255, 255, 255, 0.08)/g' src/index.css
sed -i 's/inset 0 1px 0 rgba(255, 255, 255, 0.12)/inset 0 1px 0 rgba(255, 255, 255, 0.16)/g' src/index.css
sed -i 's/inset 0 1px 0 rgba(255, 255, 255, 0.15)/inset 0 1px 0 rgba(255, 255, 255, 0.08)/g' src/index.css
sed -i 's/inset 0 1px 0 rgba(255, 255, 255, 0.2)/inset 0 1px 0 rgba(255, 255, 255, 0.16)/g' src/index.css

echo "Done"
