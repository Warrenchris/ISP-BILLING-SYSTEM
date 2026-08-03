import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background font-sans">

      {/* Sidebar Component */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative w-full overflow-hidden">

        {/* Header Component */}
        <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />

        {/* Page Content — floating panel */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto relative">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
