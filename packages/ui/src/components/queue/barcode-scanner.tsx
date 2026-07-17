"use client";

import * as React from "react";
import { useState } from "react";
import { QrCode, X, Scan, Keyboard } from "lucide-react";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n/context";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const { t } = useI18n();
  const [manualInput, setManualInput] = useState("");
  const [mode, setMode] = useState<"scan" | "manual">("scan");

  if (!open) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("queue.barcodeScanner")}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-glass-border bg-glass-elevated p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-text-primary">
              {t("queue.barcodeScanner")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-glass-surface hover:text-text-primary transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex gap-1 rounded-lg bg-glass-background p-1">
          <button
            onClick={() => setMode("scan")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              mode === "scan"
                ? "bg-glass-surface text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Scan className="h-3.5 w-3.5" />
            {t("queue.camera")}
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              mode === "manual"
                ? "bg-glass-surface text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            {t("queue.manual")}
          </button>
        </div>

        {/* Camera placeholder */}
        {mode === "scan" && (
          <div className="mb-4 flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-glass-border bg-glass-surface">
            <div className="text-center">
              <Scan className="mx-auto mb-2 h-8 w-8 text-text-muted" />
              <p className="text-xs text-text-muted">
                {t("queue.cameraReady")}
              </p>
              <p className="mt-0.5 text-[10px] text-text-muted">
                {t("queue.pointCamera")}
              </p>
            </div>
          </div>
        )}

        {/* Manual input */}
        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="mb-4 space-y-2">
            <label className="text-xs font-medium text-text-secondary">
              {t("queue.enterBarcode")}
            </label>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={t("queue.barcodePlaceholder")}
              autoFocus
              className="w-full rounded-lg border border-glass-border bg-glass-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        )}

        {/* Submit */}
        {mode === "manual" && (
          <Button
            variant="primary"
            size="md"
            className="w-full text-xs"
            disabled={!manualInput.trim()}
            onClick={() => {
              if (manualInput.trim()) {
                onScan(manualInput.trim());
                setManualInput("");
                onClose();
              }
            }}
          >
            <QrCode className="mr-2 h-4 w-4" />
            {t("queue.lookupBarcode")}
          </Button>
        )}

        {mode === "scan" && (
          <p className="text-center text-[10px] text-text-muted">
            {t("queue.secureContextNote")}
          </p>
        )}
      </div>
    </div>
  );
}

export { BarcodeScanner };
