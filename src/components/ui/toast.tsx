import * as React from "react";
import { createRoot } from "react-dom/client";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ToastProps {
  variant?: "default" | "destructive" | "info";
  title?: string;
  description?: string;
  onClose?: () => void;
  duration?: number;
  className?: string;
  hideClose?: boolean;
}

interface ToastContextType {
  toast: (props: ToastProps) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([]);

  const toast = React.useCallback((props: ToastProps) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...props, id }]);

    if (props.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, props.duration || 5000);
    }
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 m-6 flex flex-col items-end space-y-4">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            onClose={() => dismissToast(t.id)}
            className={t.className}
            hideClose={t.hideClose}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export function Toast({
  variant = "default",
  title,
  description,
  onClose,
  className,
  hideClose,
}: ToastProps) {
  return (
    <div
      className={cn(
        "animate-slide-up min-w-64 rounded-md border p-4 shadow-md transition-all",
        variant === "default" && "bg-white text-black border-gray-200",
        variant === "destructive" && "bg-red-600 text-white border-red-600",
        variant === "info" && "bg-blue-600 text-white border-blue-600",
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          {title && <div className="font-medium">{title}</div>}
          {description && <div className="mt-1 text-sm">{description}</div>}
        </div>
        {onClose && !hideClose && (
          <button
            className={cn(
              "ml-4 h-6 w-6 rounded-md p-1",
              variant === "info" ? "hover:bg-blue-500" : "hover:bg-gray-100"
            )}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Helper function for components that don't have access to context
export const toast = (props: ToastProps) => {
  // Create a temporary div for the toast if not within context
  const div = document.createElement("div");
  div.className = "fixed bottom-0 right-0 z-50 m-6";
  document.body.appendChild(div);

  const toastElement = document.createElement("div");
  div.appendChild(toastElement);

  const toastComponent = (
    <Toast
      variant={props.variant}
      title={props.title}
      description={props.description}
      className={props.className}
      hideClose={props.hideClose}
    />
  );

  const root = createRoot(toastElement);
  root.render(toastComponent);

  setTimeout(() => {
    div.classList.add("opacity-0");
    div.style.transition = "opacity 150ms ease-out";
    setTimeout(() => {
      root.unmount();
      document.body.removeChild(div);
    }, 150);
  }, props.duration || 3000);
}; 