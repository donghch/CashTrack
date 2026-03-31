import { Hono } from "hono";
import { getTransaction, createTransaction } from "../controllers/dbcontroller.js";
import { transactions } from "../model/db/schema.js";
import type { ServerResponse } from "../model/types/response.js";
import { ServerResponseCode } from "../model/types/response.js";
import { StatusCodes } from "http-status-codes";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const transactionRoutes = new Hono();

const newTransactionSchema = createInsertSchema(transactions);

transactionRoutes.get("/", (c) => {
  return c.json({ message: "List of transactions" });
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
  const parseResult = newTransactionSchema.safeParse(reqBody);

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