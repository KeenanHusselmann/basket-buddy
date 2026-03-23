// ==========================================
// BasketBuddy - Main Layout
// ==========================================

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import FloatingCalculator from '../common/FloatingCalculator';
import { cn } from '../../utils/helpers';

const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        'min-h-screen flex flex-col transition-[margin] duration-200 ease-in-out',
        sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
      )}>
        <Header />
        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />

      <FloatingCalculator />
    </div>
  );
};

export default Layout;
