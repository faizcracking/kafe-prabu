'use client';
// Notifikasi kecil (toast) di pojok layar.
import { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random();
    setList((l) => [...l, { id, message, type }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4500);
  }, []);
  const color = { info: 'bg-espresso text-cream', success: 'bg-emerald-600 text-white', error: 'bg-red-600 text-white' };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2">
        {list.map((t) => (
          <div key={t.id} className={`pointer-events-auto animate-fade-up rounded-xl px-4 py-3 text-sm font-medium shadow-xl ${color[t.type] || color.info}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
