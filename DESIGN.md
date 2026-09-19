# Beyond The Internet 2026 (BTI 2026) — Design System & Architectural Specification

> **Source of Truth**: Extracted directly from `metadata.json`, `index.html`, `src/index.css`, `src/types.ts`, `src/App.tsx`, `src/components/`, `src/services/`, and `src/utils/i18n.ts`.

---

## 1. Product Identity & Core Purpose

* **Official Title**: `Beyond The Internet 2026 - Live Gameshow Interaction` (Short: `BTI 2026`)
* **Primary Tagline**: *"Đấu trường tương tác trực tiếp học thuật thời gian thực. Đồng bộ siêu tốc giữa Khán Giả, Ban Tổ Chức và Màn Chiếu Sân Khấu LED."*
* **Domain / Academic Focus**: An toàn số & Chống giả mạo, Nhận diện Deepfake & Kỹ xảo AI, Pháp luật An ninh mạng 2018, Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân), và Phân tích Trắc lượng tâm lý học thuật (SPSS / Psychometric Item Analysis).
* **System Mission**: Zero-latency broadcast synchronization connecting hundreds of hall attendees and live contestants directly to stage projection and MC control with automated scoring, haptic feedback, and battery preservation.

---

## 2. Product's Native Shape: The Realtime Broadcast State Machine

This application does not follow a generic SaaS CRUD or static landing page structure. Its native shape is a **Distributed Event Stream Pipeline & State Machine**:

```
[ STANDBY ] ───────► [ ACTIVE ] ───────► [ LOCKED ] ───────► [ REVEAL ]
MC Standby Cue        Timer Ticking       Lock In & Freeze    Correct Ans & Stats
Wait for Stage        Haptic countdown    Syncing Telemetry   Leaderboard & Score
```

### The 4 Academic Competition Rounds:
1. **Round 1: Khởi Động (`KD`)**:
   * *Formats*: Multiple Choice 4 Options (`MULTIPLE_CHOICE`) & Short Answer (`SHORT_ANSWER`).
   * *Scoring*: `+10đ` per correct answer, `+5đ` fast-response bonus if answered in `< 3s`.
2. **Round 2: Vượt Chướng Ngại Vật (`VCNV`)**:
   * *Formats*: Clue Unveiling (`vcnv_clues`), Center Piece (`vcnv_center_status`), Keyword Prediction (`+80đ`), Risk Box / Ô Mạo Hiểm (`+120đ`).
3. **Round 3: Tăng Tốc (`TT`)**:
   * *Formats*: Speed Tiers with 6-option elimination (`ELIMINATION_6`, `SEQUENCING`).
   * *Scoring*: Decreasing speed tiers based on response latency: `+40đ`, `+30đ`, `+20đ`, `+10đ`.
4. **Round 4: Về Đích (`VD`)**:
   * *Formats*: Interactive Roleplay (`BLIND_POLL`, AID scenario) and Practical Simulation (`TRUE_FALSE_4`, `FILL_IN_BLANK`).
   * *Scoring*: `+40đ` for correct practical judgment.

### Auxiliary Realtime Modules:
* **Ad-Hoc Emergency Poll (`EmergencyPoll`)**: 5 Stakeholder sources (`ADVISOR` Cố vấn, `CONTESTANT` Thí sinh, `JURY` Giám khảo, `AUDIENCE` Khán giả, `HOST` Ban tổ chức) with `YES_NO`, `TRUE_FALSE`, `CUSTOM_2`, `AGREE_DISAGREE`, `MULTIPLE_CHOICE`.
* **Stage Projection Telemetry**: Big-screen bar charts, Word Cloud (`ProjectorWordCloud`), Live Cheer Meter (`ProjectorCheerMeter`), and Lucky Draw Roulette (`LuckyDrawProjector`).
* **Audience Community Layer**: Live Cheer Hearts (`AudienceCheerButton`), Marquee Shouts (`AudienceShoutMarquee`), Moderated Q&A (`AudienceQAWidget`), Question Upvoting (`QuestionLikeButton`).

---

## 3. Surface Architecture & Role Routing

The application routes into 3 synchronized operational surfaces:

