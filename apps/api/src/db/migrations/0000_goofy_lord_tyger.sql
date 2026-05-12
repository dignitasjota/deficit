CREATE TYPE "public"."admin_action" AS ENUM('suspend_user', 'restore_user', 'impersonate_user', 'promote_user', 'demote_user');--> statement-breakpoint
CREATE TYPE "public"."atributo_codigo" AS ENUM('FUE', 'VIT', 'DES', 'INT', 'CRE', 'ESP', 'CAR', 'HID', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms', 'privacy', 'cookies');--> statement-breakpoint
CREATE TYPE "public"."email_token_type" AS ENUM('verify', 'reset');--> statement-breakpoint
CREATE TYPE "public"."exercise_tipo" AS ENUM('ejercicio', 'caminata');--> statement-breakpoint
CREATE TYPE "public"."user_plan" AS ENUM('free', 'premium');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subscription_period" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');--> statement-breakpoint
CREATE TYPE "public"."factor_actividad" AS ENUM('sedentario', 'ligero', 'moderado', 'activo', 'muy_activo');--> statement-breakpoint
CREATE TYPE "public"."sexo" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TYPE "public"."xp_tipo" AS ENUM('P', 'C', 'L', 'H', 'A', 'M');--> statement-breakpoint
CREATE TYPE "public"."estado_semana" AS ENUM('EN_CURSO', 'COMPENSADA', 'MAS_XP', 'DEFICIT');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"target_user_id" uuid,
	"action" "admin_action" NOT NULL,
	"payload" jsonb,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attribute_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"atributo" "atributo_codigo" NOT NULL,
	"delta" integer DEFAULT 1 NOT NULL,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "consent_type" NOT NULL,
	"version" integer NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "daily_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"pasos" integer,
	"pasos_cerrados" timestamp with time zone,
	"kcal_in" integer,
	"sodio_g" numeric(5, 2),
	"agua_l" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cafe_te_l" numeric(5, 2) DEFAULT '0' NOT NULL,
	"refresco_zero_l" numeric(5, 2) DEFAULT '0' NOT NULL,
	"azucarada_l" numeric(5, 2) DEFAULT '0' NOT NULL,
	"alcohol_l" numeric(5, 2) DEFAULT '0' NOT NULL,
	"productividad" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_weight" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"peso_kg" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "email_token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"tipo" "exercise_tipo" NOT NULL,
	"nombre" text NOT NULL,
	"minutos" integer,
	"kcal_quemadas" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_id" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"plan" "user_plan" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"trial_ends_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"purge_scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"period" "subscription_period" NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"peso_inicial_kg" numeric(5, 2) NOT NULL,
	"peso_objetivo_kg" numeric(5, 2) NOT NULL,
	"altura_cm" numeric(5, 1) NOT NULL,
	"edad" integer NOT NULL,
	"sexo" "sexo" NOT NULL,
	"factor_actividad" "factor_actividad" NOT NULL,
	"kg_por_nivel" numeric(8, 4) NOT NULL,
	"xp_por_nivel" numeric(10, 2) NOT NULL,
	"niveles_por_semana" numeric(8, 4) NOT NULL,
	"motivo_cambio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current_version_id" uuid NOT NULL,
	"fecha_inicio" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"tipo" "xp_tipo" NOT NULL,
	"descripcion" text NOT NULL,
	"xp" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"inicio" date NOT NULL,
	"fin" date NOT NULL,
	"xp_total" integer DEFAULT 0 NOT NULL,
	"estado" "estado_semana" DEFAULT 'EN_CURSO' NOT NULL,
	"colchon_recibido" integer DEFAULT 0 NOT NULL,
	"colchon_invertido" integer DEFAULT 0 NOT NULL,
	"cerrada_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nivel" integer NOT NULL,
	"nombre" text NOT NULL,
	"color" text,
	"alcanzado_at" timestamp with time zone,
	"archivado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nivel" integer NOT NULL,
	"xp_invertida" integer NOT NULL,
	"comprada_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_log" ADD CONSTRAINT "attribute_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_entry" ADD CONSTRAINT "daily_entry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_weight" ADD CONSTRAINT "daily_weight_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_version" ADD CONSTRAINT "profile_version_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_log" ADD CONSTRAINT "xp_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_log" ADD CONSTRAINT "xp_log_profile_version_id_profile_version_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."profile_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_purchases" ADD CONSTRAINT "level_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_admin_idx" ON "admin_audit_log" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_target_idx" ON "admin_audit_log" USING btree ("target_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "attribute_log_user_fecha_idx" ON "attribute_log" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE INDEX "attribute_log_user_atributo_idx" ON "attribute_log" USING btree ("user_id","atributo");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_events_stripe_event_unique" ON "billing_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "billing_events_type_idx" ON "billing_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "billing_events_processed_at_idx" ON "billing_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "consent_log_user_type_idx" ON "consent_log" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "consent_log_accepted_at_idx" ON "consent_log" USING btree ("accepted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_entry_user_fecha_unique" ON "daily_entry" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_weight_user_fecha_unique" ON "daily_weight" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "email_tokens_token_hash_unique" ON "email_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_tokens_user_type_idx" ON "email_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "email_tokens_expires_at_idx" ON "email_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "exercise_log_user_fecha_idx" ON "exercise_log" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "users_purge_scheduled_at_idx" ON "users" USING btree ("purge_scheduled_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_suspended_at_idx" ON "users" USING btree ("suspended_at");--> statement-breakpoint
CREATE INDEX "users_plan_idx" ON "users" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "users_stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "users_trial_ends_at_idx" ON "users" USING btree ("trial_ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_unique" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profile_version_user_id_idx" ON "profile_version" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profile_version_user_validity_idx" ON "profile_version" USING btree ("user_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "xp_log_user_fecha_idx" ON "xp_log" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE INDEX "xp_log_user_created_idx" ON "xp_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weeks_user_inicio_unique" ON "weeks" USING btree ("user_id","inicio");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_user_nivel_unique" ON "milestones" USING btree ("user_id","nivel");--> statement-breakpoint
CREATE INDEX "milestones_user_alcanzado_idx" ON "milestones" USING btree ("user_id","alcanzado_at");--> statement-breakpoint
CREATE UNIQUE INDEX "level_purchases_user_nivel_unique" ON "level_purchases" USING btree ("user_id","nivel");--> statement-breakpoint
CREATE INDEX "level_purchases_user_id_idx" ON "level_purchases" USING btree ("user_id");