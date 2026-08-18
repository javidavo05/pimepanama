import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    ok: r.status === 0,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function bytesHuman(n) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** @typedef {{ id: string; name: string; mountPoint: string; device: string; protocol: string; fileSystem: string; sizeBytes: number; sizeHuman: string; internal: boolean; readOnly: boolean }} VolumeInfo */

function isSystemVolumeName(name) {
  return /^(Macintosh HD|Preboot|Recovery|VM|Update|iSCPreboot|xART|Hardware|Data)$/i.test(name);
}

function parseDiskutilInfo(mountPoint) {
  const detail = run("diskutil", ["info", mountPoint]);
  if (!detail.ok) return null;
  const text = detail.stdout;
  const pick = (re) => text.match(re)?.[1]?.trim() ?? "";
  const sizeRaw = pick(/Disk Size:\s+[\d.]+\s+\w+\s+\((\d+)\s+Bytes\)/);
  const internal = /Internal:\s+Yes/i.test(text);
  const protocol = pick(/Protocol:\s+(.+)/) || "unknown";
  const fileSystem = pick(/File System Personality:\s+(.+)/) || pick(/Type \(Bundle\):\s+(.+)/) || "unknown";
  const deviceNode = pick(/Device Node:\s+(.+)/);
  return {
    sizeBytes: sizeRaw ? Number(sizeRaw) : 0,
    internal,
    protocol,
    fileSystem,
    deviceNode,
    readOnly: /Read-Only Media:\s+Yes/i.test(text),
  };
}

/**
 * @returns {VolumeInfo[]}
 */
export function listVolumes() {
  if (process.platform !== "darwin") {
    return listVolumesFallback();
  }

  /** @type {VolumeInfo[]} */
  const volumes = [];
  const root = "/Volumes";
  if (!fs.existsSync(root)) return [];

  for (const name of fs.readdirSync(root)) {
    if (isSystemVolumeName(name)) continue;
    const mountPoint = path.join(root, name);
    try {
      if (!fs.statSync(mountPoint).isDirectory()) continue;
    } catch {
      continue;
    }

    const info = parseDiskutilInfo(mountPoint);
    if (info?.internal) continue;

    volumes.push({
      id: mountPoint,
      name,
      mountPoint,
      device: info?.deviceNode || mountPoint,
      protocol: info?.protocol ?? "unknown",
      fileSystem: info?.fileSystem ?? "unknown",
      sizeBytes: info?.sizeBytes ?? 0,
      sizeHuman: bytesHuman(info?.sizeBytes ?? 0),
      internal: false,
      readOnly: info?.readOnly ?? false,
    });
  }

  return volumes.length ? volumes : listVolumesFallback();
}

function listVolumesFallback() {
  const root = "/Volumes";
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((name) => !isSystemVolumeName(name))
    .map((name) => {
      const mountPoint = path.join(root, name);
      try {
        const st = fs.statSync(mountPoint);
        if (!st.isDirectory()) return null;
        return {
          id: mountPoint,
          name,
          mountPoint,
          device: mountPoint,
          protocol: "unknown",
          fileSystem: "unknown",
          sizeBytes: 0,
          sizeHuman: "—",
          internal: false,
          readOnly: false,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * @param {string} mountPoint
 * @returns {{ device: string; fileSystem: string; partitionOffsetSectors: number; mounted: boolean } | null}
 */
export function resolveVolumeDevice(mountPoint) {
  const detail = run("diskutil", ["info", mountPoint]);
  if (!detail.ok) return null;
  const text = detail.stdout;
  const pick = (re) => text.match(re)?.[1]?.trim() ?? "";
  const device = pick(/Device Node:\s+(.+)/);
  if (!device) return null;
  const fileSystem = pick(/File System Personality:\s+(.+)/) || "unknown";
  const offsetBytes = pick(/Partition Offset:\s+(\d+)\s+Bytes/);
  const sectorSize = Number(pick(/Device Block Size:\s+(\d+)/) || "512");
  const partitionOffsetSectors = offsetBytes ? Math.floor(Number(offsetBytes) / sectorSize) : 0;
  const mounted = /Mounted:\s+Yes/i.test(text);
  return { device, fileSystem, partitionOffsetSectors, mounted };
}

export function assertSafeVolume(mountPoint) {
  const abs = path.resolve(mountPoint);
  if (!abs.startsWith("/Volumes/")) {
    throw new Error("Solo se permiten volúmenes en /Volumes/");
  }
  if (!fs.existsSync(abs)) throw new Error("Volumen no encontrado");
  const st = fs.statSync(abs);
  if (!st.isDirectory()) throw new Error("La ruta no es un volumen montado");
  return abs;
}

export function assertSafeDestination(dest) {
  const abs = path.resolve(dest.replace(/^~/, os.homedir()));
  const home = os.homedir();
  if (!abs.startsWith(home)) {
    throw new Error("Restaurar solo a una carpeta dentro de tu usuario (~/…)");
  }
  if (fs.existsSync(abs)) {
    const st = fs.statSync(abs);
    if (!st.isDirectory()) throw new Error("El destino debe ser una carpeta");
  } else {
    fs.mkdirSync(abs, { recursive: true });
  }
  return abs;
}
