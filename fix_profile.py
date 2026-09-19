import re

file_path = "src/components/ProfileModal.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("firebaseConfig.firestoreDatabaseId", "(firebaseConfig as any).firestoreDatabaseId")

with open(file_path, "w") as f:
    f.write(content)

file_path_sync = "src/services/syncService.ts"
with open(file_path_sync, "r") as f:
    content_sync = f.read()

content_sync = content_sync.replace("firebaseConfig.firestoreDatabaseId", "(firebaseConfig as any).firestoreDatabaseId")

with open(file_path_sync, "w") as f:
    f.write(content_sync)
    
print("Done fixing ProfileModal and syncService")
