import re

with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

# 1. Import
if "FluentSearchBar" not in content[:3000]:
    content = content.replace(
        "import { AdminDashboard } from './AdminDashboard';", 
        "import { AdminDashboard } from './AdminDashboard';\nimport { FluentSearchBar } from './FluentSearchBar';"
    )

# 2. Render SearchBar inside the header
# Find Group 4 and add it right before or after it
search_bar_code = """
          {/* Group: Tìm kiếm */}
          <div className="fluent-action-group flex-1 sm:flex-initial hidden md:flex items-center ml-auto">
            <FluentSearchBar 
              db={db}
              questionBank={questionBank}
              allResponses={allResponses}
              onSelectResult={(type, id, name) => {
                if (type === 'QUESTION') {
                  setActiveAdminTab('QUESTIONS');
                  // Optional: handle logic to open the specific question if supported by QUESTIONS tab
                  triggerHudToast('SEARCH', `Đã chuyển đến câu hỏi: ${id}`);
                } else if (type === 'USER') {
                  setActiveAdminTab('STATS');
                  triggerHudToast('SEARCH', `Đã chọn khán giả: ${name || id}`);
                }
              }}
            />
          </div>
"""

# We can insert it before Group 4
if "<FluentSearchBar" not in content:
    content = content.replace("          {/* Group 4: Giám Sát & Trợ Giúp", search_bar_code + "\n          {/* Group 4: Giám Sát & Trợ Giúp")

with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)

print("Added FluentSearchBar to AdminPortal")
