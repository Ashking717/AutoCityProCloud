'use client';
import { ReactNode, useState } from 'react'; // Add useState if adding toggle
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
  user: any;
  onLogout: () => void;
}

export default function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false); // Optional: For mobile toggle

  return (
    <div className="flex min-h-screen bg-[#050505]"> {/* Change to dark bg if your app is dark-themed */}
      {/* Sidebar: Hidden on mobile, fixed on desktop */}
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        className={`fixed left-0 top-0 h-screen w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:block`} // Responsive + toggle animation
      />
      {/* Optional mobile toggle button (add to your mobile header in ProductsPage or here) */}
      {/* <button className="md:hidden" onClick={() => setShowSidebar(!showSidebar)}><Menu /></button> */}

      <div className="flex-1 ml-0 md:ml-64"> {/* Responsive margin */}
        {children}
      </div>
    </div>
  );
}