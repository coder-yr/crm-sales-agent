import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SideNavBar } from './SideNavBar';
import { TopAppBar } from './TopAppBar';
import { socketService } from '../services/socket.service';

export const AppLayout: React.FC = () => {
  useEffect(() => {
    try {
      socketService.connect();
    } catch (err) {
      console.error('Socket connection failed', err);
    }
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--surface)' }}>
      <SideNavBar />
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        <TopAppBar />
        <main className="flex-1 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
