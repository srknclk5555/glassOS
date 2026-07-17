"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Button,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from "@repo/ui";
import {
  getStationByIdAction,
  getStationMachinesAction,
  getStationPersonnelAction,
  assignMachineToStationAction,
  removeMachineFromStationAction,
  assignPersonnelToStationAction,
  removePersonnelFromStationAction,
  getAvailableMachinesForStationAction,
  getAvailablePersonnelForStationAction,
} from "@/app/actions/stations";
import { X, Factory, MapPin, Activity, User, Cpu, Users } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface StationDetail {
  id: string;
  stationCode: string;
  name: string;
  description: string | null;
  stationType: string;
  sortOrder: number;
  maxConcurrentJobs: number;
  maxMachines: number | null;
  maxOperators: number | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MachineAssignment {
  id: string;
  stationId: string;
  machineId: string;
  isPrimary: boolean;
  assignedAt: string;
  machineCode: string;
  machineName: string;
  machineType: string;
  machineStatus: string;
  machineIsActive: boolean;
}

interface PersonnelAssignment {
  id: string;
  stationId: string;
  personnelId: string;
  isHeadOperator: boolean;
  assignedAt: string;
  personnelCode: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface StationDetailDrawerProps {
  stationId: string | null;
  onClose: () => void;
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

/* ── Component ─────────────────────────────────────────────────── */

export function StationDetailDrawer({ stationId, onClose }: StationDetailDrawerProps) {
  const { t } = useI18n();
  const [station, setStation] = useState<StationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Machine assignments
  const [machineAssignments, setMachineAssignments] = useState<MachineAssignment[]>([]);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [availableMachines, setAvailableMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [machineAsPrimary, setMachineAsPrimary] = useState(false);

  // Personnel assignments
  const [personnelAssignments, setPersonnelAssignments] = useState<PersonnelAssignment[]>([]);
  const [showAddPersonnel, setShowAddPersonnel] = useState(false);
  const [availablePersonnel, setAvailablePersonnel] = useState<any[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [personnelAsHead, setPersonnelAsHead] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [result, machines, personnel] = await Promise.all([
        getStationByIdAction(stationId),
        getStationMachinesAction(stationId),
        getStationPersonnelAction(stationId),
      ]);
      setStation(result as StationDetail);
      setMachineAssignments(machines as MachineAssignment[]);
      setPersonnelAssignments(personnel as PersonnelAssignment[]);
    } catch {
      setStation(null);
      setMachineAssignments([]);
      setPersonnelAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    if (stationId) {
      fetchDetail();
      setActiveTab("general");
    } else {
      setStation(null);
      setMachineAssignments([]);
      setPersonnelAssignments([]);
    }
  }, [stationId, fetchDetail]);

  const handleRefresh = useCallback(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Machine Assignment ──

  const handleOpenAddMachine = useCallback(async () => {
    if (!stationId) return;
    try {
      const machines = await getAvailableMachinesForStationAction(stationId);
      setAvailableMachines(machines);
      setSelectedMachineId("");
      setMachineAsPrimary(false);
      setShowAddMachine(true);
    } catch (e) {
      console.error(e);
    }
  }, [stationId]);

  const handleAssignMachine = useCallback(async () => {
    if (!stationId || !selectedMachineId) return;
    try {
      await assignMachineToStationAction({
        stationId,
        machineId: selectedMachineId,
        isPrimary: machineAsPrimary,
      });
      setShowAddMachine(false);
      const [machines, newAvailable] = await Promise.all([
        getStationMachinesAction(stationId),
        getAvailableMachinesForStationAction(stationId),
      ]);
      setMachineAssignments(machines as MachineAssignment[]);
      setAvailableMachines(newAvailable);
    } catch (e) {
      console.error(e);
    }
  }, [stationId, selectedMachineId, machineAsPrimary]);

  const handleRemoveMachine = useCallback(async (assignmentId: string) => {
    try {
      await removeMachineFromStationAction(assignmentId);
      if (stationId) {
        const [machines, newAvailable] = await Promise.all([
          getStationMachinesAction(stationId),
          getAvailableMachinesForStationAction(stationId),
        ]);
        setMachineAssignments(machines as MachineAssignment[]);
        setAvailableMachines(newAvailable);
      }
    } catch (e) {
      console.error(e);
    }
  }, [stationId]);

  // ── Personnel Assignment ──

  const handleOpenAddPersonnel = useCallback(async () => {
    if (!stationId) return;
    try {
      const personnel = await getAvailablePersonnelForStationAction(stationId);
      setAvailablePersonnel(personnel);
      setSelectedPersonnelId("");
      setPersonnelAsHead(false);
      setShowAddPersonnel(true);
    } catch (e) {
      console.error(e);
    }
  }, [stationId]);

  const handleAssignPersonnel = useCallback(async () => {
    if (!stationId || !selectedPersonnelId) return;
    try {
      await assignPersonnelToStationAction({
        stationId,
        personnelId: selectedPersonnelId,
        isHeadOperator: personnelAsHead,
      });
      setShowAddPersonnel(false);
      const [personnel, newAvailable] = await Promise.all([
        getStationPersonnelAction(stationId),
        getAvailablePersonnelForStationAction(stationId),
      ]);
      setPersonnelAssignments(personnel as PersonnelAssignment[]);
      setAvailablePersonnel(newAvailable);
    } catch (e) {
      console.error(e);
    }
  }, [stationId, selectedPersonnelId, personnelAsHead]);

  const handleRemovePersonnel = useCallback(async (assignmentId: string) => {
    try {
      await removePersonnelFromStationAction(assignmentId);
      if (stationId) {
        const [personnel, newAvailable] = await Promise.all([
          getStationPersonnelAction(stationId),
          getAvailablePersonnelForStationAction(stationId),
        ]);
        setPersonnelAssignments(personnel as PersonnelAssignment[]);
        setAvailablePersonnel(newAvailable);
      }
    } catch (e) {
      console.error(e);
    }
  }, [stationId]);

  const typeLabels: Record<string, string> = {
    cutting: t("stations.typeCutting"),
    grinding: t("stations.typeGrinding"),
    tempering: t("stations.typeTempering"),
    insulating_glass: t("stations.typeInsulatingGlass"),
    cnc: t("stations.typeCnc"),
    drilling: t("stations.typeDrilling"),
    lamination: t("stations.typeLamination"),
    washing: t("stations.typeWashing"),
    painting: t("stations.typePainting"),
    sandblasting: t("stations.typeSandblasting"),
    quality: t("stations.typeQuality"),
    dispatch: t("stations.typeDispatch"),
  };

  return (
    <>
      <Sheet open={!!stationId} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
              <SheetTitle>{t("stations.details")}</SheetTitle>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SheetDescription>
              {station ? `${station.stationCode} - ${station.name}` : ""}
            </SheetDescription>
          </SheetHeader>

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {!loading && !station && stationId && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Activity className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">{t("queue.jobNotFound")}</p>
            </div>
          )}

          {!loading && station && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {station.isActive ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {t("stations.statusActive")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-danger/10 text-danger border-danger/20">
                    {t("stations.statusInactive")}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  {typeLabels[station.stationType] ?? station.stationType}
                </Badge>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="general" className="flex-1">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    {t("stations.generalInfo")}
                  </TabsTrigger>
                  <TabsTrigger value="machines" className="flex-1">
                    <Cpu className="h-3.5 w-3.5 mr-1.5" />
                    {t("stations.machines")} ({machineAssignments.length})
                  </TabsTrigger>
                  <TabsTrigger value="personnel" className="flex-1">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    {t("stations.personnel")} ({personnelAssignments.length})
                  </TabsTrigger>
                </TabsList>

                {/* General Info Tab */}
                <TabsContent value="general" className="mt-4 space-y-4">
                  <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                    <DetailRow label={t("stations.stationCode")} value={station.stationCode} />
                    <DetailRow label={t("stations.stationName")} value={station.name} />
                    <DetailRow label={t("stations.stationType")} value={typeLabels[station.stationType] ?? station.stationType} />
                    <DetailRow label={t("stations.descriptionLabel")} value={station.description} />
                    <DetailRow label={t("stations.sortOrder")} value={station.sortOrder} />
                    <DetailRow label={t("stations.maxConcurrentJobs")} value={station.maxConcurrentJobs} />
                    <DetailRow label={t("stations.maxMachines")} value={station.maxMachines} />
                    <DetailRow label={t("stations.maxOperators")} value={station.maxOperators} />
                  </div>

                  {station.notes && (
                    <div>
                      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                        {t("stations.notes")}
                      </h3>
                      <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{station.notes}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Audit</h3>
                    <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                      <DetailRow label={t("personnel.createdAt")} value={station.createdAt ? new Date(station.createdAt).toLocaleString() : null} />
                      <DetailRow label={t("personnel.updatedAt")} value={station.updatedAt ? new Date(station.updatedAt).toLocaleString() : null} />
                    </div>
                  </div>
                </TabsContent>

                {/* Machines Tab */}
                <TabsContent value="machines" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t("stations.assignedMachines")}
                    </h3>
                    <Button size="sm" onClick={handleOpenAddMachine}>
                      {t("stations.addMachine")}
                    </Button>
                  </div>
                  <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                    {machineAssignments.length === 0 && (
                      <p className="text-xs text-text-muted text-center py-4">{t("stations.noMachinesAssigned")}</p>
                    )}
                    {machineAssignments.map((ma) => (
                      <div key={ma.id} className="flex items-center justify-between py-2 border-b border-glass-border last:border-0">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-text-muted shrink-0" />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-primary">{ma.machineName}</span>
                              {ma.isPrimary && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-purple-500/10 text-purple-500 border-purple-500/20">
                                  {t("stations.isPrimary")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-text-muted">{ma.machineCode} · {ma.machineType}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMachine(ma.id)}
                          className="text-xs text-danger hover:text-danger/80 transition-colors shrink-0 ml-2"
                        >
                          {t("stations.removeMachine")}
                        </button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Personnel Tab */}
                <TabsContent value="personnel" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t("stations.assignedPersonnel")}
                    </h3>
                    <Button size="sm" onClick={handleOpenAddPersonnel}>
                      {t("stations.addPersonnel")}
                    </Button>
                  </div>
                  <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                    {personnelAssignments.length === 0 && (
                      <p className="text-xs text-text-muted text-center py-4">{t("stations.noPersonnelAssigned")}</p>
                    )}
                    {personnelAssignments.map((pa) => (
                      <div key={pa.id} className="flex items-center justify-between py-2 border-b border-glass-border last:border-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-text-muted shrink-0" />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-primary">{pa.firstName} {pa.lastName}</span>
                              {pa.isHeadOperator && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                  {t("stations.isHeadOperator")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-text-muted">{pa.personnelCode} · {pa.role}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemovePersonnel(pa.id)}
                          className="text-xs text-danger hover:text-danger/80 transition-colors shrink-0 ml-2"
                        >
                          {t("stations.removePersonnel")}
                        </button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Machine Dialog ── */}
      <Dialog open={showAddMachine} onOpenChange={setShowAddMachine}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stations.addMachine")}</DialogTitle>
            <DialogDescription>{t("stations.addMachine")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger>
                <SelectValue placeholder={t("stations.addMachine")} />
              </SelectTrigger>
              <SelectContent>
                {availableMachines.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.machineCode} - {m.name} ({m.machineType})
                  </SelectItem>
                ))}
                {availableMachines.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    {t("stations.noMachinesAssigned")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={machineAsPrimary}
                onChange={(e) => setMachineAsPrimary(e.target.checked)}
                className="rounded border-glass-border"
              />
              <label htmlFor="isPrimary" className="text-sm text-text-primary">
                {t("stations.isPrimary")}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMachine(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAssignMachine} disabled={!selectedMachineId}>
              {t("stations.addMachine")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Personnel Dialog ── */}
      <Dialog open={showAddPersonnel} onOpenChange={setShowAddPersonnel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stations.addPersonnel")}</DialogTitle>
            <DialogDescription>{t("stations.addPersonnel")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
              <SelectTrigger>
                <SelectValue placeholder={t("stations.addPersonnel")} />
              </SelectTrigger>
              <SelectContent>
                {availablePersonnel.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.personnelCode} - {p.firstName} {p.lastName} ({p.role})
                  </SelectItem>
                ))}
                {availablePersonnel.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    {t("stations.noPersonnelAssigned")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isHeadOperator"
                checked={personnelAsHead}
                onChange={(e) => setPersonnelAsHead(e.target.checked)}
                className="rounded border-glass-border"
              />
              <label htmlFor="isHeadOperator" className="text-sm text-text-primary">
                {t("stations.isHeadOperator")}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPersonnel(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAssignPersonnel} disabled={!selectedPersonnelId}>
              {t("stations.addPersonnel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
