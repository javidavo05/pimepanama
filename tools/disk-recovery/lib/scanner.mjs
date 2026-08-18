import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { assertSafeVolume } from "./volumes.mjs";
import {
  FDA_HINT,
  filterPathsOnVolume,
  listTrashPathsViaFinder,
  listTrashPathsViaSudo,
  probeTrashAccess,
} from "./trash-access.mjs";
import { statViaSudo, listTrashPathsViaSudoDetailed, spawnSudoLong, unmountVolume, mountVolume, getDeviceMountPoint, hasSudoPassword, runSudo } from "./sudo-read.mjs";
import { scanHfsCatalog, scanHfsInodeIndex } from "./hfs-recovery.mjs";
import { resolveVolumeDevice } from "./volumes.mjs";

/** @type {{ write: (data: string) => void; kill: (signal?: NodeJS.Signals) => void } | null} */
let activePhotorecProc = null;
/** @type {string | null} */
let activeScanWorkId = null;
/** @type {string | null} */
let activeScanVolumePath = null;

const PHOTOREC_PURGE_MS = 300;
const INTERNAL_TMP_WARN_BYTES = 400 * 1024 * 1024;

export function cancelActivePhotorec() {
  if (!activePhotorecProc) {
    killStalePhotorecProcesses();
    return false;
  }
  activePhotorecProc.kill("SIGTERM");
  if (activeScanWorkId) {
    cleanupScanWorkDir(activeScanWorkId, activeScanVolumePath);
    activeScanWorkId = null;
    activeScanVolumePath = null;
  }
  killStalePhotorecProcesses();
  return true;
}

function stripAnsi(text) {
  return text
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\r/g, "")
    .trim();
}

/** @returns {{ stdin?: string; log?: string }} */
function photorecAutoReply(plain) {
  // PhotoRec trata Enter (\n) y 's' como "detener escaneo" (check_enter_key_or_s).
  // Nunca enviar \n durante el escaneo — solo teclas sueltas.
  if (/Answer Y to really Quit/i.test(plain)) {
    return { stdin: "N", log: "↩ Reanudando escaneo (respuesta automática: N)" };
  }
  if (/continue.*session|resume.*recovery|use.*previous session/i.test(plain)) {
    return { stdin: "y", log: "Reanudando sesión PhotoRec anterior…" };
  }
  return {};
}

function isUsefulPhotorecLine(plain) {
  if (!plain || plain.length < 4) return false;
  if (/^PhotoRec 7\.|^Christophe|^https:\/\/www\.cgsecurity/i.test(plain)) return false;
  return /Pass \d|files found|recovered|Elapsed time|Estimated time|sector|txt:|jpg:|pdf:|png:|mp4:|PhotoRec exited|Destination |Reading sector/i.test(
    plain
  );
}

/** Directorios donde PhotoRec escribe (sessionDir, sessionDir.1, …). */
function photorecOutputRoots(sessionDir) {
  const parent = path.dirname(sessionDir);
  const base = path.basename(sessionDir);
  /** @type {string[]} */
  const roots = [];
  try {
    for (const name of fs.readdirSync(parent)) {
      if (name === base || name.startsWith(`${base}.`)) {
        roots.push(path.join(parent, name));
      }
    }
  } catch {
    roots.push(sessionDir);
  }
  return roots.length ? roots : [sessionDir];
}

function countPhotorecRecovered(sessionDir, extensions = null) {
  let n = 0;
  for (const root of photorecOutputRoots(sessionDir)) {
    walkFiles(root, (abs) => {
      const base = path.basename(abs);
      if (base === "photorec.log" || base.endsWith(".ses") || base === "report.xml") return;
      if (extensions && !matchesExtensions(base, extensions)) return;
      n += 1;
    });
  }
  return n;
}

function parsePhotorecLogTail(logPath) {
  if (!fs.existsSync(logPath)) return null;
  try {
    const buf = fs.readFileSync(logPath);
    const text = buf.toString("utf8");
    const tail = buf.slice(Math.max(0, buf.length - 12_000)).toString("utf8");
    const pass = [...tail.matchAll(/Pass (\d+)/g)].pop()?.[1] ?? null;
    const sector = [...tail.matchAll(/\t\s*(\d+)-\d+/g)].pop()?.[1] ?? null;
    const totalSectors = text.match(/(\d+) sectors \(RO\)/)?.[1] ?? null;
    const reading = tail.match(/Reading sector\s+(\d+)\/(\d+)/);
    const elapsed = [...tail.matchAll(/Elapsed time ([^\n]+)/g)].pop()?.[1]?.trim() ?? null;
    const lastLine = tail
      .trim()
      .split("\n")
      .pop()
      ?.trim();
    const halted = /^PhotoRec has been stopped$/i.test(lastLine ?? "");
    return {
      pass,
      sector,
      totalSectors,
      elapsed,
      halted,
      readingCurrent: reading?.[1] ?? sector,
      readingTotal: reading?.[2] ?? totalSectors,
    };
  } catch {
    return null;
  }
}

