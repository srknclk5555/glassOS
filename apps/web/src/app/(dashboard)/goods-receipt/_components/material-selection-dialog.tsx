"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Badge,
} from "@repo/ui";
import { useI18n } from "@repo/ui";
import { getMaterialsAction } from "@/app/actions/materials";
import { Search, Loader2, Package } from "lucide-react";

interface MaterialSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (materialId: string, materialCode: string, materialName: string) => void;
}

export function MaterialSelectionDialog({
  open,
  onOpenChange,
  onSelect,
}: MaterialSelectionDialogProps) {
  const { t } = useI18n();
  const [search, setSearch] = React.useState("");
  const [materials, setMaterials] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const fetchMaterials = React.useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const result = await getMaterialsAction({
        search: q,
        pageSize: 50,
      });
      setMaterials(result.items);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedId(null);
      fetchMaterials();
      // Focus search input after dialog opens
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, fetchMaterials]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMaterials(search);
  };

  const handleSelect = () => {
    if (selectedId) {
      const mat = materials.find((m) => m.id === selectedId);
      onSelect(selectedId, mat?.materialCode ?? "", mat?.name ?? "");
      onOpenChange(false);
    }
  };

  const handleDoubleClick = (id: string) => {
    const mat = materials.find((m) => m.id === id);
    onSelect(id, mat?.materialCode ?? "", mat?.name ?? "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t("materials.selectMaterial")}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("materials.searchPlaceholder")}
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            {t("common.search")}
          </Button>
        </form>

        {/* Material List */}
        <div className="border border-glass-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 bg-glass-bg-alt px-3 py-2 text-xs font-medium text-text-muted">
            <span className="col-span-2">{t("materials.materialCode")}</span>
            <span className="col-span-3">{t("materials.materialName")}</span>
            <span className="col-span-2">{t("materials.thickness")}</span>
            <span className="col-span-2">{t("materials.color")}</span>
            <span className="col-span-1">{t("materials.baseUnit")}</span>
            <span className="col-span-2">{t("materials.status")}</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : materials.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">
              {search ? t("common.noResults") : t("materials.noMaterials")}
            </div>
          ) : (
            <div className="divide-y divide-glass-border">
              {materials.map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => setSelectedId(mat.id)}
                  onDoubleClick={() => handleDoubleClick(mat.id)}
                  className={[
                    "w-full grid grid-cols-12 gap-2 px-3 py-2 text-left text-sm transition-colors",
                    selectedId === mat.id
                      ? "bg-glass-bg-alt ring-1 ring-inset ring-glass-border-hover"
                      : "hover:bg-glass-bg-alt/50",
                  ].join(" ")}
                >
                  <span className="col-span-2 font-mono text-xs truncate">
                    {mat.materialCode}
                  </span>
                  <span className="col-span-3 truncate font-medium">
                    {mat.name}
                  </span>
                  <span className="col-span-2 text-text-muted">
                    {mat.thicknessMm ? `${mat.thicknessMm}mm` : "—"}
                  </span>
                  <span className="col-span-2 text-text-muted truncate">
                    {mat.color ?? "—"}
                  </span>
                  <span className="col-span-1 text-text-muted">
                    {mat.baseUnit ?? "—"}
                  </span>
                  <span className="col-span-2">
                    <Badge
                      variant={
                        mat.status === "active"
                          ? "success"
                          : mat.status === "passive"
                          ? "secondary"
                          : "danger"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {mat.status}
                    </Badge>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSelect} disabled={!selectedId}>
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
