with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()
content = content.replace("              description: 'Tài liệu tham khảo và trích xuất phương pháp nghiên cứu'\n\n          ].map", "              description: 'Tài liệu tham khảo và trích xuất phương pháp nghiên cứu'\n            }\n          ].map")
with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)
