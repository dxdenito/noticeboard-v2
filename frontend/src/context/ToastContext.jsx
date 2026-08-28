import { createContext, useContext, useState, useCallback } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const showError = useCallback((message) => showToast(message, "error"), [showToast]);
  const showSuccess = useCallback((message) => showToast(message, "success"), [showToast]);

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm text-white ${
              t.type === "success" ? "bg-jkuat-green" : "bg-jkuat-red"
            }`}
          >
            {t.type === "success" ? <CheckCircle size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span className="text-sm flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)}><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}