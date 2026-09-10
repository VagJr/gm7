import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('rooms',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),state:text('state').notNull(),version:integer('version').notNull().default(0),code:text('code').notNull().unique()});
export const members=sqliteTable('members',{room:text('room').notNull(),user:text('user').notNull()},t=>[primaryKey({columns:[t.room,t.user]})]);
