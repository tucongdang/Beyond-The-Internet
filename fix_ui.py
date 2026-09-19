import re

# Fix AdminDashboard.tsx
try:
    with open("src/components/AdminDashboard.tsx", "r") as f:
        content = f.read()
    
    content = content.replace("rounded-xl", "rounded-[4px]")
    content = content.replace("rounded-lg", "rounded-[4px]")
    
    with open("src/components/AdminDashboard.tsx", "w") as f:
        f.write(content)
    print("Fixed AdminDashboard.tsx")
except Exception as e:
    print(e)

# Fix FluentSearchBar.tsx
try:
    with open("src/components/FluentSearchBar.tsx", "r") as f:
        content = f.read()
    
    content = content.replace("rounded-full", "rounded-[4px]")
    content = content.replace("rounded-xl", "rounded-[4px]")
    content = content.replace("rounded-md", "rounded-[4px]")
    
    with open("src/components/FluentSearchBar.tsx", "w") as f:
        f.write(content)
    print("Fixed FluentSearchBar.tsx")
except Exception as e:
    print(e)

