import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-text-primary font-sans selection:bg-primary/30">

      {/* Sidebar Component */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative w-full overflow-hidden">

        {/* Header Component */}
        <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background relative">
          {/* Background ambient glow effects */}
          <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[100px]" />
          </div>

          {/* Content Text - Ensure it sits on top of bg effects */}
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
