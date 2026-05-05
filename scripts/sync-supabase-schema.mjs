import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "src", "lib", "supabase", "000_production_full_schema.sql");
const targetPath = path.join(root, "supabase", "migrations", "20260503223000_init_schema.sql");

if (!fs.existsSync(sourcePath)) {
  console.error("Schema source not found:", sourcePath);
  process.exit(1);
}

const content = fs.readFileSync(sourcePath, "utf8");

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, content, "utf8");

console.log("Supabase schema synced:", path.relative(root, targetPath));
