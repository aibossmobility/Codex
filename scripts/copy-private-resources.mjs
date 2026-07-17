import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const source = path.resolve(process.cwd(), "server/private-resources");
const destination = path.resolve(process.cwd(), "dist/private-resources");

await stat(source);
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log(`Copied protected resources to ${destination}`);
