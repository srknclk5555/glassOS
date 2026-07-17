"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { getPersonnelByIdAction, getPersonnelMachineAssignmentsAction, getMachinesForPersonnelAction, assignMachineAction, removeMachineAssignmentAction } from "@/app/actions/personnel";
import { getStationsByPersonnelIdAction } from "@/app/actions/stations";
import { X, User, Activity, Phone, Mail, Calendar, Wrench, Shield, Stethoscope, AlertTriangle, MapPin } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface PersonnelDetail {
  id: string;
  personnelCode: string;
  firstName: string;
  lastName: string;
  titleId: string | null;
  titleName: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  hiredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  factoryId: string;
  userId: string | null;
}

interface MachineAssignment {
  id: string;
  personnelId: string;
  machineId: string;
  assignmentType: string;
  assignedAt: string;
  releasedAt: string | null;
}

interface MachineWithAssignment {
  assignment: MachineAssignment;
  machine: {
    id: string;
    machineCode: string;
    name: string;
    machineType: string;
    status: string;
  };
}

interface PersonnelDetailDrawerProps {
  personnelId: string | null;
  onClose: () => void;
}

interface MachineSelectorProps {
  open: boolean;
  onClose: () => void;
  personnelId: string;
  onAssigned: () => void;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-glass-border last:border-0">
      <span className="text-xs font-medium text-text-muted shrink-0 w-36">{label}</span>
      <span className="text-sm text-text-primary text-right">{value ?? "—"}</span>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</h3>
    </div>
  );
}

/* ── Machine Selector Dialog ────────────────────────────────────── */

