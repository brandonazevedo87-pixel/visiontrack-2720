import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export * from './auth-schema';
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(), status: text('status').notNull().default('pending'),
  expiresAt: integer('expires_at'), paymentReported: integer('payment_reported', { mode: 'boolean' }).default(false),
});
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(), pixKey: text('pix_key').notNull().default(''),
  pixName: text('pix_name').notNull().default(''), price: integer('price').notNull().default(150),
  days: integer('days').notNull().default(30),
});
export const recordings = sqliteTable('recordings', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  customer: text('customer').notNull(), device: text('device').notNull(), service: text('service').notNull(),
  token: text('token').notNull().unique(), key: text('key').notNull(),
  status: text('status').notNull().default('uploading'), duration: integer('duration').notNull().default(0),
  createdAt: integer('created_at').notNull(), size: integer('size').notNull().default(0),
  views: integer('views').notNull().default(0),
});
