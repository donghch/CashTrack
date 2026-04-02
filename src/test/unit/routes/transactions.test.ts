import axios from "axios";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { tr } from "zod/v4/locales"

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";

const api = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    withCredentials: true, 
    validateStatus: () => true,
});

type CreateTransactionBody = {
    merchant: string;
    currency: string;
    totalMajor: number;
    totalMinor: number;
    transactionTime: string;
    transactionTimezone: string;
};

const createdTransactionIds: number[] = [];

const nowWithOffset = (): { transactionTime: string; transactionTimezone: string } => {
    const now = new Date();
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const minutes = String(absMinutes % 60).padStart(2, "0");
    const isoNoZ = new Date(now.getTime() - now.getMilliseconds())
        .toISOString()
        .replace("Z", "");
    return {
        transactionTime: isoNoZ,
        transactionTimezone: `${sign}${hours}:${minutes}`
    };
};

const createTransactionBody = (
    overrides: Partial<CreateTransactionBody> = {},
): CreateTransactionBody => {
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const { transactionTime, transactionTimezone } = nowWithOffset();

    return {
        merchant: `UT_MERCHANT_${uniqueSuffix}`,
        currency: "USD",
        totalMajor: 12,
        totalMinor: 34,
        transactionTime,
        transactionTimezone,
        ...overrides,
    };
};

const createTransactionAndGetId = async (
    body: CreateTransactionBody,
): Promise<number | null> => {
    const createRes = await api.post("/transactions", body);
    if (createRes.status !== 201) {
        return null;
    }

    const listRes = await api.get("/transactions", {
        params: {
            merchant: body.merchant,
            limit: 1,
            offset: 0,
        },
    });

    if (listRes.status !== 200) {
        return null;
    }

    const first = listRes.data?.data?.[0]?.transaction;
    if (typeof first?.id !== "number") {
        return null;
    }

    createdTransactionIds.push(first.id);
    return first.id;
};

