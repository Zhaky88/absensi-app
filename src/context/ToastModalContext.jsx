import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Trash2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const ToastModalContext = createContext(null);

export function ToastModalProvider({ children }) {
  // State Toasts
  const [toasts, setToasts] = useState([]);
  
  // State Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolveRef = useRef(null);

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  const addToast = useCallback((type, message, title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    
    // Default title if empty
    let defaultTitle = '';
    if (!title) {
      if (type === 'success') defaultTitle = 'Berhasil';
      else if (type === 'error') defaultTitle = 'Terjadi Kesalahan';
      else if (type === 'warning') defaultTitle = 'Perhatian';
      else defaultTitle = 'Informasi';
    }

    const newToast = {
      id,
      type,
      title: title || defaultTitle,
      message,
      duration: 3800,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, title) => addToast('success', msg, title),
    error: (msg, title) => addToast('error', msg, title),
    warning: (msg, title) => addToast('warning', msg, title),
    info: (msg, title) => addToast('info', msg, title),
  };

  // ==========================================
  // CONFIRMATION & ALERT DIALOG MODAL
  // ==========================================
  const showConfirm = useCallback(({
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan?',
    type = 'warning', // 'danger' | 'warning' | 'info' | 'success'
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
  }) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmDialog({
        title,
        message,
        type,
        confirmText,
        cancelText,
        isAlertOnly: false,
      });
    });
  }, []);

  const showAlert = useCallback(({
    title = 'Pemberitahuan',
    message = '',
    type = 'info',
    confirmText = 'Mengerti',
  }) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmDialog({
        title,
        message,
        type,
        confirmText,
        cancelText: null,
        isAlertOnly: true,
      });
    });
  }, []);

  const handleConfirmClose = (result) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
    setConfirmDialog(null);
  };

  return (
    <ToastModalContext.Provider value={{ toast, showConfirm, showAlert }}>
      {children}

      {/* ========================================================= */}
      {/* TOAST CONTAINER (FLOATING TOP-RIGHT)                      */}
      {/* ========================================================= */}
      <aside aria-label="Notifikasi" className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let badgeBg = 'bg-blue-100 text-blue-600 border-blue-200';
          let borderAccent = 'border-blue-500/20';
          let IconComponent = Info;
          let progressBg = 'bg-blue-500';

          if (t.type === 'success') {
            badgeBg = 'bg-emerald-100 text-emerald-600 border-emerald-200';
            borderAccent = 'border-emerald-500/30';
            IconComponent = CheckCircle2;
            progressBg = 'bg-emerald-500';
          } else if (t.type === 'error') {
            badgeBg = 'bg-rose-100 text-rose-600 border-rose-200';
            borderAccent = 'border-rose-500/30';
            IconComponent = XCircle;
            progressBg = 'bg-rose-500';
          } else if (t.type === 'warning') {
            badgeBg = 'bg-amber-100 text-amber-600 border-amber-200';
            borderAccent = 'border-amber-500/30';
            IconComponent = AlertTriangle;
            progressBg = 'bg-amber-500';
          }

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-md shadow-xl rounded-2xl border ${borderAccent} p-3.5 flex items-start gap-3 transition-all duration-300 transform translate-y-0`}
            >
              <div className={`p-1.5 rounded-xl border shrink-0 ${badgeBg}`}>
                <IconComponent className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-xs font-bold text-slate-800 leading-tight">{t.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{t.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Mini progress bar */}
              <div
                className={`absolute bottom-0 left-0 h-0.5 w-full opacity-60 ${progressBg} animate-pulse`}
              />
            </div>
          );
        })}
      </aside>

      {/* ========================================================= */}
      {/* INTERACTIVE CONFIRM & ALERT MODAL                         */}
      {/* ========================================================= */}
      {confirmDialog && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              {confirmDialog.type === 'danger' ? (
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
              ) : confirmDialog.type === 'warning' ? (
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : confirmDialog.type === 'success' ? (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                  <Info className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800 leading-snug">
                  {confirmDialog.title}
                </h3>
                <div className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line break-words max-h-60 overflow-y-auto pr-1">
                  {confirmDialog.message}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              {!confirmDialog.isAlertOnly && (
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {confirmDialog.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => handleConfirmClose(true)}
                className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmDialog.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastModalContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastModalContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastModalProvider');
  }
  return context;
}
