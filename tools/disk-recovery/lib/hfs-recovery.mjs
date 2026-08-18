import { spawnSync } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveVolumeDevice } from "./volumes.mjs";
import { hasSudoPassword, runSudo } from "./sudo-read.mjs";

/** @returns {{ installed: boolean; fls?: string; icat?: string }} */
export function sleuthkitStatus() {
  const fls = spawnSync("which", ["fls"], { encoding: "utf8" });
  const icat = spawnSync("which", ["icat"], { encoding: "utf8" });
  const installed = fls.status === 0 && icat.status === 0;
  return {
    installed,
    fls: fls.status === 0 ? fls.stdout.trim() : undefined,
    icat: icat.status === 0 ? icat.stdout.trim() : undefined,
  };
}

/**
 * @param {string} name
 * @param {string[] | null} extensions
 */
function matchesExtensions(name, extensions) {
  if (!extensions?.length) return true;
  const ext = path.extname(name).toLowerCase().replace(/^\./, "");
  return extensions.some((e) => e.toLowerCase().replace(/^\./, "") === ext);
}

/** HFS+ system / junk names to skip in catalog scan. */
function skipCatalogName(name) {
  if (!name || name.startsWith("$")) return true;
  if (/^\.(_{2,}|Trashes|DS_Store|fseventsd|Spotlight-V100|TemporaryItems)/.test(name)) return true;
  return false;
}

/**
 * fls lines: `r/r 219845:\tpath` or `r/r * 17:\tdeleted path`
 * @param {string} line
 */
function parseFlsLine(line) {
  const m = line.match(/^\S+\s+(?:\*\s+)?(\d+)(?:-\d+-\d+)?:[\s\t]+(.+)$/);
  if (!m) return null;
  const deleted = /\*\s+\d/.test(line);
  return { inode: Number(m[1]), rel: m[2].trim(), deleted };
}

/**
 * Sleuth Kit fls often exits 1 while still printing the full listing — use stdout when present.
 * @param {string} device
 * @param {number} partitionOffsetSectors
 * @param {boolean} deletedOnly
 */
function runFlsListing(device, partitionOffsetSectors, deletedOnly) {
  /** @type {string[]} */
  const flsArgs = ["fls", "-f", "hfs", "-r", "-p"];
  if (deletedOnly) flsArgs.push("-d");
  if (partitionOffsetSectors > 0) flsArgs.push("-o", String(partitionOffsetSectors));
  flsArgs.push(device);

  const r = runSudo(flsArgs);
  const stdout = r.stdout ?? "";
  if (!stdout.trim()) {
    return { ok: false, stdout: "", stderr: r.stderr || "fls sin salida" };
  }
  return { ok: true, stdout, stderr: r.stderr, exitStatus: r.status };
}

/**
 * @param {{ device: string; fileSystem?: string; partitionOffsetSectors?: number }} devInfo
 * @param {(msg: string) => void} log
 * @param {string[] | null} extensions
 * @param {"catalog" | "deleted"} kind
 * @param {(file: import("./scanner.mjs").RecoverableFile) => void} [onFile]
 */
function scanFlsIndex(devInfo, log, extensions, kind, onFile) {
  /** @type {import("./scanner.mjs").RecoverableFile[]} */
  const files = [];

  const sk = sleuthkitStatus();
  if (!sk.installed) {
    if (kind === "catalog") log("Índice HFS: instala sleuthkit → brew install sleuthkit");
    return files;
  }
  if (!hasSudoPassword()) {
    if (kind === "catalog") log("Índice HFS: requiere sudo (~/.pime-disk-recovery/sudo-password).");
    return files;
  }

  const device = devInfo.device;
  if (!device) return files;
  if (devInfo.fileSystem && !/hfs/i.test(devInfo.fileSystem)) return files;

  const useOffset =
    devInfo.partitionOffsetSectors && /\/disk\d+$/.test(device) ? devInfo.partitionOffsetSectors : 0;

  const deletedOnly = kind === "deleted";
  const label =
    kind === "catalog"
      ? "catálogo HFS (archivos en el índice del disco)"
      : "entradas borradas en catálogo HFS";

  log(`Índice HFS: leyendo ${label} en ${device}…`);

  const r = runFlsListing(device, useOffset, deletedOnly);
  if (!r.ok) {
    log(`Índice HFS (${kind}): sin datos (${(r.stderr || "fls vacío").slice(0, 100)})`);
    return files;
  }
  if (r.exitStatus !== 0) {
    log(`Índice HFS: fls terminó con aviso (código ${r.exitStatus}); usando listado parcial.`);
  }

  let scanned = 0;
  const seenInodes = new Set();

  for (const line of r.stdout.split(/\r?\n/)) {
    const parsed = parseFlsLine(line);
    if (!parsed) continue;
    scanned += 1;
    if (deletedOnly && !parsed.deleted) continue;
    if (!deletedOnly && parsed.deleted) continue;
    if (seenInodes.has(parsed.inode)) continue;
    seenInodes.add(parsed.inode);

    const rel = parsed.rel;
    const name = path.basename(rel);
    if (skipCatalogName(name)) continue;
    if (!matchesExtensions(name, extensions)) continue;

    const sizeBytes = queryInodeSize(device, useOffset, parsed.inode);
    const source = kind === "catalog" ? /** @type {const} */ ("catalog") : /** @type {const} */ ("deleted");

    const file = {
      id: randomUUID(),
      name,
      relativePath: rel,
      absolutePath: `hfs-${kind}:${device}:${parsed.inode}`,
      sizeBytes,
      modifiedAt: null,
      source,
      confidence: /** @type {const} */ (kind === "catalog" ? "high" : "high"),
      mimeHint: "application/octet-stream",
      inode: parsed.inode,
      device,
      fsType: "hfs",
      partitionOffsetSectors: useOffset,
    };
    files.push(file);
    onFile?.(file);
  }

  const extLabel = extensions?.length === 1 ? `.${extensions[0]}` : "archivo(s)";
  const kindLabel = kind === "catalog" ? "en catálogo" : "borrado(s) en catálogo";
  log(`Índice HFS: ${files.length} ${extLabel} ${kindLabel} (${scanned.toLocaleString("es")} líneas fls).`);
  return files;
}

