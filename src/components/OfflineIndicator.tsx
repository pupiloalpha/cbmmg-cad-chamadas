import React, { useEffect, useState } from 'react';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-3 right-3 sm:right-auto sm:left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-2xl border border-amber-300">
      <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
      <span>Modo Offline Ativo — Exibindo dados em cache local.</span>
      <Database className="w-3.5 h-3.5 ml-1 shrink-0" />
    </div>
  );
};
