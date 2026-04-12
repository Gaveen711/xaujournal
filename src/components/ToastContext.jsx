/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'success', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`
              pointer-events-auto px-6 py-4 rounded-2xl glass border shadow-2xl min-w-[300px]
              animate-in slide-in-from-right-full duration-500 flex items-center gap-4
              ${t.type === 'success' ? 'border-green-500/20' : t.type === 'error' ? 'border-red-500/20' : 'border-primary/20'}
            `}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm
              ${t.type === 'success' ? 'bg-green-500/10 text-green-500' : t.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}
            `}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                {t.type === 'success' ? 'Success' : t.type === 'error' ? 'Error' : 'Notification'}
              </span>
              <span className="text-sm font-bold text-foreground/90">{t.msg}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};


export const useToast = () => useContext(ToastContext);
