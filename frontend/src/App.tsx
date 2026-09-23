import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { PrivateRoute } from './guards/PrivateRoute';

// Lazy load pages
import { LandingPage } from './pages/LandingPage';
import { Pricing } from './pages/Pricing';
import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { WorkspaceOverview } from './pages/WorkspaceOverview';
import { LeadsManagement } from './pages/LeadsManagement';
import { LeadDetails } from './pages/LeadDetails';
import { Pipeline } from './pages/Pipeline';
import { ReportsAnalytics } from './pages/ReportsAnalytics';
import { ChannelPartners } from './pages/ChannelPartners';
import { EmployeeManagement } from './pages/EmployeeManagement';
import { Properties } from './pages/Properties';
import { PropertyDetails } from './pages/PropertyDetails';
import { Settings } from './pages/Settings';
import { HelpCenter } from './pages/HelpCenter';
import { TasksPage } from './pages/TasksPage';
import { ActivateAccount } from './pages/ActivateAccount';
import { SignalCenter } from './pages/SignalCenter';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-surface-container-low">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Unauthenticated Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/activate" element={<ActivateAccount />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Authenticated Layout Routes */}
            <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route path="/workspace-overview" element={<WorkspaceOverview />} />
              <Route path="/leads-management" element={<LeadsManagement />} />
              <Route path="/leads/:id" element={<LeadDetails />} />
              <Route path="/signals" element={<SignalCenter />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/reports-analytics" element={<ReportsAnalytics />} />
              <Route path="/channel-partners" element={<ChannelPartners />} />
              <Route path="/employee-management" element={<EmployeeManagement />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetails />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<HelpCenter />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

export default App;

