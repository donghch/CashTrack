import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import type { ServerResponse } from "../model/types/response.js";
import { ServerResponseCode } from "../model/types/response.js";
import {
	CreateItemValidationError,
	ListItemsValidationError,
	UpdateItemValidationError,
} from "../controllers/item-validation.js";
import { createItem, deleteItem, getItem, listItems, updateItem } from "../controllers/itemcontroller.js";
import {
	buildPagination,
	parseJsonRequestBody,
	parsePositiveIntQuery,
	parseRequiredPositiveIntParam,
} from "./resource-helpers.js";

const itemRoutes = new Hono();

itemRoutes.get("/", async (c: any) => {
	const queryParams = c.req.query();
	const parsedParams: Record<string, unknown> = {};

	const limit = parsePositiveIntQuery(queryParams.limit);
	const offset = parsePositiveIntQuery(queryParams.offset);
	const transactionId = parsePositiveIntQuery(queryParams.transactionId);
	const categoryId = parsePositiveIntQuery(queryParams.categoryId);

	if (limit !== undefined) parsedParams.limit = limit;
	if (offset !== undefined) parsedParams.offset = offset;
	if (transactionId !== undefined) parsedParams.transactionId = transactionId;
	if (categoryId !== undefined) parsedParams.categoryId = categoryId;

	try {
		const { items: foundItems, total } = await listItems(parsedParams as any);
		const response: ServerResponse = {
			code: ServerResponseCode.SUCCESS,
			text: "Items retrieved successfully",
			data: foundItems,
			pagination: buildPagination(total, offset ?? 0, limit ?? 20),
		};
		return c.json(response, StatusCodes.OK);
	} catch (error) {
		if (error instanceof ListItemsValidationError) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Invalid query parameters",
				data: error.issues,
			};
			return c.json(response, StatusCodes.BAD_REQUEST);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Internal server error while retrieving items",
		};
		return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

itemRoutes.post("/", async (c: any) => {
	const reqBody = await c.req.text();
	const bodyResult = await parseJsonRequestBody(reqBody);
	if (!bodyResult.ok) {
		return c.json(bodyResult.response, bodyResult.status);
	}

	try {
		const result = await createItem(bodyResult.body);
		const response: ServerResponse = {
			code: ServerResponseCode.SUCCESS,
			text: "Item created successfully",
			data: {
				id: Number(result.lastInsertRowid),
			},
		};
		return c.json(response, StatusCodes.CREATED);
	} catch (error) {
		if (error instanceof CreateItemValidationError) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Invalid request body",
				data: error.issues,
			};
			return c.json(response, StatusCodes.BAD_REQUEST);
		}

		if (error instanceof Error && (error.message === "Transaction not found" || error.message === "Category not found")) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: error.message,
			};
			return c.json(response, StatusCodes.NOT_FOUND);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Internal server error while creating item",
		};
		return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

itemRoutes.get("/:id", async (c: any) => {
	const { id } = c.req.param();
	const parsedId = parseRequiredPositiveIntParam(id, "Item");
	if (!parsedId.ok) {
		return c.json(parsedId.response, parsedId.status);
	}

	const result = await getItem(parsedId.id);
	if (!result) {
		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Item not found",
		};
		return c.json(response, StatusCodes.NOT_FOUND);
	}

	const response: ServerResponse = {
		code: ServerResponseCode.SUCCESS,
		text: "Item retrieved successfully",
		data: result,
	};
	return c.json(response, StatusCodes.OK);
});

const updateItemHandler = async (c: any) => {
	const { id } = c.req.param();
	const parsedId = parseRequiredPositiveIntParam(id, "Item");
	if (!parsedId.ok) {
		return c.json(parsedId.response, parsedId.status);
	}

	const reqBody = await c.req.text();
	const bodyResult = await parseJsonRequestBody(reqBody);
	if (!bodyResult.ok) {
		return c.json(bodyResult.response, bodyResult.status);
	}

	try {
		const result = await updateItem(parsedId.id, bodyResult.body);
		if (result.rowsAffected === 0) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Item not found",
			};
			return c.json(response, StatusCodes.NOT_FOUND);
		}

		const updated = await getItem(parsedId.id);
		const response: ServerResponse = {
			code: ServerResponseCode.SUCCESS,
			text: "Item updated successfully",
			data: updated,
		};
		return c.json(response, StatusCodes.OK);
	} catch (error) {
		if (error instanceof UpdateItemValidationError) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Invalid request body",
				data: error.issues,
			};
			return c.json(response, StatusCodes.BAD_REQUEST);
		}

		if (error instanceof Error && (error.message === "Transaction not found" || error.message === "Category not found")) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: error.message,
			};
			return c.json(response, StatusCodes.NOT_FOUND);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Internal server error while updating item",
		};
		return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};

itemRoutes.patch("/:id", updateItemHandler);
itemRoutes.put("/:id", updateItemHandler);

itemRoutes.delete("/:id", async (c: any) => {
	const { id } = c.req.param();
	const parsedId = parseRequiredPositiveIntParam(id, "Item");
	if (!parsedId.ok) {
		return c.json(parsedId.response, parsedId.status);
	}

	const result = await deleteItem(parsedId.id);
	if (result.rowsAffected === 0) {
		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Item not found",
		};
		return c.json(response, StatusCodes.NOT_FOUND);
	}

	const response: ServerResponse = {
		code: ServerResponseCode.SUCCESS,
		text: "Item deleted successfully",
		data: { id: parsedId.id },
	};
	return c.json(response, StatusCodes.OK);
});

export default itemRoutes;
