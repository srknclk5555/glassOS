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
} from "@repo/ui";
import { getMachineByIdAction } from "@/app/actions/machines";
import { getMachineOperatorsAction, removeMachineAssignmentAction } from "@/app/actions/personnel";
import { getStationByMachineIdAction } from "@/app/actions/stations";
import { X, Factory, Calendar, Activity, User, MapPin } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface MachineDetail {
  id: string;
  machineCode: string;
  name: string;
  machineType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  manufactureYear: number | null;
  purchasedAt: string | null;
  commissionedAt: string | null;
  warrantyStartsAt: string | null;
  warrantyEndsAt: string | null;
  status: string;
  isActive: boolean;
  hourlyCapacity: string | null;
  dailyCapacity: string | null;
  maxGlassWidthMm: string | null;
  maxGlassHeightMm: string | null;
  maxThicknessMm: string | null;
  minThicknessMm: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  factoryId: string | null;
  stationId: string | null;
}

interface MachineDetailDrawerProps {
  machineId: string | null;
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

export function MachineDetailDrawer({ machineId, onClose }: MachineDetailDrawerProps) {
  const { t } = useI18n();
  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [operators, setOperators] = useState<Array<{assignment: {id: string; assignmentType: string}; personnel: {id: string; personnelCode: string; firstName: string; lastName: string; role: string}}>>([]);
  const [stationInfo, setStationInfo] = useState<{ stationId: string; stationCode: string; stationName: string; stationType: string; isPrimary: boolean } | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!machineId) return;
    setLoading(true);
    try {
      const [result, ops, station] = await Promise.all([
        getMachineByIdAction(machineId),
        getMachineOperatorsAction(machineId),
        getStationByMachineIdAction(machineId),
      ]);
      setMachine(result as MachineDetail);
      setOperators(ops as any[] ?? []);
      setStationInfo(station as any);
    } catch {
      setMachine(null);
      setOperators([]);
      setStationInfo(null);
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    if (machineId) {
      fetchDetail();
    } else {
      setMachine(null);
      setOperators([]);
      setStationInfo(null);
    }
  }, [machineId, fetchDetail]);

  const handleRemoveOperator = useCallback(async (assignmentId: string) => {
    try {
      await removeMachineAssignmentAction(assignmentId);
      if (machineId) {
        const ops = await getMachineOperatorsAction(machineId);
        setOperators(ops as any[] ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [machineId]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: {
      label: t("machines.statusActive"),
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    maintenance: {
      label: t("machines.statusMaintenance"),
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    idle: {
      label: t("machines.statusIdle"),
      className: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    decommissioned: {
      label: t("machines.statusDecommissioned"),
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    },
  };

  const typeLabels: Record<string, string> = {
    cutting: t("machines.typeCutting"),
    grinding: t("machines.typeGrinding"),
    tempering: t("machines.typeTempering"),
    insulating_glass: t("machines.typeInsulatingGlass"),
    cnc: t("machines.typeCnc"),
    drilling: t("machines.typeDrilling"),
    lamination: t("machines.typeLamination"),
    washing: t("machines.typeWashing"),
    painting: t("machines.typePainting"),
    sandblasting: t("machines.typeSandblasting"),
    quality: t("machines.typeQuality"),
    dispatch: t("machines.typeDispatch"),
  };

  return (
    <Sheet open={!!machineId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle>{t("machines.details")}</SheetTitle>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SheetDescription>
            {machine ? `${machine.machineCode} - ${machine.name}` : ""}
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

        {!loading && !machine && machineId && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Activity className="h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-muted">{t("queue.jobNotFound")}</p>
          </div>
        )}

        {!loading && machine && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={statusConfig[machine.status]?.className ?? "bg-slate-500/10 text-slate-500"}
              >
                {statusConfig[machine.status]?.label ?? machine.status}
              </Badge>
              {!machine.isActive && (
                <Badge variant="outline" className="bg-danger/10 text-danger border-danger/20">
                  {t("machines.statusDecommissioned")}
                </Badge>
              )}
            </div>

            {/* General Info */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                {t("machines.generalInfo")}
              </h3>
              <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                <DetailRow label={t("machines.machineCode")} value={machine.machineCode} />
                <DetailRow label={t("machines.machineName")} value={machine.name} />
                <DetailRow label={t("machines.machineType")} value={typeLabels[machine.machineType] ?? machine.machineType} />
                <DetailRow label={t("machines.brand")} value={machine.brand} />
                <DetailRow label={t("machines.model")} value={machine.model} />
                <DetailRow label={t("machines.serialNumber")} value={machine.serialNumber} />
                <DetailRow label={t("machines.manufactureYear")} value={machine.manufactureYear?.toString()} />
                <DetailRow label={t("machines.status")} value={statusConfig[machine.status]?.label ?? machine.status} />
                <DetailRow label={t("machines.station")} value={stationInfo ? `${stationInfo.stationCode} - ${stationInfo.stationName}` : "—"} />
              </div>
            </div>

            {/* Dates */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                {t("machines.purchasedAt")}
              </h3>
              <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                <DetailRow label={t("machines.purchasedAt")} value={machine.purchasedAt} />
                <DetailRow label={t("machines.commissionedAt")} value={machine.commissionedAt} />
                <DetailRow label={t("machines.warrantyStarts")} value={machine.warrantyStartsAt} />
                <DetailRow label={t("machines.warrantyEnds")} value={machine.warrantyEndsAt} />
              </div>
            </div>

            {/* Technical Specs */}
            {machine.hourlyCapacity || machine.dailyCapacity || machine.maxGlassWidthMm || machine.maxGlassHeightMm ? (
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  {t("machines.technicalSpecs")}
                </h3>
                <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                  <DetailRow label={t("machines.hourlyCapacity")} value={machine.hourlyCapacity ? `${machine.hourlyCapacity} pcs/h` : null} />
                  <DetailRow label={t("machines.dailyCapacity")} value={machine.dailyCapacity ? `${machine.dailyCapacity} pcs/d` : null} />
                  <DetailRow label={t("machines.maxGlassWidth")} value={machine.maxGlassWidthMm ? `${machine.maxGlassWidthMm} mm` : null} />
                  <DetailRow label={t("machines.maxGlassHeight")} value={machine.maxGlassHeightMm ? `${machine.maxGlassHeightMm} mm` : null} />
                  <DetailRow label={t("machines.maxThickness")} value={machine.maxThicknessMm ? `${machine.maxThicknessMm} mm` : null} />
                  <DetailRow label={t("machines.minThickness")} value={machine.minThicknessMm ? `${machine.minThicknessMm} mm` : null} />
                </div>
              </div>
            ) : null}

            {/* Notes */}
            {machine.notes && (
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  {t("machines.notes")}
                </h3>
                <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{machine.notes}</p>
                </div>
              </div>
            )}

            {/* Assigned Operators */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                {t("machines.assignedOperators")}
              </h3>
              <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                {operators.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-2">{t("machines.noAssignedOperators")}</p>
                )}
                {operators.map((op) => (
                  <div key={op.assignment.id} className="flex items-center justify-between py-2 border-b border-glass-border last:border-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-text-muted" />
                      <div className="flex flex-col">
                        <span className="text-sm text-text-primary">{op.personnel.firstName} {op.personnel.lastName}</span>
                        <span className="text-xs text-text-muted">{op.personnel.personnelCode}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveOperator(op.assignment.id)}
                      className="text-xs text-danger hover:text-danger/80 transition-colors"
                    >
                      {t("machines.removeOperator")}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Audit
              </h3>
              <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
                <DetailRow label={t("machines.createdAt")} value={machine.createdAt ? new Date(machine.createdAt).toLocaleString() : null} />
                <DetailRow label={t("machines.updatedAt")} value={machine.updatedAt ? new Date(machine.updatedAt).toLocaleString() : null} />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
