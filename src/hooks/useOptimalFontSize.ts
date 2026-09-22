import { useAdaptiveFontSize } from './useAdaptiveFontSize';
import type { UseAdaptiveFontSizeOptions, AdaptiveFontSizeResult } from './useAdaptiveFontSize';

export type UseOptimalFontSizeOptions = UseAdaptiveFontSizeOptions;
export type OptimalFontSizeResult = AdaptiveFontSizeResult;

export const useOptimalFontSize = useAdaptiveFontSize;
export const useQuestionFontSize = useAdaptiveFontSize;
export const useAutoFitText = useAdaptiveFontSize;

export default useAdaptiveFontSize;
export { useAdaptiveFontSize };
