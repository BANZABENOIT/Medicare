import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastId = 0;
let toastsState: ToastItem[] = [];
const listeners = new Set<ToastListener>();

const TOAST_EVENT = 'mediaremit_toast';

const emit = () => {
  listeners.forEach((l) => l([...toastsState]));
};

const pushToast = (type: ToastType, message: string, options?: { duration?: number }) => {
  toastId += 1;
  const id = toastId;
  toastsState = [...toastsState, { id, type, message }];
  emit();

  const duration = options?.duration ?? 3200;
  window.setTimeout(() => {
    toastsState = toastsState.filter((t) => t.id !== id);
    emit();
  }, duration);
};

export const toast = {
  success: (message: string, options?: { duration?: number }) => pushToast('success', message, options),
  error: (message: string, options?: { duration?: number }) => pushToast('error', message, options),
  info: (message: string, options?: { duration?: number }) => pushToast('info', message, options)
};

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: ToastListener = (items) => setToasts(items);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const removeToast = (id: number) => {
    toastsState = toastsState.filter((t) => t.id !== id);
    emit();
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 mt-0.5 shrink-0" />,
    error: <AlertTriangle className="w-4.5 h-4.5 text-rose-500 mt-0.5 shrink-0" />,
    info: <Info className="w-4.5 h-4.5 text-sky-500 mt-0.5 shrink-0" />
  };

  const borderCls: Record<ToastType, string> = {
    success: 'border-l-emerald-500',
    error: 'border-l-rose-500',
    info: 'border-l-sky-500'
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 max-w-xs bg-white border border-slate-200 border-l-4 ${borderCls[t.type]} rounded-lg shadow-lg px-3.5 py-3 text-xs animate-in fade-in slide-in-from-top-2`}
        >
          {icons[t.type]}
          <span className="text-slate-700 leading-snug">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="ml-auto p-0.5 text-slate-400 hover:text-slate-600 rounded shrink-0"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
