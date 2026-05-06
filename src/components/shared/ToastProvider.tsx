"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import styles from "./ToastProvider.module.css";

type ToastTone = "success" | "error" | "info";
type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue>({ notify: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  const value = useMemo<ToastContextValue>(
    () => ({
      notify(message, tone = "info") {
        const id = Date.now() + Math.round(Math.random() * 1000);

        startTransition(() => {
          setToasts((current) => [...current.slice(-2), { id, message, tone }]);
        });

        window.setTimeout(() => {
          startTransition(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
          });
        }, 2800);
      },
    }),
    [startTransition],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? XCircle : Info;

          return (
            <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
              <Icon size={17} strokeWidth={2.2} />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
