import React, { useEffect, useState } from 'react';

interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastListener: ((toast: ToastData) => void) | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toastListener?.({ message, type });
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<(ToastData & { id: number })[]>([]);

  useEffect(() => {
    let counter = 0;
    toastListener = (toast) => {
      const id = ++counter;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
};
