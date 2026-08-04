import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NetworkStatusBanner from '../common/NetworkStatusBanner';

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <NetworkStatusBanner />
      <div className="flex flex-1 min-h-screen relative w-full overflow-hidden">
        {/* Sidebar Component */}
        <Sidebar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
          setCollapsed={handleToggleCollapse}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen relative w-full overflow-hidden">
          {/* Header Component */}
          <Header
            onMenuClick={() => setMobileOpen(!mobileOpen)}
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          {/* Page Content — floating panel */}
          <main role="main" aria-label="Main content" className="flex-1 overflow-x-hidden overflow-y-auto relative">
            <div className="p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