describe("transactions routes", () => {
    beforeAll(async () => {
        const res = await api.get("/transactions", { params: { limit: 1, offset: 0 } });
        if (res.status >= 500 || res.status === 0) {
            throw new Error(
                `Expected running server at ${baseUrl}, but GET /transactions failed with status ${res.status}`,
            );
        }
    });

    afterAll(() => {
        // Checks that created IDs are tracked for potential external cleanup scripts.
        expect(Array.isArray(createdTransactionIds)).toBe(true);
    });

    it("creates a transaction with valid payload", async () => {
        // Checks that POST /transactions accepts a valid body and returns success status.
        const payload = createTransactionBody();

        const res = await api.post("/transactions", payload);

        expect(res.status).toBe(201);
        expect(res.data).toMatchObject({
            code: 0,
            text: "Transaction created successfully",
        });
    });

    it("rejects invalid JSON body", async () => {
        // Checks that POST /transactions returns 400 when JSON parsing fails.
        const res = await api.request({
            method: "POST",
            url: "/transactions",
            data: "{invalid-json",
            headers: { "Content-Type": "application/json" },
            transformRequest: [(raw) => raw as string],
        });

        expect(res.status).toBe(400);
        expect(res.data?.code).toBe(1);
    });

    it("rejects payload missing required fields", async () => {
        // Checks that POST /transactions validates required fields and returns 400.
        const payload = {
            merchant: "UT_MISSING_REQUIRED",
        };

        const res = await api.post("/transactions", payload);

        expect(res.status).toBe(400);
        expect(res.data?.code).toBe(1);
    });

    it("rejects totalMinor outside cents range", async () => {
        // Checks that POST /transactions rejects totalMinor greater than 99.
        const payload = createTransactionBody({ totalMinor: 100 });

        const res = await api.post("/transactions", payload);

        expect(res.status).toBe(400);
        expect(res.data?.code).toBe(1);
    });

    it("returns 400 for non-numeric transaction id", async () => {
        // Checks that GET /transactions/:id rejects non-number path values.
        const res = await api.get("/transactions/not-a-number");

        expect(res.status).toBe(400);
        expect(res.data).toMatchObject({
            code: 1,
            text: "Transaction ID must be a number",
        });
    });

    it("returns 404 when transaction id does not exist", async () => {
        // Checks that GET /transactions/:id returns not found for unknown IDs.
        const nonExistentId = 2_000_000_000;

        const res = await api.get(`/transactions/${nonExistentId}`);

        expect(res.status).toBe(404);
        expect(res.data).toMatchObject({
            code: 1,
            text: "Transaction not found",
        });
    });

    it("lists transactions with pagination envelope", async () => {
        // Checks that GET /transactions returns the paginated response structure.
        const res = await api.get("/transactions", {
            params: {
                limit: 5,
                offset: 0,
            },
        });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.data?.data)).toBe(true);
        expect(typeof res.data?.pagination?.total).toBe("number");
        expect(typeof res.data?.pagination?.limit).toBe("number");
        expect(typeof res.data?.pagination?.offset).toBe("number");
        expect(typeof res.data?.pagination?.hasMore).toBe("boolean");
    });

    it("filters by merchant and total range using minTotal/maxTotal", async () => {
        // Checks that GET /transactions applies merchant and total filters together.
        const merchant = `UT_FILTER_${Date.now()}`;
        const payload = createTransactionBody({
            merchant,
            totalMajor: 15,
            totalMinor: 25,
        });

        const createdId = await createTransactionAndGetId(payload);
        expect(createdId).not.toBeNull();

        const minTotal = payload.totalMajor * 100 + payload.totalMinor - 1;
        const maxTotal = payload.totalMajor * 100 + payload.totalMinor + 1;

        const res = await api.get("/transactions", {
            params: {
                merchant: "UT_FILTER_",
                minTotal,
                maxTotal,
                limit: 50,
                offset: 0,
            },
        });

        expect(res.status).toBe(200);
        const transactions = res.data?.data ?? [];
        const merchants = transactions.map((entry: any) => entry.transaction?.merchant);
        expect(merchants).toContain(merchant);
    });

    it("sorts by total ascending", async () => {
        // Checks that sortBy=total orders by major then minor amount ascending.
        const merchantPrefix = `UT_SORT_${Date.now()}`;

        const low = createTransactionBody({
            merchant: `${merchantPrefix}_LOW`,
            totalMajor: 4,
            totalMinor: 10,
        });
        const high = createTransactionBody({
            merchant: `${merchantPrefix}_HIGH`,
            totalMajor: 4,
            totalMinor: 80,
        });

        await createTransactionAndGetId(low);
        await createTransactionAndGetId(high);

        const res = await api.get("/transactions", {
            params: {
                merchant: merchantPrefix,
                sortBy: "total",
                sortOrder: "asc",
                limit: 10,
                offset: 0,
            },
        });

        expect(res.status).toBe(200);

        const rows = res.data?.data ?? [];
        expect(rows.length).toBeGreaterThanOrEqual(2);

        const totals = rows.map((entry: any) => {
            const t = entry.transaction;
            return t.totalMajor * 100 + t.totalMinor;
        });

        for (let i = 1; i < totals.length; i += 1) {
            expect(totals[i]).toBeGreaterThanOrEqual(totals[i - 1]);
        }
    });

    it("includes items field when includeItems=true", async () => {
        // Checks that GET /transactions returns nested items property when requested.
        const payload = createTransactionBody({
            merchant: `UT_ITEMS_${Date.now()}`,
        });
        await createTransactionAndGetId(payload);

        const res = await api.get("/transactions", {
            params: {
                merchant: "UT_ITEMS_",
                includeItems: true,
                limit: 5,
                offset: 0,
            },
        });

        expect(res.status).toBe(200);
        const rows = res.data?.data ?? [];
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]).toHaveProperty("items");
        expect(Array.isArray(rows[0].items)).toBe(true);
    });

    it("retrieves a transaction by id", async () => {
        // Checks that GET /transactions/:id returns the specific persisted transaction.
        const payload = createTransactionBody({
            merchant: `UT_GET_BY_ID_${Date.now()}`,
        });

        const createdId = await createTransactionAndGetId(payload);
        expect(createdId).not.toBeNull();

        const res = await api.get(`/transactions/${createdId}`);

        expect(res.status).toBe(200);
        expect(res.data?.data?.id).toBe(createdId);
        expect(res.data?.data?.merchant).toBe(payload.merchant);
    });
});
