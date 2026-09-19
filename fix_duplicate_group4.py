with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

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

# Ensure exactly ONE instance of group_4
parts = content.split(group_4)
if len(parts) > 2:
    print(f"Found {len(parts) - 1} instances of Group 4. Fixing to 1.")
    new_content = parts[0] + group_4 + parts[-1]
    with open("src/components/AdminPortal.tsx", "w") as f:
        f.write(new_content)
else:
    print("No duplicates found with string matching. Trying regex.")
    
