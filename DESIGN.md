# Beyond The Internet 2026 (BTI 2026) — Claude Design System & Architectural Specification

> **Source of Truth**: Aligned with `https://github.com/jimliu/baoyu-design` (`skills/claude-design` & `skills/dataviz`), `https://github.com/mhfed/vn-law-check` (2025–2026 Vietnamese Legal Framework), `src/utils/claudeDesignTokens.ts`, and `src/index.css`.

---

## 1. Product Identity & Core Purpose

* **Official Title**: `Beyond The Internet 2026 - Live Gameshow Interaction` (Short: `BTI 2026`)
* **Primary Tagline**: *"Đấu trường tương tác trực tiếp học thuật thời gian thực. Đồng bộ siêu tốc giữa Khán Giả, Ban Tổ Chức và Màn Chiếu Sân Khấu LED."*
* **Domain / Academic & Legal Focus**:
  * **Bảo vệ dữ liệu cá nhân**: Luật Bảo vệ dữ liệu cá nhân số `91/2025/QH15` & Nghị định `356/2025/NĐ-CP` (hiệu lực 01/01/2026, thay thế NĐ 13/2023/NĐ-CP).
  * **An ninh mạng**: Luật An ninh mạng số `116/2025/QH15` & Nghị định `333/2026/NĐ-CP` (hiệu lực 01/07/2026, thay thế Luật ANM 24/2018/QH14).
  * **Trí tuệ nhân tạo & Chống Deepfake**: Luật Trí tuệ nhân tạo số `134/2025/QH15` & Nghị định `142/2026/NĐ-CP` (hiệu lực 01/03/2026 — gắn nhãn minh bạch nội dung AI theo Điều 11).

---

## 2. Claude Design System (`jimliu/baoyu-design`)

### 2.1 Primary Brand Palette (`brand-colors.md`)
* **Ivory (`#FAF9F5`)**: Primary text on dark surfaces / primary light background.
* **Slate (`#141413`)**: Primary dark background ground (`Gray 950`).
* **Clay (`#D97757`)**: The single primary brand accent on Claude surfaces (CTAs, active tabs, selected option rings, focus rings).
* **Oat (`#E3DACC`)**: Warm neutral secondary accent for subtle dividers, badges, and metadata.
* **Blue (`#2A78D6` light / `#3987E5` dark)**: Interactive links & Series 1 dataviz anchor.

### 2.2 21-Step Warm Grayscale (`brand-colors.md`)
All neutral surfaces carry a subtle warm yellow-red undertone (`#141413` Slate `950`, `#1A1918` `900`, `#1F1E1D` `850`, `#262624` `800`, `#30302E` `750`, `#3D3D3A` `700`, `#87867F` `500` muted ink, `#C2C0B6` `350` secondary ink, `#FAF9F5` `050` Ivory). Cool blue/purple gray ramps are never substituted.

### 2.3 Structural Borders & Geometry (`craft.md`)
* **Uniform `2px` Border Radius**: Every card, button, input, modal, and skeleton across the system uses `border-radius: 2px` (`rounded-[2px]`).
* **No Top Color Strip & No Left-Border Accent Bars**: Cards and toasts rely on warm surface elevation and `1px solid rgba(250, 249, 245, 0.12)` neutral hairline borders — never decorative top gradient strips or left-border accent bars.

### 2.4 Brand Typography (`brand-typography.md`)
* **Display / Editorial Headings (`.cds-display`, `.cds-title`)**: `'Anthropic Serif'`, `'Source Serif 4'`, Georgia, serif (`font-weight: 400–500`, `letter-spacing: 0`, `line-height: 1.2–1.3`).
* **UI & Body Copy (`--cds-font-sans`)**: `'Anthropic Sans'`, `'SVN-Gilroy'`, `'Lexend'`, system-ui, sans-serif (`font-weight: 400`).
* **Telemetry, Timers & Tabular Numerals (`--cds-font-mono`)**: `'Anthropic Mono'`, `'JetBrains Mono'`, `'SVN-Gilroy'`, monospace (`font-variant-numeric: tabular-nums`).

### 2.5 CVD-Safe Dataviz Categorical & Status Palette (`skills/dataviz/references/palette.md`)
* **8-Slot Categorical Order (Dark UI)**:
  1. `Blue 500`: `#3987e5` (Option A)
  2. `Clay / Orange`: `#D97757` (Option B)
  3. `Aqua 600`: `#199e70` (Option C)
  4. `Yellow 500`: `#fab219` (Option D)
  5. `Magenta 500`: `#d55181` (Option E)
  6. `Violet 400`: `#9085e9` (Option F)
  7. `Green 600`: `#008300` (Slot 7)
  8. `Red 400`: `#e66767` (Slot 8)
* **Semantic Status Palette**: Good `#0ca30c`, Warning `#fab219`, Serious `#ec835a`, Critical `#d03b3b`.
