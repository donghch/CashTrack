import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

/* routes */
import transactionRoutes from "./routes/transactions.js";
import authRoutes from "./routes/auth.js";
import ocrRoutes from "./routes/ocr.js";
import authMiddleware from "./middleware/auth.js";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
    return c.text("Hello, World!");
});

// Apply authentication middleware to protected routes
app.use("/transactions/*", authMiddleware);
app.use("/ocr/*", authMiddleware);

app.route("/transactions", transactionRoutes);
app.route("/ocr", ocrRoutes);

// Public routes (no auth required)
app.route("/auth", authRoutes);

serve(app);