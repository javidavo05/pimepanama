import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  basenameDisplay,
  expandHome,
  isGitRepo,
  resolveProfileForPath,
  scanLocalGitRepos,
  WEBSITES_ROOT,
} from "./lib.mjs";
import { verifyRepoGit } from "./funnel.mjs";

function gitOut(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return "";
  return (result.stdout || "").trim();
}

const SIG_LABELS = {
  G: "firmado",
  U: "firmado",
  B: "firma inválida",
  X: "firma expirada",
  Y: "llave expirada",
  R: "revocado",
  E: "sin firma",
  N: "sin firma",
};

function parseTracking(sbFirstLine) {
  const ahead = sbFirstLine.match(/ahead (\d+)/);
  const behind = sbFirstLine.match(/behind (\d+)/);
  return {
    ahead: ahead ? Number(ahead[1]) : 0,
    behind: behind ? Number(behind[1]) : 0,
  };
}

function parseBranchLine(sbFirstLine) {
  const m = sbFirstLine.match(/^## ([^\s.]+)(?:\.\.\.([^ \[]+))?/);
  return {
    branch: m?.[1] ?? "",
    upstream: m?.[2] ?? null,
  };
}

/** @param {import("./lib.mjs").GitIdentityConfig} config */
export function listProjects(config, rootDir = WEBSITES_ROOT) {
  /** @type {{ path: string; name: string; profileId: string | null; source: string }[]} */
  const projects = [];
  const seen = new Set();

  for (const m of config.mappings) {
    const p = path.resolve(expandHome(m.path));
    if (!isGitRepo(p) || seen.has(p)) continue;
    seen.add(p);
    projects.push({
      path: p,
      name: basenameDisplay(p),
      profileId: m.profileId,
      source: "mapped",
    });
  }

  for (const local of scanLocalGitRepos(rootDir)) {
    if (seen.has(local.path)) continue;
    seen.add(local.path);
    const profile = resolveProfileForPath(config, local.path);
    projects.push({
      path: local.path,
      name: basenameDisplay(local.path),
      profileId: profile?.id ?? null,
      source: "local",
    });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

function getRepoWorkingState(abs) {
  const statusSb = gitOut(abs, ["status", "-sb"]);
  const firstLine = statusSb.split("\n")[0] ?? "";
  const { branch, upstream } = parseBranchLine(firstLine);
  const { ahead, behind } = parseTracking(firstLine);
  const porcelain = gitOut(abs, ["status", "--porcelain"]);
  const changedFiles = porcelain ? porcelain.split("\n").filter(Boolean) : [];
  return { branch, upstream, ahead, behind, changedFiles, clean: changedFiles.length === 0 };
}

/**
 * Etiqueta de sync para UI: al día / por subir / por bajar / divergente.
 * @param {{ ahead: number; behind: number; upstream: string | null }} ws
 */
export function syncStatusLabel(ws) {
  const ahead = ws.ahead || 0;
  const behind = ws.behind || 0;
  if (!ws.upstream) {
    return {
      label: "sin upstream",
      kind: "warn",
      readyToPush: ahead > 0,
      synced: false,
    };
  }
  if (ahead === 0 && behind === 0) {
    return { label: "al día", kind: "ok", readyToPush: false, synced: true };
  }
  if (ahead > 0 && behind > 0) {
    return {
      label: `divergente ↑${ahead} ↓${behind}`,
      kind: "bad",
      readyToPush: false,
      synced: false,
    };
  }
  if (ahead > 0) {
    return {
      label: `por subir ↑${ahead}`,
      kind: "warn",
      readyToPush: true,
      synced: false,
    };
  }
  return {
    label: `por bajar ↓${behind}`,
    kind: "warn",
    readyToPush: false,
    synced: false,
  };
}

/**
 * Verifica identidad + estado de push vs remoto.
 * @param {import("./lib.mjs").GitIdentityConfig} config
 * @param {string} repoPath
 * @param {{ fetch?: boolean }} [opts]
 */
export function getPushStatus(config, repoPath, { fetch: doFetch = false } = {}) {
  const abs = path.resolve(expandHome(repoPath));
  if (!isGitRepo(abs)) {
    return {
      ok: false,
      path: abs,
      error: "No es un repositorio git",
      verifyOk: false,
      issues: ["No es un repositorio git"],
      warnings: [],
      fetched: false,
      branch: "",
      upstream: null,
      ahead: 0,
      behind: 0,
      head: "",
      sync: syncStatusLabel({ ahead: 0, behind: 0, upstream: null }),
      pushOk: false,
    };
  }

  let fetched = false;
  let fetchError = null;
  if (doFetch) {
    const result = spawnSync("git", ["fetch", "--quiet"], {
      cwd: abs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status === 0) {
      fetched = true;
    } else {
      fetchError = (result.stderr || result.stdout || "git fetch falló").trim();
    }
  }

  const verify = verifyRepoGit(config, abs, { apply: false });
  const ws = getRepoWorkingState(abs);
  const head = gitOut(abs, ["rev-parse", "--short", "HEAD"]);
  const sync = syncStatusLabel(ws);
  const issues = [...verify.issues];
  if (fetchError) issues.push(`Fetch remoto: ${fetchError}`);

  return {
    ok: verify.ok && !fetchError,
    path: abs,
    name: basenameDisplay(abs),
    verifyOk: verify.ok,
    issues,
    warnings: verify.warnings,
    fetched,
    fetchError,
    branch: ws.branch,
    upstream: ws.upstream,
    ahead: ws.ahead,
    behind: ws.behind,
    head,
    sync,
    /** true si el remoto está al día con HEAD local (nada por subir ni bajar) */
    pushOk: sync.synced,
    clean: ws.clean,
  };
}

/** Resumen ligero para la lista de proyectos en el portal. */
export function getProjectBrief(config, repoPath) {
  const abs = path.resolve(expandHome(repoPath));
  if (!isGitRepo(abs)) return null;

  const profile = resolveProfileForPath(config, abs);
  const verify = verifyRepoGit(config, abs, { apply: false });
  const ws = getRepoWorkingState(abs);
  const head = gitOut(abs, ["rev-parse", "--short", "HEAD"]);

  const sync = syncStatusLabel(ws);

  return {
    path: abs,
    name: basenameDisplay(abs),
    profileId: profile?.id ?? null,
    profileLabel: profile?.label ?? null,
    verifyOk: verify.ok,
    hasCursorRule: fs.existsSync(
      path.join(abs, ".cursor", "rules", "pime-git-pipeline.mdc")
    ),
    head,
    branch: ws.branch,
    upstream: ws.upstream,
    ahead: ws.ahead,
    behind: ws.behind,
    sync,
    clean: ws.clean,
    changedCount: ws.changedFiles.length,
  };
}

export function listProjectsWithSummary(config, rootDir = WEBSITES_ROOT) {
  return listProjects(config, rootDir).map((p) => ({
    ...p,
    summary: getProjectBrief(config, p.path),
  }));
}

/** Estado completo del portal en una sola llamada. */
export function getDashboard(config, { activePath, commitLimit = 35, rootDir } = {}) {
  const projects = listProjectsWithSummary(config, rootDir);
  let active = activePath ? path.resolve(expandHome(activePath)) : "";
  if (active && !projects.some((p) => p.path === active)) active = "";
  if (!active && projects.length > 0) {
    const mapped = projects.find((p) => p.source === "mapped");
    active = mapped?.path ?? projects[0].path;
  }
  const detail = active ? getProjectDetail(config, active, { commitLimit }) : null;
  return { projects, activePath: active || null, detail };
}

/** @param {import("./lib.mjs").GitIdentityConfig} config */
export function getProjectDetail(config, repoPath, { commitLimit = 30 } = {}) {
  const abs = path.resolve(expandHome(repoPath));
  if (!isGitRepo(abs)) {
    return { ok: false, path: abs, error: "No es un repositorio git" };
  }

  const profile = resolveProfileForPath(config, abs);
  const verify = verifyRepoGit(config, abs, { apply: false });

  const ws = getRepoWorkingState(abs);
  const { branch, upstream, ahead, behind, changedFiles, clean } = ws;
  const staged = changedFiles.filter((l) => l[0] !== " " && l[0] !== "?").length;
  const unstaged = changedFiles.filter((l) => l[1] !== " ").length;
  const untracked = changedFiles.filter((l) => l.startsWith("??")).length;

  const origin = gitOut(abs, ["remote", "get-url", "origin"]);
  const head = gitOut(abs, ["rev-parse", "--short", "HEAD"]);

  const rawLog = gitOut(abs, [
    "log",
    `-n`,
    String(commitLimit),
    "--format=%H%x1f%h%x1f%G?%x1f%an%x1f%ae%x1f%at%x1f%s",
  ]);

  const commits = rawLog
    ? rawLog.split("\n").map((line) => {
        const [hash, short, sig, author, email, at, ...msgParts] = line.split("\x1f");
        const subject = msgParts.join("\x1f");
        return {
          hash,
          short,
          signature: sig || "N",
          signatureLabel: SIG_LABELS[sig] ?? sig,
          author,
          email,
          date: new Date(Number(at) * 1000).toISOString(),
          subject,
        };
      })
    : [];

  const cursorRule = path.join(abs, ".cursor", "rules", "pime-git-pipeline.mdc");

  const sync = syncStatusLabel({ ahead, behind, upstream });

  return {
    ok: true,
    path: abs,
    name: basenameDisplay(abs),
    profileId: profile?.id ?? null,
    profileLabel: profile?.label ?? null,
    verify: {
      ok: verify.ok,
      issues: verify.issues,
      warnings: verify.warnings,
    },
    branch,
    upstream,
    ahead,
    behind,
    sync,
    head,
    origin,
    clean,
    changedFiles: changedFiles.length,
    staged,
    unstaged,
    untracked,
    changedList: changedFiles.slice(0, 40).map((l) => ({
      index: l.slice(0, 2),
      file: l.slice(3),
    })),
    commits,
    hasCursorRule: fs.existsSync(cursorRule),
  };
}
