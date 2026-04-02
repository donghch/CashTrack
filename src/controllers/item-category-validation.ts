import { z } from "zod";
import type { itemCategories } from "../model/db/schema.js";

type NewItemCategory = typeof itemCategories.$inferInsert;

export class CreateItemCategoryValidationError extends Error {
	readonly issues: z.ZodIssue[];

	constructor(message: string, issues: z.ZodIssue[]) {
		super(message);
		this.name = "CreateItemCategoryValidationError";
		this.issues = issues;
	}
}

export class UpdateItemCategoryValidationError extends Error {
	readonly issues: z.ZodIssue[];

	constructor(message: string, issues: z.ZodIssue[]) {
		super(message);
		this.name = "UpdateItemCategoryValidationError";
		this.issues = issues;
	}
}

export class ListItemCategoriesValidationError extends Error {
	readonly issues: z.ZodIssue[];

	constructor(message: string, issues: z.ZodIssue[]) {
		super(message);
		this.name = "ListItemCategoriesValidationError";
		this.issues = issues;
	}
}

const createItemCategoryInputSchema = z
	.object({
		name: z.string().trim().min(1, "name is required").max(255, "name must be at most 255 characters"),
	})
	.strict();

const updateItemCategoryInputSchema = createItemCategoryInputSchema.partial().strict().refine(
	(value) => Object.keys(value).length > 0,
	"At least one category field must be provided",
);

export const itemCategoryListQuerySchema = z.object({
	limit: z.number().int().min(1).max(100).default(20),
	offset: z.number().int().nonnegative().default(0),
});

export const validateCreateItemCategoryInput = (itemCategoryData: unknown): NewItemCategory => {
	const parsed = createItemCategoryInputSchema.safeParse(itemCategoryData);
	if (!parsed.success) {
		throw new CreateItemCategoryValidationError("Invalid category input", parsed.error.issues);
	}

	return parsed.data;
};

export const validateUpdateItemCategoryInput = (itemCategoryData: unknown) => {
	const parsed = updateItemCategoryInputSchema.safeParse(itemCategoryData);
	if (!parsed.success) {
		throw new UpdateItemCategoryValidationError("Invalid category update input", parsed.error.issues);
	}

	return parsed.data;
};

export const validateItemCategoryListQuery = (query: unknown) => {
	const parsed = itemCategoryListQuerySchema.safeParse(query);
	if (!parsed.success) {
		throw new ListItemCategoriesValidationError("Invalid category query input", parsed.error.issues);
	}

	return parsed.data;
};
