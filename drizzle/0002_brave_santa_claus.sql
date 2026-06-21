CREATE TYPE "public"."request_type" AS ENUM('stock_reservation', 'special_request');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('not_synced', 'synced', 'sync_failed');--> statement-breakpoint
CREATE TABLE "request_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text,
	"file_size" integer,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "warehouse_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "request_type" "request_type" DEFAULT 'stock_reservation' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "free_text" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "sync_status" "sync_status" DEFAULT 'not_synced' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "external_system" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "external_ref" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;