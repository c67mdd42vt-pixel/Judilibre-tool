import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors({ origin: true, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "x-api-key"] }));
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const JUDILIBRE_BASE_URL = process.env.JUDILIBRE_BASE_URL || "https://replace-with-your-judilibre-host.example";
const MCP_API_KEY = process.env.MCP_API_KEY || "";
const SSE_KEEPALIVE_MS = 15000;

function auth(req, res, next) {
  if (!MCP_API_KEY) return next();
  const token = req.headers["x-api-key"];
  if (token !== MCP_API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function jfetch(path, params = {}) {
  const url = new URL(path, JUDILIBRE_BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach(x => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, String(v));
  });
  log("judilibre", url.toString());
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judilibre ${response.status}: ${text.slice(0, 500)}`);
  }
  return response.json();
}

const tools = [
  {
    name: "judilibre.search",
    description: "Recherche dans JUDILIBRE avec filtres standards.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        field: { type: "array", items: { type: "string" } },
        operator: { type: "string" },
        type: { type: "array", items: { type: "string" } },
        theme: { type: "array", items: { type: "string" } },
        chamber: { type: "array", items: { type: "string" } },
        formation: { type: "array", items: { type: "string" } },
        jurisdiction: { type: "array", items: { type: "string" } },
        publication: { type: "array", items: { type: "string" } },
        solution: { type: "array", items: { type: "string" } },
        date_start: { type: "string" },
        date_end: { type: "string" },
        sort: { type: "string" },
        order: { type: "string" },
        page_size: { type: "number" },
        page: { type: "number" },
        resolve_references: { type: "boolean" }
      }
    }
  },
  {
    name: "judilibre.decision",
    description: "Récupère une décision complète par identifiant.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        query: { type: "string" },
        operator: { type: "string" },
        resolve_references: { type: "boolean" }
      },
      required: ["id"]
    }
  },
  {
    name: "judilibre.taxonomy",
    description: "Résout une entrée de taxonomie JUDILIBRE.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        key: { type: "string" },
        value: { type: "string" },
        context_value: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "judilibre.stats",
    description: "Retourne les statistiques du service Judilibre.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "judilibre.healthcheck",
    description: "Vérifie la disponibilité du backend Judilibre.",
    inputSchema: { type: "object", properties: {} }
  }
];

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "judilibre-mcp", base: JUDILIBRE_BASE_URL });
});

app.get("/mcp/sse", auth, (req, res) => {
  const session = crypto.randomUUID();
  log("sse open", session);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.write(`event: endpoint\ndata: /mcp/message?session=${session}\n\n`);
  const timer = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, SSE_KEEPALIVE_MS);
  req.on("close", () => {
    clearInterval(timer);
    log("sse close", session);
  });
});

app.post("/mcp/message", auth, async (req, res) => {
  const { method, params, id } = req.body || {};
  log("rpc", method);
  try {
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "judilibre-mcp", version: "2.0.0" },
          capabilities: { tools: {} }
        }
      });
    }

    if (method === "tools/list") {
      return res.json({ jsonrpc: "2.0", id, result: { tools } });
    }

    if (method === "tools/call") {
      const name = params?.name;
      const args = params?.arguments || {};
      let result;
      if (name === "judilibre.search") result = await jfetch("/search", args);
      else if (name === "judilibre.decision") result = await jfetch("/decision", args);
      else if (name === "judilibre.taxonomy") result = await jfetch("/taxonomy", args);
      else if (name === "judilibre.stats") result = await jfetch("/stats");
      else if (name === "judilibre.healthcheck") result = await jfetch("/healthcheck");
      else throw new Error("Unknown tool");

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        }
      });
    }

    return res.status(400).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: "Method not found" }
    });
  } catch (error) {
    log("error", error.message);
    return res.status(500).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: error.message }
    });
  }
});

app.listen(PORT, () => {
  log(`judilibre-mcp listening on ${PORT}`);
});
