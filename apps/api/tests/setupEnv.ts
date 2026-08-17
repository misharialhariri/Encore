import dotenv from "dotenv";
import path from "node:path";

// Loaded before any test file — points the app at the isolated test
// database instead of whatever DATABASE_URL is in the developer's shell.
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
