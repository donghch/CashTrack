import { z } from "zod";
import { transactions } from "../model/db/schema.js";
import {
    TransactionFilterSchema,
    type TransactionFilter,
} from "../model/types/request.js";

type NewTransaction = typeof transactions.$inferInsert;

export class CreateTransactionValidationError extends Error {
    readonly issues: z.ZodIssue[];

    constructor(message: string, issues: z.ZodIssue[]) {
        super(message);
        this.name = "CreateTransactionValidationError";
        this.issues = issues;
    }
}

export class FilterTransactionsValidationError extends Error {
    readonly issues: z.ZodIssue[];

    constructor(message: string, issues: z.ZodIssue[]) {
        super(message);
        this.name = "FilterTransactionsValidationError";
        this.issues = issues;
    }
}

const iso8601OffsetRegex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2}:\d{2}$/;

const createTransactionInputSchema = z
    .object({
        merchant: z
            .string()
            .trim()
            .min(1, "merchant is required")
            .max(255, "merchant must be at most 255 characters"),
        currency: z
            .string()
            .trim()
            .transform((value) => value.toUpperCase())
            .pipe(
                z.string().regex(/^[A-Z]{3}$/, "currency must be a 3-letter code"),
            ),
        totalMajor: z
            .number()
            .int("totalMajor must be an integer")
            .nonnegative("totalMajor must be zero or greater")
            .safe(),
        totalMinor: z
            .number()
            .int("totalMinor must be an integer")
            .min(0, "totalMinor must be between 0 and 99")
            .max(99, "totalMinor must be between 0 and 99")
            .safe(),
        transactionTime: z
            .string()
            .trim()
            .refine(
                (value) => iso8601OffsetRegex.test(value),
                "transactionTime must be ISO 8601 with timezone offset (e.g. 2026-03-22T11:08:20-07:00)",
            )
            .refine(
                (value) => Number.isFinite(Date.parse(value)),
                "transactionTime must be a valid datetime",
            ),
    })
    .strict();

export const validateCreateTransactionInput = (
    transactionData: NewTransaction,
): NewTransaction => {
    const parsed = createTransactionInputSchema.safeParse(transactionData);
    if (!parsed.success) {
        throw new CreateTransactionValidationError(
            "Invalid transaction input",
            parsed.error.issues,
        );
    }

    return parsed.data;
};

export const validateFilterTransactionsInput = (
    filter: unknown,
): TransactionFilter => {
    const parsed = TransactionFilterSchema.safeParse(filter);
    if (!parsed.success) {
        throw new FilterTransactionsValidationError(
            "Invalid transaction filter input",
            parsed.error.issues,
        );
    }

    return parsed.data;
};
