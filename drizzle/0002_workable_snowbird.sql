CREATE TABLE "journey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_label" text NOT NULL,
	"to_label" text NOT NULL,
	"depart_date" date,
	"return_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"label" text NOT NULL,
	"portal" text NOT NULL,
	"carrier" text,
	"stops" integer,
	"duration_mins" integer,
	"cabin" text,
	"via_text" text,
	"cash_usd" double precision DEFAULT 0 NOT NULL,
	"points_currency_id" uuid,
	"points_amount" integer,
	"cpp_override" double precision,
	"adjustments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_currency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"default_cpp" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journey" ADD CONSTRAINT "journey_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_journey_id_journey_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journey"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_points_currency_id_point_currency_id_fk" FOREIGN KEY ("points_currency_id") REFERENCES "public"."point_currency"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_currency" ADD CONSTRAINT "point_currency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "point_currency_user_code_unique" ON "point_currency" USING btree ("user_id","code");