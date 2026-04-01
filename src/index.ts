import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

/* routes */
import transactionRoutes from "./routes/transactions.js";
import authRoutes from "./routes/auth.js";
import ocrRoutes from "./routes/ocr.js";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
    return c.text("Hello, World!");
});

app.route("/transactions", transactionRoutes);

app.route("/auth", authRoutes);
app.route("/ocr", ocrRoutes);

serve(app);