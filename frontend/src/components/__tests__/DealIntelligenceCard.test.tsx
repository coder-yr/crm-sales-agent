import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DealIntelligenceCard } from '../DealIntelligenceCard';
import { agentRunsService } from '../../services/agentRuns.service';
import { vi } from 'vitest';

vi.mock('../../services/agentRuns.service', () => ({
  agentRunsService: {
    getDealIntelligence: vi.fn(),
    getLatestRun: vi.fn(),
    startDealAnalysis: vi.fn(),
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

describe('DealIntelligenceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no deal intelligence exists', async () => {
    vi.mocked(agentRunsService.getDealIntelligence).mockResolvedValue({ success: true, data: null });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<DealIntelligenceCard leadId="lead-123" />);

    await waitFor(() => {
      expect(screen.getByText('No Deal Intelligence Calculated Yet')).toBeInTheDocument();
      expect(screen.getByText('Run Deal Intelligence')).toBeInTheDocument();
    });
  });

  it('renders scores, breakdown bars, health badges, and reasons correctly', async () => {
    const mockRecord = {
      id: 'deal-intel-1',
      tenantId: 'tenant-1',
      leadId: 'lead-123',
      dealScore: 87,
      healthScore: 87,
      intentScore: 90,
      companyFitScore: 85,
      contactFitScore: 80,
      engagementScore: 70,
      riskScore: 15,
      dealHealth: 'HOT' as const,
      buyingStage: 'EVALUATION' as const,
      urgency: 'HIGH' as const,
      dataCompleteness: 92,
      modelVersion: 'v1',
      lastAnalyzedAt: new Date().toISOString(),
      factors: {
        positives: [
          {
            category: 'SIGNAL' as const,
            title: 'High Intent Hiring Activity',
            detail: 'Active hiring in engineering',
            evidence: 'We are expanding our payments infrastructure team.',
            confidence: 88,
          },
          {
            category: 'ENGAGEMENT' as const,
            title: 'Recent Activity Momentum',
            detail: '3 interactions in the past 7 days',
          },
        ],
        risks: [
          {
            category: 'STALE_ENGAGEMENT' as const,
            title: 'Follow-up Overdue',
            detail: 'No logged touchpoint in 14 days',
            severity: 'MEDIUM' as const,
          },
        ],
        missingData: [
          {
            category: 'BUDGET' as const,
            title: 'Unconfirmed Budget',
            detail: 'Budget information not provided',
          },
        ],
      },
    };

    vi.mocked(agentRunsService.getDealIntelligence).mockResolvedValue({ success: true, data: mockRecord });
    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });

    render(<DealIntelligenceCard leadId="lead-123" leadName="Jane Doe" companyName="Acme Corp" />);

    await waitFor(() => {
      // 1. Deal Score Display
      expect(screen.getByTestId('deal-score-value')).toHaveTextContent('87');
      expect(screen.getByText('/ 100')).toBeInTheDocument();

      // 2. Health Badge
      const healthBadge = screen.getByTestId('deal-health-badge');
      expect(healthBadge).toHaveTextContent('HOT');

      // 3. Stage & Urgency
      expect(screen.getByText('EVALUATION')).toBeInTheDocument();
      expect(screen.getByText('High Urgency')).toBeInTheDocument();
      expect(screen.getByText('92% Data Completeness')).toBeInTheDocument();
    });

    // 4. Progress Bars Width Verification (0-100 scale: score%)
    const intentBar = screen.getByTestId('intent-bar');
    expect(intentBar).toHaveStyle({ width: '90%' });

    const companyFitBar = screen.getByTestId('company-fit-bar');
    expect(companyFitBar).toHaveStyle({ width: '85%' });

    const contactFitBar = screen.getByTestId('contact-fit-bar');
    expect(contactFitBar).toHaveStyle({ width: '80%' });

    const engagementBar = screen.getByTestId('engagement-bar');
    expect(engagementBar).toHaveStyle({ width: '70%' });

    const riskBar = screen.getByTestId('risk-bar');
    expect(riskBar).toHaveStyle({ width: '15%' });

    // 5. Why This Score? Evidence & Factors
    expect(screen.getByText('High Intent Hiring Activity')).toBeInTheDocument();
    expect(screen.getByText('88% conf')).toBeInTheDocument();
    expect(screen.getByText('"We are expanding our payments infrastructure team."')).toBeInTheDocument();

    expect(screen.getByText('Follow-up Overdue')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();

    expect(screen.getByText('Unconfirmed Budget')).toBeInTheDocument();
  });
});
