import React from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface AndroidFrameProps {
  isMobile: boolean;
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ isMobile, children }) => {
  if (!isMobile) {
    return <div className="w-full min-h-[calc(100vh-56px)] bg-slate-50">{children}</div>;
  }

  // Current time for status bar
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="py-2 sm:py-6 px-1 sm:px-4 flex justify-center items-start min-h-[calc(100vh-56px)] bg-slate-200/80">
      {/* Android Device Mockup Frame - adapts on actual mobile screens so it never overflows */}
      <div className="relative w-full max-w-full sm:max-w-[420px] bg-slate-900 sm:rounded-[44px] rounded-2xl p-1.5 sm:p-3 shadow-2xl border-2 sm:border-[4px] border-slate-700/60 ring-1 ring-black/20">
        {/* Device Earpiece Speaker / Camera Notch (hidden on small screens to save vertical space) */}
        <div className="hidden sm:flex absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-full items-center justify-center z-50">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
        </div>

        {/* Screen Bezel & Surface - responsive height so it never cuts off on short viewports */}
        <div className="relative w-full bg-slate-50 sm:rounded-[34px] rounded-xl overflow-hidden h-[min(820px,calc(100dvh-5.5rem))] flex flex-col shadow-inner">
          {/* Android Material 3 Status Bar */}
          <div className="h-9 sm:h-10 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between text-xs text-slate-800 font-semibold select-none z-40 border-b border-slate-100 shrink-0">
            <span>{timeString}</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <BatteryMedium className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          {/* Screen Scrollable Viewport - proper bottom padding for bottom nav */}
          <div className="flex-1 overflow-y-auto pb-24 relative overscroll-contain">
            {children}
          </div>

          {/* Android Gesture Bar */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 sm:w-32 h-1 bg-slate-400 rounded-full z-50 pointer-events-none opacity-60" />
        </div>
      </div>
    </div>
  );
};
