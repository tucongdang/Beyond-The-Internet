import re

with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

search_group = """        {/* Cụm 2.5: Tìm kiếm */}
        <div className="w-full xl:flex-1 hidden md:flex items-center mx-4">
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
"""

target = """        {/* Fluent UI Header Action Bar (Cụm 3: Action Controls) */}"""

# We want to replace target with search_group + target
if target in content and "Cụm 2.5: Tìm kiếm" not in content:
    content = content.replace(target, search_group + "\n" + target)
    with open("src/components/AdminPortal.tsx", "w") as f:
        f.write(content)
    print("Injected Search Bar")
else:
    print("Target not found or already injected.")
