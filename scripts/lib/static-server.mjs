// A zero-dependency static file server for the built site (redesign
// REQ-021): the Chrome-backed gates (lighthouse, layout) serve _site/ over
// http on an ephemeral loopback port, as GitHub Pages would — correct MIME
// types, 404.html with status 404 for misses, directory URLs resolved to
// their index.html, text responses gzip-compressed when the client accepts
// it (Pages compresses too, so the measured transfer sizes are honest).

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".mjs", ".json", ".svg", ".xml", ".txt"]);

/** The file a request path resolves to inside root, or null when it escapes or is missing. */
async function resolveFile(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  const target = path.resolve(root, `.${decoded}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  for (const candidate of decoded.endsWith("/") ? [path.join(target, "index.html")] : [target, path.join(target, "index.html")]) {
    const info = await stat(candidate).catch(() => null);
    if (info?.isFile()) return candidate;
  }
  return null;
}

/**
 * Start serving `rootDir`. Resolves to { port, url, close() }.
 * @param {string} rootDir — the built site (absolute or relative to cwd)
 * @param {{ host?: string, port?: number }} [options] — port 0 picks a free one
 */
export async function start(rootDir, { host = "127.0.0.1", port = 0 } = {}) {
  const root = path.resolve(rootDir);
  const server = createServer(async (request, response) => {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let file = await resolveFile(root, request.url ?? "/");
    let status = 200;
    if (file === null) {
      status = 404;
      const notFound = path.join(root, "404.html");
      file = (await stat(notFound).catch(() => null))?.isFile() ? notFound : null;
    }
    if (file === null) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    const extension = path.extname(file).toLowerCase();
    const headers = { "Content-Type": MIME[extension] ?? "application/octet-stream", "Cache-Control": "no-store" };
    let body = await readFile(file);
    if (COMPRESSIBLE.has(extension) && /\bgzip\b/.test(request.headers["accept-encoding"] ?? "")) {
      body = gzipSync(body);
      headers["Content-Encoding"] = "gzip";
      headers.Vary = "Accept-Encoding";
    }
    headers["Content-Length"] = body.length;
    response.writeHead(status, headers);
    response.end(method === "HEAD" ? undefined : body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  return {
    port: boundPort,
    url: `http://${host}:${boundPort}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
