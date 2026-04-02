import axios from "axios";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";

const api = axios.create({
	baseURL: baseUrl,
	timeout: 10000,
	withCredentials: true,
	validateStatus: () => true,
});

const uniqueName = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;

const createCategory = async (name: string): Promise<number | null> => {
	const res = await api.post("/item-categories", { name });
	if (res.status !== 201) {
		return null;
	}

	return res.data?.data?.id ?? null;
};

describe("item category routes", () => {
	beforeAll(async () => {
		const res = await api.get("/item-categories", { params: { limit: 1, offset: 0 } });
		if (res.status >= 500 || res.status === 0) {
			throw new Error(`Expected running server at ${baseUrl}, but GET /item-categories failed with status ${res.status}`);
		}
	});

	afterAll(() => {
		expect(true).toBe(true);
	});

	it("creates an item category", async () => {
		const res = await api.post("/item-categories", { name: uniqueName("UT_CATEGORY_CREATE") });
		expect(res.status).toBe(201);
		expect(res.data).toMatchObject({
			code: 0,
			text: "Item category created successfully",
		});
	});

	it("lists item categories", async () => {
		await createCategory(uniqueName("UT_CATEGORY_LIST"));
		const res = await api.get("/item-categories", { params: { limit: 10, offset: 0 } });
		expect(res.status).toBe(200);
		expect(Array.isArray(res.data?.data)).toBe(true);
		expect(typeof res.data?.pagination?.total).toBe("number");
	});

	it("retrieves an item category by id", async () => {
		const name = uniqueName("UT_CATEGORY_GET");
		const id = await createCategory(name);
		expect(id).not.toBeNull();

		const res = await api.get(`/item-categories/${id}`);
		expect(res.status).toBe(200);
		expect(res.data?.data?.name).toBe(name);
	});

	it("updates an item category", async () => {
		const id = await createCategory(uniqueName("UT_CATEGORY_UPDATE"));
		expect(id).not.toBeNull();

		const nextName = uniqueName("UT_CATEGORY_UPDATE_NEXT");
		const res = await api.patch(`/item-categories/${id}`, { name: nextName });
		expect(res.status).toBe(200);
		expect(res.data?.data?.name).toBe(nextName);
	});

	it("deletes an unused item category", async () => {
		const id = await createCategory(uniqueName("UT_CATEGORY_DELETE"));
		expect(id).not.toBeNull();

		const res = await api.delete(`/item-categories/${id}`);
		expect(res.status).toBe(200);
		expect(res.data?.text).toBe("Item category deleted successfully");
	});
});
