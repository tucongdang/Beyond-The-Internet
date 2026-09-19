with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

# Remove import
content = content.replace("import { SoundFxAdmin } from './SoundFxAdmin';\n", "")

# Remove from activeAdminTab definition
content = content.replace("| 'SOUND_FX' ", "")

# Remove shortcut handler
shortcut_handler = """      if (e.key === '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setActiveAdminTab('SOUND_FX');
        triggerHudToast('9', 'Tab: 9. Hiệu ứng âm thanh (FX)');
        return;
      }"""
content = content.replace(shortcut_handler, "")

# Remove tab config
tab_config = """            { 
              id: 'SOUND_FX', 
              label: '9. Âm Thanh (FX)', 
              fullTitle: 'Bàn trộn hiệu ứng âm thanh sàn đấu',
              icon: Volume2,
              description: 'Phát các hiệu ứng âm thanh kịch tính, chuông báo, nhạc nền'
            },"""
content = content.replace(tab_config, "")

# Remove tab rendering
tab_render = """      ) : activeAdminTab === 'SOUND_FX' ? (
        <div className="space-y-6">
          <SoundFxAdmin />
        </div>"""
content = content.replace(tab_render, "")

with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)

print("Done")
