// Replit-only startup; the repository's application and strategy stay unchanged.
process.env.HOST ??= "0.0.0.0";
process.env.PORT ??= "5000";
// A non-default SQLite path avoids automatic migration of the legacy JSON ledger.
process.env.DATA_PATH ??= "./data/v2-preparation.sqlite";

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 24 || (major === 24 && minor < 5)) {
  throw new Error("Hardened V2 requires Node 24.5 or newer.");
}

const {createServer} = await import("../src/server.js");
const {config} = await import("../src/config.js");
const {codeFingerprint} = await import("../src/version.js");
const server = createServer();

// Preserve every other CSP restriction and permit only self/trusted Replit framing.
// The default standalone server retains its original frame-ancestors 'none' policy.
server.prependListener("request", (_req, res) => {
  const original = res.writeHead;
  res.writeHead = function (...args) {
    const index = typeof args[1] === "string" ? 2 : 1;
    const headers = args[index];
    if (headers?.["content-security-policy"]) {
      args[index] = {
        ...headers,
        "content-security-policy": headers["content-security-policy"].replace(
          "frame-ancestors 'none'",
          "frame-ancestors 'self' https://replit.com"
        )
      };
    }
    return original.apply(this, args);
  };
});

server.listen(config.port, process.env.HOST, () => {
  console.log(`Paper-only ${config.version} listening on ${process.env.HOST}:${config.port}`);
  console.log(`Node ${process.version}; application fingerprint ${codeFingerprint}`);
});
