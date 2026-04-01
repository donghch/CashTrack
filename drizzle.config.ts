import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/model/db/schema.ts",
  out: "./migrations",          // where SQL files get generated
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_FILE_NAME!
  },
});