with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

search_group_old = """          {/* Group: Tìm kiếm */}
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
          </div>"""

# Ensure we remove any existing search group in the button group
if search_group_old in content:
    content = content.replace(search_group_old + "\n", "")
    content = content.replace(search_group_old, "")

search_group_new = """          {/* Group: Tìm kiếm */}
          <div className="w-full flex justify-end mb-2">
            <div className="w-full md:w-80">
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
            </div>
          </div>"""

btn_group_start = """        {/* Cụm Nút Điều Khiển */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto mt-4 md:mt-0">"""

if btn_group_start in content:
    content = content.replace(btn_group_start, btn_group_start + "\n" + search_group_new)

with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)

print("Fixed header layout")