/**
 * Archivos aún referenciados en el catálogo HFS+ (como el escaneo rápido de Wondershare).
 * @param {{ device: string; fileSystem?: string; partitionOffsetSectors?: number }} devInfo
 * @param {(msg: string) => void} log
 * @param {string[] | null} extensions
 * @param {(file: import("./scanner.mjs").RecoverableFile) => void} [onFile]
 */
export function scanHfsCatalogOnDevice(devInfo, log, extensions = null, onFile) {
  return scanFlsIndex(devInfo, log, extensions, "catalog", onFile);
}

/**
 * Entradas marcadas como borradas en el catálogo HFS+ (a menudo vacío en HFS+ con Sleuth Kit).
 */
export function scanHfsDeletedOnDevice(devInfo, log, extensions = null, onFile) {
  return scanFlsIndex(devInfo, log, extensions, "deleted", onFile);
}

/**
 * Catálogo + borrados (disco desmontado o montado).
 */
export function scanHfsInodeIndex(devInfo, log, extensions = null, onFile) {
  const catalog = scanHfsCatalogOnDevice(devInfo, log, extensions, onFile);
  const deleted = scanHfsDeletedOnDevice(devInfo, log, extensions, onFile);
  return [...catalog, ...deleted];
}

/**
 * Escaneo rápido desde punto de montaje (volumen montado).
 */
export function scanHfsCatalog(volumePath, log, extensions = null, onFile) {
  const dev = resolveVolumeDevice(volumePath);
  if (!dev?.device) {
    log("Índice HFS: no se pudo resolver el dispositivo del volumen.");
    return [];
  }
  return scanHfsCatalogOnDevice(dev, log, extensions, onFile);
}

/**
 * @param {string} device
 * @param {number} partitionOffsetSectors
 * @param {number} inode
 */
function queryInodeSize(device, partitionOffsetSectors, inode) {
  /** @type {string[]} */
  const args = ["istat", "-f", "hfs"];
  if (partitionOffsetSectors > 0) args.push("-o", String(partitionOffsetSectors));
  args.push(device, String(inode));
  const r = runSudo(args);
  if (!r.stdout?.trim()) return 0;
  const m = r.stdout.match(/(?:Size|Allocated):\s+(\d+)/i);
  return m ? Number(m[1]) : 0;
}

/**
 * Extrae un inode al destino con icat.
 * @param {{ device: string; inode: number; fsType?: string; partitionOffsetSectors?: number; targetPath: string }} opts
 */
export function recoverDeletedInode({ device, inode, fsType = "hfs", partitionOffsetSectors = 0, targetPath }) {
  /** @type {string[]} */
  const icatArgs = ["icat", "-f", fsType];
  if (partitionOffsetSectors > 0) icatArgs.push("-o", String(partitionOffsetSectors));
  icatArgs.push(device, String(inode));

  const inner = `${icatArgs.map((a) => (/\s/.test(a) ? `'${a}'` : a)).join(" ")} > '${targetPath.replace(/'/g, `'\"'\"'`)}'`;
  const r = runSudo(["sh", "-c", inner]);
  return r.ok;
}
