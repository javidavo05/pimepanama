import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  ensureAndApply,
  expandHome,
  isGitRepo,
  loadConfig,
  resolveProfileForPath,
  shellQuote,
  testSsh,
} from "./lib.mjs";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));

function gitQuiet(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return "";
  return (result.stdout || "").trim();
}

function gitRoot(start = process.cwd()) {
  const out = gitQuiet(start, ["rev-parse", "--show-toplevel"]);
  return out || path.resolve(start);
}

/**
 * @typedef {{
 *   ok: boolean;
 *   path: string;
 *   profile: import("./lib.mjs").GitProfile | null;
 *   issues: string[];
 *   warnings: string[];
 *   identity: { name: string; email: string; signingKey: string; gpgSign: string; gpgFormat: string };
 *   origin: string;
 *   branch: string;
 * }} VerifyResult
 */

/** @returns {VerifyResult} */
export function verifyRepoGit(config, repoPath, { apply = false } = {}) {
  const abs = path.resolve(repoPath);
  /** @type {string[]} */
  const issues = [];
  /** @type {string[]} */
  const warnings = [];

  if (!isGitRepo(abs)) {
    return {
      ok: false,
      path: abs,
      profile: null,
      issues: ["No es un repositorio git"],
      warnings,
      identity: { name: "", email: "", signingKey: "", gpgSign: "", gpgFormat: "" },
      origin: "",
      branch: "",
    };
  }

  let profile = resolveProfileForPath(config, abs);
  if (!profile) {
    issues.push(
      `Sin mapeo pime-git para este proyecto.`,
      `Asignar: pime-git map "${abs}" <cuenta>`,
      `Cuentas: ${config.profiles.map((p) => p.id).join(", ")}`
    );
    return {
      ok: false,
      path: abs,
      profile: null,
      issues,
      warnings,
      identity: { name: "", email: "", signingKey: "", gpgSign: "", gpgFormat: "" },
      origin: gitQuiet(abs, ["remote", "get-url", "origin"]),
      branch: gitQuiet(abs, ["branch", "--show-current"]),
    };
  }

  if (apply) {
    try {
      ensureAndApply(config, abs);
    } catch (e) {
      issues.push(e instanceof Error ? e.message : String(e));
    }
  }

  const ssh = testSsh(profile);
  if (!ssh.ok) {
    issues.push(`SSH no conecta para "${profile.id}": ${ssh.message}`);
  }

  const name = gitQuiet(abs, ["config", "--get", "user.name"]);
  const email = gitQuiet(abs, ["config", "--get", "user.email"]);
  const signingKey = gitQuiet(abs, ["config", "--get", "user.signingkey"]);
  const gpgSign = gitQuiet(abs, ["config", "--get", "commit.gpgsign"]);
  const gpgFormat = gitQuiet(abs, ["config", "--get", "gpg.format"]);
  const origin = gitQuiet(abs, ["remote", "get-url", "origin"]);
  const branch = gitQuiet(abs, ["branch", "--show-current"]);

  if (email !== profile.email) {
    issues.push(
      `user.email="${email || "(vacío)"}" no coincide con ${profile.id} → ${profile.email}`,
      `Ejecutar: pime-git apply "${abs}"`
    );
  }
  if (name !== profile.name) {
    warnings.push(`user.name difiere del perfil "${profile.id}" (${profile.name})`);
  }

  if (profile.signingKey) {
    const expected = expandHome(profile.signingKey);
    const actual = expandHome(signingKey);
    if (!fs.existsSync(expected)) {
      issues.push(`Falta llave de firma: ${expected}`);
    }
    if (profile.gpgSign) {
      if (gpgSign !== "true") {
        issues.push(`commit.gpgsign debe ser true para "${profile.id}"`);
      }
      if (gpgFormat && gpgFormat !== "ssh") {
        warnings.push(`gpg.format es "${gpgFormat}" (se espera ssh)`);
      }
      if (actual && actual !== expected) {
        issues.push(`user.signingkey incorrecta para "${profile.id}"`);
      }
      if (!actual) {
        issues.push(`Sin user.signingkey — commits no firmados`);
      }
    }
  }

  if (origin && origin.includes("github.com")) {
    const hostOk = origin.includes(`@${profile.sshHost}:`);
    if (!hostOk) {
      issues.push(
        `origin usa host incorrecto para "${profile.id}"`,
        `Esperado: git@${profile.sshHost}:owner/repo.git`,
        `Actual: ${origin}`,
        `Ejecutar: pime-git apply "${abs}"`
      );
    }
  }

  return {
    ok: issues.length === 0,
    path: abs,
    profile,
    issues,
    warnings,
    identity: { name, email, signingKey, gpgSign, gpgFormat },
    origin,
    branch,
  };
}

export function formatVerifyReport(result) {
  const lines = [];
  lines.push(`Proyecto: ${result.path}`);
  if (result.profile) {
    lines.push(`Cuenta:   ${result.profile.label} (${result.profile.id})`);
    lines.push(`Email:    ${result.profile.email}`);
    lines.push(`Firma:    ${result.profile.gpgSign ? "SSH sí" : "no"}`);
  }
  if (result.branch) lines.push(`Rama:     ${result.branch}`);
  if (result.origin) lines.push(`Origin:   ${result.origin}`);
  for (const w of result.warnings) lines.push(`⚠ ${w}`);
  for (const i of result.issues) lines.push(`✗ ${i}`);
  if (result.ok) lines.push("✓ Verificación OK — listo para commit/push");
  return lines.join("\n");
}

/**
 * Aplica cuenta, verifica identidad/firma/SSH y ejecuta git.
 * @param {import("./lib.mjs").GitIdentityConfig} config
 */
export function funnelGit(config, repoPath, gitArgs, { verify = true, apply = true } = {}) {
  const abs = path.resolve(repoPath);
  if (apply) ensureAndApply(config, abs);

  if (verify) {
    const check = verifyRepoGit(config, abs, { apply: false });
    if (!check.ok) {
      const err = new Error(
        `Pime Git funnel bloqueó la operación:\n\n${formatVerifyReport(check)}`
      );
      err.verify = check;
      throw err;
    }
  }

  const result = spawnSync("git", gitArgs, { cwd: abs, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = new Error(`git ${gitArgs.join(" ")} falló (código ${result.status})`);
    err.exitCode = result.status;
    throw err;
  }
}

export function runHook(name) {
  const config = loadConfig();
  const root = gitRoot();
  const verifyOnly = name === "pre-commit" || name === "pre-push";

  ensureAndApply(config, root);
  const check = verifyRepoGit(config, root, { apply: false });

  if (!check.ok) {
    console.error(`\n[Pime Git ${name}] Verificación fallida:\n`);
    console.error(formatVerifyReport(check));
    console.error(`\nCorrige con: pime-git apply "${root}"`);
    process.exit(1);
  }

  if (verifyOnly && check.warnings.length) {
    for (const w of check.warnings) console.error(`[Pime Git] ⚠ ${w}`);
  }

  process.exit(0);
}

export function installCursorRule() {
  const src = path.join(TOOL_DIR, "cursor", "pime-git-pipeline.mdc");
  const destDir = path.join(os.homedir(), ".cursor", "rules");
  const dest = path.join(destDir, "pime-git-pipeline.mdc");
  if (!fs.existsSync(src)) throw new Error(`Falta plantilla: ${src}`);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  return dest;
}
