import { pgTable, uuid, text, boolean, date, timestamp, jsonb, pgEnum, integer, doublePrecision, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';

export const idpConvention = pgEnum('idp_convention', ['1949', '1968']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const permanentProfile = pgTable('permanent_profile', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  citizenships: jsonb('citizenships').$type<{ country: string; passportExpiry: string | null }[]>().notNull().default([]),
  residenceCountry: text('residence_country'),
  residenceVisaStatus: text('residence_visa_status'),
  idpConvention: idpConvention('idp_convention'),
  idpExpiry: date('idp_expiry'),
  controlledMeds: text('controlled_meds').array().notNull().default([]),
  hasMinors: boolean('has_minors').notNull().default(false),
  extras: jsonb('extras').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tripStatus = pgEnum('trip_status', ['planning', 'booked', 'active', 'past']);
export const tripPurpose = pgEnum('trip_purpose', ['tourism', 'business', 'family', 'study']);

export const trip = pgTable('trip', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: tripStatus('status').notNull().default('planning'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leg = pgTable('leg', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trip.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  fromCountry: text('from_country').notNull(),
  toCountry: text('to_country').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
}, (t) => ({
  tripSeqUnique: uniqueIndex('leg_trip_seq_unique').on(t.tripId, t.seq),
}));

export const tripContext = pgTable('trip_context', {
  tripId: uuid('trip_id').primaryKey().references(() => trip.id, { onDelete: 'cascade' }),
  travelingWithMinors: boolean('traveling_with_minors').notNull().default(false),
  drivingAtDestination: boolean('driving_at_destination').notNull().default(false),
  carryingControlledMeds: boolean('carrying_controlled_meds').notNull().default(false),
  purpose: tripPurpose('purpose'),
  extras: jsonb('extras').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const conditionSource = pgEnum('condition_source', ['seed', 'ai']);
export const conditionConfidence = pgEnum('condition_confidence', ['high', 'medium', 'low']);

export const conditionRow = pgTable('condition_row', {
  rowType: text('row_type').notNull(),
  rowKey: text('row_key').notNull(),
  data: jsonb('data').notNull(),
  source: conditionSource('source').notNull(),
  confidence: conditionConfidence('confidence'),
  citations: jsonb('citations'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (t) => ({
  pk: primaryKey({ columns: [t.rowType, t.rowKey] }),
}));

export const pointCurrency = pgTable('point_currency', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  defaultCpp: doublePrecision('default_cpp').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userCodeUnique: uniqueIndex('point_currency_user_code_unique').on(t.userId, t.code),
}));

export const journey = pgTable('journey', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fromLabel: text('from_label').notNull(),
  toLabel: text('to_label').notNull(),
  departDate: date('depart_date'),
  returnDate: date('return_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const option = pgTable('option', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').notNull().references(() => journey.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  portal: text('portal').notNull(),
  carrier: text('carrier'),
  stops: integer('stops'),
  durationMins: integer('duration_mins'),
  cabin: text('cabin'),
  viaText: text('via_text'),
  cashUsd: doublePrecision('cash_usd').notNull().default(0),
  pointsCurrencyId: uuid('points_currency_id').references(() => pointCurrency.id, { onDelete: 'set null' }),
  pointsAmount: integer('points_amount'),
  cppOverride: doublePrecision('cpp_override'),
  adjustments: jsonb('adjustments').$type<{ label: string; deltaUsd: number }[]>().notNull().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
