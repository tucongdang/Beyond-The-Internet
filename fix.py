with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()
content = content.replace("      ) : activeAdminTab === 'GUIDE' ? (\n        <AdminGuide />\n      ) : (", "      ) : (")
with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)
