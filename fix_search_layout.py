with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''          {/* Group: Tìm kiếm */}
          <div className="fluent-action-group flex-1 sm:flex-initial hidden md:flex items-center ml-auto">
            <FluentSearchBar 
              db={null}
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
          </div>''',
'''          {/* Group: Tìm kiếm */}
          <div className="flex-1 sm:flex-initial hidden md:flex items-center ml-auto w-full max-w-xs">
            <FluentSearchBar 
              db={null}
              questionBank={questionBank}
              allResponses={allResponses}
              onSelectResult={(type, id, name) => {
                if (type === 'QUESTION') {
                  setActiveAdminTab('QUESTIONS');
                  triggerHudToast('SEARCH', `Đã chuyển đến câu hỏi: ${id}`);
                } else if (type === 'USER') {
                  setActiveAdminTab('STATS');
                  triggerHudToast('SEARCH', `Đã chọn khán giả: ${name || id}`);
                }
              }}
            />
          </div>'''
)

with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)
print("Fixed search bar layout wrapper in AdminPortal")
