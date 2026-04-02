import { StatusCodes } from "http-status-codes";
import type { ServerResponse } from "../model/types/response.js";
import { ServerResponseCode } from "../model/types/response.js";

type JsonBodyResult =
	| { ok: true; body: unknown }
	| { ok: false; response: ServerResponse; status: number };

type IdResult =
	| { ok: true; id: number }
	| { ok: false; response: ServerResponse; status: number };

export const parsePositiveIntQuery = (value: string | undefined): number | undefined => {
	if (!value) {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
};

export const parseJsonRequestBody = async (text: string): Promise<JsonBodyResult> => {
	try {
		return { ok: true, body: JSON.parse(text) };
	} catch {
		return {
			ok: false,
			status: StatusCodes.BAD_REQUEST,
			response: {
				code: ServerResponseCode.ERROR,
				text: "Invalid JSON in request body",
			},
		};
	}
};

export const parseRequiredPositiveIntParam = (value: string | undefined, resourceLabel: string): IdResult => {
	if (!value) {
		return {
			ok: false,
			status: StatusCodes.BAD_REQUEST,
			response: {
				code: ServerResponseCode.ERROR,
				text: `${resourceLabel} ID must be a number`,
			},
		};
	}

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		return {
			ok: false,
			status: StatusCodes.BAD_REQUEST,
			response: {
				code: ServerResponseCode.ERROR,
				text: `${resourceLabel} ID must be a number`,
			},
		};
	}

	return { ok: true, id: parsed };
};

export const buildPagination = (total: number, offset: number, limit: number) => ({
	total,
	limit,
	offset,
	hasMore: offset + limit < total,
});
