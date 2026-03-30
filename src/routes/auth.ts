import { Hono } from "hono";

const authRoutes = new Hono();

authRoutes.post("/", (c) => {
    const saltedPwd = c.req.query("saltedPwd");
    return c.json({ message: "User login" });
});

export default authRoutes;