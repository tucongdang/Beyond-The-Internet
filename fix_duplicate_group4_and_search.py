import re

with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

group_4_pattern = re.compile(r'\s*\{\/\*\s*Group 4: Giám Sát.*?</div>\s*</div>', re.DOTALL)
# wait, it is <div className="fluent-action-group ..."> ... </div>
group_4_pattern = re.compile(r'(\s*\{\/\*\s*Group 4: Giám Sát.*?</button>\s*</div>)', re.DOTALL)
matches = list(group_4_pattern.finditer(content))

if len(matches) > 1:
    print(f"Found {len(matches)} Group 4. Removing the second one...")
    content = content[:matches[1].start()] + content[matches[1].end():]
    
    with open("src/components/AdminPortal.tsx", "w") as f:
        f.write(content)

