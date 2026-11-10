export interface ProjectorThemeConfig {
  id: string;
  name: string;
  description: string;
  badgeBg: string;
  previewGradient: string;
  bgGradient: string;
  glow1: string;
  glow2: string;
  headerIconBg: string;
  headerIconText: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  cardBg: string;
  cardBorder: string;
  activeBadge: string;
  lockedBadge: string;
  revealBadge: string;
  optionNormalBg: string;
  optionNormalBorder: string;
  optionCorrectBg: string;
  optionCorrectBorder: string;
  progressGradient: string;
}

export const PROJECTOR_THEMES: Record<string, ProjectorThemeConfig> = {
  default: {
    id: 'default',
    name: 'Claude Design (Slate & Clay)',
    description: 'Hệ màu Anthropic Slate (#141413), Ivory (#FAF9F5) & Clay (#D97757)',
    badgeBg: 'bg-[#D97757]',
    previewGradient: 'from-[#1A1918] to-[#D97757]/20',
    bgGradient: 'bg-transparent',
    glow1: 'bg-[#D97757]/10',
    glow2: 'bg-[#E3DACC]/8',
    headerIconBg: 'bg-[#D97757]/15 shadow-[#D97757]/20',
    headerIconText: 'text-[#D97757]',
    accentText: 'text-[#D97757]',
    accentBorder: 'border-[#30302E]',
    accentBg: 'bg-[#1F1E1D]',
    cardBg: 'bg-[#1F1E1D]/90 backdrop-blur-md',
    cardBorder: 'border-[#30302E]',
    activeBadge: 'bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40',
    lockedBadge: 'bg-[#141413]/70 text-[#87867F] border border-[#30302E]',
    revealBadge: 'bg-[#E3DACC]/15 text-[#FAF9F5] border border-[#D97757]/40',
    optionNormalBg: 'bg-[#1A1918]/85',
    optionNormalBorder: 'border-[#30302E]',
    optionCorrectBg: 'bg-[#D97757]/20',
    optionCorrectBorder: 'border-[#D97757] ring-1 ring-[#E3DACC]/30',
    progressGradient: 'from-[#D97757]/75 to-[#D97757]',
  }
};

export const getProjectorTheme = (themeId?: string): ProjectorThemeConfig => {
  return PROJECTOR_THEMES.default;
};
