"use client";

import { useEffect, useRef } from "react";
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
  confirmDisabled?: boolean;
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
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Lock body scroll, capture trigger element on open and restore on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => {
        const inputOrButton = dialogRef.current?.querySelector<HTMLElement>(
          'input:not([disabled]), button:not([disabled])'
        );
        inputOrButton?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = "";
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus trap and Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE4F2] space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div>
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-[#33283D]">
            {title}
          </h3>
          {description && (
            <div className="text-sm text-[#7A6F86] mt-2 leading-relaxed">
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
            className="flex-1 py-2 px-4 border border-[#EAE4F2] rounded-xl text-sm font-medium text-[#33283D] bg-white hover:bg-[#FAF8FC] transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isConfirming || confirmDisabled}
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
