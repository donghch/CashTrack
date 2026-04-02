import "dotenv/config";
import { Hono } from "hono";
import { type ServerResponse, ServerResponseCode } from "../model/types/response.js";
import { StatusCodes } from "http-status-codes";
import * as jose from "jose";
import { z } from "zod";

const authRoutes = new Hono();

// Zod schema for authentication request
const AuthRequestSchema = z.object({
  pwd: z.string().min(1, "Password is required"),
}).strict();

// Check required environment variables
function checkEnvVariables(): string[] {
  const missing: string[] = [];
  if (!process.env.PASSWORD) {
    missing.push("PASSWORD");
  }
  if (!process.env.JWT_SECRET) {
    missing.push("JWT_SECRET");
  }
  return missing;
}

authRoutes.post("/", async (c) => {
  // Check environment variables
  const missingEnv = checkEnvVariables();
  if (missingEnv.length > 0) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: `Server configuration error: Missing environment variables: ${missingEnv.join(", ")}`,
    };
    return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Parse and validate request body
  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Invalid JSON in request body",
    };
    return c.json(response, StatusCodes.BAD_REQUEST);
  }

  // Validate with Zod schema
  const validationResult = AuthRequestSchema.safeParse(body);
  if (!validationResult.success) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Invalid request body",
      data: validationResult.error.errors,
    };
    return c.json(response, StatusCodes.BAD_REQUEST);
  }

  const { pwd } = validationResult.data;

  // Validate password
  if (pwd !== process.env.PASSWORD) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Invalid password",
    };
    return c.json(response, StatusCodes.UNAUTHORIZED);
  }

  // Create JWT token
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const alg = "HS256";
  const token = await new jose.SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret);

  // Return response with cookie
  const response: ServerResponse = {
    code: ServerResponseCode.SUCCESS,
    text: "Authentication successful",
  };
  c.header("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=7200; SameSite=Strict`);

  return c.json(response, StatusCodes.OK);
});

export default authRoutes;