ALTER TABLE "production_events" ADD COLUMN "result_data" jsonb;--> statement-breakpoint
ALTER TABLE "production_events" ADD COLUMN "quality_status" varchar(30);