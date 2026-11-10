import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAUDE_BRAND_COLORS,
  CLAUDE_WARM_GRAYSCALE,
  CLAUDE_DATAVIZ_CATEGORICAL,
  CLAUDE_STATUS_PALETTE,
  getOptionDatavizColor,
} from './claudeDesignTokens';
import { interpolateTimerColor } from './colorUtils';

test('Claude brand primary tokens match brand-colors.md specification', () => {
  assert.equal(CLAUDE_BRAND_COLORS.clay, '#D97757');
  assert.equal(CLAUDE_BRAND_COLORS.ivory, '#FAF9F5');
  assert.equal(CLAUDE_BRAND_COLORS.slate, '#141413');
  assert.equal(CLAUDE_BRAND_COLORS.oat, '#E3DACC');
  assert.equal(CLAUDE_BRAND_COLORS.blueLight, '#2A78D6');
});

test('Claude 21-step warm grayscale contains exact dark & light surface steps', () => {
  assert.equal(Object.keys(CLAUDE_WARM_GRAYSCALE).length, 21);
  assert.equal(CLAUDE_WARM_GRAYSCALE[950], '#141413');
  assert.equal(CLAUDE_WARM_GRAYSCALE[900], '#1A1918');
  assert.equal(CLAUDE_WARM_GRAYSCALE[850], '#1F1E1D');
  assert.equal(CLAUDE_WARM_GRAYSCALE[800], '#262624');
  assert.equal(CLAUDE_WARM_GRAYSCALE[50], '#FAF9F5');
});

test('Claude dataviz categorical palette preserves CVD-safe slot ordering', () => {
  assert.equal(CLAUDE_DATAVIZ_CATEGORICAL.length, 8);
  assert.deepEqual(
    CLAUDE_DATAVIZ_CATEGORICAL.map((s) => s.name),
    ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red']
  );
  assert.equal(getOptionDatavizColor('A'), '#3987e5');
  assert.equal(getOptionDatavizColor('B'), '#D97757');
  assert.equal(getOptionDatavizColor('C'), '#199e70');
  assert.equal(getOptionDatavizColor('D'), '#c98500');
});

test('Claude status palette matches fixed hex values and timer interpolation works', () => {
  assert.equal(CLAUDE_STATUS_PALETTE.good, '#0ca30c');
  assert.equal(CLAUDE_STATUS_PALETTE.warning, '#fab219');
  assert.equal(CLAUDE_STATUS_PALETTE.serious, '#ec835a');
  assert.equal(CLAUDE_STATUS_PALETTE.critical, '#d03b3b');

  // 100% timer -> Claude Clay (#D97757 -> rgb(217, 119, 87))
  assert.equal(interpolateTimerColor(100), 'rgb(217, 119, 87)');
  // 0% timer -> Warm Slate 700 (#3D3D3A -> rgb(61, 61, 58))
  assert.equal(interpolateTimerColor(0), 'rgb(61, 61, 58)');
});
