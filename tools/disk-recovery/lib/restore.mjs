import fs from "node:fs";
import path from "node:path";
import { assertSafeDestination } from "./volumes.mjs";
import { getScan } from "./scanner.mjs";
import { sudoCopyFile, recoverCarvedSectors } from "./sudo-read.mjs";
import { recoverDeletedInode } from "./hfs-recovery.mjs";

/**
 * @param {{ scanId: string; fileIds: string[]; destination: string; onProgress?: (evt: object) => void }} opts
 */
export function restoreFiles({ scanId, fileIds, destination, onProgress = () => {} }) {
  const session = getScan(scanId);
  if (!session) throw new Error("Sesión de escaneo no encontrada");
  if (session.status !== "done" && session.status !== "running") {
    throw new Error("El escaneo no está disponible para restaurar");
  }

  const destRoot = assertSafeDestination(destination);
  const selected = new Set(fileIds);
  const files = session.files.filter((f) => selected.has(f.id));
  if (!files.length) throw new Error("No hay archivos seleccionados");

  /** @type {{ id: string; name: string; restoredPath: string; ok: boolean; error?: string }[]} */
  const results = [];
  let i = 0;

  for (const file of files) {
    i++;
    onProgress({
      step: i,
      total: files.length,
      id: file.id,
      name: file.name,
      status: "running",
    });

    try {
      const safeName = file.name.replace(/[/\\?%*:|"<>]/g, "_") || `recovered-${file.id.slice(0, 8)}`;
      let target = path.join(destRoot, safeName);
      if (fs.existsSync(target)) {
        const ext = path.extname(safeName);
        const base = path.basename(safeName, ext);
        target = path.join(destRoot, `${base}-${Date.now()}${ext}`);
      }

      if (
        (file.source === "deleted" || file.source === "catalog") &&
        file.inode &&
        file.device
      ) {
        const ok = recoverDeletedInode({
          device: file.device,
          inode: file.inode,
          fsType: file.fsType ?? "hfs",
          partitionOffsetSectors: file.partitionOffsetSectors ?? 0,
          targetPath: target,
        });
        if (!ok) throw new Error("No se pudo extraer el archivo del índice HFS (icat falló)");
        results.push({ id: file.id, name: file.name, restoredPath: target, ok: true });
        onProgress({
          step: i,
          total: files.length,
          id: file.id,
          name: file.name,
          status: "ok",
          restoredPath: target,
        });
        continue;
      }

      if (
        file.source === "carved" &&
        file.carveDevice &&
        file.carveSectorStart != null &&
        file.carveSectorEnd != null
      ) {
        const ok = recoverCarvedSectors({
          device: file.carveDevice,
          sectorStart: file.carveSectorStart,
          sectorEnd: file.carveSectorEnd,
          targetPath: target,
        });
        if (!ok) {
          throw new Error(
            "No se pudo extraer del disco (sectores). El .zip puede estar fragmentado — prueba otro hallazgo."
          );
        }
        results.push({ id: file.id, name: file.name, restoredPath: target, ok: true });
        onProgress({
          step: i,
          total: files.length,
          id: file.id,
          name: file.name,
          status: "ok",
          restoredPath: target,
        });
        continue;
      }

      if (!fs.existsSync(file.absolutePath)) {
        throw new Error("El archivo ya no existe en el volumen");
      }
      let copied = false;
      try {
        fs.copyFileSync(file.absolutePath, target);
        copied = true;
      } catch (copyErr) {
        const err = /** @type {NodeJS.ErrnoException} */ (copyErr);
        if (err.code === "EPERM" || err.code === "EACCES") {
          copied = sudoCopyFile(file.absolutePath, target);
          if (!copied) throw new Error("Permiso denegado al copiar (sudo falló)");
        } else {
          throw copyErr;
        }
      }
      if (!copied) throw new Error("No se pudo copiar el archivo");

      results.push({ id: file.id, name: file.name, restoredPath: target, ok: true });
      onProgress({
        step: i,
        total: files.length,
        id: file.id,
        name: file.name,
        status: "ok",
        restoredPath: target,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: file.id, name: file.name, restoredPath: "", ok: false, error: msg });
      onProgress({
        step: i,
        total: files.length,
        id: file.id,
        name: file.name,
        status: "fail",
        error: msg,
      });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  return { destination: destRoot, restored: ok, failed: results.length - ok, results };
}
