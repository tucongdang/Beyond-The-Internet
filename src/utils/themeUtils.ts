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
    name: 'Mặc Định',
    description: 'Chủ đề chính (#190839 & #F7CAC9)',
    badgeBg: 'bg-[#F7CAC9]',
    previewGradient: 'from-[#190839] to-[#F7CAC9]/20',
    bgGradient: 'bg-transparent',
    glow1: 'bg-[#F7CAC9]/10',
    glow2: 'bg-[#F7CAC9]/10',
    headerIconBg: 'bg-[#F7CAC9]/20 shadow-[#F7CAC9]/30',
    headerIconText: 'text-[#F7CAC9]',
    accentText: 'text-[#F7CAC9]',
    accentBorder: 'border-[#3E1D74]',
    accentBg: 'bg-[#241148]',
    cardBg: 'bg-[#241148]/70 backdrop-blur-md',
    cardBorder: 'border-[#3E1D74]',
    activeBadge: 'bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/40',
    lockedBadge: 'bg-[#0D0420]/50 text-[#B6A6D8]/50 border border-[#3E1D74]/30',
    revealBadge: 'bg-[#FCEEEC]/20 text-[#F7CAC9] border border-[#F7CAC9]/40',
    optionNormalBg: 'bg-[#0D0420]/40',
    optionNormalBorder: 'border-[#3E1D74]/60',
    optionCorrectBg: 'bg-[#F7CAC9]/20',
    optionCorrectBorder: 'border-[#F7CAC9] ring-2 ring-[#FCEEEC]/30',
    progressGradient: 'from-[#F7CAC9]/60 to-[#F7CAC9]',
  }
};

export const getProjectorTheme = (themeId?: string): ProjectorThemeConfig => {
  return PROJECTOR_THEMES.default;
};
