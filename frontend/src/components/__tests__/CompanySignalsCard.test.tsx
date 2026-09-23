import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompanySignalsCard } from '../CompanySignalsCard';
import { agentRunsService } from '../../services/agentRuns.service';
import { vi } from 'vitest';

vi.mock('../../services/agentRuns.service', () => ({
  agentRunsService: {
    getLatestRun: vi.fn(),
    getCompanySignals: vi.fn(),
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

describe('CompanySignalsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats confidence percentage correctly when stored as 0-100', async () => {
    const mockSignals = [
      {
        id: '1',
        type: 'HIRING',
        title: 'Hiring software engineers',
        strength: 0.88,
        confidence: 88, // Backend confidence is 0-100
      },
      {
        id: '2',
        type: 'EXPANSION',
        title: 'Opening new office',
        strength: 0.95,
        confidence: 100, // Backend confidence is 0-100
      },
    ];

    vi.mocked(agentRunsService.getLatestRun).mockResolvedValue({ success: true, data: null });
    vi.mocked(agentRunsService.getCompanySignals).mockResolvedValue({ success: true, data: mockSignals });

    render(<CompanySignalsCard companyId="test-company" hasResearch={true} />);

    await waitFor(() => {
      expect(screen.getByText('88%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    const bars = screen.getAllByTestId('confidence-bar');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveStyle({ width: '88%' });
    expect(bars[1]).toHaveStyle({ width: '100%' });
  });
});
