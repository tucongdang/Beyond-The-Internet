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
    name: 'Cosmic Twilight (Hồng Sương & Tím Vũ Trụ)',
    description: 'Hệ màu Cosmic Twilight (#0D0420, #190839), Hồng Sương (#F7CAC9) & Lam Sương (#92A8D1)',
    badgeBg: 'bg-[#F7CAC9] text-[#190839]',
    previewGradient: 'from-[#190839] to-[#F7CAC9]/30',
    bgGradient: 'bg-transparent',
    glow1: 'bg-[#F7CAC9]/15',
    glow2: 'bg-[#92A8D1]/10',
    headerIconBg: 'bg-[#F7CAC9]/20 shadow-[#F7CAC9]/30',
    headerIconText: 'text-[#F7CAC9]',
    accentText: 'text-[#F7CAC9]',
    accentBorder: 'border-[#F7CAC9]/40',
    accentBg: 'bg-[#190839]/90',
    cardBg: 'bg-[#190839]/90 backdrop-blur-md',
    cardBorder: 'border-white/15',
    activeBadge: 'bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/40',
    lockedBadge: 'bg-[#0D0420]/70 text-white/50 border border-white/10',
    revealBadge: 'bg-[#F7CAC9]/20 text-[#F5EFF9] border border-[#F7CAC9]/40',
    optionNormalBg: 'bg-[#190839]/80',
    optionNormalBorder: 'border-white/15',
    optionCorrectBg: 'bg-[#F7CAC9]/25',
    optionCorrectBorder: 'border-[#F7CAC9] ring-1 ring-[#F7CAC9]/40',
    progressGradient: 'from-[#92A8D1] via-[#F7CAC9] to-[#E39A96]',
  }
};

export const getProjectorTheme = (themeId?: string): ProjectorThemeConfig => {
  return PROJECTOR_THEMES.default;
};
