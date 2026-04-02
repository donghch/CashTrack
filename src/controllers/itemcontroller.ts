import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { and, asc, eq, sql } from "drizzle-orm";
import { itemCategories, items, transactions } from "../model/db/schema.js";
import type { ItemListQuery } from "../model/types/request.js";
import { validateCreateItemInput, validateItemListQuery, validateUpdateItemInput } from "./item-validation.js";

const db = drizzle(process.env.DB_FILE_NAME!);

export type ItemWithCategory = {
	item: typeof items.$inferSelect;
	category?: typeof itemCategories.$inferSelect | null;
};

const ensureRelatedRecordExists = async (table: "transaction" | "category", id: number) => {
	if (table === "transaction") {
		const result = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, id)).limit(1);
		return result.length > 0;
	}

	const result = await db.select({ id: itemCategories.id }).from(itemCategories).where(eq(itemCategories.id, id)).limit(1);
	return result.length > 0;
};

const getItem = async (id: number): Promise<ItemWithCategory | null> => {
	const result = await db
		.select({ item: items, category: itemCategories })
		.from(items)
		.leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
		.where(eq(items.id, id))
		.limit(1);

	if (result.length === 0) {
		return null;
	}

	const row = result[0]!;
	return {
		item: row.item,
		category: row.category ?? null,
	};
};

const listItems = async (query: ItemListQuery): Promise<{ items: ItemWithCategory[]; total: number }> => {
	const validatedQuery = validateItemListQuery(query);
	const conditions = [];

	if (validatedQuery.transactionId !== undefined) {
		conditions.push(eq(items.transactionId, validatedQuery.transactionId));
	}

	if (validatedQuery.categoryId !== undefined) {
		conditions.push(eq(items.categoryId, validatedQuery.categoryId));
	}

	const countResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(items)
		.where(conditions.length ? and(...conditions) : undefined);

	const total = countResult[0]?.count ?? 0;

	const rows = await db
		.select({ item: items, category: itemCategories })
		.from(items)
		.leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(asc(items.id))
		.limit(validatedQuery.limit)
		.offset(validatedQuery.offset);

	return {
		items: rows.map((row) => ({
			item: row.item,
			category: row.category ?? null,
		})),
		total,
	};
};

const createItem = async (itemData: unknown) => {
	const validatedData = validateCreateItemInput(itemData);

	const transactionExists = await ensureRelatedRecordExists("transaction", validatedData.transactionId);
	if (!transactionExists) {
		throw new Error("Transaction not found");
	}

	if (validatedData.categoryId !== null && validatedData.categoryId !== undefined) {
		const categoryExists = await ensureRelatedRecordExists("category", validatedData.categoryId);
		if (!categoryExists) {
			throw new Error("Category not found");
		}
	}

	return db.insert(items).values(validatedData);
};

const updateItem = async (id: number, itemData: unknown) => {
	const validatedData = validateUpdateItemInput(itemData);

	if (validatedData.transactionId !== undefined) {
		const transactionExists = await ensureRelatedRecordExists("transaction", validatedData.transactionId);
		if (!transactionExists) {
			throw new Error("Transaction not found");
		}
	}

	if (validatedData.categoryId !== undefined && validatedData.categoryId !== null) {
		const categoryExists = await ensureRelatedRecordExists("category", validatedData.categoryId);
		if (!categoryExists) {
			throw new Error("Category not found");
		}
	}

	return db.update(items).set(validatedData).where(eq(items.id, id));
};

const deleteItem = async (id: number) => {
	return db.delete(items).where(eq(items.id, id));
};

export { getItem, listItems, createItem, updateItem, deleteItem };
