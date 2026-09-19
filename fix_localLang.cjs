const fs = require('fs');

function addLocalLang(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it already has localLanguage
    if (!content.includes('const { language: localLanguage }') && !content.includes('const { localLanguage }')) {
        // Find the first return statement, which is inside the component
        // Or find the first `{` after `export const ComponentName = ...`
        // More robust: just find `return (` and inject it before that if it's a simple component. Wait, no, hooks must be called before early returns.
        // Let's replace `const [isLiked, setIsLiked]` with `const { language: localLanguage } = useLanguage();\n  const [isLiked, setIsLiked]` in QuestionLikeButton
        if (file.includes('QuestionLikeButton')) {
            content = content.replace('const [isLiked, setIsLiked]', 'const { language: localLanguage } = useLanguage();\n  const [isLiked, setIsLiked]');
        }
        if (file.includes('AnnouncerOverlay')) {
            content = content.replace('const [isExpanded, setIsExpanded]', 'const { language: localLanguage } = useLanguage();\n  const [isExpanded, setIsExpanded]');
        }
        if (file.includes('EmergencyPollAudience')) {
            content = content.replace('const [hasVoted, setHasVoted]', 'const { language: localLanguage } = useLanguage();\n  const [hasVoted, setHasVoted]');
        }
        
    }
    fs.writeFileSync(file, content);
    console.log("Fixed localLanguage in " + file);
}

['src/components/QuestionLikeButton.tsx', 'src/components/AnnouncerOverlay.tsx', 'src/components/EmergencyPollAudience.tsx'].forEach(addLocalLang);
