import { Hono } from "hono";

const transactionRoutes = new Hono();

transactionRoutes.get("/", (c) => {
  return c.json({ message: "List of transactions" });
});

transactionRoutes.post("/", (c) => {
  return c.json({ message: "Create a new transaction" });
});

transactionRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  return c.json({ message: `Details of transaction ${id}` });
});

export default transactionRoutes;