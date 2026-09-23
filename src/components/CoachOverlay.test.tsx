import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CoachOverlay } from './CoachOverlay';
import type { CoachExplanation } from '../services/api';

const explanation: CoachExplanation = {
  analysis_id: 'analysis-1',
  primary_reason: 'equal_but_unfavorable_exchange',
  confidence: { score: 0.82, tier: 'medium' },
  summary: 'The material stays equal, but the exchange worsens your position.',
  detail: 'The trade gives up your more useful piece.',
  material: {
    gained: 3,
    lost: 3,
    net: 0,
    gained_pieces: ['bishop'],
    lost_pieces: ['knight'],
    exchange_complete: true,
    plies_analyzed: 4,
    line: ['f4d5', 'c6d5'],
  },
  tactical_theme: null,
  positional_factors: ['loss_of_outpost'],
  principal_variation: ['c6d5'],
  speech: {
    immediate: 'Hold on. This move needs another look.',
    follow_up: 'The material remains equal, but your knight was more active.',
  },
  interruption: { normal: 'popup', professional: 'none', roast: 'popup', off: 'none' },
};

function renderOverlay(overrides: Partial<React.ComponentProps<typeof CoachOverlay>> = {}) {
  const props: React.ComponentProps<typeof CoachOverlay> = {
    visible: true,
    isThinking: false,
    classification: 'Mistake',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    onCommitWarning: vi.fn(),
    onDismissWarning: vi.fn(),
    onAskHint: vi.fn(),
    onShowFollowUp: vi.fn(),
    explanation,
    ...overrides,
  };
  return { ...render(<CoachOverlay {...props} />), props };
}

describe('CoachOverlay', () => {
  it('renders the exact backend explanation and invokes Play Anyway immediately', () => {
    const { props } = renderOverlay();
    expect(screen.getByText(explanation.summary)).toBeInTheDocument();
    expect(screen.getByText(explanation.detail)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play Anyway' }));
    expect(props.onCommitWarning).toHaveBeenCalledOnce();
  });

  it('keeps other controls available while detailed follow-up is loading', () => {
    renderOverlay({ isFollowUpLoading: true });
    expect(screen.getByRole('button', { name: 'Analysing Follow Up…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Play Anyway' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Hint Box' })).toBeEnabled();
  });

  it('offers detailed follow-up for a Worst Move', () => {
    renderOverlay({ classification: 'Worst Move' });
    expect(screen.getByRole('button', { name: 'Show Follow Up Moves' })).toBeInTheDocument();
  });
});
