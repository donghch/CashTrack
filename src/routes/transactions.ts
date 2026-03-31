import { Hono } from "hono";
import { getTransaction, createTransaction, filterTransactions } from "../controllers/dbcontroller.js";
import { transactions } from "../model/db/schema.js";
import type { ServerResponse } from "../model/types/response.js";
import { ServerResponseCode } from "../model/types/response.js";
import { StatusCodes } from "http-status-codes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { TransactionFilterSchema } from "../model/types/request.js";
import type { TransactionWithItems } from "../model/types/response.js";

const transactionRoutes = new Hono();

const newTransactionSchema = createInsertSchema(transactions);

transactionRoutes.get("/", async (c) => {
  // Parse and validate query parameters
  const queryParams = c.req.query();
  
  // Convert string values to appropriate types
  const parsedParams: any = {};
  
  // Type conversions
  if (queryParams.limit) parsedParams.limit = parseInt(queryParams.limit, 10);
  if (queryParams.offset) parsedParams.offset = parseInt(queryParams.offset, 10);
  if (queryParams.minAmount) parsedParams.minAmount = parseInt(queryParams.minAmount, 10);
  if (queryParams.maxAmount) parsedParams.maxAmount = parseInt(queryParams.maxAmount, 10);
  if (queryParams.category) {
    const cat = queryParams.category;
    parsedParams.category = isNaN(Number(cat)) ? cat : parseInt(cat, 10);
  }
  if (queryParams.includeItems) {
    parsedParams.includeItems = queryParams.includeItems === "true";
  }
  
  // Copy other params
  ["startDate", "endDate", "merchant", "currency", "sortBy", "sortOrder"].forEach(key => {
    if (queryParams[key]) parsedParams[key] = queryParams[key];
  });
  
  // Validate with Zod schema
  const validationResult = TransactionFilterSchema.safeParse(parsedParams);
  
  if (!validationResult.success) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Invalid query parameters",
      data: validationResult.error.errors
    };
    return c.json(response, StatusCodes.BAD_REQUEST);
  }
  
  try {
    const filter = validationResult.data;
    const { transactions: filteredTransactions, total } = await filterTransactions(c.env as Env, filter);
    
    const response: ServerResponse<TransactionWithItems[]> = {
      code: ServerResponseCode.SUCCESS,
      text: "Transactions retrieved successfully",
      data: filteredTransactions,
      pagination: {
        total,
        limit: filter.limit,
        offset: filter.offset,
        hasMore: (filter.offset + filter.limit) < total
      }
    };
    
    return c.json(response, StatusCodes.OK);
  } catch (error) {
    // Log error (using Pino in production)
    console.error("Error filtering transactions:", error);
    
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Internal server error while retrieving transactions"
    };
    return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

transactionRoutes.post("/", async (c) => {

  // parse request body and validate it using zod schema

  const reqBody = await c.req.text();
  let jsonBody;
  try {
    jsonBody = JSON.parse(reqBody);
  } catch (e) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Invalid JSON in request body"
    };
    return c.json(response, StatusCodes.BAD_REQUEST);
  }
  const parseResult = newTransactionSchema.safeParse(jsonBody);

  if (!parseResult.success) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Invalid request body",
      data: parseResult.error
    };
    return c.json(response, StatusCodes.BAD_REQUEST);
  }

  // create a new transaction using the validated data
  const data = parseResult.data;
  const result = await createTransaction(c.env as Env, data);
  const response: ServerResponse = {
    code: ServerResponseCode.SUCCESS,
    text: "Transaction created successfully",
  };
  return c.json(response, StatusCodes.CREATED);

});

transactionRoutes.get("/:id", async (c) => {

  const { id } = c.req.param();

  if (!id) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR, 
      text: "Transaction ID is required"
    };
    return c.json(response, StatusCodes.BAD_REQUEST);
  }

  // try check if id is a number
  const idNum = parseInt(id);
  if (isNaN(idNum)) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Transaction ID must be a number"
    };
    return c.json(response, StatusCodes.BAD_REQUEST);
  }

  const result = await getTransaction(c.env as Env, idNum);
  
  // check if result is null
  if (!result) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Transaction not found"
    };
    return c.json(response, StatusCodes.NOT_FOUND);
  }


  const response: ServerResponse = {
    code: ServerResponseCode.SUCCESS,
    text: "Transaction retrieved successfully",
    data: result
  };
  return c.json(response, StatusCodes.OK);

});

export default transactionRoutes;