import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const ACCENT: Record<ToastType, { bar: string; icon: JSX.Element; bg: string; border: string; text: string; closeBtn: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-[#0d2010]',
    border: 'border-green-300 dark:border-green-700/50',
    bar: 'bg-green-500',
    text: 'text-green-900 dark:text-green-100',
    closeBtn: 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40',
    icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />,
  },
  error: {
    bg: 'bg-red-50 dark:bg-[#200d0d]',
    border: 'border-red-300 dark:border-red-700/50',
    bar: 'bg-red-500',
    text: 'text-red-900 dark:text-red-100',
    closeBtn: 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40',
    icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-[#1f1500]',
    border: 'border-amber-300 dark:border-amber-600/50',
    bar: 'bg-amber-400',
    text: 'text-amber-900 dark:text-amber-100',
    closeBtn: 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-[#0a1525]',
    border: 'border-blue-300 dark:border-blue-700/50',
    bar: 'bg-blue-500',
    text: 'text-blue-900 dark:text-blue-100',
    closeBtn: 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40',
    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />,
  },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const accent = ACCENT[type];

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 30);

    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 320);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
      clearInterval(tick);
    };
  }, [id, duration, onClose]);

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-center gap-3 px-4 py-3 rounded-xl border
        shadow-lg backdrop-blur-md
        transition-all duration-[320ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${accent.bg} ${accent.border}
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'}
        min-w-[300px] max-w-[400px]
      `}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: 'inherit' }}>
        <div className={`absolute inset-0 ${accent.bar} rounded-l-xl`} />
      </div>

      <div className="flex items-center gap-3 pl-1 w-full">
        <div className="transition-transform duration-200" style={{ transform: isVisible ? 'scale(1)' : 'scale(0.5)' }}>
          {accent.icon}
        </div>
        <p className={`flex-1 text-sm font-medium leading-snug ${accent.text}`}>{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 320);
          }}
          className={`p-1 rounded-lg active:scale-90 transition-all duration-150 ${accent.closeBtn}`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className={`absolute bottom-0 left-0 h-[2px] ${accent.bar} opacity-60 transition-none`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }>>([]);

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return {
    toasts,
    showToast,
    closeToast,
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
  };
};

export default Toast;