| Role / Surface | File Entry | Target Device | Key Responsibility |
| :--- | :--- | :--- | :--- |
| **Khán Giả** (Audience) | `src/components/AudienceView.tsx` | Mobile Safari / Chrome (Touch, PWA) | Single-hand answer voting, live cheer, wake lock, battery saver, question logs, personal rank. |
| **Màn Chiếu LED** (Projector) | `src/components/ProjectorView.tsx` | Ultra-wide LED Stage Display (16:9 / 4K) | Real-time question broadcast, distribution bar charts, word clouds, cheer meter, lucky draw. |
| **Ban Tổ Chức** (Admin Portal) | `src/components/AdminPortal.tsx` | Desktop / Laptop Director Console | Stage controls, question switcher, emergency poll manager, audio soundboard, SPSS data export. |

---

## 4. Visual Identity & Design Tokens

Inherits and extends the **BTI Custom Fluent UI 2 System** (Microsoft Fluent 2 merged with Windows 11 Acrylic & Mica materials customized for a dark cosmic twilight arena).

### 4.1 Color Palette

```css
/* Cosmic Twilight Palette (src/index.css) */
--color-primary-bg:        #190839;  /* Cosmic Deep Purple / Primary Surface */
--color-primary-highlight: #F7CAC9;  /* Rose Quartz (Pantone 13-1520) - Primary Accent */
--color-tim-vu-tru:        #0D0420;  /* Cosmic Void - Deepest Background */
--color-tim-be-mat:        #241148;  /* Elevated Surface / Card Background */
--color-tim-chang-vang:    #3E1D74;  /* Twilight Border / Subtle Divider */
--color-hong-suong:        #FCEEEC;  /* Mist Rose Tint */
--color-hong-hoang-hon:    #E39A96;  /* Sunset Coral Accent */
--color-hong-man:          #EBC7D6;  /* Plum Quartz Accent */
--color-lam-suong:         #E2DBEC;  /* Lavender Frost */
--color-trang-nga:         #F5EFF9;  /* Ivory Text (High Contrast Primary) */
--color-xam-lam:           #B6A6D8;  /* Lavender Gray (Muted Secondary Text) */
```

#### Status & Functional Accents:
* **Emerald Eco / Battery**: `#10b981` (Border) / `#34d399` (Text)
* **Danger / Lock / Alarm**: `#f43f5e` / `#fb7185`
* **Warning / Score Gold**: `#f59e0b` / `#fbbf24`
* **Stage Sky Blue**: `#38bdf8` / `#60a5fa`

#### Signature Horizon Gradient:
```css
/* Custom Gradient Utilities */
.bg-gradient-horizon {
  background: linear-gradient(90deg, #F7CAC9 0%, #EBC7D6 50%, #E2DBEC 100%);
}
.text-gradient-horizon {
  background: linear-gradient(90deg, #F7CAC9 0%, #EBC7D6 50%, #E2DBEC 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

### 4.2 Specialized Display Modes

1. **Cosmic Twilight Mode (Default)**:
   * Ambient deep background: `#0D0420` with multi-layer Mica blur `backdrop-filter: blur(48px) saturate(180%)`.
   * Cards use translucent purple surfaces (`rgba(25, 8, 57, 0.62)`) with specular 1px top-highlight.

2. **Pure Black High Contrast Mode (`.audience-high-contrast`)**:
   * Root background forced to `#000000`.
   * Cards convert to `#0d0d0d` with crisp `1px solid rgba(255, 255, 255, 0.16)` borders.
   * Text boosted to pure `#ffffff`.

3. **Battery Saver Mode (`.battery-saver-active`)**:
   * Background set to pure `#000000`.
   * All heavy GPU filters (`backdrop-filter`, `box-shadow`, `text-shadow`) are disabled (`none !important`).
   * Infinite animations (`animate-pulse`, `animate-bounce`) are halted.
   * Navbar displays an emerald indicator: `border-bottom: 2px solid #10b981`.

---

### 4.3 Typography & Font Pairing

