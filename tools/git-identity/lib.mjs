import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export const CONFIG_DIR = path.join(os.homedir(), ".pime-git");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
export const PROFILES_DIR = path.join(CONFIG_DIR, "profiles");
export const SSH_SNIPPET_PATH = path.join(CONFIG_DIR, "ssh-config.snippet");

/** @typedef {{
 *   id: string;
 *   label: string;
 *   name: string;
 *   email: string;
 *   sshHost: string;
 *   sshKey: string;
 *   signingKey?: string;
 *   gpgSign?: boolean;
 *   githubUser?: string;
 * }} GitProfile */

/** @typedef {{
 *   profiles: GitProfile[];
 *   mappings: { path: string; profileId: string }[];
 * }} GitIdentityConfig */

export function expandHome(p) {
  return p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : p;
}

/** Ejecuta git sin volcar stderr al terminal (repos sin origin, etc.). */
function gitQuiet(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return "";
  return (result.stdout || "").trim();
}

export function ensureConfigDir() {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

export function slugifyId(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function defaultConfig() {
  return /** @type {GitIdentityConfig} */ ({
    profiles: [
      {
        id: "pime",
        label: "Pime Panamá",
        name: "Javier Vallejo",
        email: "javidavo05@gmail.com",
        sshHost: "github.com-pime",
        sshKey: "~/.ssh/id_ed25519_pime",
        signingKey: "~/.ssh/id_ed25519_pime.pub",
        gpgSign: true,
      },
      {
        id: "academyx",
        label: "Academyx",
        name: "Academyx System",
        email: "academyxsystem@gmail.com",
        sshHost: "github.com-academyx",
        sshKey: "~/.ssh/id_ed25519_academyx",
        signingKey: "~/.ssh/id_ed25519_academyx.pub",
        gpgSign: true,
      },
    ],
    mappings: [
      {
        path: path.join(os.homedir(), "Documents/Websites/pimepanama"),
        profileId: "pime",
      },
    ],
  });
}

export function loadConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    const cfg = defaultConfig();
    saveConfig(cfg);
    return cfg;
  }
  return /** @type {GitIdentityConfig} */ (JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")));
}

export function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export function getProfile(config, id) {
  return config.profiles.find((p) => p.id === id) ?? null;
}

export function resolveProfileForPath(config, targetPath) {
  const resolved = path.resolve(targetPath);
  const matches = config.mappings
    .map((m) => ({ ...m, path: path.resolve(expandHome(m.path)) }))
    .filter((m) => resolved === m.path || resolved.startsWith(m.path + path.sep))
    .sort((a, b) => b.path.length - a.path.length);

  if (matches.length === 0) return null;
  return getProfile(config, matches[0].profileId);
}

export function isGitRepo(repoPath) {
  return fs.existsSync(path.join(repoPath, ".git"));
}

export function profileGitconfig(profile) {
  const lines = [
    `[user]`,
    `\tname = ${profile.name}`,
    `\temail = ${profile.email}`,
  ];
  if (profile.signingKey) {
    lines.push(`\tsigningkey = ${expandHome(profile.signingKey)}`);
    lines.push(`[gpg]`, `\tformat = ssh`);
    lines.push(`[commit]`, `\tgpgsign = ${profile.gpgSign ? "true" : "false"}`);
  }
  lines.push(`[core]`, `\tsshCommand = ssh -i ${expandHome(profile.sshKey)} -o IdentitiesOnly=yes`);
  return lines.join("\n") + "\n";
}

export function writeProfileFiles(config) {
  ensureConfigDir();
  for (const profile of config.profiles) {
    const file = path.join(PROFILES_DIR, `${profile.id}.gitconfig`);
    fs.writeFileSync(file, profileGitconfig(profile));
  }
}

export function writeSshSnippet(config) {
  const lines = ["# Pime Git Identity", ""];
  for (const p of config.profiles) {
    lines.push(
      `Host ${p.sshHost}`,
      `  HostName github.com`,
      `  User git`,
      `  IdentityFile ${expandHome(p.sshKey)}`,
      `  IdentitiesOnly yes`,
      ""
    );
  }
  fs.writeFileSync(SSH_SNIPPET_PATH, lines.join("\n"));
}

export function installSshConfig(config) {
  writeSshSnippet(config);
  const sshConfigPath = path.join(os.homedir(), ".ssh", "config");
  const marker = "# >>> pime-git-identity >>>";
  const endMarker = "# <<< pime-git-identity <<<";
  let content = fs.existsSync(sshConfigPath) ? fs.readFileSync(sshConfigPath, "utf8") : "";
  content = content.replace(new RegExp(`${marker}[\\s\\S]*?${endMarker}\\n?`, "m"), "");
  const snippet = fs
    .readFileSync(SSH_SNIPPET_PATH, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("# Pime Git Identity"))
    .join("\n")
    .trim();
  const block = `${marker}\n${snippet}\n${endMarker}\n`;
  fs.mkdirSync(path.dirname(sshConfigPath), { recursive: true });
  fs.writeFileSync(sshConfigPath, content.trimEnd() + (content.trimEnd() ? "\n\n" : "") + block);
}

export function installGitIncludes(config) {
  writeProfileFiles(config);
  const gitconfigPath = path.join(os.homedir(), ".gitconfig");
  const marker = "# >>> pime-git-identity >>>";
  const endMarker = "# <<< pime-git-identity <<<";

  let content = fs.existsSync(gitconfigPath) ? fs.readFileSync(gitconfigPath, "utf8") : "";
  content = content.replace(new RegExp(`${marker}[\\s\\S]*?${endMarker}\\n?`, "m"), "");

  const blocks = config.mappings.map((m) => {
    const gitdir = expandHome(m.path).replace(/ /g, "\\ ");
    const includePath = path.join(PROFILES_DIR, `${m.profileId}.gitconfig`);
    return `[includeIf "gitdir:${gitdir}/"]\n\tpath = ${includePath}`;
  });

  const block = [marker, ...blocks, endMarker, ""].join("\n");
  fs.writeFileSync(gitconfigPath, content.trimEnd() + "\n\n" + block);
}

export function syncAll(config) {
  installGitIncludes(config);
  installSshConfig(config);
  writeProfileFiles(config);
}

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const CURSOR_RULE_SRC = path.join(TOOL_DIR, "cursor", "pime-git-pipeline.mdc");
const CLI_PATH = path.join(TOOL_DIR, "cli.mjs");

/** Copia la regla Cursor del pipeline al proyecto (para repos nuevos importados). */
export function installProjectCursorRule(repoPath) {
  if (!fs.existsSync(CURSOR_RULE_SRC)) return null;
  const abs = path.resolve(repoPath);
  const destDir = path.join(abs, ".cursor", "rules");
  const dest = path.join(destDir, "pime-git-pipeline.mdc");
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(CURSOR_RULE_SRC, dest);
  return dest;
}

/** Onboarding completo: mapeo, hooks, regla Cursor, identidad git. */
export function onboardProject(config, repoPath, profileId) {
  const profile = getProfile(config, profileId);
  if (!profile) throw new Error(`Cuenta desconocida: ${profileId}`);
  const abs = path.resolve(expandHome(repoPath));
  mapProject(config, abs, profileId);
  if (isGitRepo(abs)) {
    applyToRepo(abs, profile);
    installProjectCursorRule(abs);
  }
  return abs;
}

/** Instala hooks pre-commit/pre-push que validan cuenta y firma. */
export function installRepoHooks(repoPath) {
  const abs = path.resolve(repoPath);
  if (!isGitRepo(abs)) throw new Error(`No es repo git: ${abs}`);
  const hooksDir = path.join(abs, ".git", "hooks");
  fs.mkdirSync(hooksDir, { recursive: true });

  for (const name of ["pre-commit", "pre-push"]) {
    const hookPath = path.join(hooksDir, name);
    const body = `#!/bin/sh
# Pime Git funnel — generado automáticamente
set -e
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
exec node ${shellQuote(CLI_PATH)} hook-run ${name} "$@"
`;
    fs.writeFileSync(hookPath, body, { mode: 0o755 });
  }
  return abs;
}

export function applyToRepo(repoPath, profile) {
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) {
    throw new Error(`No es un repositorio git: ${repoPath}`);
  }

  execSync(`git config user.name ${shellQuote(profile.name)}`, { cwd: repoPath });
  execSync(`git config user.email ${shellQuote(profile.email)}`, { cwd: repoPath });
  execSync(
    `git config core.sshCommand ${shellQuote(`ssh -i ${expandHome(profile.sshKey)} -o IdentitiesOnly=yes`)}`,
    { cwd: repoPath }
  );

  if (profile.signingKey) {
    execSync(`git config gpg.format ssh`, { cwd: repoPath });
    execSync(`git config user.signingkey ${shellQuote(expandHome(profile.signingKey))}`, {
      cwd: repoPath,
    });
    execSync(`git config commit.gpgsign ${profile.gpgSign ? "true" : "false"}`, { cwd: repoPath });
  }

  let originBefore = "";
  let originAfter = "";
  try {
    originBefore = execSync("git remote get-url origin", { cwd: repoPath, encoding: "utf8" }).trim();
    const next = rewriteGithubRemote(originBefore, profile.sshHost);
    originAfter = next ?? originBefore;
    if (next && next !== originBefore) {
      execSync(`git remote set-url origin ${shellQuote(next)}`, { cwd: repoPath });
    }
  } catch {
    originBefore = "";
    originAfter = "";
  }

  return { originBefore, originAfter, profile };
}

