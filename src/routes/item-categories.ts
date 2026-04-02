import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import type { ServerResponse } from "../model/types/response.js";
import { ServerResponseCode } from "../model/types/response.js";
import {
	CreateItemCategoryValidationError,
	ListItemCategoriesValidationError,
	UpdateItemCategoryValidationError,
} from "../controllers/item-category-validation.js";
import {
	createItemCategory,
	deleteItemCategory,
	getItemCategory,
	listItemCategories,
	updateItemCategory,
} from "../controllers/item-category-controller.js";
import {
	buildPagination,
	parseJsonRequestBody,
	parsePositiveIntQuery,
	parseRequiredPositiveIntParam,
} from "./resource-helpers.js";

const itemCategoryRoutes = new Hono();

itemCategoryRoutes.get("/", async (c: any) => {
	const queryParams = c.req.query();
	const parsedParams: Record<string, unknown> = {};

	const limit = parsePositiveIntQuery(queryParams.limit);
	const offset = parsePositiveIntQuery(queryParams.offset);
	if (limit !== undefined) parsedParams.limit = limit;
	if (offset !== undefined) parsedParams.offset = offset;

	try {
		const { itemCategories: foundCategories, total } = await listItemCategories(parsedParams);
		const response: ServerResponse = {
			code: ServerResponseCode.SUCCESS,
			text: "Item categories retrieved successfully",
			data: foundCategories,
			pagination: buildPagination(total, offset ?? 0, limit ?? 20),
		};
		return c.json(response, StatusCodes.OK);
	} catch (error) {
		if (error instanceof ListItemCategoriesValidationError) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Invalid query parameters",
				data: error.issues,
			};
			return c.json(response, StatusCodes.BAD_REQUEST);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Internal server error while retrieving item categories",
		};
		return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

itemCategoryRoutes.post("/", async (c: any) => {
	const reqBody = await c.req.text();
	const bodyResult = await parseJsonRequestBody(reqBody);
	if (!bodyResult.ok) {
		return c.json(bodyResult.response, bodyResult.status);
	}

	try {
		const result = await createItemCategory(bodyResult.body);
		const response: ServerResponse = {
			code: ServerResponseCode.SUCCESS,
			text: "Item category created successfully",
			data: {
				id: Number(result.lastInsertRowid),
			},
		};
		return c.json(response, StatusCodes.CREATED);
	} catch (error) {
		if (error instanceof CreateItemCategoryValidationError) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Invalid request body",
				data: error.issues,
			};
			return c.json(response, StatusCodes.BAD_REQUEST);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Internal server error while creating item category",
		};
		return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

itemCategoryRoutes.get("/:id", async (c: any) => {
	const { id } = c.req.param();
	const parsedId = parseRequiredPositiveIntParam(id, "Item category");
	if (!parsedId.ok) {
		return c.json(parsedId.response, parsedId.status);
	}

	const result = await getItemCategory(parsedId.id);
	if (!result) {
		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Item category not found",
		};
		return c.json(response, StatusCodes.NOT_FOUND);
	}

	const response: ServerResponse = {
		code: ServerResponseCode.SUCCESS,
		text: "Item category retrieved successfully",
		data: result,
	};
	return c.json(response, StatusCodes.OK);
});

const updateItemCategoryHandler = async (c: any) => {
	const { id } = c.req.param();
	const parsedId = parseRequiredPositiveIntParam(id, "Item category");
	if (!parsedId.ok) {
		return c.json(parsedId.response, parsedId.status);
	}

	const reqBody = await c.req.text();
	const bodyResult = await parseJsonRequestBody(reqBody);
	if (!bodyResult.ok) {
		return c.json(bodyResult.response, bodyResult.status);
	}

	try {
		const result = await updateItemCategory(parsedId.id, bodyResult.body);
		if (result.rowsAffected === 0) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Item category not found",
			};
			return c.json(response, StatusCodes.NOT_FOUND);
		}

		const updated = await getItemCategory(parsedId.id);
		const response: ServerResponse = {
			code: ServerResponseCode.SUCCESS,
			text: "Item category updated successfully",
			data: updated,
		};
		return c.json(response, StatusCodes.OK);
	} catch (error) {
		if (error instanceof UpdateItemCategoryValidationError) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Invalid request body",
				data: error.issues,
			};
			return c.json(response, StatusCodes.BAD_REQUEST);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Internal server error while updating item category",
		};
		return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};

itemCategoryRoutes.patch("/:id", updateItemCategoryHandler);
itemCategoryRoutes.put("/:id", updateItemCategoryHandler);

itemCategoryRoutes.delete("/:id", async (c: any) => {
	const { id } = c.req.param();
	const parsedId = parseRequiredPositiveIntParam(id, "Item category");
	if (!parsedId.ok) {
		return c.json(parsedId.response, parsedId.status);
	}

	try {
		const result = await deleteItemCategory(parsedId.id);
		if (result.rowsAffected === 0) {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Item category not found",
			};
			return c.json(response, StatusCodes.NOT_FOUND);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.SUCCESS,
			text: "Item category deleted successfully",
			data: { id: parsedId.id },
		};
		return c.json(response, StatusCodes.OK);
	} catch (error) {
		if (error instanceof Error && error.message === "Category is in use") {
			const response: ServerResponse = {
				code: ServerResponseCode.ERROR,
				text: "Item category is in use",
			};
			return c.json(response, StatusCodes.CONFLICT);
		}

		const response: ServerResponse = {
			code: ServerResponseCode.ERROR,
			text: "Internal server error while deleting item category",
		};
		return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
	}
});

export default itemCategoryRoutes;