* **Typeface**: `'SVN-Gilroy'`, `'Lexend'`, ui-sans-serif, system-ui (Weights: `300`, `400`, `500`, `600`, `700`, `800`, `900` mapped from SVN-Gilroy Medium, SemiBold, Bold, XBold, Black).
* **Monospace Engine**: `'SVN-Gilroy'`, `'Lexend'`, ui-monospace (Used for timers, scores, question IDs, latency tracking, and MSSV to maintain clean tabular numeral alignment).
* **Mathematical Hierarchy**:
  * *Stage Display (Projector)*: `text-3xl` to `text-5xl` (36px - 48px), `font-black`, tight leading (`leading-tight`).
  * *Audience Question Box*: `text-base` to `text-xl` (16px - 20px), `font-bold`, leading `1.5`.
  * *Option Buttons*: `text-sm` to `text-base` (14px - 16px), `font-medium` / `font-semibold`.
  * *Telemetry / Badges*: `text-[11px]` to `text-xs` (11px - 12px), `font-mono`, `font-bold`, uppercase, tracking `0.04em`.

---

### 4.4 Elevation & Component Tokens

* **Question Card (`.fluent-question-box`)**:
  * Background: `rgba(36, 17, 72, 0.82)`
  * Filter: `blur(36px) saturate(160%)`
  * Radius: `12px`
  * Top Edge Accent: `3px` Horizon gradient (`#F7CAC9` to `#B6A6D8`)
  * Shadow: `0 10px 36px -4px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.14)`

* **Option Button (`.fluent-option-btn`)**:
  * Background: `rgba(25, 8, 57, 0.6)`
  * Radius: `4px` (Crisp Fluent standard)
  * Timing Curve: `380ms` Windows 11 Motion: `cubic-bezier(0.13, 0.77, 0.32, 0.99)`
  * Hover: `scale(1.02)` with border highlight `#F7CAC9`
  * Active (Press): `scale(0.97)` with `150ms` tactile rebound

* **Tactile Buttons (`.bti-btn`, `.fluent-btn`)**:
  * Transition: `transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)`
  * Active State: `scale(0.96) translateY(1px)`

---

## 5. Critical Files & Responsibilities

| File Path | Functional Responsibility |
| :--- | :--- |
| `/src/App.tsx` | View state router (`landing`, `audience`, `projector`, `admin`), QR broadcast engine, Wake Lock & Battery Saver coordinator. |
| `/src/types.ts` | Authoritative data contracts: `GameState`, `RoundType`, `EmergencyPoll`, `SPSSRow`, `AudienceScoreState`. |
| `/src/index.css` | Design tokens, Fluent 2 Acrylic & Mica classes, Horizon gradient, High-contrast & Battery saver rules. |
| `/src/services/syncService.ts` | Hybrid synchronization layer (Firebase Firestore + local fallback broadcast channel). |
| `/src/services/audienceScoringService.ts` | Multi-round score accumulation, latency bonus computation, and breakdown calculation. |
| `/src/services/audioEffects.ts` | Real-time Web Audio API sound synthesizer (`correct`, `wrong`, `countdown`, `ting`, `applause`, `alarm`). |
| `/src/components/AudienceView.tsx` | Core player viewport with question renderers, quick vote, live cheer, and drawer tools. |
| `/src/components/ProjectorView.tsx` | Big-screen LED stage display with bar distributions, word clouds, and countdowns. |
| `/src/components/AdminPortal.tsx` | Director and host control cockpit for question progression, timer locks, and emergency polls. |
| `/src/data/questionBank.ts` | Validated competition question bank covering cybersecurity, deepfake AI, and Decree 13/2023. |
| `/src/utils/i18n.ts` | Bilingual localization repository (`vi` Vietnamese, `en` English). |

---

## 6. Accessibility & Hardware Integration

1. **Screen Wake Lock API (`useScreenWakeLock`)**: Prevents mobile screens from sleeping during 15s - 30s question countdowns.
2. **Physical Haptic Feedback (`src/utils/hapticUtils.ts`)**: Distinct vibration patterns for option tap (`15ms`), answer submission (`40ms`), correct reveal (`[30ms, 50ms, 60ms]`), and critical timer warnings.
3. **PWA & Offline Resilience (`OfflineBanner.tsx`, `InstallAppModal.tsx`)**: Service Worker, standalone full-screen manifest, and live connection quality telemetry (`PingQuality`).
4. **Bilingual Switcher (`useLanguage.ts`, `i18n.ts`)**: Real-time Vietnamese / English switching with zero layout shifts.
