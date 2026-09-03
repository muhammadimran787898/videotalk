import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

let toastListener = null;

export const showToast = (message, type = "info") => {
  if (toastListener) {
    toastListener({ id: Date.now(), message, type });
  }
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastListener = (newToast) => {
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-3 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error" || toast.type === "destructive";
        const isWarning = toast.type === "warning";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in ${
              isSuccess
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-100"
                : isError
                ? "bg-rose-950/90 border-rose-500/50 text-rose-100"
                : isWarning
                ? "bg-amber-950/90 border-amber-500/50 text-amber-100"
                : "bg-slate-900/90 border-slate-700/60 text-slate-100"
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : isError ? (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : isWarning ? (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-medium truncate">
                {toast.message}
              </span>
            </div>

            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 shrink-0 ml-2"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
