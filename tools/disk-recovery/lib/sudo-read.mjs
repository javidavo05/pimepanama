import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const CONFIG_DIR = path.join(os.homedir(), ".pime-disk-recovery");
const PASSWORD_FILE = path.join(CONFIG_DIR, "sudo-password");

/** @returns {string | null} */
export function loadSudoPassword() {
  const fromEnv = process.env.PIME_DISK_RECOVERY_SUDO_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  try {
    if (fs.existsSync(PASSWORD_FILE)) {
      return fs.readFileSync(PASSWORD_FILE, "utf8").trim() || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function hasSudoPassword() {
  return Boolean(loadSudoPassword());
}

/** @param {string} s */
export function shellQuote(s) {
  if (/^[a-zA-Z0-9_./:@%+-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\"'\"'`)}'`;
}

/**
 * @param {string[]} args — argumentos para sudo (sin "sudo")
 * @param {string} [stdinExtra]
 */
export function runSudo(args, stdinExtra = "") {
  const password = loadSudoPassword();
  if (!password) {
    return { ok: false, stdout: "", stderr: "Sin contraseña sudo configurada", status: 1 };
  }

  const r = spawnSync("sudo", ["-S", "-p", "", ...args], {
    encoding: "utf8",
    input: `${password}\n${stdinExtra}`,
    timeout: 300_000,
  });

  return {
    ok: r.status === 0,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
    status: r.status ?? 1,
  };
}

/** Prueba que sudo funciona con la contraseña guardada. */
export function probeSudo() {
  const r = runSudo(["-v"]);
  return { ok: r.ok, message: r.ok ? "sudo disponible" : r.stderr || "sudo falló" };
}

/**
 * Lista archivos bajo .Trashes con find + sudo.
 * @param {string} volumePath
 * @returns {string[]}
 */
export function listTrashPathsViaSudo(volumePath) {
  const trashesRoot = path.join(volumePath, ".Trashes");
  if (!fs.existsSync(trashesRoot)) return [];
  if (!hasSudoPassword()) return [];

  const r = runSudo([
    "find",
    trashesRoot,
    "-type",
    "f",
    "-print",
  ]);

  if (!r.ok || !r.stdout) {
    if (/not permitted|EPERM|Operation not permitted/i.test(r.stderr)) {
      return /** @type {string[]} */ ([]);
    }
    return [];
  }

  return r.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** @returns {{ paths: string[]; blocked: boolean }} */
export function listTrashPathsViaSudoDetailed(volumePath) {
  const trashesRoot = path.join(volumePath, ".Trashes");
  if (!fs.existsSync(trashesRoot)) return { paths: [], blocked: false };
  if (!hasSudoPassword()) return { paths: [], blocked: false };

  const r = runSudo(["find", trashesRoot, "-type", "f", "-print"]);

  if (!r.ok || !r.stdout) {
    const blocked = /not permitted|EPERM|Operation not permitted/i.test(r.stderr);
    return { paths: [], blocked };
  }

  return {
    paths: r.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    blocked: false,
  };
}

/**
 * Copia un archivo protegido usando sudo cp.
 * @returns {boolean}
 */
export function sudoCopyFile(src, dest) {
  const r = runSudo(["cp", "-p", src, dest]);
  return r.ok;
}

/**
 * @param {string} filePath
 */
export function statViaSudo(filePath) {
  const r = runSudo(["stat", "-f", "%z %m", filePath]);
  if (!r.ok) return null;
  const m = r.stdout.match(/^(\d+)\s+(\d+)/);
  if (!m) return null;
  return {
    sizeBytes: Number(m[1]),
    modifiedAt: new Date(Number(m[2]) * 1000).toISOString(),
  };
}

/** ¿sudo puede listar .Trashes en este volumen? */
export function probeTrashViaSudo(volumePath) {
  const trashesRoot = path.join(volumePath, ".Trashes");
  if (!fs.existsSync(trashesRoot)) {
    return { ok: true, available: false, message: "Sin carpeta .Trashes" };
  }
  if (!hasSudoPassword()) {
    return { ok: false, available: false, message: "sudo no configurado" };
  }
  const r = runSudo(["ls", trashesRoot]);
  return {
    ok: r.ok,
    available: true,
    message: r.ok ? "sudo puede leer papelera" : r.stderr || "sudo no puede leer papelera",
  };
}

export function unmountVolume(volumePath) {
  return runSudo(["diskutil", "unmount", volumePath]);
}

/** Monta un volumen por ruta o dispositivo (/dev/diskXsY). */
export function mountVolume(deviceOrPath) {
  return runSudo(["diskutil", "mount", deviceOrPath]);
}

/** @returns {string | null} */
export function getDeviceMountPoint(device) {
  const r = spawnSync("diskutil", ["info", device], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const m = r.stdout.match(/Mount Point:\s+(.+)/);
  const mp = m?.[1]?.trim();
  if (!mp || mp === "Not applicable (not mounted)") return null;
  return mp;
}

/**
 * Ejecuta un comando largo con sudo (p. ej. PhotoRec).
 * Mantiene stdin abierto para que procesos interactivos no reciban EOF.
 * @param {string} command
 * @param {string[]} args
 * @param {{ onLine?: (line: string, stream: 'stdout' | 'stderr', write: (data: string) => void) => void; env?: Record<string, string>; cwd?: string; stdinNull?: boolean }} opts
 */
export function spawnSudoLong(command, args, { onLine = () => {}, env = {}, cwd, stdinNull = false } = {}) {
  const password = loadSudoPassword();
  if (!password) {
    return Promise.reject(new Error("Sin contraseña sudo configurada"));
  }

  /** @type {import('node:child_process').ChildProcess | null} */
  let child = null;
  let stdinOpen = true;

  const write = (data) => {
    if (!stdinNull && stdinOpen && child?.stdin && !child.stdin.destroyed) {
      child.stdin.write(data);
    }
  };

  const kill = (signal = "SIGTERM") => {
    stdinOpen = false;
    try {
      child?.stdin?.end();
    } catch {
      /* ignore */
    }
    child?.kill(signal);
  };

  const promise = new Promise((resolve, reject) => {
    if (stdinNull) {
      const cmd = [command, ...args].map(shellQuote).join(" ");
      child = spawn("sudo", ["-S", "-p", "", "sh", "-c", `${cmd} < /dev/null`], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb", ...env },
        cwd,
      });
      child.stdin.write(`${password}\n`);
      child.stdin.end();
      stdinOpen = false;
    } else {
      child = spawn("sudo", ["-S", "-p", "", command, ...args], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb", ...env },
        cwd,
      });
      child.stdin.write(`${password}\n`);
      // No cerrar stdin: procesos interactivos interpretan EOF como salida.
    }

    const handle = (buf, stream) => {
      const text = buf.toString().replace(/\r/g, "\n");
      for (const line of text.split("\n")) {
        if (line.trim()) onLine(line, stream, write);
      }
    };
    child.stdout.on("data", (b) => handle(b, "stdout"));
    child.stderr.on("data", (b) => handle(b, "stderr"));
    child.on("close", (code) => {
      stdinOpen = false;
      try {
        child?.stdin?.end();
      } catch {
        /* ignore */
      }
      if (code === 0 || code === null) resolve(code ?? 0);
      else reject(new Error(`Comando terminó con código ${code}`));
    });
    child.on("error", (e) => {
      stdinOpen = false;
      reject(e);
    });
  });

  return { promise, write, kill, get child() { return child; } };
}

/**
 * Extrae sectores del dispositivo al destino (hallazgos indexados por PhotoRec).
 * @param {{ device: string; sectorStart: number; sectorEnd: number; targetPath: string; sectorSize?: number }} opts
 */
export function recoverCarvedSectors({ device, sectorStart, sectorEnd, targetPath, sectorSize = 512 }) {
  const count = sectorEnd - sectorStart + 1;
  const skip = sectorStart;
  const cmd = `dd if=${shellQuote(device)} bs=${sectorSize} skip=${skip} count=${count} of=${shellQuote(targetPath)} 2>/dev/null`;
  const r = runSudo(["sh", "-c", cmd]);
  return r.ok && fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0;
}

/**
 * Ejecuta un comando corto con sudo (stdin se cierra tras la contraseña).
 * @param {string} command
 * @param {string[]} args
 * @param {{ onLine?: (line: string, stream: 'stdout' | 'stderr') => void }} opts
 */
export function spawnSudo(command, args, { onLine = () => {} } = {}) {
  const password = loadSudoPassword();
  if (!password) {
    return Promise.reject(new Error("Sin contraseña sudo configurada"));
  }

  return new Promise((resolve, reject) => {
    const child = spawn("sudo", ["-S", "-p", "", command, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdin.write(`${password}\n`);
    child.stdin.end();

    const handle = (buf, stream) => {
      for (const line of buf.toString().split("\n")) {
        if (line.trim()) onLine(line.trim(), stream);
      }
    };
    child.stdout.on("data", (b) => handle(b, "stdout"));
    child.stderr.on("data", (b) => handle(b, "stderr"));
    child.on("close", (code) => {
      if (code === 0 || code === null) resolve(code ?? 0);
      else reject(new Error(`Comando terminó con código ${code}`));
    });
    child.on("error", reject);
  });
}