function MachineSelectorDialog({ open, onClose, personnelId, onAssigned }: MachineSelectorProps) {
  const { t } = useI18n();
  const [machines, setMachines] = useState<Array<{id: string; machineCode: string; name: string}>>([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [assignmentType, setAssignmentType] = useState("primary");
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSelectedMachineId("");
      setAssignmentType("primary");
      // Fetch available machines
      fetchAvailableMachines().then(setMachines).finally(() => setLoading(false));
    }
  }, [open]);

  const fetchAvailableMachines = async () => {
    try {
      const { getMachinesAction } = await import("@/app/actions/machines");
      const result = await getMachinesAction({ status: "active", pageSize: 200 });
      return result.items.map((m: any) => ({
        id: m.id,
        machineCode: m.machineCode,
        name: m.name,
      }));
    } catch {
      return [];
    }
  };

  const handleAssign = async () => {
    if (!selectedMachineId) return;
    setAssigning(true);
    try {
      await assignMachineAction(personnelId, selectedMachineId, assignmentType);
      onAssigned();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("personnel.addMachine")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("machines.title")}</label>
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger className="glass-input">
                <SelectValue placeholder={t("machines.searchPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.machineCode} - {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.assignmentType")}</label>
            <Select value={assignmentType} onValueChange={setAssignmentType}>
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">{t("personnel.assignmentPrimary")}</SelectItem>
                <SelectItem value="assistant">{t("personnel.assignmentAssistant")}</SelectItem>
                <SelectItem value="temporary">{t("personnel.assignmentTemporary")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={assigning}>{t("common.cancel")}</Button>
          <Button className="glass-button" onClick={handleAssign} disabled={!selectedMachineId || assigning}>
            {assigning ? t("common.loading") : t("personnel.addMachine")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Personnel Detail Drawer ────────────────────────────────────── */

export function PersonnelDetailDrawer({ personnelId, onClose }: PersonnelDetailDrawerProps) {
  const { t } = useI18n();
  const [personnel, setPersonnel] = useState<PersonnelDetail | null>(null);
  const [machines, setMachines] = useState<MachineWithAssignment[]>([]);
  const [stations, setStations] = useState<Array<{id: string; stationCode: string; stationName: string; stationType: string; isHeadOperator: boolean; assignedAt: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showMachineSelector, setShowMachineSelector] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!personnelId) return;
    setLoading(true);
    try {
      const result = await getPersonnelByIdAction(personnelId);
      setPersonnel(result as PersonnelDetail);
    } catch {
      setPersonnel(null);
    } finally {
      setLoading(false);
    }
  }, [personnelId]);

  const fetchMachines = useCallback(async () => {
    if (!personnelId) return;
    try {
      const result = await getMachinesForPersonnelAction(personnelId);
      setMachines(result as MachineWithAssignment[]);
    } catch {
      setMachines([]);
    }
  }, [personnelId]);

  const fetchStations = useCallback(async () => {
    if (!personnelId) return;
    try {
      const result = await getStationsByPersonnelIdAction(personnelId);
      setStations(result as any[] ?? []);
    } catch {
      setStations([]);
    }
  }, [personnelId]);

  useEffect(() => {
    if (personnelId) {
      fetchDetail();
      fetchMachines();
      fetchStations();
    } else {
      setPersonnel(null);
      setMachines([]);
      setStations([]);
    }
  }, [personnelId, fetchDetail, fetchMachines, fetchStations]);

  const handleMachineAssigned = () => {
    fetchMachines();
    fetchStations();
    fetchDetail();
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await removeMachineAssignmentAction(assignmentId);
      fetchMachines();
    } catch (e) {
      console.error(e);
    }
  };

  const roleLabels: Record<string, string> = {
    operator: "Operatör",
    senior_operator: "Kıdemli Operatör",
    supervisor: "Süpervizör",
    manager: "Yönetici",
  };

  const assignmentTypeLabels: Record<string, string> = {
    primary: t("personnel.assignmentPrimary"),
    assistant: t("personnel.assignmentAssistant"),
    temporary: t("personnel.assignmentTemporary"),
  };

  const tabs = [
    { id: "general", label: t("personnel.generalInfo") },
    { id: "assignments", label: t("personnel.assignments") },
  ];

  return (
    <>
      <Sheet open={!!personnelId} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="w-full max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
              <SheetTitle>{t("personnel.details")}</SheetTitle>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SheetDescription>
              {personnel ? `${personnel.personnelCode} - ${personnel.firstName} ${personnel.lastName}` : ""}
            </SheetDescription>
          </SheetHeader>

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {!loading && !personnel && personnelId && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <User className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">{t("personnel.noPersonnel")}</p>
            </div>
          )}

          {!loading && personnel && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    personnel.isActive
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                  }
                >
                  {personnel.isActive ? t("personnel.statusActive") : t("personnel.statusInactive")}
                </Badge>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-glass-border pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                      activeTab === tab.id
                        ? "bg-glass-surface text-text-primary border-b-2 border-primary"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* General Info Tab */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <SectionTitle icon={<User className="h-3.5 w-3.5 text-text-muted" />} label={t("personnel.generalInfo")} />
                    <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                      <DetailRow label={t("personnel.personnelCode")} value={personnel.personnelCode} />
                      <DetailRow label={t("personnel.firstName")} value={personnel.firstName} />
                      <DetailRow label={t("personnel.lastName")} value={personnel.lastName} />
                      <DetailRow label={t("personnel.title")} value={personnel.titleName ?? "—"} />
                      <DetailRow label={t("personnel.role")} value={roleLabels[personnel.role] ?? personnel.role} />
                      <DetailRow label={t("personnel.phone")} value={personnel.phone} />
                      <DetailRow label={t("personnel.email")} value={personnel.email} />
                      <DetailRow label={t("personnel.hireDate")} value={personnel.hiredAt ?? "—"} />
                    </div>
                  </div>

                  <div>
                    <SectionTitle icon={<AlertTriangle className="h-3.5 w-3.5 text-text-muted" />} label={t("personnel.notes")} />
                    <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                      <p className="text-sm text-text-primary">{personnel.notes ?? "—"}</p>
                    </div>
                  </div>

                  <div>
                    <SectionTitle icon={<Calendar className="h-3.5 w-3.5 text-text-muted" />} label={t("personnel.systemAccess")} />
                    <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                      <DetailRow label={t("personnel.systemAccess")} value={personnel.userId ?? t("personnel.noSystemAccount")} />
                      <DetailRow label={t("personnel.createdAt")} value={new Date(personnel.createdAt).toLocaleDateString()} />
                      <DetailRow label={t("personnel.updatedAt")} value={new Date(personnel.updatedAt).toLocaleDateString()} />
                    </div>
                  </div>
                </div>
              )}

              {/* Assignments Tab */}
              {activeTab === "assignments" && (
                <div className="space-y-4">
                  {/* Machine Assignments */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <SectionTitle icon={<Wrench className="h-3.5 w-3.5 text-text-muted" />} label={t("personnel.machines")} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setShowMachineSelector(true)}
                      >
                        {t("personnel.addMachine")}
                      </Button>
                    </div>
                    <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                      {machines.length === 0 && (
                        <p className="text-xs text-text-muted text-center py-4">{t("personnel.noMachinesAssigned")}</p>
                      )}
                      {machines.map((ma) => (
                        <div key={ma.assignment.id} className="flex items-center justify-between py-2 border-b border-glass-border last:border-0">
                          <div className="flex flex-col">
                            <span className="text-sm text-text-primary">{ma.machine.machineCode} - {ma.machine.name}</span>
                            <span className="text-xs text-text-muted">
                              {assignmentTypeLabels[ma.assignment.assignmentType] ?? ma.assignment.assignmentType}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(ma.assignment.id)}
                            className="text-xs text-danger hover:text-danger/80 transition-colors"
                          >
                            {t("personnel.removeAssignment")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Station Assignments */}
                  <div>
                    <SectionTitle icon={<MapPin className="h-3.5 w-3.5 text-text-muted" />} label={t("personnel.stations")} />
                    <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                      {stations.length === 0 && (
                        <p className="text-xs text-text-muted text-center py-4">{t("personnel.noStationsAssigned")}</p>
                      )}
                      {stations.map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-2 border-b border-glass-border last:border-0">
                          <div className="flex flex-col">
                            <span className="text-sm text-text-primary">{s.stationCode} - {s.stationName}</span>
                            <span className="text-xs text-text-muted">
                              {s.stationType}{s.isHeadOperator ? ` (${t("stations.isHeadOperator")})` : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <MachineSelectorDialog
        open={showMachineSelector}
        onClose={() => setShowMachineSelector(false)}
        personnelId={personnelId ?? ""}
        onAssigned={handleMachineAssigned}
      />
    </>
  );
}
