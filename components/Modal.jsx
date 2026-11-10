'use client';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`animate-fade-up max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl ${wide ? 'max-w-2xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-espresso/5" aria-label="Tutup"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
