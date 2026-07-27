import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import MainLayout from './layouts/MainLayout';
import HomeLayout from './layouts/HomeLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Communities from './pages/CommunityPage';
import Projects from './pages/ProjectsPage';
import Events from './pages/EventsPage';
import Research from './pages/Research';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Search from './pages/Search';
import Home from './pages/Home';

const AppContent = () => {
  const { user, loading } = useAuth();
  const getPathTab = () => {
    const path = window.location.pathname.replace('/', '');
    return path || 'home';
  };

  const [currentTab, setCurrentTab] = useState(getPathTab());
  const [searchValue, setSearchValue] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getPathTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSearch = (value) => {
    setSearchValue(value);
    if (value.trim() !== '') {
      if (currentTab !== 'search') {
        window.history.pushState(null, '', '/search');
        setCurrentTab('search');
      }
    } else if (currentTab === 'search') {
      window.history.pushState(null, '', '/dashboard');
      setCurrentTab('dashboard');
    }
  };

  // Switch tabs cleanly resetting searches
  const handleTabChange = (tabId) => {
    setSearchValue('');
    if (currentTab !== tabId) {
      window.history.pushState(null, '', '/' + tabId);
      setCurrentTab(tabId);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex flex-col justify-center items-center gap-4 bg-canvas-100"
      >
        <div className="relative">
          <div 
            className="w-12 h-12 rounded-full animate-spin border-4 border-t-blue-600 border-blue-600/20"
          />
          <div 
            className="absolute inset-0 w-12 h-12 rounded-full animate-pulse-glow"
            style={{ boxShadow: '0 0 20px rgba(101,146,135,0.4)' }}
          />
        </div>
        <span 
          className="text-xs font-semibold tracking-widest uppercase animate-pulse text-blue-600 font-display"
        >
          Loading Portal
        </span>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return showRegister ? (
      <Register onSwitchLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchRegister={() => setShowRegister(true)} />
    );
  }

  // Logged In Views
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={handleTabChange} />;
      case 'home':
        return <Home setCurrentTab={handleTabChange} />;
      case 'communities':
        return <Communities />;
      case 'projects':
        return <Projects />;
      case 'events':
        return <Events />;
      case 'research':
        return <Research />;
      case 'chat':
        return <Chat />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return user.role === 'admin' ? <Admin /> : <Dashboard setCurrentTab={handleTabChange} />;
      case 'search':
        return <Search queryStr={searchValue} setCurrentTab={handleTabChange} />;
      default:
        return <Home setCurrentTab={handleTabChange} />;
    }
  };

  if (currentTab === 'home') {
    return (
      <HomeLayout setCurrentTab={handleTabChange}>
        <Home setCurrentTab={handleTabChange} />
      </HomeLayout>
    );
  }

  return (
    <MainLayout
      currentTab={currentTab}
      setCurrentTab={handleTabChange}
      onSearch={handleSearch}
      searchValue={searchValue}
    >
      {renderTabContent()}
    </MainLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
