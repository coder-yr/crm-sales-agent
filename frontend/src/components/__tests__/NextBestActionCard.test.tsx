import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextBestActionCard } from '../NextBestActionCard';
import { recommendationsService } from '../../services/recommendations.service';
import { agentRunsService } from '../../services/agentRuns.service';
import { vi } from 'vitest';

vi.mock('../../services/recommendations.service', () => ({
  recommendationsService: {
    getLeadRecommendations: vi.fn(),
    acceptRecommendation: vi.fn(),
    dismissRecommendation: vi.fn(),
    startRecommendations: vi.fn(),
  },
}));

vi.mock('../../services/agentRuns.service', () => ({
  agentRunsService: {
    getLatestRun: vi.fn(),
  },
}));

vi.mock('../../services/socket.service', () => ({
  socketService: {
    getSocket: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
    })),
  },
}));

describe('NextBestActionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no recommendations exist', async () => {
    vi.mocked(recommendationsService.getLeadRecommendations).mockResolvedValue({
      success: true,
      data: [],
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<NextBestActionCard leadId="lead-123" />);

    await waitFor(() => {
      expect(screen.getByText('No Pending Next Best Actions')).toBeInTheDocument();
      expect(screen.getByText('Run Recommendations Agent')).toBeInTheDocument();
    });
  });

  it('renders primary recommendation banner with priority badge, action statement and reason', async () => {
    const mockRecs = [
      {
        id: 'rec-1',
        tenantId: 'tenant-1',
        leadId: 'lead-123',
        ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
        type: 'NEXT_BEST_ACTION',
        title: 'Hiring Expansion Follow-up',
        action: 'Follow up with the prospect about their current hiring/expansion needs.',
        reason: 'Detected strong hiring signal (88% confidence) and deal is healthy.',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        version: 'v1',
        createdAt: new Date().toISOString(),
        evidence: {
          ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
          evidence: [
            'HIRING signal detected with 88% confidence',
            'Deal health is HEALTHY (dealScore: 85)',
            'No CRM activity recorded in last 7 days',
          ],
          recommendationVersion: 'v1',
          evaluatedAt: new Date().toISOString(),
        },
      },
    ];

    vi.mocked(recommendationsService.getLeadRecommendations).mockResolvedValue({
      success: true,
      data: mockRecs,
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<NextBestActionCard leadId="lead-123" />);

    await waitFor(() => {
      expect(screen.getByText('Primary Next Action')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(
        screen.getByText('Follow up with the prospect about their current hiring/expansion needs.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Detected strong hiring signal (88% confidence) and deal is healthy.')
      ).toBeInTheDocument();
      expect(screen.getByText('HIRING_EXPANSION_FOLLOWUP')).toBeInTheDocument();
    });
  });

  it('toggles evidence drawer and shows concrete criteria', async () => {
    const mockRecs = [
      {
        id: 'rec-1',
        tenantId: 'tenant-1',
        leadId: 'lead-123',
        ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
        type: 'NEXT_BEST_ACTION',
        title: 'Hiring Expansion Follow-up',
        action: 'Follow up with the prospect about their current hiring/expansion needs.',
        reason: 'Detected strong hiring signal (88% confidence) and deal is healthy.',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        version: 'v1',
        createdAt: new Date().toISOString(),
        evidence: {
          ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
          evidence: [
            'HIRING signal detected with 88% confidence',
            'Deal health is HEALTHY (dealScore: 85)',
          ],
          recommendationVersion: 'v1',
          evaluatedAt: new Date().toISOString(),
        },
      },
    ];

    vi.mocked(recommendationsService.getLeadRecommendations).mockResolvedValue({
      success: true,
      data: mockRecs,
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<NextBestActionCard leadId="lead-123" />);

    await waitFor(() => {
      expect(screen.getByText('Why this action?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Why this action?'));

    await waitFor(() => {
      expect(
        screen.getByText('HIRING signal detected with 88% confidence')
      ).toBeInTheDocument();
      expect(screen.getByText('Hide audit evidence')).toBeInTheDocument();
    });
  });

  it('calls acceptRecommendation when Accept & Create Task is clicked', async () => {
    const mockRecs = [
      {
        id: 'rec-1',
        tenantId: 'tenant-1',
        leadId: 'lead-123',
        ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
        type: 'NEXT_BEST_ACTION',
        title: 'Hiring Expansion Follow-up',
        action: 'Follow up with the prospect about their current hiring/expansion needs.',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(recommendationsService.getLeadRecommendations).mockResolvedValue({
      success: true,
      data: mockRecs,
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });
    vi.mocked(recommendationsService.acceptRecommendation).mockResolvedValue({
      success: true,
      data: {
        ...mockRecs[0],
        status: 'COMPLETED' as const,
        taskId: 'task-999',
        task: {
          id: 'task-999',
          title: 'Action: Follow up with the prospect about their current hiring/expansion needs.',
          status: 'PENDING',
        },
      },
      message: 'Accepted',
    });

    render(<NextBestActionCard leadId="lead-123" />);

    await waitFor(() => {
      expect(screen.getByText('Accept & Create Task')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept & Create Task'));

    await waitFor(() => {
      expect(recommendationsService.acceptRecommendation).toHaveBeenCalledWith('rec-1', true);
    });
  });

  it('calls dismissRecommendation when Dismiss is clicked', async () => {
    const mockRecs = [
      {
        id: 'rec-1',
        tenantId: 'tenant-1',
        leadId: 'lead-123',
        ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
        type: 'NEXT_BEST_ACTION',
        title: 'Hiring Expansion Follow-up',
        action: 'Follow up with the prospect about their current hiring/expansion needs.',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(recommendationsService.getLeadRecommendations).mockResolvedValue({
      success: true,
      data: mockRecs,
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });
    vi.mocked(recommendationsService.dismissRecommendation).mockResolvedValue({
      success: true,
      data: { ...mockRecs[0], status: 'REJECTED' as const },
      message: 'Dismissed',
    });

    render(<NextBestActionCard leadId="lead-123" />);

    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dismiss'));

    await waitFor(() => {
      expect(recommendationsService.dismissRecommendation).toHaveBeenCalledWith('rec-1');
    });
  });

  it('renders secondary recommendations in accordion when multiple actions exist', async () => {
    const mockRecs = [
      {
        id: 'rec-1',
        tenantId: 'tenant-1',
        leadId: 'lead-123',
        ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
        type: 'NEXT_BEST_ACTION',
        title: 'Hiring Expansion Follow-up',
        action: 'Follow up with the prospect about their current hiring/expansion needs.',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-2',
        tenantId: 'tenant-1',
        leadId: 'lead-123',
        ruleKey: 'SCHEDULE_TECHNICAL_DEMO',
        type: 'NEXT_BEST_ACTION',
        title: 'Schedule Technical Demo',
        action: 'Offer a technical architecture deep dive with a solutions engineer.',
        priority: 'MEDIUM' as const,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(recommendationsService.getLeadRecommendations).mockResolvedValue({
      success: true,
      data: mockRecs,
    });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<NextBestActionCard leadId="lead-123" />);

    await waitFor(() => {
      expect(screen.getByText('Primary Next Action')).toBeInTheDocument();
      expect(screen.getByText('Alternative Recommendations (1)')).toBeInTheDocument();
      expect(
        screen.getByText('Offer a technical architecture deep dive with a solutions engineer.')
      ).toBeInTheDocument();
    });
  });
});
