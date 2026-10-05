import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
  uniqueIndex,
  date,
  numeric,
  bigint,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "manager", "viewer"]);
export const clientStatus = pgEnum("client_status", ["active", "archived"]);
export const factCategory = pgEnum("fact_category", [
  "service",
  "price",
  "guarantee",
  "certification",
  "award",
  "location",
  "claim",
  "other",
]);
export const googleProvider = pgEnum("google_provider", [
  "google_ads",
  "search_console",
  "analytics",
  "business_profile",
]);
export const adsReportType = pgEnum("ads_report_type", ["campaigns", "keywords", "search_terms"]);
export const recommendationStatus = pgEnum("recommendation_status", ["approved", "dismissed", "done"]);
export const leadChannel = pgEnum("lead_channel", ["call", "whatsapp", "form", "email", "walk_in", "other"]);
export const leadSource = pgEnum("lead_source", [
  "google_ads",
  "google_search",
  "google_maps",
  "referral",
  "social",
  "direct",
  "other",
  "unknown",
]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "quoted", "won", "lost"]);
export const connectionStatus = pgEnum("connection_status", [
  "not_connected",
  "connected",
  "error",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("ZAR"),
  timezone: text("timezone").notNull().default("Africa/Johannesburg"),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("manager"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the random token stored in the cookie; the raw token never touches the DB.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    industry: text("industry"),
    website: text("website"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    region: text("region"),
    country: text("country").notNull().default("South Africa"),
    notes: text("notes"),
    status: clientStatus("status").notNull().default("active"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("clients_agency_idx").on(t.agencyId, t.status)],
);

const clientRef = () =>
  uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" });

export const clientServices = pgTable(
  "client_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("client_services_client_idx").on(t.clientId)],
);

export const clientLocations = pgTable(
  "client_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    name: text("name").notNull(),
    radiusKm: integer("radius_km"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("client_locations_client_idx").on(t.clientId)],
);

export const clientCompetitors = pgTable(
  "client_competitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    name: text("name").notNull(),
    website: text("website"),
    notes: text("notes"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("client_competitors_client_idx").on(t.clientId)],
);

/**
 * Facts the AI assistants are allowed to use in ads and content.
 * Only rows with verified = true are ever passed to a model.
 */
export const clientFacts = pgTable(
  "client_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    category: factCategory("category").notNull(),
    statement: text("statement").notNull(),
    source: text("source"),
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedById: uuid("verified_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("client_facts_client_idx").on(t.clientId)],
);

export const googleConnections = pgTable(
  "google_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    provider: googleProvider("provider").notNull(),
    status: connectionStatus("status").notNull().default("not_connected"),
    externalAccountId: text("external_account_id"),
    externalAccountName: text("external_account_name"),
    lastError: text("last_error"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("google_connections_client_provider_idx").on(t.clientId, t.provider)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    details: jsonb("details"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("audit_log_agency_idx").on(t.agencyId, t.createdAt)],
);

/** One uploaded Google Ads report file. */
export const adsImports = pgTable(
  "ads_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    reportType: adsReportType("report_type").notNull().default("campaigns"),
    filename: text("filename").notNull(),
    rowCount: integer("row_count").notNull(),
    /** The span the file covers (from its date-range line, or its first/last day). */
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    daily: boolean("daily").notNull(),
    currency: text("currency"),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("ads_imports_client_idx").on(t.clientId, t.createdAt)],
);

/**
 * Campaign metrics exactly as exported by Google Ads. A row covers one day
 * (daily reports) or one whole period (non-segmented reports). Ratios such as
 * CTR and CPC are not stored; they are recomputed from the sums.
 */
export const adsCampaignMetrics = pgTable(
  "ads_campaign_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    importId: uuid("import_id")
      .notNull()
      .references(() => adsImports.id, { onDelete: "cascade" }),
    campaignName: text("campaign_name").notNull(),
    campaignStatus: text("campaign_status"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    currency: text("currency"),
    budget: numeric("budget", { precision: 14, scale: 2, mode: "number" }),
    cost: numeric("cost", { precision: 14, scale: 2, mode: "number" }).notNull(),
    impressions: bigint("impressions", { mode: "number" }).notNull(),
    clicks: bigint("clicks", { mode: "number" }).notNull(),
    conversions: numeric("conversions", { precision: 14, scale: 2, mode: "number" }),
    conversionValue: numeric("conversion_value", { precision: 14, scale: 2, mode: "number" }),
    /** 0–1. Null when Google reported a bound like "< 10%" rather than a value. */
    searchImpressionShare: numeric("search_impression_share", { precision: 6, scale: 4, mode: "number" }),
  },
  (t) => [
    uniqueIndex("ads_metrics_unique_idx").on(t.clientId, t.campaignName, t.periodStart, t.periodEnd),
    index("ads_metrics_range_idx").on(t.clientId, t.periodStart, t.periodEnd),
  ],
);

/**
 * Which dates each import still provides data for. A later import of the same
 * days replaces earlier data and trims the earlier import's coverage, so
 * coverage always matches the rows actually stored.
 */
export const adsCoverage = pgTable(
  "ads_coverage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    importId: uuid("import_id")
      .notNull()
      .references(() => adsImports.id, { onDelete: "cascade" }),
    reportType: adsReportType("report_type").notNull().default("campaigns"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    daily: boolean("daily").notNull(),
  },
  (t) => [index("ads_coverage_client_idx").on(t.clientId, t.reportType, t.periodStart)],
);

const metricColumns = () => ({
  cost: numeric("cost", { precision: 14, scale: 2, mode: "number" }).notNull(),
  impressions: bigint("impressions", { mode: "number" }).notNull(),
  clicks: bigint("clicks", { mode: "number" }).notNull(),
  conversions: numeric("conversions", { precision: 14, scale: 2, mode: "number" }),
  conversionValue: numeric("conversion_value", { precision: 14, scale: 2, mode: "number" }),
});

/** Rows from a Google Ads "Keywords" report. */
export const adsKeywordMetrics = pgTable(
  "ads_keyword_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    importId: uuid("import_id")
      .notNull()
      .references(() => adsImports.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    matchType: text("match_type").notNull(), // broad | phrase | exact
    status: text("status"),
    campaignName: text("campaign_name").notNull(),
    adGroupName: text("ad_group_name").notNull(),
    maxCpc: numeric("max_cpc", { precision: 14, scale: 2, mode: "number" }),
    qualityScore: integer("quality_score"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    ...metricColumns(),
  },
  (t) => [
    uniqueIndex("ads_keyword_unique_idx").on(t.clientId, t.campaignName, t.adGroupName, t.keyword, t.matchType, t.periodStart, t.periodEnd),
  ],
);

/** Rows from a Google Ads "Search terms" report: what people actually typed. */
export const adsSearchTermMetrics = pgTable(
  "ads_search_term_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    importId: uuid("import_id")
      .notNull()
      .references(() => adsImports.id, { onDelete: "cascade" }),
    searchTerm: text("search_term").notNull(),
    matchType: text("match_type"),
    addedExcluded: text("added_excluded"),
    keyword: text("keyword"),
    campaignName: text("campaign_name").notNull(),
    adGroupName: text("ad_group_name").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    ...metricColumns(),
  },
  (t) => [
    uniqueIndex("ads_search_term_unique_idx").on(t.clientId, t.campaignName, t.adGroupName, t.searchTerm, t.periodStart, t.periodEnd),
  ],
);

/**
 * Decisions on recommendations. Recommendations themselves are recomputed
 * from the data every time; only what a person decided is stored, keyed by a
 * stable fingerprint (rule + target), with a snapshot of what they saw.
 */
export const adsRecommendationDecisions = pgTable(
  "ads_recommendation_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    fingerprint: text("fingerprint").notNull(),
    status: recommendationStatus("status").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    decidedById: uuid("decided_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("ads_rec_decision_idx").on(t.clientId, t.fingerprint)],
);

/** An enquiry from a potential customer. Personal information — agency staff only. */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    channel: leadChannel("channel").notNull(),
    source: leadSource("source").notNull().default("unknown"),
    service: text("service"),
    location: text("location"),
    notes: text("notes"),
    status: leadStatus("status").notNull().default("new"),
    /** Job value in the client's currency, recorded when won. */
    value: numeric("value", { precision: 14, scale: 2, mode: "number" }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("leads_client_received_idx").on(t.clientId, t.receivedAt)],
);

export type AdDraftItem = {
  id: string;
  kind: "headline" | "description" | "callout";
  text: string;
  /** What the AI first wrote, kept for reference after edits. */
  original: string;
  /** Labels of the verified facts the AI said it used (F1, F2, …). */
  factIds: string[];
  status: "pending" | "approved" | "rejected";
  flags: string[];
};

/** One AI ad-copy generation for a client, reviewed line by line. Never published automatically. */
export const adDrafts = pgTable(
  "ad_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: clientRef(),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    focus: text("focus").notNull(),
    instructions: text("instructions"),
    model: text("model").notNull(),
    /** The verified facts given to the AI, labelled as it saw them. */
    facts: jsonb("facts").$type<{ id: string; text: string }[]>().notNull(),
    items: jsonb("items").$type<AdDraftItem[]>().notNull(),
    writerNotes: text("writer_notes"),
    ...timestamps,
  },
  (t) => [index("ad_drafts_client_idx").on(t.clientId, t.createdAt)],
);

export type AdDraft = typeof adDrafts.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type ClientFact = typeof clientFacts.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type GoogleProvider = (typeof googleProvider.enumValues)[number];
export type FactCategory = (typeof factCategory.enumValues)[number];
