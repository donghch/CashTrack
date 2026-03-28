import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { pinoHttp } from "pino-http";
import { cors } from "hono/cors";

const app = new Hono();
app.get("/", (c) => {
    return c.text("Hello, World!");
});

export default app;