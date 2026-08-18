#!/usr/bin/env node
/**
 * Pime Disk Recovery — portal web local para recuperar archivos borrados.
 *   npm run disk-recovery:web
 */

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { listVolumes } from "./lib/volumes.mjs";
import { getScan, startScan, cancelActivePhotorec, cleanupOrphanPhotorecWork } from "./lib/scanner.mjs";
import { restoreFiles } from "./lib/restore.mjs";
import { sleuthkitStatus } from "./lib/hfs-recovery.mjs";
import { openFullDiskAccessSettings, probeTrashAccessFull, probeSudo, hasSudoPassword, unmountVolume } from "./lib/trash-access.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PIME_DISK_RECOVERY_PORT || 3947);
const HOST = process.env.PIME_DISK_RECOVERY_HOST || "0.0.0.0";

function lanAddresses() {
  /** @type {string[]} */
  const addrs = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) addrs.push(iface.address);
    }
  }
  return addrs;
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function ndjsonStream(res) {
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  return {
    send(obj) {
      res.write(`${JSON.stringify(obj)}\n`);
    },
    end() {
      res.end();
    },
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(res, pathname) {
  const safe = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(PUBLIC_DIR, path.normalize(safe).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(file);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
  };
  res.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

function photorecStatus() {
  const r = spawnSync("which", ["photorec"], { encoding: "utf8" });
  return { installed: r.status === 0, path: r.stdout.trim() || null };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/state") {
    const ips = lanAddresses();
    return json(res, 200, {
      port: PORT,
      platform: process.platform,
      home: os.homedir(),
      defaultRestoreDir: path.join(os.homedir(), "Desktop", "Recuperados"),
      photorec: photorecStatus(),
      sleuthkit: sleuthkitStatus(),
      sudo: {
        configured: hasSudoPassword(),
        probe: hasSudoPassword() ? probeSudo() : { ok: false, message: "sin contraseña local" },
      },
      setup: {
        photorecReady: photorecStatus().installed,
        sudoReady: hasSudoPassword() && probeSudo().ok,
        allReady: photorecStatus().installed && hasSudoPassword() && probeSudo().ok,
      },
      urls: {
        local: `http://localhost:${PORT}`,
        lan: ips.map((ip) => `http://${ip}:${PORT}`),
      },
    });
  }

  if (req.method === "GET" && url.pathname === "/api/volumes") {
    const volumes = listVolumes().map((v) => ({
      ...v,
      trash: probeTrashAccessFull(v.mountPoint),
    }));
    return json(res, 200, { volumes });
  }

  if (req.method === "POST" && url.pathname === "/api/unmount") {
    const body = await readBody(req);
    const { volumePath } = body;
    if (!volumePath) return json(res, 400, { error: "volumePath requerido" });
    if (!hasSudoPassword()) return json(res, 400, { error: "sudo no configurado" });
    const r = unmountVolume(volumePath);
    if (!r.ok) return json(res, 500, { error: r.stderr || "No se pudo desmontar" });
    return json(res, 200, { ok: true, message: "Volumen desmontado" });
  }

  if (req.method === "POST" && url.pathname === "/api/open-full-disk-access") {
    const ok = openFullDiskAccessSettings();
    return json(res, 200, { ok });
  }

  if (req.method === "GET" && url.pathname === "/api/trash-probe") {
    const volumePath = url.searchParams.get("volume");
    if (!volumePath) return json(res, 400, { error: "volume requerido" });
    return json(res, 200, { probe: probeTrashAccess(volumePath) });
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/scan/")) {
    const id = url.pathname.split("/").pop();
    const session = id ? getScan(id) : null;
    if (!session) return json(res, 404, { error: "Escaneo no encontrado" });
    return json(res, 200, { session });
  }

  if (req.method === "POST" && url.pathname === "/api/scan") {
    const body = await readBody(req);
    const volumePath = body.volumePath;
    const mode = body.mode ?? "trash";
    if (!volumePath) return json(res, 400, { error: "volumePath requerido" });

    const stream = body.stream === true;
    if (stream) {
      const nd = ndjsonStream(res);
      const session = await startScan({
        volumePath,
        mode,
        onStart: (s) => nd.send({ type: "started", session: { id: s.id, mode: s.mode, status: s.status } }),
        onLog: (msg) => nd.send({ type: "log", message: msg }),
        onFile: (file) => nd.send({ type: "file", file }),
      });
      nd.send({ type: "done", session });
      nd.end();
      return;
    }

    const session = await startScan({ volumePath, mode });
    return json(res, 200, { session });
  }

  if (req.method === "POST" && url.pathname === "/api/scan/cancel") {
    const stopped = cancelActivePhotorec();
    return json(res, 200, { ok: stopped, message: stopped ? "Deteniendo PhotoRec…" : "No hay escaneo activo" });
  }

  if (req.method === "POST" && url.pathname === "/api/restore") {
    const body = await readBody(req);
    const { scanId, fileIds, destination } = body;
    if (!scanId || !Array.isArray(fileIds) || !destination) {
      return json(res, 400, { error: "scanId, fileIds y destination requeridos" });
    }

    if (body.stream === true) {
      const nd = ndjsonStream(res);
      try {
        const result = restoreFiles({
          scanId,
          fileIds,
          destination,
          onProgress: (evt) => nd.send({ type: "progress", ...evt }),
        });
        nd.send({ type: "done", result });
      } catch (e) {
        nd.send({ type: "error", error: e instanceof Error ? e.message : String(e) });
      }
      nd.end();
      return;
    }

    try {
      const result = restoreFiles({ scanId, fileIds, destination });
      return json(res, 200, { result });
    } catch (e) {
      return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, url);
    } catch (e) {
      json(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }
  serveStatic(res, url.pathname);
});

server.listen(PORT, HOST, () => {
  cleanupOrphanPhotorecWork();
  const ips = lanAddresses();
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Pime Disk Recovery — Recuperación de archivos  ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Red LAN: http://${ip}:${PORT}`);
  console.log("\n  Solo lectura en el disco externo. Restaura a ~/Desktop/Recuperados");
  console.log("  Escaneo profundo requiere: brew install testdisk\n");
  console.log("  Ctrl+C para detener.\n");
});
