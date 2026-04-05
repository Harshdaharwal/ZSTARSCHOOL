import { useToast } from '../../hooks/useToast.js';

export function ToastHost() {
  const { toast } = useToast();
  if (!toast) return null;
  return <div className={`app-toast ${toast.type}`}>{toast.message}</div>;
}
