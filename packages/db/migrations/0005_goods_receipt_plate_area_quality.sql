-- Goods Receipt: Add plate count, total area, damaged/missing tracking
-- GlassOS Sprint 2.10.x

ALTER TABLE "goods_receipt_items"
  ADD COLUMN "plate_count" numeric(10, 0),
  ADD COLUMN "total_area_m2" numeric(14, 4),
  ADD COLUMN "damaged_count" numeric(6, 0),
  ADD COLUMN "missing_count" numeric(6, 0);
