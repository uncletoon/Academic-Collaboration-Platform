import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const MainLayout = ({ children, currentTab, setCurrentTab, onSearch, searchValue }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen bg-canvas-100 flex overflow-hidden relative selection:bg-blue-100 selection:text-blue-900">
      
      {/* ── Immersive Light Ambient Background ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Floating background orbs */}
        <div 
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[70%] rounded-full animate-float-slow mix-blend-multiply"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 60%)',
            filter: 'blur(80px)'
          }}
        />
        <div 
          className="absolute top-[30%] -right-[15%] w-[50%] h-[80%] rounded-full animate-float mix-blend-multiply"
          style={{
            background: 'radial-gradient(circle, rgba(99,179,237,0.12) 0%, transparent 60%)',
            filter: 'blur(100px)',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* ── Sidebar (Desktop & Mobile) ──────────────────────────────────────── */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Navbar 
          setMobileOpen={setMobileOpen} 
          onSearch={onSearch}
          searchValue={searchValue}
        />
        
        <main
          className={`flex-1 min-h-0 overflow-x-hidden px-4 sm:px-6 lg:px-10 perspective-1000 ${
            currentTab === 'chat'
              ? 'overflow-hidden py-4 sm:py-5 lg:py-6'
              : 'overflow-y-auto py-8 scroll-smooth'
          }`}
        >
          <div className={`max-w-7xl mx-auto w-full ${currentTab === 'chat' ? 'h-full min-h-0' : ''}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
