import "dotenv/config";
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { type ServerResponse, ServerResponseCode } from "../model/types/response.js";
import { StatusCodes } from "http-status-codes";
import * as jose from "jose";

/**
 * Authentication middleware that verifies JWT token from cookie or Authorization header.
 * If token is valid, attaches the decoded payload to context variable `user`.
 * If token is missing or invalid, returns 401 Unauthorized.
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  // Check JWT_SECRET environment variable
  if (!process.env.JWT_SECRET) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Server configuration error: Missing JWT_SECRET",
    };
    return c.json(response, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Try to get token from cookie first, then Authorization header
  let token: string | undefined;
  
  // Check cookie (set by auth endpoint)
  const cookieToken = getCookie(c, "token");
  if (cookieToken) {
    token = cookieToken;
  } else {
    // Check Authorization header (Bearer token)
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  // No token provided
  if (!token) {
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Authentication required",
    };
    return c.json(response, StatusCodes.UNAUTHORIZED);
  }

  // Verify JWT token
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    
    // Attach user payload to context (single-user app, payload.sub === "admin")
    c.set("user", payload);
    
    // Continue to next middleware/handler
    await next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    
    const response: ServerResponse = {
      code: ServerResponseCode.ERROR,
      text: "Invalid or expired token",
    };
    return c.json(response, StatusCodes.UNAUTHORIZED);
  }
});

/**
 * Helper to apply auth middleware to specific routes.
 * Usage: app.use("/protected/*", authMiddleware)
 */
export default authMiddleware;