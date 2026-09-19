with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()
content = content.replace("            }\n            },\n            { \n              id: 'GUIDE',", "            },\n            { \n              id: 'GUIDE',")
with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)
