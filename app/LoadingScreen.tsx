"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// Match the time-based logic from landing page
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setIsDark(h < 6 || h >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function LoadingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const isDark = useTimeBasedTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 12) + 2;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return 100;
        }
        return next;
      });
    }, 130);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-[100] ltr transition-colors duration-700 
        ${isDark ? 'bg-[#050505] text-white' : 'bg-[#f8f9fa] text-[#111827]'}`}
    >
      {/* Dynamic Background Texture */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 
          ${isDark ? 'opacity-[0.04]' : 'opacity-[0.08]'}`}
        style={{ 
          backgroundImage: `radial-gradient(circle, ${isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
          backgroundSize: '12px 12px',
        }} 
      />

      <div className="relative w-full max-w-sm px-8 flex flex-col items-center">
        
        {/* Logo with Theme-Aware Glow */}
        <div className="relative w-72 h-28 mb-16">
          <Image
            src="/login.png"
            alt="Auto City"
            fill
            className={`object-contain transition-all duration-700 
              ${isDark ? 'drop-shadow-[0_0_25px_rgba(255,42,42,0.4)]' : 'drop-shadow-[0_0_15px_rgba(255,42,42,0.2)]'}`}
            priority
          />
        </div>

        {/* Digital Cluster Layout */}
        <div className="w-full">
          <div className="flex justify-between items-end mb-3">
             <span className="text-[10px] font-bold tracking-[0.5em] text-[#ff2a2a] uppercase">
               Auto City Setup
             </span>
             <div className="flex items-baseline leading-none">
               <span className="text-6xl font-bold tracking-tighter">
                 {progress}
               </span>
               <span className={`text-sm font-bold ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>%</span>
             </div>
          </div>

          {/* Precision RPM Progress Bar */}
          <div className={`relative h-2 w-full rounded-full border overflow-hidden transition-colors duration-700
            ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}
          >
            {/* Step-style segments */}
            <div className="absolute inset-0 flex justify-between px-0.5 pointer-events-none z-10">
              {[...Array(24)].map((_, i) => (
                <div key={i} className={`h-full w-[2px] ${isDark ? 'bg-[#050505]/40' : 'bg-[#f8f9fa]/40'}`} />
              ))}
            </div>
            
            {/* Active Fill (Always Red) */}
            <div 
              className="h-full bg-[#ff2a2a] transition-all duration-300 ease-out shadow-[0_0_20px_#ff2a2a]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Redline Limit Visual */}
          <div className="w-full flex justify-end mt-2">
             <div className={`h-1 w-8 rounded-full overflow-hidden ${isDark ? 'bg-[#ff2a2a]/20' : 'bg-[#ff2a2a]/10'}`}>
                <div className={`h-full bg-[#ff2a2a] ${progress > 90 ? 'animate-pulse' : 'opacity-0'}`} />
             </div>
          </div>
        </div>
      </div>

      {/* Origin Stamp */}
      <div className="absolute bottom-12 flex flex-col items-center gap-3">
        <div className="h-[1px] w-8 bg-[#ff2a2a]"></div>
        <span className={`text-[10px] font-bold tracking-[0.8em] uppercase transition-colors duration-700
          ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          Qatar
        </span>
      </div>
    </div>
  );
}