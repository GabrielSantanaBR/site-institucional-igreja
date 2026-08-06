import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("admin_users_email_idx").on(table.email)]);

export const contentItems = sqliteTable("content_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  body: text("body").notNull().default(""),
  date: text("date").notNull().default(""),
  time: text("time").notNull().default(""),
  location: text("location").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull(),
}, (table) => [index("content_items_kind_order_idx").on(table.kind, table.sortOrder)]);

export const prayerRequests = sqliteTable("prayer_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  encryptedPayload: text("encrypted_payload").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("new"),
  sourceIpHash: text("source_ip_hash").notNull(),
  submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by"),
}, (table) => [
  index("prayer_requests_status_date_idx").on(table.status, table.submittedAt),
]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("audit_logs_created_at_idx").on(table.createdAt)]);

export const submissionLimits = sqliteTable("submission_limits", {
  ipHash: text("ip_hash").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  submissionCount: integer("submission_count").notNull().default(0),
});
