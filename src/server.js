// Smallest static handler: / -> public/index.html, /<file> from public/, /src/<file> from src/.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

export function resolveFile(urlPath, root = ROOT) {
  let p;
  try { p = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  if (p === "/") p = "/index.html";
  const base = p.startsWith("/src/") ? path.join(root, "src") : path.join(root, "public");
  const rel = p.startsWith("/src/") ? p.slice(5) : p.slice(1);
  const file = path.resolve(base, rel);
  return file.startsWith(base + path.sep) ? file : null;
}

export function createServer(root = ROOT) {
  return http.createServer(async (req, res) => {
    const file = req.method === "GET" ? resolveFile(req.url, root) : null;
    const type = file && TYPES[path.extname(file)];
    if (!file || !type) { res.writeHead(404).end("not found"); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": type }).end(body);
    } catch { res.writeHead(404).end("not found"); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(Number(process.env.PORT) || 8080);
}
