import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchScoreBreakdown from './MatchScoreBreakdown';

const baseProps = {
  scoreBreakdown: {
    semantic: 0.4,
    tagOverlap: 0.6,
    roleMatch: 0.5,
    geoMatch: 0.3,
    relationship: 0.7,
  },
  confidenceScores: {
    semantic: 0.8,
    tagOverlap: 0.9,
    roleMatch: 0.5,
    geoMatch: 0.6,
    relationship: 0.4,
    overall: 0.75,
  },
  rawScore: 0.45,
  starScore: 3,
  matchVersion: 'v1.1-transparency',
};

describe('MatchScoreBreakdown', () => {
  it('renders header with raw score percentage', () => {
    render(<MatchScoreBreakdown {...baseProps} />);

    expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('renders match version badge', () => {
    render(<MatchScoreBreakdown {...baseProps} />);

    expect(screen.getByText('v1.1-transparency')).toBeInTheDocument();
  });

  it('renders confidence label in header', () => {
    render(<MatchScoreBreakdown {...baseProps} />);

    // overall confidence = 0.75 → "High confidence" (>= 0.5 && < 0.8 → Medium; wait, 0.75 >= 0.5 but < 0.8 → Medium)
    expect(screen.getByText('Medium confidence')).toBeInTheDocument();
  });

  it('renders High confidence label when overall >= 0.8', () => {
    render(
      <MatchScoreBreakdown
        {...baseProps}
        confidenceScores={{ ...baseProps.confidenceScores, overall: 0.85 }}
      />,
    );

    expect(screen.getByText('High confidence')).toBeInTheDocument();
  });

  it('renders Low confidence label when overall < 0.5', () => {
    render(
      <MatchScoreBreakdown
        {...baseProps}
        confidenceScores={{ ...baseProps.confidenceScores, overall: 0.3 }}
      />,
    );

    expect(screen.getByText('Low confidence')).toBeInTheDocument();
  });

  it('expand/collapse toggle shows and hides scoring details', async () => {
    const user = userEvent.setup();
    render(<MatchScoreBreakdown {...baseProps} />);

    // Initially collapsed: the component names should not be visible
    expect(screen.queryByText('Keyword Match')).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText('Score Breakdown'));

    // Now component names should be visible
    expect(screen.getByText('Keyword Match')).toBeInTheDocument();
    expect(screen.getByText('Tag Overlap')).toBeInTheDocument();
    expect(screen.getByText('Role Match')).toBeInTheDocument();
    expect(screen.getByText('Geographic Match')).toBeInTheDocument();
    expect(screen.getByText('Relationship Strength')).toBeInTheDocument();

    // Click to collapse
    await user.click(screen.getByText('Score Breakdown'));

    expect(screen.queryByText('Keyword Match')).not.toBeInTheDocument();
  });

  it('displays all standard scoring components when expanded', async () => {
    const user = userEvent.setup();
    render(<MatchScoreBreakdown {...baseProps} />);

    await user.click(screen.getByText('Score Breakdown'));

    expect(screen.getByText('Keyword Match')).toBeInTheDocument();
    expect(screen.getByText('Tag Overlap')).toBeInTheDocument();
    expect(screen.getByText('Role Match')).toBeInTheDocument();
    expect(screen.getByText('Geographic Match')).toBeInTheDocument();
    expect(screen.getByText('Relationship Strength')).toBeInTheDocument();
  });

  it('displays personalAffinity when present and > 0', async () => {
    const user = userEvent.setup();
    render(
      <MatchScoreBreakdown
        {...baseProps}
        scoreBreakdown={{ ...baseProps.scoreBreakdown, personalAffinity: 0.5 }}
      />,
    );

    await user.click(screen.getByText('Score Breakdown'));

    expect(screen.getByText('Personal Affinity')).toBeInTheDocument();
  });

  it('does NOT display personalAffinity when 0', async () => {
    const user = userEvent.setup();
    render(
      <MatchScoreBreakdown
        {...baseProps}
        scoreBreakdown={{ ...baseProps.scoreBreakdown, personalAffinity: 0 }}
      />,
    );

    await user.click(screen.getByText('Score Breakdown'));

    expect(screen.queryByText('Personal Affinity')).not.toBeInTheDocument();
  });

  it('displays embedding score when present and >= 0', async () => {
    const user = userEvent.setup();
    render(
      <MatchScoreBreakdown
        {...baseProps}
        scoreBreakdown={{ ...baseProps.scoreBreakdown, embedding: 0.6 }}
      />,
    );

    await user.click(screen.getByText('Score Breakdown'));

    expect(screen.getByText('Semantic Similarity (AI)')).toBeInTheDocument();
  });

  it('displays nameMatch when present and > 0', async () => {
    const user = userEvent.setup();
    render(
      <MatchScoreBreakdown
        {...baseProps}
        scoreBreakdown={{ ...baseProps.scoreBreakdown, nameMatch: 0.9 }}
      />,
    );

    await user.click(screen.getByText('Score Breakdown'));

    expect(screen.getByText('Name Mentioned')).toBeInTheDocument();
  });

  it('shows correct star rating in expanded view', async () => {
    const user = userEvent.setup();
    render(<MatchScoreBreakdown {...baseProps} />);

    await user.click(screen.getByText('Score Breakdown'));

    // 3 stars = "⭐⭐⭐"
    expect(screen.getByText('⭐⭐⭐')).toBeInTheDocument();
  });

  it('shows overall match score label when expanded', async () => {
    const user = userEvent.setup();
    render(<MatchScoreBreakdown {...baseProps} />);

    await user.click(screen.getByText('Score Breakdown'));

    expect(screen.getByText('Overall Match Score')).toBeInTheDocument();
  });

  it('defaults matchVersion to v1.0 when not provided', () => {
    const { matchVersion, ...propsWithoutVersion } = baseProps;
    render(<MatchScoreBreakdown {...propsWithoutVersion} />);

    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });
});
