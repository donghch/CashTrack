import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/model/db/schema.ts",
  out: "./migrations",          // where SQL files get generated
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!
  },
});