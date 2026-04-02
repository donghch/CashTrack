import { z } from "zod";
import type { items } from "../model/db/schema.js";

type NewItem = typeof items.$inferInsert;

export class CreateItemValidationError extends Error {
	readonly issues: z.ZodIssue[];

	constructor(message: string, issues: z.ZodIssue[]) {
		super(message);
		this.name = "CreateItemValidationError";
		this.issues = issues;
	}
}

export class UpdateItemValidationError extends Error {
	readonly issues: z.ZodIssue[];

	constructor(message: string, issues: z.ZodIssue[]) {
		super(message);
		this.name = "UpdateItemValidationError";
		this.issues = issues;
	}
}

export class ListItemsValidationError extends Error {
	readonly issues: z.ZodIssue[];

	constructor(message: string, issues: z.ZodIssue[]) {
		super(message);
		this.name = "ListItemsValidationError";
		this.issues = issues;
	}
}

const itemBaseSchema = z
	.object({
		transactionId: z
			.number()
			.int("transactionId must be an integer")
			.positive("transactionId must be greater than 0"),
		name: z
			.string()
			.trim()
			.min(1, "name is required")
			.max(255, "name must be at most 255 characters"),
		quantity: z
			.number()
			.finite("quantity must be a finite number")
			.positive("quantity must be greater than 0")
			.optional(),
		unit: z.string().trim().min(1, "unit must not be empty").max(100, "unit must be at most 100 characters").optional(),
		unitPriceMinor: z
			.number()
			.int("unitPriceMinor must be an integer")
			.nonnegative("unitPriceMinor must be zero or greater")
			.optional(),
		lineTotalMinor: z
			.number()
			.int("lineTotalMinor must be an integer")
			.nonnegative("lineTotalMinor must be zero or greater")
			.optional(),
		categoryId: z
			.number()
			.int("categoryId must be an integer")
			.positive("categoryId must be greater than 0")
			.optional()
			.nullable(),
	})
	.strict();

const createItemInputSchema = itemBaseSchema;

const updateItemInputSchema = itemBaseSchema
	.partial()
	.strict()
	.refine((value) => Object.keys(value).length > 0, "At least one item field must be provided");

export const itemListQuerySchema = z.object({
	transactionId: z.number().int().positive().optional(),
	categoryId: z.number().int().positive().optional(),
	limit: z.number().int().min(1).max(100).default(20),
	offset: z.number().int().nonnegative().default(0),
});

export const validateCreateItemInput = (itemData: unknown): NewItem => {
	const parsed = createItemInputSchema.safeParse(itemData);
	if (!parsed.success) {
		throw new CreateItemValidationError("Invalid item input", parsed.error.issues);
	}

	return parsed.data;
};

export const validateUpdateItemInput = (itemData: unknown) => {
	const parsed = updateItemInputSchema.safeParse(itemData);
	if (!parsed.success) {
		throw new UpdateItemValidationError("Invalid item update input", parsed.error.issues);
	}

	return parsed.data;
};

export const validateItemListQuery = (query: unknown) => {
	const parsed = itemListQuerySchema.safeParse(query);
	if (!parsed.success) {
		throw new ListItemsValidationError("Invalid item query input", parsed.error.issues);
	}

	return parsed.data;
};
