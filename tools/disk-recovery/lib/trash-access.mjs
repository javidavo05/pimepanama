import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { hasSudoPassword, listTrashPathsViaSudo, probeSudo, probeTrashViaSudo } from "./sudo-read.mjs";

export const FDA_HINT =
  "macOS bloqueó el acceso a .Trashes. Ve a Ajustes del Sistema → Privacidad y seguridad → Acceso total al disco → activa Terminal o Cursor. Cierra y vuelve a abrir la app, luego reintenta.";

export function openFullDiskAccessSettings() {
  if (process.platform !== "darwin") return false;
  const urls = [
    "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles",
    "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
  ];
  for (const url of urls) {
    const r = spawnSync("open", [url], { stdio: "ignore" });
    if (r.status === 0) return true;
  }
  return false;
}

/**
 * @param {string} volumePath
 * @returns {{ ok: boolean; code?: string; message?: string }}
 */
export function probeTrashAccess(volumePath) {
  const trashesRoot = path.join(volumePath, ".Trashes");
  if (!fs.existsSync(trashesRoot)) {
    return { ok: true, message: "Sin carpeta .Trashes (normal si nunca se vació papelera aquí)" };
  }
  try {
    fs.readdirSync(trashesRoot);
    return { ok: true };
  } catch (e) {
    const err = /** @type {NodeJS.ErrnoException} */ (e);
    return {
      ok: false,
      code: err.code,
      message: err.code === "EPERM" || err.code === "EACCES" ? FDA_HINT : err.message,
    };
  }
}

/**
 * Lista papelera vía Finder (tiene permisos distintos a Node en algunos macOS).
 * @param {string} volumePath
 * @returns {string[]}
 */
export function listTrashPathsViaFinder(volumePath) {
  if (process.platform !== "darwin") return [];

  const script = `
set out to ""
tell application "Finder"
  repeat with t in items of trash
    try
      set p to POSIX path of (t as alias)
      if out is "" then
        set out to p
      else
        set out to out & linefeed & p
      end if
    end try
  end repeat
end tell
return out
`;

  const result = spawnSync("osascript", ["-e", script], {
    encoding: "utf8",
    timeout: 120_000,
  });

  if (result.status !== 0 || !result.stdout.trim()) return [];

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * @param {string} volumePath
 * @returns {string[]}
 */
export function filterPathsOnVolume(volumePath, paths) {
  const vol = path.resolve(volumePath);
  const volPrefix = vol + path.sep;
  return paths.filter((p) => {
    const abs = path.resolve(p);
    return abs.startsWith(volPrefix);
  });
}

export { hasSudoPassword, listTrashPathsViaSudo, probeSudo, probeTrashViaSudo, unmountVolume } from "./sudo-read.mjs";

/** Resumen de acceso a papelera (directo + sudo). */
export function probeTrashAccessFull(volumePath) {
  const direct = probeTrashAccess(volumePath);
  const sudo = probeTrashViaSudo(volumePath);
  const effectiveOk = direct.ok || sudo.ok;
  const needsFda = !direct.ok && !sudo.ok && sudo.available;
  return {
    direct,
    sudo,
    effectiveOk,
    needsFda,
    needsSudo: !direct.ok && !hasSudoPassword(),
    label: effectiveOk
      ? direct.ok
        ? "papelera accesible"
        : "papelera vía sudo"
      : "papelera bloqueada",
  };
}
