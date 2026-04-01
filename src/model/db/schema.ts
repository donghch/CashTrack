import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable(
	"transactions",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		merchant: text("merchant").notNull(),
		currency: text("currency").notNull(),
		totalMajor: integer("total_major").notNull(),
		totalMinor: integer("total_minor").notNull(),
		transactionTime: text("transaction_time").notNull(),
	},
	(table) => [index("transactions_transaction_time_idx").on(table.transactionTime)],
);

export const itemCategories = sqliteTable("item_categories", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
});

export const items = sqliteTable(
	"items",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		transactionId: integer("transaction_id")
			.notNull()
			.references(() => transactions.id),
		name: text("name").notNull(),
		quantity: real("quantity"),
		unit: text("unit"),
		unitPriceMinor: integer("unit_price_minor"),
		lineTotalMinor: integer("line_total_minor"),
		categoryId: integer("category_id").references(() => itemCategories.id),
	},
	(table) => [
		index("items_transaction_id_idx").on(table.transactionId),
		index("items_category_id_idx").on(table.categoryId),
	],
);

export const transactionRelations = relations(transactions, ({ many }) => ({
	items: many(items),
}));

export const itemRelations = relations(items, ({ one }) => ({
	transaction: one(transactions, {
		fields: [items.transactionId],
		references: [transactions.id],
	}),
	category: one(itemCategories, {
		fields: [items.categoryId],
		references: [itemCategories.id],
	}),
}));

export const itemCategoryRelations = relations(itemCategories, ({ many }) => ({
	items: many(items),
}));