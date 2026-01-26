'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import { useActivityTracker } from '@/hooks/useActivityTracker'; // ✅ Add this import

interface MainLayoutProps {
  children: ReactNode;
  user: any;
  onLogout: () => void;
}

export default function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  
  // ✅ Add this line - Activity tracker for online status
  useActivityTracker(true);

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        className={`fixed left-0 top-0 h-screen w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:block`}
      />
      
      <div className="flex-1 ml-0 md:ml-64">
        {children}
      </div>
    </div>
  );
}