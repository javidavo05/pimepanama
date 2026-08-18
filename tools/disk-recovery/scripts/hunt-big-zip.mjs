#!/usr/bin/env node
/**
 * Busca .zip >= 4 GB: catálogo HFS (desmontado) + PhotoRec espacio libre.
 * Temporales en USB (.pime-photorec-scratch) con purga continua.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  mountVolume,
  unmountVolume,
  getDeviceMountPoint,
  runSudo,
  hasSudoPassword,
  spawnSudoLong,
} from "../lib/sudo-read.mjs";
import { scanHfsInodeIndex } from "../lib/hfs-recovery.mjs";
import { purgePhotorecCarvedOutput } from "../lib/scanner.mjs";

const MIN = 4 * 1024 * 1024 * 1024;
const DEVICE = process.env.PIME_RECOVERY_DEVICE || "/dev/disk5s2";
const VOLUME_PATH = process.env.PIME_RECOVERY_VOLUME || "/Volumes/1 TB";
const MAX_RUNTIME_MS = Number(process.env.PIME_ZIP_HUNT_MS || 30 * 60 * 1000);

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString("es")}] ${msg}`);
}

function formatGb(n) {
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function parsePhotorecLog(logPath) {
  if (!fs.existsSync(logPath)) return { zips: [], pct: null, total: 0 };
  const text = fs.readFileSync(logPath, "utf8");
  const tail = text.slice(Math.max(0, text.length - 15000));
  const totalSectors = text.match(/(\d+) sectors \(RO\)/)?.[1];
  const reading = tail.match(/Reading sector\s+(\d+)\/(\d+)/);
  const sector = reading?.[1] ?? [...tail.matchAll(/\t\s*(\d+)-\d+/g)].pop()?.[1];
  const total = reading?.[2] ?? totalSectors;
  let pct = null;
  if (sector && total) pct = ((Number(sector) / Number(total)) * 100).toFixed(2);

  /** @type {{ name: string; sizeBytes: number; start: number; end: number }[]} */
  const zips = [];
  let entryCount = 0;
  for (const line of text.split("\n")) {
    const m = line.match(/^(\S+)\s+(\d+)-(\d+)\s*$/);
    if (!m) continue;
    entryCount += 1;
    const name = path.basename(m[1]);
    if (!/\.zip$/i.test(name)) continue;
    const s0 = Number(m[2]);
    const s1 = Number(m[3]);
    const sizeBytes = (s1 - s0 + 1) * 512;
    zips.push({ name, sizeBytes, start: s0, end: s1 });
  }
  return { zips, pct, total: entryCount };
}

async function main() {
  if (!hasSudoPassword()) {
    console.error("Falta ~/.pime-disk-recovery/sudo-password");
    process.exit(1);
  }

  const photorec = spawnSync("which", ["photorec"], { encoding: "utf8" });
  if (photorec.status !== 0) {
    console.error("Instala PhotoRec: brew install testdisk");
    process.exit(1);
  }

  let mountPoint = getDeviceMountPoint(DEVICE);
  if (mountPoint) {
    log(`Desmontando ${mountPoint} para índice HFS…`);
    const um = unmountVolume(mountPoint);
    if (!um.ok) {
      console.error("No se pudo desmontar:", um.stderr);
      process.exit(1);
    }
  }

  log("=== Fase 1: catálogo HFS (disco desmontado) ===");
  const catalog = scanHfsInodeIndex(
    { device: DEVICE, fileSystem: "Journaled HFS+" },
    log,
    ["zip"]
  );
  const bigCatalog = catalog.filter((f) => f.sizeBytes >= MIN);
  if (bigCatalog.length) {
    log("*** .zip >= 4 GB en catálogo HFS ***");
    for (const f of bigCatalog) {
      log(`${formatGb(f.sizeBytes)}  ${f.relativePath}  inode ${f.inode}`);
    }
    process.exit(0);
  }
  log(`Catálogo: ${catalog.length} .zip, ninguno >= 4 GB.`);

  const workBase = path.join(
    process.env.TMPDIR || "/tmp",
    "pime-disk-recovery",
    "hunt-4gb-zip"
  );
  const sessionDir = path.join(workBase, "photorec-work");
  try {
    fs.rmSync(workBase, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  fs.mkdirSync(sessionDir, { recursive: true });
  const logPath = path.join(sessionDir, "photorec.log");

  log("=== Fase 2: PhotoRec espacio libre (disco desmontado, purga continua) ===");
  log(`Índice en: ${workBase} (fragmentos se borran al instante)`);

  const optStr = "options,fileopt,everything,enable,freespace,search";
  const args = [
    "/log",
    "/logname",
    logPath,
    "/d",
    sessionDir,
    "/cmd",
    DEVICE,
    optStr,
  ];

  const purgeTimer = setInterval(() => purgePhotorecCarvedOutput(sessionDir), 300);
  /** @type {string[]} */
  const photorecLines = [];
  const proc = spawnSudoLong(photorec.stdout.trim(), args, {
    stdinNull: true,
    onLine: (line) => {
      photorecLines.push(line);
      if (/error|unable|can't/i.test(line)) log(`PhotoRec: ${line}`);
    },
  });

  const start = Date.now();
  let lastPct = "";
  let photorecDone = false;
  proc.promise.catch(() => {}).finally(() => {
    photorecDone = true;
  });

  await new Promise((resolve) => {
    const iv = setInterval(() => {
      const { zips, pct, total } = parsePhotorecLog(logPath);
      const big = zips.filter((z) => z.sizeBytes >= MIN).sort((a, b) => b.sizeBytes - a.sizeBytes);

      if (pct && pct !== lastPct) {
        lastPct = pct;
        log(`Progreso ${pct}% · fragmentos ${total} · .zip en log: ${zips.length}`);
      }

      if (big.length) {
        log("\n*** ENCONTRADO .zip >= 4 GB (espacio libre) ***");
        for (const z of big) {
          log(`${formatGb(z.sizeBytes)}  ${z.name}  sectores ${z.start}-${z.end}`);
        }
        clearInterval(iv);
        proc.kill("SIGTERM");
        resolve(null);
        return;
      }

      if (Date.now() - start > MAX_RUNTIME_MS) {
        log(`\nTiempo límite (${MAX_RUNTIME_MS / 60000} min). Mejor .zip hasta ahora:`);
        const top = zips.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 8);
        if (!top.length) log("Ningún .zip en el log aún — el escaneo completo puede tardar horas.");
        else top.forEach((z) => log(` ${formatGb(z.sizeBytes)}  ${z.name}`));
        const hit = zips.some((z) => z.sizeBytes >= MIN);
        if (!hit) log("Ningún .zip >= 4 GB en esta ventana.");
        clearInterval(iv);
        proc.kill("SIGTERM");
        resolve(null);
      }
    }, 8000);

    proc.promise.finally(() => {
      clearInterval(iv);
      if (photorecDone && photorecLines.length) {
        const tail = photorecLines.slice(-5).join(" | ");
        log(`PhotoRec terminó. Últimas líneas: ${tail}`);
      }
      resolve(null);
    });
  });

  clearInterval(purgeTimer);
  purgePhotorecCarvedOutput(sessionDir);
  try {
    fs.rmSync(workBase, { recursive: true, force: true });
  } catch {
  }
  log("Fin.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
