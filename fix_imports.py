with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()
if "BookOpen" not in content[:2000]:
    content = content.replace("Camera } from 'lucide-react';", "Camera, BookOpen } from 'lucide-react';")
    content = content.replace("import { AdminContextMenu } from './AdminContextMenu';", "import { AdminContextMenu } from './AdminContextMenu';\nimport { AdminGuide } from './AdminGuide';")
    content = content.replace("useState<'KDC' | 'VCNV' | 'TT' | 'VD' | 'QUESTIONS' | 'STATS' | 'POLL_HISTORY' | 'LUCKY_DRAW' | 'POLL_MANAGER' | 'SOUND_FX' | 'QA_MANAGER' | 'WORD_CLOUD' | 'SNAPSHOTS' | 'ACTIVITY_LOG'>", "useState<'KDC' | 'VCNV' | 'TT' | 'VD' | 'QUESTIONS' | 'STATS' | 'POLL_HISTORY' | 'LUCKY_DRAW' | 'POLL_MANAGER' | 'SOUND_FX' | 'QA_MANAGER' | 'WORD_CLOUD' | 'SNAPSHOTS' | 'ACTIVITY_LOG' | 'GUIDE'>")
with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)