/** @typedef {"trash" | "orphan" | "deep" | "zip" | "zip-full" | "full" | "recycle"} ScanMode */
/** @typedef {"trash" | "orphan" | "carved" | "recycle" | "deleted" | "catalog"} RecoverSource */

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   relativePath: string;
 *   absolutePath: string;
 *   sizeBytes: number;
 *   modifiedAt: string | null;
 *   source: RecoverSource;
 *   confidence: "high" | "medium" | "low";
 *   mimeHint: string;
 *   inode?: number;
 *   device?: string;
 *   fsType?: string;
 *   partitionOffsetSectors?: number;
 *   carveDevice?: string;
 *   carveSectorStart?: number;
 *   carveSectorEnd?: number;
 * }} RecoverableFile
 */

/**
 * @typedef {{
 *   id: string;
 *   volumePath: string;
 *   volumeName: string;
 *   mode: ScanMode;
 *   status: "running" | "done" | "error";
 *   startedAt: string;
 *   finishedAt: string | null;
 *   files: RecoverableFile[];
 *   log: string[];
 *   error: string | null;
 * }} ScanSession
 */

/** @type {Map<string, ScanSession>} */
export const scans = new Map();

function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fileExtension(name) {
  const ext = path.extname(String(name ?? "")).toLowerCase();
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

function matchesExtensions(name, extensions) {
  if (!extensions?.length) return true;
  const ext = fileExtension(name);
  return extensions.some((e) => e.toLowerCase().replace(/^\./, "") === ext);
}

/**
 * @param {RecoverableFile} file
 * @param {ScanSession} session
 * @param {(file: RecoverableFile) => void} [onFile]
 */
function addFileToSession(session, file, onFile) {
  if (!session._seenPaths) session._seenPaths = new Set();
  const key =
    file.source === "carved" && file.carveDevice
      ? `carve:${file.carveDevice}:${file.carveSectorStart}-${file.carveSectorEnd}:${file.name}`
      : `${file.absolutePath}::${file.sizeBytes}`;
  if (session._seenPaths.has(key)) return false;
  session._seenPaths.add(key);
  session.files.push(file);
  onFile?.(file);
  return true;
}

function makeRecoverableFile(abs, source, confidence, relativeBase) {
  const st = safeStat(abs);
  let sizeBytes = st?.size ?? 0;
  let modifiedAt = st?.mtime?.toISOString() ?? null;
  if (!st?.isFile()) {
    const viaSudo = statViaSudo(abs);
    if (!viaSudo) return null;
    sizeBytes = viaSudo.sizeBytes;
    modifiedAt = viaSudo.modifiedAt;
  }
  const name = path.basename(abs);
  return {
    id: randomUUID(),
    name,
    relativePath: path.relative(relativeBase, abs),
    absolutePath: abs,
    sizeBytes,
    modifiedAt,
    source,
    confidence,
    mimeHint: extHint(name),
  };
}

/**
 * Borra archivos que PhotoRec escribe durante el escaneo (fragmentos en disco).
 * Solo conserva photorec.log y photorec.ses para reanudar.
 * @param {string} sessionDir
 */
export function purgePhotorecCarvedOutput(sessionDir) {
  for (const root of photorecOutputRoots(sessionDir)) {
    try {
      spawnSync(
        "find",
        [
          root,
          "-type",
          "f",
          "!",
          "-name",
          "photorec.log",
          "!",
          "-name",
          "*.ses",
          "!",
          "-name",
          "report.xml",
          "-delete",
        ],
        { stdio: "ignore", timeout: 60_000 }
      );
      spawnSync("find", [root, "-mindepth", "1", "-type", "d", "-empty", "-delete"], {
        stdio: "ignore",
        timeout: 30_000,
      });
    } catch {
      walkFiles(root, (abs) => {
        const base = path.basename(abs);
        if (base === "photorec.log" || base.endsWith(".ses") || base === "report.xml") return;
        try {
          fs.unlinkSync(abs);
        } catch {
          /* ignore */
        }
      });
    }
  }
}

function photorecWorkDirSize(sessionDir) {
  let total = 0;
  for (const root of photorecOutputRoots(sessionDir)) {
    walkFiles(root, (abs) => {
      try {
        const base = path.basename(abs);
        if (base === "photorec.log" || base.endsWith(".ses") || base === "report.xml") return;
        total += fs.statSync(abs).size;
      } catch {
        /* ignore */
      }
    });
  }
  return total;
}

/**
 * Purga fragmentos de PhotoRec varias veces por segundo mientras corre el escaneo.
 * @param {string} sessionDir
 * @param {{ internalTmp?: boolean; onBloat?: (bytes: number) => void }} [opts]
 */
function startPhotorecPurger(sessionDir, opts = {}) {
  const { internalTmp = false, onBloat } = opts;
  const tick = () => {
    purgePhotorecCarvedOutput(sessionDir);
    if (internalTmp) {
      const sz = photorecWorkDirSize(sessionDir);
      if (sz > INTERNAL_TMP_WARN_BYTES) onBloat?.(sz);
    }
  };
  tick();
  const timer = setInterval(tick, PHOTOREC_PURGE_MS);
  return () => clearInterval(timer);
}

/** Mata PhotoRec huérfano y borra temporales internos al arrancar el servidor. */
export function cleanupOrphanPhotorecWork() {
  killStalePhotorecProcesses();
  const base = path.join(os.tmpdir(), "pime-disk-recovery");
  try {
    fs.rmSync(base, { recursive: true, force: true });
  } catch {
    if (hasSudoPassword()) runSudo(["rm", "-rf", base]);
  }
}

/** @param {string} logPath @param {string[] | null} extensions */
function countPhotorecLogEntries(logPath, extensions = null) {
  if (!fs.existsSync(logPath)) return { matched: 0, total: 0 };
  let matched = 0;
  let total = 0;
  const text = fs.readFileSync(logPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\S+\s+(\d+)-(\d+)\s*$/);
    if (!m) continue;
    total += 1;
    const name = path.basename(line.split(/\s+/)[0]);
    if (matchesExtensions(name, extensions)) matched += 1;
  }
  return { matched, total };
}

