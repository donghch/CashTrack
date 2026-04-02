import axios from "axios";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

type CreateItemBody = {
	transactionId: number;
	name: string;
	quantity?: number;
	unit?: string;
	unitPriceMinor?: number;
	lineTotalMinor?: number;
	categoryId?: number | null;
};

const nowWithOffset = (): { transactionTime: string; transactionTimezone: string } => {
	const now = new Date();
	const offsetMinutes = -now.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absMinutes = Math.abs(offsetMinutes);
	const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
	const minutes = String(absMinutes % 60).padStart(2, "0");
	const isoNoZ = new Date(now.getTime() - now.getMilliseconds()).toISOString().replace("Z", "");
	return {
		transactionTime: isoNoZ,
		transactionTimezone: `${sign}${hours}:${minutes}`,
	};
};

const createTransactionBody = (overrides: Partial<CreateTransactionBody> = {}): CreateTransactionBody => {
	const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
	const { transactionTime, transactionTimezone } = nowWithOffset();

	return {
		merchant: `UT_ITEM_TX_${uniqueSuffix}`,
	currency: "USD",
	totalMajor: 12,
	totalMinor: 34,
	transactionTime,
	transactionTimezone,
		...overrides,
	};
};

const createItemBody = (overrides: Partial<CreateItemBody> = {}): CreateItemBody => ({
	transactionId: 1,
	name: `UT_ITEM_${Date.now()}`,
	quantity: 2,
	unit: "pack",
	unitPriceMinor: 1250,
	lineTotalMinor: 2500,
	...overrides,
});

const createTransactionAndGetId = async (): Promise<number> => {
	const payload = createTransactionBody();
	const createRes = await api.post("/transactions", payload);
	expect(createRes.status).toBe(201);

	const listRes = await api.get("/transactions", {
		params: {
			merchant: payload.merchant,
			limit: 1,
			offset: 0,
		},
	});

	expect(listRes.status).toBe(200);
	const first = listRes.data?.data?.[0]?.transaction;
	expect(typeof first?.id).toBe("number");
	return first.id;
};

describe("items routes", () => {
	beforeAll(async () => {
		const res = await api.get("/items", { params: { limit: 1, offset: 0 } });
		if (res.status >= 500 || res.status === 0) {
			throw new Error(`Expected running server at ${baseUrl}, but GET /items failed with status ${res.status}`);
		}
	});

	afterAll(() => {
		expect(true).toBe(true);
	});

	it("creates an item with valid payload", async () => {
		const transactionId = await createTransactionAndGetId();
		const payload = createItemBody({ transactionId, name: `UT_ITEM_CREATE_${Date.now()}` });

		const res = await api.post("/items", payload);

		expect(res.status).toBe(201);
		expect(res.data).toMatchObject({
			code: 0,
			text: "Item created successfully",
		});
	});

	it("rejects payload with missing required fields", async () => {
		const res = await api.post("/items", { name: "missing transaction" });
		expect(res.status).toBe(400);
		expect(res.data?.code).toBe(1);
	});

	it("returns 404 for unknown transactionId", async () => {
		const payload = createItemBody({ transactionId: 2_000_000_000, name: `UT_ITEM_BAD_TX_${Date.now()}` });
		const res = await api.post("/items", payload);

		expect(res.status).toBe(404);
		expect(res.data?.text).toBe("Transaction not found");
	});

	it("lists items with pagination envelope", async () => {
		const transactionId = await createTransactionAndGetId();
		await api.post("/items", createItemBody({ transactionId, name: `UT_ITEM_LIST_${Date.now()}` }));

		const res = await api.get("/items", {
			params: {
				transactionId,
				limit: 10,
				offset: 0,
			},
		});

		expect(res.status).toBe(200);
		expect(Array.isArray(res.data?.data)).toBe(true);
		expect(typeof res.data?.pagination?.total).toBe("number");
	});

	it("retrieves an item by id", async () => {
		const transactionId = await createTransactionAndGetId();
		const createRes = await api.post("/items", createItemBody({ transactionId, name: `UT_ITEM_GET_${Date.now()}` }));
		expect(createRes.status).toBe(201);

		const listRes = await api.get("/items", { params: { transactionId, limit: 1, offset: 0 } });
		expect(listRes.status).toBe(200);
		const first = listRes.data?.data?.[0]?.item;
		expect(typeof first?.id).toBe("number");

		const res = await api.get(`/items/${first.id}`);
		expect(res.status).toBe(200);
		expect(res.data?.data?.item?.id).toBe(first.id);
	});

	it("updates an item", async () => {
		const transactionId = await createTransactionAndGetId();
		await api.post("/items", createItemBody({ transactionId, name: `UT_ITEM_UPDATE_${Date.now()}` }));
		const listRes = await api.get("/items", { params: { transactionId, limit: 1, offset: 0 } });
		const first = listRes.data?.data?.[0]?.item;

		const res = await api.patch(`/items/${first.id}`, {
			name: `UT_ITEM_UPDATE_${Date.now()}_UPDATED`,
		});

		expect(res.status).toBe(200);
		expect(res.data?.text).toBe("Item updated successfully");
	});

	it("deletes an item", async () => {
		const transactionId = await createTransactionAndGetId();
		await api.post("/items", createItemBody({ transactionId, name: `UT_ITEM_DELETE_${Date.now()}` }));
		const listRes = await api.get("/items", { params: { transactionId, limit: 1, offset: 0 } });
		const first = listRes.data?.data?.[0]?.item;

		const res = await api.delete(`/items/${first.id}`);

		expect(res.status).toBe(200);
		expect(res.data?.text).toBe("Item deleted successfully");
	});
});
