const fs = require('fs');

function addImports(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('import { t } from')) {
        // insert after the first import
        content = content.replace(/import (.*?) from (.*?);/, "import $1 from $2;\nimport { t } from '../utils/i18n';");
    }
    
    if (!content.includes('import { useLanguage }')) {
        content = content.replace(/import (.*?) from (.*?);/, "import $1 from $2;\nimport { useLanguage } from '../hooks/useLanguage';");
    }

    if (!content.includes('localLanguage')) {
        // insert const { language: localLanguage } = useLanguage(); at the top of the component
        // finding the component declaration
        content = content.replace(/(const [A-Za-z0-9_]+: React\.FC<.*?> = \(\{.*?\}\) => \{)/s, "$1\n  const { language: localLanguage } = useLanguage();\n");
    }

    fs.writeFileSync(file, content);
    console.log("Fixed imports in " + file);
}

['src/components/QuestionLikeButton.tsx', 'src/components/AnnouncerOverlay.tsx', 'src/components/EmergencyPollAudience.tsx', 'src/components/BatteryIndicator.tsx'].forEach(addImports);

