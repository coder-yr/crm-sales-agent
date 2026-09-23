export type UserRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: string;
  avatar?: string;
  title?: string;
  inviteLink?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  supportEmail?: string;
  officialPhone?: string;
  logo?: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  tenantId: string | null;
}

export interface Property {
  id: string;
  name: string;
  description?: string;
  price: number;
  location: string;
  type: string;
  sqft: number;
  status: string;
  images: string[];
  yearBuilt?: number;
  createdAt: string;
  version: number;
}

export interface Lead {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
  status?: string;
  budget?: string | number;
  interestedProperty?: string;
  preapprovalStatus?: string;
  expectedCloseDate?: string;
  location?: string;
  stageId: string;
  creatorId: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Task {
  id: string;
  tenantId: string;
  leadId: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
