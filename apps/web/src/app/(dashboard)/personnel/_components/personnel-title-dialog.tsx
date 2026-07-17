"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Badge,
  LoadingState,
} from "@repo/ui";
import {
  Plus,
  Pencil,
  Power,
  PowerOff,
  X,
} from "lucide-react";
import {
  getAllPersonnelTitlesAction,
  createPersonnelTitleAction,
  updatePersonnelTitleAction,
  deactivatePersonnelTitleAction,
  activatePersonnelTitleAction,
} from "@/app/actions/personnel";

/* ── Types ─────────────────────────────────────────────────────── */

interface PersonnelTitle {
  id: string;
  titleName: string;
  isActive: boolean;
}

interface PersonnelTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTitlesChanged?: () => void;
}

/* ── Component ─────────────────────────────────────────────────── */

export function PersonnelTitleDialog({ open, onOpenChange, onTitlesChanged }: PersonnelTitleDialogProps) {
  const { t } = useI18n();
  const [titles, setTitles] = useState<PersonnelTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add mode
  const [showAdd, setShowAdd] = useState(false);
  const [newTitleName, setNewTitleName] = useState("");

  // Edit mode
  const [editItem, setEditItem] = useState<PersonnelTitle | null>(null);
  const [editName, setEditName] = useState("");

  // Confirm action
  const [confirmAction, setConfirmAction] = useState<{ id: string; titleName: string; action: "activate" | "deactivate" } | null>(null);

  const fetchTitles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllPersonnelTitlesAction();
      setTitles(result as PersonnelTitle[]);
    } catch {
      setTitles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTitles();
      setShowAdd(false);
      setEditItem(null);
      setNewTitleName("");
      setEditName("");
      setConfirmAction(null);
    }
  }, [open, fetchTitles]);

  const handleCreate = useCallback(async () => {
    if (!newTitleName.trim()) return;
    setSaving(true);
    try {
      await createPersonnelTitleAction(newTitleName.trim());
      setNewTitleName("");
      setShowAdd(false);
      await fetchTitles();
      onTitlesChanged?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [newTitleName, fetchTitles, onTitlesChanged]);

  const handleUpdate = useCallback(async () => {
    if (!editItem || !editName.trim()) return;
    setSaving(true);
    try {
      await updatePersonnelTitleAction(editItem.id, { titleName: editName.trim() });
      setEditItem(null);
      setEditName("");
      await fetchTitles();
      onTitlesChanged?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [editItem, editName, fetchTitles, onTitlesChanged]);

  const handleConfirmToggle = useCallback(async () => {
    if (!confirmAction) return;
    setSaving(true);
    try {
      if (confirmAction.action === "deactivate") {
        await deactivatePersonnelTitleAction(confirmAction.id);
      } else {
        await activatePersonnelTitleAction(confirmAction.id);
      }
      setConfirmAction(null);
      await fetchTitles();
      onTitlesChanged?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [confirmAction, fetchTitles, onTitlesChanged]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("personnel.manageTitles")}</DialogTitle>
            <DialogDescription>
              {t("personnel.manageTitles")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Add Title Section */}
            {showAdd ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-glass-border bg-glass-surface">
                <Input
                  value={newTitleName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitleName(e.target.value)}
                  placeholder={t("personnel.titleName")}
                  className="glass-input flex-1"
                  autoFocus
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setShowAdd(false); setNewTitleName(""); }
                  }}
                />
                <Button size="sm" className="glass-button" onClick={handleCreate} disabled={!newTitleName.trim() || saving}>
                  {saving ? t("common.loading") : t("common.save")}
                </Button>
                <button
                  onClick={() => { setShowAdd(false); setNewTitleName(""); }}
                  className="rounded-md p-1.5 text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button onClick={() => setShowAdd(true)} className="w-full">
                <Plus className="mr-1.5 h-4 w-4" />
                {t("personnel.addTitle")}
              </Button>
            )}

            {/* Title List */}
            {loading ? (
              <LoadingState title={t("common.loading")} />
            ) : titles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-text-muted">{t("personnel.noTitlesDefined")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {titles.map((title) => (
                  <div
                    key={title.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-glass-border bg-glass-surface"
                  >
                    {editItem?.id === title.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                          className="glass-input flex-1"
                          autoFocus
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === "Enter") handleUpdate();
                            if (e.key === "Escape") { setEditItem(null); setEditName(""); }
                          }}
                        />
                        <Button size="sm" className="glass-button" onClick={handleUpdate} disabled={!editName.trim() || saving}>
                          {saving ? t("common.loading") : t("common.save")}
                        </Button>
                        <button
                          onClick={() => { setEditItem(null); setEditName(""); }}
                          className="rounded-md p-1.5 text-text-muted hover:text-text-primary transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{title.titleName}</span>
                          <Badge
                            variant="outline"
                            className={
                              title.isActive
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px] px-1.5 py-0"
                            }
                          >
                            {title.isActive ? t("personnel.titleActive") : t("personnel.titleInactive")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditItem(title); setEditName(title.titleName); }}
                            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                            title={t("personnel.editTitle")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({
                              id: title.id,
                              titleName: title.titleName,
                              action: title.isActive ? "deactivate" : "activate",
                            })}
                            className={`rounded-md p-1.5 transition-colors ${
                              title.isActive
                                ? "text-text-muted hover:bg-danger/10 hover:text-danger"
                                : "text-text-muted hover:bg-emerald-500/10 hover:text-emerald-500"
                            }`}
                            title={title.isActive ? t("personnel.confirmDeactivateTitle") : t("personnel.confirmActivateTitle")}
                          >
                            {title.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open: boolean) => { if (!open) setConfirmAction(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "deactivate"
                ? t("personnel.confirmDeactivateTitle")
                : t("personnel.confirmActivateTitle")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "deactivate"
                ? `${t("personnel.confirmDeactivateTitle")} "${confirmAction?.titleName}"`
                : `${t("personnel.confirmActivateTitle")} "${confirmAction?.titleName}"`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button
              className={confirmAction?.action === "deactivate" ? "bg-danger text-white hover:bg-danger/90" : "glass-button"}
              onClick={handleConfirmToggle}
              disabled={saving}
            >
              {saving ? t("common.loading") : (confirmAction?.action === "deactivate" ? t("personnel.titleInactive") : t("personnel.titleActive"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
