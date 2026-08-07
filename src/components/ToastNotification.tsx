import { useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

interface ToastNotificationProps {
  toast: ToastState;
  onClose: () => void;
}

export default function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.show, onClose]);

  if (!toast.show) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 20px',
      borderRadius: 99,
      background: isSuccess
        ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
        : 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
      color: 'white',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
      fontSize: '0.9rem',
      fontWeight: 700,
      animation: 'toastSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      pointerEvents: 'none',
      letterSpacing: 0.2,
    }}>
      {isSuccess ? (
        <CheckCircle2 size={18} color="white" />
      ) : (
        <AlertCircle size={18} color="white" />
      )}
      <span>{toast.message}</span>
    </div>
  );
}
