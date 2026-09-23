import { create } from 'zustand';
import type { Lead, PipelineStage } from '../types';

interface CRMStore {
  leads: Lead[];
  pipelineStages: PipelineStage[];
  selectedLeadId: string | null;
  filters: {
    status: string;
    search: string;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  setLeads: (leads: Lead[], pagination?: CRMStore['pagination']) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLeadStage: (id: string, stageId: string) => void;
  setPipelineStages: (stages: PipelineStage[]) => void;
  setSelectedLead: (id: string | null) => void;
  setFilters: (filters: Partial<CRMStore['filters']>) => void;
  
  // Analytics & Derived Getters
  getPipelineValue: () => number;
  getConversionRate: () => number;
  getLeadsByStage: (stageId: string) => Lead[];
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  leads: [],
  pipelineStages: [],
  selectedLeadId: null,
  filters: {
    status: 'All',
    search: '',
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  },
  
  setLeads: (leads, pagination) => set((state) => ({ 
    leads, 
    pagination: pagination || state.pagination 
  })),
  addLead: (lead) => set((state) => ({ leads: [lead, ...state.leads] })),
  updateLead: (id, updates) => set((state) => ({
    leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l)
  })),
  deleteLead: (id) => set((state) => ({
    leads: state.leads.filter(l => l.id !== id)
  })),
  moveLeadStage: (id, stageId) => set((state) => ({
    leads: state.leads.map(l => l.id === id ? { ...l, stageId } : l)
  })),
  setPipelineStages: (stages) => set({ pipelineStages: stages }),
  setSelectedLead: (id) => set({ selectedLeadId: id }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),

  // Analytics & Derived Getters
  getPipelineValue: () => {
    const { leads, pipelineStages } = get();
    const closedStageIds = pipelineStages
      .filter(s => s.name.toLowerCase().includes('closed'))
      .map(s => s.id);
    return leads
      .filter(l => !closedStageIds.includes(l.stageId))
      .reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  },
  getConversionRate: () => {
    const { leads, pipelineStages } = get();
    if (leads.length === 0) return 0;
    const closedStageIds = pipelineStages
      .filter(s => s.name.toLowerCase().includes('closed'))
      .map(s => s.id);
    const closedLeads = leads.filter(l => closedStageIds.includes(l.stageId));
    return (closedLeads.length / leads.length) * 100;
  },
  getLeadsByStage: (stageId) => {
    const { leads } = get();
    return leads.filter(l => l.stageId === stageId);
  }
}));
