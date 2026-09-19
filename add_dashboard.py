with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

# Add LayoutDashboard to lucide-react imports if not present
if "LayoutDashboard" not in content[:3000]:
    content = content.replace("Camera, BookOpen } from 'lucide-react';", "Camera, BookOpen, LayoutDashboard } from 'lucide-react';")

# Import AdminDashboard
if "AdminDashboard" not in content[:3000]:
    content = content.replace("import { AdminContextMenu } from './AdminContextMenu';", "import { AdminContextMenu } from './AdminContextMenu';\nimport { AdminDashboard } from './AdminDashboard';")

# Update useState default
content = content.replace(
    "useState<'KDC' | 'VCNV' | 'TT' | 'VD' | 'QUESTIONS' | 'STATS' | 'POLL_HISTORY' | 'LUCKY_DRAW' | 'POLL_MANAGER' | 'QA_MANAGER' | 'WORD_CLOUD' | 'SNAPSHOTS' | 'ACTIVITY_LOG' | 'GUIDE'>('KDC')",
    "useState<'DASHBOARD' | 'KDC' | 'VCNV' | 'TT' | 'VD' | 'QUESTIONS' | 'STATS' | 'POLL_HISTORY' | 'LUCKY_DRAW' | 'POLL_MANAGER' | 'QA_MANAGER' | 'WORD_CLOUD' | 'SNAPSHOTS' | 'ACTIVITY_LOG' | 'GUIDE'>('DASHBOARD')"
)
# Make sure we replace any left-overs (e.g. if the default was 'KDC')
content = content.replace(
    "useState<'KDC' | 'VCNV' | 'TT' | 'VD' | 'QUESTIONS' | 'STATS' | 'POLL_HISTORY' | 'LUCKY_DRAW' | 'POLL_MANAGER' | 'QA_MANAGER' | 'WORD_CLOUD' | 'SNAPSHOTS' | 'ACTIVITY_LOG' | 'GUIDE'>('DASHBOARD')",
    "useState<'DASHBOARD' | 'KDC' | 'VCNV' | 'TT' | 'VD' | 'QUESTIONS' | 'STATS' | 'POLL_HISTORY' | 'LUCKY_DRAW' | 'POLL_MANAGER' | 'QA_MANAGER' | 'WORD_CLOUD' | 'SNAPSHOTS' | 'ACTIVITY_LOG' | 'GUIDE'>('DASHBOARD')"
)

# Add DASHBOARD to the tab configuration right before KDC
dashboard_tab = """            { 
              id: 'DASHBOARD', 
              label: 'Tổng Quan', 
              fullTitle: 'Bảng Điều Khiển Tổng Quan',
              icon: LayoutDashboard,
              description: 'Giao diện tổng quan nhóm các chức năng hệ thống'
            },
            { 
              id: 'KDC',"""
content = content.replace("            { \n              id: 'KDC',", dashboard_tab)

# Update render logic
# Look for the first element after the activeAdminTab rendering switch.
# currently we have activeAdminTab === 'QUESTIONS' ? ...
dashboard_render = """      {activeAdminTab === 'DASHBOARD' ? (
        <AdminDashboard 
          onNavigate={setActiveAdminTab} 
          gameState={gameState} 
          snapshotCount={snapshotCount} 
        />
      ) : activeAdminTab === 'QUESTIONS' ? ("""

content = content.replace("      {activeAdminTab === 'QUESTIONS' ? (", dashboard_render)

with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)

print("Dashboard integration successful")
