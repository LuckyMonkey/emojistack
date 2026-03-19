const fs = require("fs");
const http = require("http");
const path = require("path");

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
}

const root = path.resolve(process.cwd(), argValue("--root", "."));
const port = Number(argValue("--port", "4173"));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

function safeResolve(urlPath) {
  const sanitized = decodeURIComponent(urlPath.split("?")[0]);
  const relative = sanitized === "/" ? "/index.html" : sanitized;
  const filePath = path.resolve(root, `.${relative}`);
  if (!filePath.startsWith(root)) {
    return null;
  }
  return filePath;
}

http
  .createServer((req, res) => {
    const resolved = safeResolve(req.url || "/");
    if (!resolved) {
      send(res, 403, "Forbidden");
      return;
    }

    let filePath = resolved;

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      send(res, 404, `Not found: ${filePath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const body = fs.readFileSync(filePath);
    send(res, 200, body, mimeTypes[ext] || "application/octet-stream");
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`EmojiStack server running at http://127.0.0.1:${port}`);
    console.log(`Serving ${root}`);
  });
