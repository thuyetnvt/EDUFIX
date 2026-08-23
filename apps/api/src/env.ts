import { config } from "dotenv";
import { resolve } from "path";

// pnpm filter chạy với cwd ở apps/api, còn Docker/CI thường chạy từ repo root.
config({ path: resolve(process.cwd(), "../../.env") });
config();
