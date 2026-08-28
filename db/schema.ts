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
  imageUrl: text("image_url").notNull().default(""),
  linkUrl: text("link_url").notNull().default(""),
  author: text("author").notNull().default(""),
  groupId: integer("group_id"),
  imagePosition: text("image_position").notNull().default("center"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull(),
}, (table) => [
  index("content_items_kind_order_idx").on(table.kind, table.sortOrder),
  index("content_items_group_idx").on(table.groupId, table.sortOrder),
]);

export const contentGroups = sqliteTable("content_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  coverImageUrl: text("cover_image_url").notNull().default(""),
  coverImagePosition: text("cover_image_position").notNull().default("center"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull(),
}, (table) => [
  uniqueIndex("content_groups_name_idx").on(table.name),
  index("content_groups_order_idx").on(table.sortOrder),
]);

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

export const contactConversations = sqliteTable("contact_conversations", {
  id: text("id").primaryKey(),
  accessHash: text("access_hash").notNull(),
  encryptedIdentity: text("encrypted_identity").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("new"),
  sourceIpHash: text("source_ip_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastVisitorAt: text("last_visitor_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastAdminAt: text("last_admin_at"),
  assignedTo: text("assigned_to"),
}, (table) => [
  index("contact_conversations_status_date_idx").on(table.status, table.updatedAt),
]);

export const contactMessages = sqliteTable("contact_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: text("conversation_id").notNull(),
  sender: text("sender").notNull(),
  encryptedBody: text("encrypted_body").notNull(),
  authorName: text("author_name").notNull().default(""),
  readByAdmin: integer("read_by_admin", { mode: "boolean" }).notNull().default(false),
  readByVisitor: integer("read_by_visitor", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("contact_messages_conversation_date_idx").on(table.conversationId, table.createdAt),
]);

export const contactLimits = sqliteTable("contact_limits", {
  ipHash: text("ip_hash").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  messageCount: integer("message_count").notNull().default(0),
});

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

export const adminLoginLimits = sqliteTable("admin_login_limits", {
  ipHash: text("ip_hash").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull(),
});
