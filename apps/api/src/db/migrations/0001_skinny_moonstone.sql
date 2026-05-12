CREATE TYPE "public"."user_theme" AS ENUM('cyberpunk');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme_preference" "user_theme" DEFAULT 'cyberpunk' NOT NULL;