/**
 * @param {string} device
 * @param {string} name
 * @param {number} sectorStart
 * @param {number} sectorEnd
 */
function makeCarvedIndexFile(device, name, sectorStart, sectorEnd) {
  const sectors = sectorEnd - sectorStart + 1;
  return {
    id: randomUUID(),
    name,
    relativePath: name,
    absolutePath: `carve://${device}/${sectorStart}-${sectorEnd}/${name}`,
    sizeBytes: sectors * 512,
    modifiedAt: null,
    source: /** @type {const} */ ("carved"),
    confidence: /** @type {const} */ ("medium"),
    mimeHint: extHint(name),
    carveDevice: device,
    carveSectorStart: sectorStart,
    carveSectorEnd: sectorEnd,
  };
}

/**
 * Indexa hallazgos desde photorec.log (sin conservar archivos en disco).
 * @returns {() => void} stop
 */
function startPhotorecLogIndexer(sessionDir, logPath, device, { extensions, onDiscover, intervalMs = 2500 }) {
  const known = new Set();

  const tick = () => {
    purgePhotorecCarvedOutput(sessionDir);
    if (!fs.existsSync(logPath)) return;

    for (const line of fs.readFileSync(logPath, "utf8").split("\n")) {
      const m = line.match(/^(\S+)\s+(\d+)-(\d+)\s*$/);
      if (!m) continue;
      const name = path.basename(m[1]);
      if (!matchesExtensions(name, extensions)) continue;
      const sectorStart = Number(m[2]);
      const sectorEnd = Number(m[3]);
      const key = `${device}:${sectorStart}-${sectorEnd}:${name}`;
      if (known.has(key)) continue;
      known.add(key);
      onDiscover(makeCarvedIndexFile(device, name, sectorStart, sectorEnd));
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

/**
 * @param {string} scanId
 * @param {string | null} [volumePath]
 */
export function cleanupScanWorkDir(scanId, volumePath = null) {
  /** @type {string[]} */
  const dirs = [path.join(os.tmpdir(), "pime-disk-recovery", scanId)];
  if (volumePath) {
    dirs.push(path.join(volumePath, ".pime-photorec-scratch", scanId));
    const dev = resolveVolumeDevice(volumePath);
    if (dev?.device) {
      const mp = getDeviceMountPoint(dev.device);
      if (mp) dirs.push(path.join(mp, ".pime-photorec-scratch", scanId));
    }
  }
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    if (fs.existsSync(dir) && hasSudoPassword()) {
      runSudo(["rm", "-rf", dir]);
    }
  }
}

function extHint(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".zip": "application/zip",
    ".txt": "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}

function safeStat(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function walkFiles(dir, onFile, depth = 0, onError) {
  if (depth > 12) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    onError?.(dir, e);
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkFiles(full, onFile, depth + 1, onError);
    } else if (ent.isFile()) {
      onFile(full);
    }
  }
}

function pushRecoverableFile(files, volumePath, abs, source, confidence) {
  let st = safeStat(abs);
  let sizeBytes = st?.size ?? 0;
  let modifiedAt = st?.mtime?.toISOString() ?? null;

  if (!st?.isFile()) {
    const viaSudo = statViaSudo(abs);
    if (!viaSudo) return;
    sizeBytes = viaSudo.sizeBytes;
    modifiedAt = viaSudo.modifiedAt;
  }

  const name = path.basename(abs);
  files.push({
    id: randomUUID(),
    name,
    relativePath: path.relative(volumePath, abs),
    absolutePath: abs,
    sizeBytes,
    modifiedAt,
    source,
    confidence,
    mimeHint: extHint(name),
  });
}

/**
 * @param {string} volumePath
 * @param {(msg: string) => void} log
 * @param {string[] | null} extensions
 * @param {(file: RecoverableFile) => void} [onFile]
 */
function scanQuickMetadata(volumePath, log, extensions, onFile) {
  /** @type {RecoverableFile[]} */
  const collected = [];
  const emitFrom = (list) => {
    for (const f of list) {
      if (extensions && !matchesExtensions(f.name, extensions)) continue;
      collected.push(f);
      onFile?.(f);
    }
  };

  log("── Fase 1/2: escaneo rápido (papelera + índice HFS + restos ocultos) ──");
  emitFrom(scanTrash(volumePath, log));
  emitFrom(scanRecycleBin(volumePath, log));
  emitFrom(scanOrphans(volumePath, log));

  const dev = resolveVolumeDevice(volumePath);
  if (dev?.device && /hfs/i.test(dev.fileSystem ?? "")) {
    emitFrom(scanHfsCatalog(volumePath, log, extensions));
  }

  const unique = dedupeFiles(collected);
  const label = extensions?.length === 1 ? `.${extensions[0]}` : "archivo(s)";
  if (unique.length) log(`Rápido (montado): ${unique.length} ${label} en papelera/restos.`);
  else log(`Rápido (montado): sin ${label} en papelera/restos.`);
  return unique;
}

/**
 * @param {string} volumePath
 * @param {(msg: string) => void} log
 * @returns {RecoverableFile[]}
 */
function scanTrashViaSudo(volumePath, log) {
  if (!hasSudoPassword()) {
    log("Sin contraseña sudo local (~/.pime-disk-recovery/sudo-password).");
    return [];
  }

  log("Intentando papelera con sudo (find en .Trashes)…");
  const { paths, blocked } = listTrashPathsViaSudoDetailed(volumePath);
  if (blocked) {
    log("⚠ macOS bloquea .Trashes incluso con sudo (TCC). Activa Acceso total al disco para Terminal/Cursor, o usa PhotoRec.");
  }
  /** @type {RecoverableFile[]} */
  const files = [];
  for (const abs of paths) {
    pushRecoverableFile(files, volumePath, abs, "trash", "high");
  }
  log(`sudo (.Trashes): ${files.length} archivo(s).`);
  return files;
}

function scanTrashFallbacks(volumePath, log) {
  const viaSudo = scanTrashViaSudo(volumePath, log);
  if (viaSudo.length > 0) return viaSudo;
  return scanTrashViaFinder(volumePath, log);
}

/**
 * @param {string} volumePath
 * @param {(msg: string) => void} log
 * @returns {RecoverableFile[]}
 */
function scanTrashViaFinder(volumePath, log) {
  log("Intentando papelera vía Finder (alternativa cuando macOS bloquea .Trashes)…");
  const paths = filterPathsOnVolume(volumePath, listTrashPathsViaFinder(volumePath));
  /** @type {RecoverableFile[]} */
  const files = [];

  for (const abs of paths) {
    const st = safeStat(abs);
    if (st?.isDirectory()) {
      walkFiles(abs, (fileAbs) => pushRecoverableFile(files, volumePath, fileAbs, "trash", "high"));
    } else {
      pushRecoverableFile(files, volumePath, abs, "trash", "high");
    }
  }

  log(`Finder (papelera): ${files.length} archivo(s) en este volumen.`);
  return files;
}

/**
 * @param {string} volumePath
 * @param {(msg: string) => void} log
 * @returns {RecoverableFile[]}
 */
function scanTrash(volumePath, log) {
  /** @type {RecoverableFile[]} */
  const files = [];
  const trashesRoot = path.join(volumePath, ".Trashes");
  if (!fs.existsSync(trashesRoot)) {
    log("No hay carpeta .Trashes en este volumen.");
    return scanTrashFallbacks(volumePath, log);
  }

  const probe = probeTrashAccess(volumePath);
  if (!probe.ok) {
    log(`⚠ Acceso directo bloqueado (${probe.code ?? "sin permiso"}).`);
    return scanTrashFallbacks(volumePath, log);
  }

  log(`Escaneando papelera del volumen: ${trashesRoot}`);
  let permError = false;

  let uidDirs;
  try {
    uidDirs = fs.readdirSync(trashesRoot);
  } catch (e) {
    const err = /** @type {NodeJS.ErrnoException} */ (e);
    log(`⚠ No se pudo leer .Trashes (${err.code ?? err.message}).`);
    return scanTrashFallbacks(volumePath, log);
  }

  for (const uidDir of uidDirs) {
    const trashDir = path.join(trashesRoot, uidDir);
    if (!safeStat(trashDir)?.isDirectory()) continue;
    walkFiles(
      trashDir,
      (abs) => pushRecoverableFile(files, volumePath, abs, "trash", "high"),
      0,
      (dir, e) => {
        if (!permError) {
          permError = true;
          const err = /** @type {NodeJS.ErrnoException} */ (e);
          log(`⚠ Permiso denegado en ${dir} (${err.code ?? "error"}).`);
        }
      }
    );
  }

  if (files.length === 0) {
    return dedupeFiles([...files, ...scanTrashFallbacks(volumePath, log)]);
  }

  log(`Papelera: ${files.length} archivo(s) encontrado(s).`);
  return files;
}

/**
 * @param {string} volumePath
 * @param {(msg: string) => void} log
 * @returns {RecoverableFile[]}
 */
function scanRecycleBin(volumePath, log) {
  /** @type {RecoverableFile[]} */
  const files = [];
  const recycle = path.join(volumePath, "$RECYCLE.BIN");
  if (!fs.existsSync(recycle)) return files;
  log(`Escaneando $RECYCLE.BIN (Windows): ${recycle}`);
  walkFiles(recycle, (abs) => {
    const st = safeStat(abs);
    if (!st?.isFile()) return;
    const name = path.basename(abs);
    files.push({
      id: randomUUID(),
      name,
      relativePath: path.relative(volumePath, abs),
      absolutePath: abs,
      sizeBytes: st.size,
      modifiedAt: st.mtime.toISOString(),
      source: "recycle",
      confidence: "high",
      mimeHint: extHint(name),
    });
  });
  log(`$RECYCLE.BIN: ${files.length} archivo(s).`);
  return files;
}

/**
 * Busca archivos ocultos / temporales que a veces quedan tras borrados.
 * @param {string} volumePath
 * @param {(msg: string) => void} log
 */
function scanOrphans(volumePath, log) {
  /** @type {RecoverableFile[]} */
  const files = [];

  log("Buscando restos en carpetas ocultas del volumen…");
  const hiddenDirs = [".TemporaryItems", ".DocumentRevisions-V100", ".fseventsd"];
  for (const dir of hiddenDirs) {
    const full = path.join(volumePath, dir);
    if (!fs.existsSync(full)) continue;
    walkFiles(full, (abs) => {
      const st = safeStat(abs);
      if (!st?.isFile() || st.size < 64) return;
      const name = path.basename(abs);
      files.push({
        id: randomUUID(),
        name,
        relativePath: path.relative(volumePath, abs),
        absolutePath: abs,
        sizeBytes: st.size,
        modifiedAt: st.mtime.toISOString(),
        source: "orphan",
        confidence: "medium",
        mimeHint: extHint(name),
      });
    });
  }

  // Resource forks huérfanos en raíz (puede fallar EPERM en algunas carpetas del volumen)
  let rootEntries;
  try {
    rootEntries = fs.readdirSync(volumePath);
  } catch (e) {
    const err = /** @type {NodeJS.ErrnoException} */ (e);
    log(`⚠ No se pudo listar la raíz del volumen (${err.code ?? err.message}).`);
    log(`Restos ocultos: ${files.length} archivo(s).`);
    return dedupeFiles(files);
  }

  for (const name of rootEntries) {
    if (!name.startsWith("._")) continue;
    const abs = path.join(volumePath, name);
    const st = safeStat(abs);
    if (!st?.isFile()) continue;
    files.push({
      id: randomUUID(),
      name,
      relativePath: name,
      absolutePath: abs,
      sizeBytes: st.size,
      modifiedAt: st.mtime.toISOString(),
      source: "orphan",
      confidence: "low",
      mimeHint: extHint(name),
    });
  }

  log(`Restos ocultos: ${files.length} archivo(s).`);
  return dedupeFiles(files);
}

function dedupeFiles(files) {
  const seen = new Set();
  return files.filter((f) => {
    const key = `${f.absolutePath}::${f.sizeBytes}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function killStalePhotorecProcesses() {
  spawnSync("pkill", ["-f", "photorec /log"], { stdio: "ignore" });
}

/**
 * @param {string} volumePath
 * @param {string} outputDir
 * @param {(msg: string) => void} log
 * @param {{ extensions?: string[] | null; onFile?: (file: RecoverableFile) => void; session?: ScanSession; spaceMode?: "freespace" | "wholespace"; scanId?: string }} [opts]
 * @returns {Promise<RecoverableFile[]>}
 */
async function scanDeepPhotorec(volumePath, outputDir, log, opts = {}) {
  const { extensions = null, onFile, session, spaceMode = "freespace", scanId = null } = opts;
  const zipOnly = extensions?.length === 1 && extensions[0].toLowerCase() === "zip";
  const freespace = spaceMode === "freespace";
  const photorec = spawnSync("which", ["photorec"], { encoding: "utf8" });
  if (photorec.status !== 0) {
    throw new Error(
      "PhotoRec no está instalado. Instálalo con: brew install testdisk\nLuego reinicia el escaneo profundo."
    );
  }
  if (!hasSudoPassword()) {
    throw new Error("PhotoRec requiere sudo en este Mac. Configura ~/.pime-disk-recovery/sudo-password");
  }

  killStalePhotorecProcesses();
  await new Promise((r) => setTimeout(r, 500));

  const photorecBin = photorec.stdout.trim();
  const deviceInfo = spawnSync("diskutil", ["info", volumePath], { encoding: "utf8" });
  const devMatch = deviceInfo.stdout.match(/Device Node:\s+(\S+)/);
  const device = devMatch?.[1];
  const fileSystem = deviceInfo.stdout.match(/File System Personality:\s+(.+)/)?.[1]?.trim() ?? "unknown";
  if (!device) {
    throw new Error("No se pudo resolver el dispositivo del volumen.");
  }

  const isMounted = /Mounted:\s+Yes/i.test(deviceInfo.stdout);
  if (isMounted) {
    log("Desmontando volumen antes de PhotoRec…");
    const um = unmountVolume(volumePath);
    if (!um.ok) {
      throw new Error(
        `No se pudo desmontar "${path.basename(volumePath)}": ${um.stderr}\nCierra apps que usen el disco.`
      );
    }
    log("✓ Volumen desmontado.");
  }

  log("Índice HFS (disco desmontado — catálogo + borrados)…");
  scanHfsInodeIndex({ device, fileSystem }, log, extensions, (file) => {
    if (session) addFileToSession(session, file, onFile);
    else onFile?.(file);
  });

  // PhotoRec requiere el volumen desmontado; temporales en disco interno con purga continua.
  log("PhotoRec: disco desmontado; temporales se purgan cada 0,3 s (solo queda photorec.log).");
  fs.mkdirSync(outputDir, { recursive: true });
  const sessionDir = path.join(outputDir, "photorec-work");
  fs.mkdirSync(sessionDir, { recursive: true });
  const hasSession = fs.existsSync(path.join(sessionDir, "photorec.ses"));
  if (hasSession) log("Reanudando sesión PhotoRec anterior…");

  const buildArgs = (devNode, startSector = 0) => {
    const space = freespace ? "freespace" : "wholespace";
    const optStr = `options,fileopt,everything,enable,${space},search`;
    const cmd = startSector > 0 ? `${startSector},${optStr}` : optStr;
    return [
      "/log",
      "/logname",
      path.join(sessionDir, "photorec.log"),
      "/d",
      sessionDir,
      "/cmd",
      devNode,
      cmd,
    ];
  };

  const emitPhotorecIndex = (file) => {
    if (session) addFileToSession(session, file, onFile);
    else onFile?.(file);
  };

  const runOnce = async (devNode, attempt, startSector = 0) => {
    log(`PhotoRec (${attempt}): escaneando ${devNode} con sudo…`);
    if (startSector > 0) {
      log(`Reanudando desde sector ${startSector.toLocaleString("es")}…`);
    }
    log("PhotoRec solo indexa hallazgos; no guarda archivos en tu Mac hasta pulsar Restaurar.");
    if (zipOnly) {
      if (freespace) {
        log("PhotoRec: solo espacio libre (no asignado) — mucho más rápido que disco completo.");
        log("La tabla filtra .zip. Si no aparece, prueba «.zip exhaustivo».");
      } else {
        log("PhotoRec: lectura de TODO el disco (puede tardar días en 930 GB).");
      }
    } else if (freespace) {
      log("PhotoRec: escaneando solo espacio libre del volumen (horas, no días).");
    } else {
      log("Puede tardar horas en discos grandes. El progreso se actualiza cada ~15 s.");
    }
    const lines = [];
    let lastProgress = "";
    const logPath = path.join(sessionDir, "photorec.log");

    const stopIndexer = startPhotorecLogIndexer(sessionDir, logPath, devNode, {
      extensions: extensions ?? null,
      onDiscover: (file) => {
        emitPhotorecIndex(file);
        if (zipOnly) {
          log(`📦 .zip indexado: ${file.name} (~${formatBytes(file.sizeBytes)})`);
        }
      },
      intervalMs: zipOnly ? 2000 : 3000,
    });

    let bloatWarned = false;
    const stopPurger = startPhotorecPurger(sessionDir, {
      internalTmp: true,
      onBloat: (bytes) => {
        purgePhotorecCarvedOutput(sessionDir);
        if (!bloatWarned) {
          bloatWarned = true;
          log(
            `⚠ Temporales internos crecieron (${formatBytes(bytes)}). Purga reforzada — si persiste, cancela el escaneo.`
          );
        }
      },
    });

    const progressTimer = setInterval(() => {
      const info = parsePhotorecLogTail(logPath);
      const { matched: zipCount, total: carvedTotal } = countPhotorecLogEntries(logPath, extensions);
      const parts = [];
      const cur = info?.readingCurrent ? Number(info.readingCurrent) : null;
      const tot = info?.readingTotal ? Number(info.readingTotal) : null;
      if (cur && tot) {
        const pct = ((cur / tot) * 100).toFixed(2);
        parts.push(`${pct}%`);
        parts.push(`sector ${cur.toLocaleString("es")}/${tot.toLocaleString("es")}`);
      } else if (info?.pass) {
        parts.push(`Pass ${info.pass}`);
      }
      if (zipOnly) {
        parts.push(`${zipCount} .zip`);
        if (carvedTotal > zipCount) parts.push(`${carvedTotal} fragmentos`);
      } else {
        parts.push(`${carvedTotal} archivo(s)`);
      }
      if (info?.elapsed) parts.push(info.elapsed);
      const msg = `📊 ${parts.join(" · ")}`;
      if (msg !== lastProgress) {
        lastProgress = msg;
        log(msg);
      }
    }, 5000);

    const progressPurgeTimer = setInterval(() => purgePhotorecCarvedOutput(sessionDir), 1000);

    const proc = spawnSudoLong(photorecBin, buildArgs(devNode, startSector), {
      cwd: sessionDir,
      stdinNull: true,
      onLine: (line) => {
        const plain = stripAnsi(line);
        if (plain) lines.push(plain);

        if (isUsefulPhotorecLine(plain) && plain !== lastProgress) {
          lastProgress = plain;
          log(plain);
        }
      },
    });

    activePhotorecProc = proc;
    try {
      await proc.promise;
      return { ok: true, text: lines.join("\n") };
    } catch (e) {
      const tail = lines.slice(-8).join("\n");
      const hint = tail ? `\n${tail}` : "";
      const err = e instanceof Error ? new Error(`${e.message}${hint}`) : e;
      return { ok: false, text: lines.join("\n"), error: err };
    } finally {
      clearInterval(progressTimer);
      clearInterval(progressPurgeTimer);
      stopPurger();
      stopIndexer();
      purgePhotorecCarvedOutput(sessionDir);
      activePhotorecProc = null;
    }
  };

  const logPath = path.join(sessionDir, "photorec.log");

  function progressPct() {
    const info = parsePhotorecLogTail(logPath);
    const cur = Number(info?.readingCurrent ?? info?.sector ?? 0);
    const tot = Number(info?.readingTotal ?? 0);
    if (!cur || !tot) return 0;
    return (cur / tot) * 100;
  }

  function exitedNormally(text) {
    return /PhotoRec exited normally/i.test(text) || /exited normally/i.test(text);
  }

  function shouldResumeAfterRun(text, pct) {
    if (pct >= 99.5) return false;
    if (exitedNormally(text)) return true;
    try {
      const tail = fs.readFileSync(logPath).slice(-4000).toString();
      return /PhotoRec has been stopped/i.test(tail) && !/PhotoRec exited normally/i.test(tail);
    } catch {
      return false;
    }
  }

  let attempt = 0;
  let lastSector = 0;
  let staleRounds = 0;
  let result = { ok: false, text: "", error: new Error("sin intentos") };

  while (attempt < 200) {
    attempt += 1;
    const resumeSector =
      attempt > 1 ? Number(parsePhotorecLogTail(logPath)?.readingCurrent ?? parsePhotorecLogTail(logPath)?.sector ?? 0) : 0;
    result = await runOnce(device, `ronda ${attempt}`, resumeSector);
    if (!result.ok) {
      throw result.error instanceof Error
        ? result.error
        : new Error("PhotoRec falló. Revisa el log arriba.");
    }

    const pct = progressPct();
    const info = parsePhotorecLogTail(logPath);
    const cur = Number(info?.readingCurrent ?? info?.sector ?? 0);

    if (pct >= 99.5) {
      log(`✓ Escaneo completo (${pct.toFixed(1)}% del disco).`);
      break;
    }

    if (!shouldResumeAfterRun(result.text, pct)) {
      if (pct < 99.5) log(`PhotoRec finalizó al ${pct.toFixed(2)}%.`);
      break;
    }

    if (cur <= lastSector) staleRounds += 1;
    else staleRounds = 0;
    lastSector = cur;

    if (staleRounds >= 2) {
      log(`PhotoRec no avanza más (sector ${cur.toLocaleString("es")}). Detén o reintenta.`);
      break;
    }

    log(`PhotoRec terminó al ${pct.toFixed(2)}% — reanudando automáticamente…`);
    await new Promise((r) => setTimeout(r, 1500));
  }

  purgePhotorecCarvedOutput(sessionDir);
  const indexed = countPhotorecLogEntries(logPath, extensions);
  const label = zipOnly ? ".zip" : "coincidencias";
  log(`PhotoRec: ${indexed.matched} ${label} indexadas (0 archivos temporales en disco).`);
  return [];
}

/**
 * @param {{ volumePath: string; mode: ScanMode; onLog?: (msg: string) => void; onFile?: (file: RecoverableFile) => void; onStart?: (session: ScanSession) => void }} opts
 */
export async function startScan({ volumePath, mode, onLog = () => {}, onFile = () => {}, onStart = () => {} }) {
  const vol = assertSafeVolume(volumePath);
  const scanId = randomUUID();
  const session = {
    id: scanId,
    volumePath: vol,
    volumeName: path.basename(vol),
    mode,
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    files: [],
    log: [],
    error: null,
    _seenPaths: new Set(),
  };
  scans.set(scanId, session);

  const log = (msg) => {
    session.log.push(msg);
    onLog(msg);
  };

  const trackFile = (file) => {
    addFileToSession(session, file, onFile);
  };

  onStart?.(session);

  try {
    /** @type {RecoverableFile[]} */
    let files = [];
    if (mode === "trash") {
      files = [...scanTrash(vol, log), ...scanRecycleBin(vol, log)];
    } else if (mode === "orphan") {
      files = scanOrphans(vol, log);
    } else if (mode === "zip") {
      log("Modo .zip rápido: papelera + índice HFS + espacio libre…");
      scanQuickMetadata(vol, log, ["zip"], trackFile);
      log("── Fase 2/2: carving en espacio libre (PhotoRec) ──");
      const workDir = path.join(os.tmpdir(), "pime-disk-recovery", scanId);
      activeScanWorkId = scanId;
      activeScanVolumePath = vol;
      files = await scanDeepPhotorec(vol, workDir, log, {
        extensions: ["zip"],
        spaceMode: "freespace",
        onFile: trackFile,
        session,
        scanId,
      });
    } else if (mode === "zip-full") {
      log("Modo .zip exhaustivo: papelera + índice + disco completo…");
      scanQuickMetadata(vol, log, ["zip"], trackFile);
      log("── Fase 2/2: carving disco completo (PhotoRec) ──");
      const workDir = path.join(os.tmpdir(), "pime-disk-recovery", scanId);
      activeScanWorkId = scanId;
      activeScanVolumePath = vol;
      files = await scanDeepPhotorec(vol, workDir, log, {
        extensions: ["zip"],
        spaceMode: "wholespace",
        onFile: trackFile,
        session,
        scanId,
      });
    } else if (mode === "deep") {
      log("Modo profundo: papelera + índice + espacio libre…");
      scanQuickMetadata(vol, log, null, trackFile);
      log("── Carving en espacio libre (PhotoRec) ──");
      const workDir = path.join(os.tmpdir(), "pime-disk-recovery", scanId);
      activeScanWorkId = scanId;
      activeScanVolumePath = vol;
      files = await scanDeepPhotorec(vol, workDir, log, {
        spaceMode: "freespace",
        session,
        onFile: trackFile,
        scanId,
      });
    } else {
      files = [
        ...scanTrash(vol, log),
        ...scanRecycleBin(vol, log),
        ...scanOrphans(vol, log),
      ];
    }
    if (mode !== "zip" && mode !== "zip-full" && mode !== "deep") {
      session.files = dedupeFiles(files);
    } else {
      session.files = dedupeFiles(session.files.length ? session.files : files);
    }
    session.status = "done";
    session.finishedAt = new Date().toISOString();
    if (
      session.files.length === 0 &&
      session.log.some(
        (l) =>
          l.includes("Acceso directo bloqueado") ||
          l.includes("Permiso denegado") ||
          l.includes("bloqueó el acceso")
      )
    ) {
      log("Sugerencia: concede Acceso total al disco a Terminal/Cursor, o usa escaneo profundo (PhotoRec).");
    }
    log(`Escaneo completo: ${session.files.length} archivo(s) listos para restaurar.`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (session.files.length > 0 && (msg.includes("EPERM") || msg.includes("EACCES"))) {
      session.status = "done";
      session.finishedAt = new Date().toISOString();
      log(`⚠ Escaneo parcial: ${msg}`);
      log(`Escaneo completo: ${session.files.length} archivo(s) listos para restaurar.`);
    } else {
      session.status = "error";
      session.error = msg;
      session.finishedAt = new Date().toISOString();
      log(`Error: ${session.error}`);
    }
  } finally {
    activeScanWorkId = null;
    activeScanVolumePath = null;
    if (mode === "zip" || mode === "zip-full" || mode === "deep") {
      cleanupScanWorkDir(scanId, vol);
    }
  }

  return session;
}

export function getScan(scanId) {
  return scans.get(scanId) ?? null;
}