export function rewriteGithubRemote(url, sshHost) {
  if (!url) return null;
  const ssh = url.match(/^git@github\.com[^:]*:(.+)$/);
  if (ssh) return `git@${sshHost}:${ssh[1]}`;
  const https = url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  if (https) return `git@${sshHost}:${https[1]}.git`;
  return url;
}

export function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function testSsh(profile) {
  try {
    const out = execSync(`ssh -T git@${profile.sshHost}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, message: out.trim() };
  } catch (err) {
    const body = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
    if (/Hi [\w-]+!/.test(body)) return { ok: true, message: body };
    return { ok: false, message: body || String(err.message) };
  }
}

export function generateSshKey(profile) {
  const keyPath = expandHome(profile.sshKey);
  if (fs.existsSync(keyPath)) return { created: false, keyPath };
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  execSync(
    `ssh-keygen -t ed25519 -f ${shellQuote(keyPath)} -C ${shellQuote(profile.email)} -N "" -q`,
    { stdio: "inherit" }
  );
  return { created: true, keyPath };
}

export function readPublicKey(profile) {
  const pub = expandHome(profile.signingKey ?? `${profile.sshKey}.pub`);
  if (!fs.existsSync(pub)) return null;
  return fs.readFileSync(pub, "utf8").trim();
}

export function copyToClipboardMac(text) {
  if (process.platform !== "darwin") return false;
  spawnSync("pbcopy", { input: text });
  return true;
}

export function openMac(url) {
  if (process.platform !== "darwin") return false;
  spawnSync("open", [url]);
  return true;
}

export function addProfile(config, profile) {
  if (getProfile(config, profile.id)) {
    throw new Error(`La cuenta "${profile.id}" ya existe.`);
  }
  config.profiles.push(profile);
  saveConfig(config);
  generateSshKey(profile);
  syncAll(config);
}

export function mapProject(config, repoPath, profileId) {
  const profile = getProfile(config, profileId);
  if (!profile) throw new Error(`Cuenta desconocida: ${profileId}`);
  const abs = path.resolve(expandHome(repoPath));
  const idx = config.mappings.findIndex((m) => path.resolve(expandHome(m.path)) === abs);
  const entry = { path: abs, profileId };
  if (idx >= 0) config.mappings[idx] = entry;
  else config.mappings.push(entry);
  saveConfig(config);
  syncAll(config);
  if (isGitRepo(abs)) {
    installRepoHooks(abs);
    installProjectCursorRule(abs);
  }
  return { path: abs, profile };
}

export function unmapProject(config, repoPath) {
  const abs = path.resolve(expandHome(repoPath));
  const before = config.mappings.length;
  config.mappings = config.mappings.filter(
    (m) => path.resolve(expandHome(m.path)) !== abs
  );
  if (config.mappings.length === before) {
    throw new Error(`No hay mapeo para: ${abs}`);
  }
  saveConfig(config);
  syncAll(config);
}

export function repoStatus(config, repoPath) {
  const abs = path.resolve(repoPath);
  const profile = resolveProfileForPath(config, abs);
  const git = isGitRepo(abs);
  let user = { name: "", email: "" };
  let origin = "";
  let branch = "";
  if (git) {
    user.name = gitQuiet(abs, ["config", "user.name"]);
    user.email = gitQuiet(abs, ["config", "user.email"]);
    origin = gitQuiet(abs, ["remote", "get-url", "origin"]);
    branch = gitQuiet(abs, ["branch", "--show-current"]);
  }
  return { path: abs, git, profile, user, origin, branch };
}

export function ensureAndApply(config, repoPath) {
  const abs = path.resolve(repoPath);
  const profile = resolveProfileForPath(config, abs);
  if (!profile) {
    throw new Error(
      `Sin cuenta asignada para:\n  ${abs}\n\nAsigna una: pime-git map "${abs}" <cuenta>`
    );
  }
  if (!isGitRepo(abs)) {
    throw new Error(`No es un repositorio git: ${abs}`);
  }
  return applyToRepo(abs, profile);
}

export function runGit(config, repoPath, gitArgs) {
  ensureAndApply(config, repoPath);
  const result = spawnSync("git", gitArgs, {
    cwd: path.resolve(repoPath),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = new Error(`git ${gitArgs.join(" ")} falló (código ${result.status})`);
    err.exitCode = result.status;
    throw err;
  }
}

export const WEBSITES_ROOT = path.join(os.homedir(), "Documents/Websites");

export function parseGithubUserFromSsh(message) {
  const m = String(message).match(/Hi ([^!]+)!/i);
  return m ? m[1].trim() : null;
}

export function resolveGithubUser(config, profile) {
  if (profile.githubUser) return profile.githubUser;
  const res = testSsh(profile);
  const user = res.ok ? parseGithubUserFromSsh(res.message) : null;
  if (user) {
    profile.githubUser = user;
    saveConfig(config);
  }
  return user;
}

export function repoSshUrl(profile, fullName) {
  return `git@${profile.sshHost}:${fullName}.git`;
}

export function normalizeRemoteSlug(url) {
  if (!url) return "";
  const ssh = url.match(/git@github\.com[^:]*:(.+?)(?:\.git)?$/i);
  if (ssh) return ssh[1].toLowerCase();
  const https = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?/i);
  if (https) return https[1].toLowerCase();
  return url.toLowerCase();
}

/** @typedef {{ name: string; fullName: string; sshUrl: string; url: string; isPrivate: boolean; updatedAt: string }} GithubRepo */

export function catalogPath(profileKey) {
  return path.join(CONFIG_DIR, "catalog", `${profileKey}.json`);
}

export function bundledCatalogPath(profileKey) {
  return path.join(TOOL_DIR, "catalogs", `${profileKey}.json`);
}

export function loadRepoCatalog(profile) {
  const keys = [...new Set([profile.id, profile.githubUser].filter(Boolean))];
  for (const key of keys) {
    for (const p of [catalogPath(key), bundledCatalogPath(key)]) {
      if (!fs.existsSync(p)) continue;
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }
  return null;
}

function mapApiRepo(r, profile) {
  const fullName = r.full_name || r.nameWithOwner;
  const name = r.name || fullName.split("/").pop();
  return {
    name,
    fullName,
    sshUrl:
      rewriteGithubRemote(r.ssh_url || r.sshUrl, profile.sshHost) ||
      repoSshUrl(profile, fullName),
    url: r.html_url || r.url || `https://github.com/${fullName}`,
    isPrivate: !!(r.private ?? r.isPrivate),
    updatedAt: r.updated_at || r.updatedAt || "",
  };
}

export function catalogToRepos(catalog, profile) {
  if (!catalog?.repos) return [];
  return catalog.repos.map((r) => ({
    name: r.name,
    fullName: r.fullName,
    sshUrl: repoSshUrl(profile, r.fullName),
    url: `https://github.com/${r.fullName}`,
    isPrivate: true,
    updatedAt: catalog.updatedAt || "",
  }));
}

function ghTokenForUser(githubUser) {
  try {
    return execSync(`gh auth token -u ${shellQuote(githubUser)}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function fetchReposViaGhApi(profile, githubUser) {
  const token = ghTokenForUser(githubUser);
  if (!token) return [];

  /** @type {GithubRepo[]} */
  const repos = [];
  for (let page = 1; page <= 30; page++) {
    const url = `https://api.github.com/user/repos?affiliation=owner,organization_member,collaborator&per_page=100&page=${page}&sort=updated&direction=desc`;
    let batch;
    try {
      const out = execSync(
        `curl -fsS -H ${shellQuote(`Authorization: Bearer ${token}`)} -H "Accept: application/vnd.github+json" ${shellQuote(url)}`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      );
      batch = JSON.parse(out);
    } catch {
      break;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch.map((r) => mapApiRepo(r, profile)));
    if (batch.length < 100) break;
  }
  return repos;
}

export function filterRepos(repos, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return repos;
  return repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.fullName.split("/")[0].toLowerCase().includes(q)
  );
}

export function listGithubRepos(profile) {
  const user = profile.githubUser;
  if (!user) throw new Error("Sin usuario GitHub para esta cuenta");

  const merged = new Map();

  const catalog = loadRepoCatalog(profile);
  if (catalog) {
    for (const r of catalogToRepos(catalog, profile)) {
      merged.set(r.fullName.toLowerCase(), r);
    }
  }

  for (const r of fetchReposViaGhApi(profile, user)) {
    merged.set(r.fullName.toLowerCase(), r);
  }

  if (merged.size === 0) {
    try {
      const out = execSync(
        `gh repo list ${shellQuote(user)} --limit 500 --json name,nameWithOwner,sshUrl,url,isPrivate,updatedAt`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      );
      for (const r of JSON.parse(out).map((row) => mapApiRepo(row, profile))) {
        merged.set(r.fullName.toLowerCase(), r);
      }
    } catch {
      try {
        const out = execSync(
          `curl -fsS ${shellQuote(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=updated&direction=desc`)}`,
          { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
        );
        for (const r of JSON.parse(out).map((row) => mapApiRepo(row, profile))) {
          merged.set(r.fullName.toLowerCase(), r);
        }
      } catch {
        /* empty */
      }
    }
  }

  if (merged.size === 0) {
    throw new Error(`No se encontraron repos para @${user}`);
  }

  return [...merged.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function scanLocalGitRepos(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  for (const name of fs.readdirSync(rootDir)) {
    const p = path.join(rootDir, name);
    try {
      if (!fs.statSync(p).isDirectory()) continue;
      if (!isGitRepo(p)) continue;
      const origin = gitQuiet(p, ["remote", "get-url", "origin"]);
      if (!origin) continue;
      results.push({ path: p, origin, slug: normalizeRemoteSlug(origin) });
    } catch {
      /* skip */
    }
  }
  return results;
}

export function buildLocalMatchesBySlug(config, rootDir = WEBSITES_ROOT) {
  /** @type {Map<string, { path: string; origin: string; source: string }[]>} */
  const bySlug = new Map();

  const push = (slug, entry) => {
    const key = slug.toLowerCase();
    if (!key) return;
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key).push(entry);
  };

  for (const m of config.mappings) {
    const p = path.resolve(expandHome(m.path));
    if (!isGitRepo(p)) continue;
    const st = repoStatus(config, p);
    const slug = normalizeRemoteSlug(st.origin);
    if (slug) push(slug, { path: p, origin: st.origin, source: "mapeo" });
  }

  for (const local of scanLocalGitRepos(rootDir)) {
    push(local.slug, { path: local.path, origin: local.origin, source: "local" });
  }

  return bySlug;
}

export function findLocalMatchesForRepo(config, fullName, matchIndex) {
  const slug = fullName.toLowerCase();
  if (matchIndex) return matchIndex.get(slug) ?? [];

  /** @type {{ path: string; origin: string; source: string }[]} */
  const matches = [];
  const seen = new Set();

  for (const m of config.mappings) {
    const p = path.resolve(expandHome(m.path));
    if (!isGitRepo(p)) continue;
    const st = repoStatus(config, p);
    if (normalizeRemoteSlug(st.origin) === slug && !seen.has(p)) {
      matches.push({ path: p, origin: st.origin, source: "mapeo" });
      seen.add(p);
    }
  }

  for (const local of scanLocalGitRepos(WEBSITES_ROOT)) {
    if (local.slug === slug && !seen.has(local.path)) {
      matches.push({ path: local.path, origin: local.origin, source: "local" });
      seen.add(local.path);
    }
  }

  return matches;
}

export function gitEnvForProfile(profile) {
  return {
    ...process.env,
    GIT_SSH_COMMAND: `ssh -i ${expandHome(profile.sshKey)} -o IdentitiesOnly=yes`,
  };
}

export function cloneRepo(profile, sshUrl, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const result = spawnSync("git", ["clone", sshUrl, destPath], {
    stdio: "inherit",
    env: gitEnvForProfile(profile),
  });
  if (result.status !== 0) {
    throw new Error(`git clone falló (código ${result.status})`);
  }
}

export function setRepoOrigin(localPath, sshUrl) {
  const current = gitQuiet(localPath, ["remote", "get-url", "origin"]);
  if (current) {
    if (normalizeRemoteSlug(current) !== normalizeRemoteSlug(sshUrl)) {
      execSync(`git remote set-url origin ${shellQuote(sshUrl)}`, {
        cwd: localPath,
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
  } else {
    execSync(`git remote add origin ${shellQuote(sshUrl)}`, {
      cwd: localPath,
      stdio: ["ignore", "ignore", "ignore"],
    });
  }
}

export function pullRepoAt(config, profile, localPath, sshUrl) {
  const abs = path.resolve(localPath);
  mapProject(config, abs, profile.id);
  if (!fs.existsSync(abs)) {
    cloneRepo(profile, sshUrl, abs);
  } else if (!isGitRepo(abs)) {
    throw new Error(`La ruta existe pero no es un repo git: ${abs}`);
  } else {
    setRepoOrigin(abs, sshUrl);
  }
  applyToRepo(abs, profile);
  const result = spawnSync("git", ["pull", "--ff-only"], {
    cwd: abs,
    stdio: "inherit",
    env: gitEnvForProfile(profile),
  });
  if (result.status !== 0) {
    throw new Error(`git pull falló (código ${result.status})`);
  }
  installProjectCursorRule(abs);
  return abs;
}

/** Nombre de carpeta local para un repo (evita colisiones por nombre). */
export function localFolderNameForRepo(repo, usedNames = new Set()) {
  let name = repo.name;
  if (usedNames.has(name.toLowerCase())) {
    name = repo.fullName.replace("/", "-");
  }
  usedNames.add(name.toLowerCase());
  return name;
}

/** Parsea selección: "1,3,5-8", "all", o líneas owner/repo. */
export function parseRepoSelection(raw, repos) {
  const text = String(raw ?? "").trim();
  if (!text) return [];

  if (/^(all|todos|\*)$/i.test(text)) return [...repos];

  const bySlug = new Map(repos.map((r) => [r.fullName.toLowerCase(), r]));
  const byName = new Map();
  for (const r of repos) {
    const key = r.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(r);
  }

  if (text.includes("/") || text.includes("\n")) {
    const lines = text
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const picked = [];
    const seen = new Set();
    for (const line of lines) {
      let repo = null;
      if (line.includes("/")) {
        repo = bySlug.get(line.toLowerCase()) ?? null;
      } else {
        const matches = byName.get(line.toLowerCase()) ?? [];
        if (matches.length === 1) repo = matches[0];
      }
      if (repo && !seen.has(repo.fullName.toLowerCase())) {
        seen.add(repo.fullName.toLowerCase());
        picked.push(repo);
      }
    }
    return picked;
  }

  const indices = new Set();
  for (const part of text.split(/[,\s]+/)) {
    if (!part) continue;
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) indices.add(i);
    } else {
      const n = Number(part);
      if (Number.isInteger(n) && n >= 1) indices.add(n);
    }
  }

  const picked = [];
  const seen = new Set();
  for (const i of [...indices].sort((a, b) => a - b)) {
    const repo = repos[i - 1];
    if (!repo) continue;
    const key = repo.fullName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(repo);
  }
  return picked;
}

/**
 * Clona o hace pull de varios repos en carpetas bajo baseDir.
 * @returns {{ ok: { repo: GithubRepo; dest: string }[]; fail: { repo: GithubRepo; dest: string; error: string }[] }}
 */
/**
 * @param {(evt: {
 *   phase: "start" | "done";
 *   current: number;
 *   total: number;
 *   repo: string;
 *   dest: string;
 *   ok?: boolean;
 *   error?: string;
 * }) => void} [onProgress]
 */
export function bulkPullRepos(config, profile, repos, baseDir, onProgress) {
  const absBase = path.resolve(expandHome(baseDir));
  fs.mkdirSync(absBase, { recursive: true });

  const used = new Set();
  /** @type {{ repo: GithubRepo; dest: string }[]} */
  const plan = repos.map((repo) => ({
    repo,
    dest: path.join(absBase, localFolderNameForRepo(repo, used)),
  }));

  /** @type {{ ok: { repo: GithubRepo; dest: string }[]; fail: { repo: GithubRepo; dest: string; error: string }[] }} */
  const results = { ok: [], fail: [] };
  const total = plan.length;

  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const current = i + 1;
    onProgress?.({
      phase: "start",
      current,
      total,
      repo: item.repo.fullName,
      dest: item.dest,
    });
    try {
      pullRepoAt(config, profile, item.dest, item.repo.sshUrl);
      results.ok.push(item);
      onProgress?.({
        phase: "done",
        current,
        total,
        repo: item.repo.fullName,
        dest: item.dest,
        ok: true,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      results.fail.push({
        ...item,
        error,
      });
      onProgress?.({
        phase: "done",
        current,
        total,
        repo: item.repo.fullName,
        dest: item.dest,
        ok: false,
        error,
      });
    }
  }

  return results;
}

export function basenameDisplay(p) {
  return path.basename(p) || p;
}

export async function promptLine(rl, label, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  return answer || defaultValue;
}

export async function promptYesNo(rl, label, defaultYes = true) {
  const hint = defaultYes ? "S/n" : "s/N";
  const answer = (await rl.question(`${label} (${hint}): `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "s" || answer === "si" || answer === "y" || answer === "yes";
}

export async function pickFromList(rl, title, items) {
  console.log(`\n${title}`);
  items.forEach((item, i) => console.log(`  ${i + 1}) ${item}`));
  const raw = await rl.question("\nElige número: ");
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > items.length) return null;
  return n - 1;
}
