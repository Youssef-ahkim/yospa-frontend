"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "./Spinner";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  cancelLabel?: string;
  confirmClassName?: string;
  isConfirming?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  confirmLoadingLabel,
  cancelLabel = "Cancel",
  confirmClassName = "bg-red-600 hover:bg-red-700 text-white",
  isConfirming = false,
}: ConfirmDialogProps) {
  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div>
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-gray-900">
            {title}
          </h3>
          {description && (
            <div className="text-sm text-gray-600 mt-2 leading-relaxed">
              {description}
            </div>
          )}
          {children}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 font-medium text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${confirmClassName}`}
          >
            {isConfirming && <Spinner className="w-4 h-4" />}
            {isConfirming ? (confirmLoadingLabel || confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
