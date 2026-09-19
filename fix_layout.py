with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

group_search = """          {/* Group: Tìm kiếm */}
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

group_4 = """          {/* Group 4: Giám Sát & Trợ Giúp (Telemetry & Shortcuts) */}
          <div className="fluent-action-group flex-1 sm:flex-initial justify-center sm:justify-start">
            <button
              type="button"
              id="btn-admin-header-network-monitor"
              onClick={() => {
                vibrateSelection();
                setShowQuickNetworkMonitor(!showQuickNetworkMonitor);
              }}
              data-tooltip="Bật/Tắt đồ thị độ trễ Real-time Recharts nhanh (Ping / Network Monitor)"
              data-tooltip-title="Giám Sát Mạng"
              data-tooltip-variant="success"
              className={`has-tooltip fluent-action-btn ${
                showQuickNetworkMonitor
                  ? 'text-emerald-200 bg-emerald-950/80 border-emerald-400/60 shadow-md shadow-emerald-950/40'
                  : 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/30'
              }`}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Giám Sát Mạng</span>
            </button>
            <button
              type="button"
              id="btn-admin-header-shortcuts"
              onClick={() => {
                vibrateTap();
                setShowShortcutsModal(true);
              }}
              data-tooltip="Phím tắt điều khiển nhanh cho MC / Host (Bấm ? hoặc F1)"
              data-tooltip-title="Bảng Phím Tắt"
              className="has-tooltip fluent-action-btn text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border-purple-500/30"
            >
              <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
              <span>Phím Tắt</span>
              <kbd className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono bg-white/10 rounded-[2px] border border-purple-500/30 text-purple-200">?</kbd>
            </button>
          </div>"""

# Remove both from content
content = content.replace(group_search, "")
content = content.replace(group_4, "")

# Find where Group 3 ends
# It ends with:
#               <Trophy className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gameState.show_summary ? 'text-white' : 'text-amber-400'}`} />
#               <span>Tổng Kết</span>
#             </button>
#           </div>

target_string = """              <Trophy className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gameState.show_summary ? 'text-white' : 'text-amber-400'}`} />
              <span>Tổng Kết</span>
            </button>
          </div>"""

# Insert Group 4 then Group Search
replacement = target_string + "\n" + group_4 + "\n" + group_search
content = content.replace(target_string, replacement)

with open("src/components/AdminPortal.tsx", "w") as f:
    f.write(content)

print("Reordered layout successfully")
