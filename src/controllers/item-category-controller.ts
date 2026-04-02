import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { asc, eq, sql } from "drizzle-orm";
import { itemCategories, items } from "../model/db/schema.js";
import {
	validateCreateItemCategoryInput,
	validateItemCategoryListQuery,
	validateUpdateItemCategoryInput,
} from "./item-category-validation.js";

const db = drizzle(process.env.DB_FILE_NAME!);

export type ItemCategoryWithItemCount = {
	itemCategory: typeof itemCategories.$inferSelect;
	itemCount: number;
};

const getItemCategory = async (id: number) => {
	const result = await db.select().from(itemCategories).where(eq(itemCategories.id, id)).limit(1);
	return result.length > 0 ? result[0]! : null;
};

const listItemCategories = async (query: unknown): Promise<{ itemCategories: ItemCategoryWithItemCount[]; total: number }> => {
	const validatedQuery = validateItemCategoryListQuery(query);

	const countResult = await db.select({ count: sql<number>`count(*)` }).from(itemCategories);
	const total = countResult[0]?.count ?? 0;

	const rows = await db
		.select({ itemCategory: itemCategories, itemCount: sql<number>`(select count(*) from ${items} where ${items.categoryId} = ${itemCategories.id})` })
		.from(itemCategories)
		.orderBy(asc(itemCategories.id))
		.limit(validatedQuery.limit)
		.offset(validatedQuery.offset);

	return {
		itemCategories: rows.map((row) => ({
			itemCategory: row.itemCategory,
			itemCount: row.itemCount,
		})),
		total,
	};
};

const createItemCategory = async (itemCategoryData: unknown) => {
	const validatedData = validateCreateItemCategoryInput(itemCategoryData);
	return db.insert(itemCategories).values(validatedData);
};

const updateItemCategory = async (id: number, itemCategoryData: unknown) => {
	const validatedData = validateUpdateItemCategoryInput(itemCategoryData);
	return db.update(itemCategories).set(validatedData).where(eq(itemCategories.id, id));
};

const deleteItemCategory = async (id: number) => {
	const references = await db.select({ id: items.id }).from(items).where(eq(items.categoryId, id)).limit(1);
	if (references.length > 0) {
		throw new Error("Category is in use");
	}

	return db.delete(itemCategories).where(eq(itemCategories.id, id));
};

export { getItemCategory, listItemCategories, createItemCategory, updateItemCategory, deleteItemCategory };
