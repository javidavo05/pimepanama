#!/usr/bin/env node
/**
 * Pime Git — portal web local (sin clave, solo red LAN).
 *   npm run pime-git:web
 *   node tools/git-identity/server.mjs
 */

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  WEBSITES_ROOT,
  applyToRepo,
  basenameDisplay,
  buildLocalMatchesBySlug,
  bulkPullRepos,
  ensureAndApply,
  expandHome,
  filterRepos,
  getProfile,
  isGitRepo,
  listGithubRepos,
  loadConfig,
  localFolderNameForRepo,
  mapProject,
  installProjectCursorRule,
  onboardProject,
  pullRepoAt,
  readPublicKey,
  repoStatus,
  resolveGithubUser,
  runGit,
  saveConfig,
  scanLocalGitRepos,
  syncAll,
  testSsh,
  unmapProject,
} from "./lib.mjs";
import {
  formatVerifyReport,
  funnelGit,
  verifyRepoGit,
} from "./funnel.mjs";
import { getDashboard, getProjectDetail, getPushStatus, listProjects } from "./repo-detail.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PIME_GIT_PORT || 3847);
const HOST = process.env.PIME_GIT_HOST || "0.0.0.0";

function lanAddresses() {
  /** @type {string[]} */
  const addrs = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) addrs.push(iface.address);
    }
  }
  return addrs;
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

/** @returns {{ send: (obj: unknown) => void; end: () => void }} */
function ndjsonStream(res) {
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  return {
    send(obj) {
      res.write(`${JSON.stringify(obj)}\n`);
    },
    end() {
      res.end();
    },
  };
}

/**
 * @param {import("./lib.mjs").GitIdentityConfig} config
 * @param {string} repoPath
 * @param {string} message
 * @param {(evt: { step: number; total: number; id: string; label: string; status: "running" | "ok" | "fail"; detail?: string }) => void} onProgress
 */
function commitProjectWithProgress(config, repoPath, message, onProgress) {
  const abs = path.resolve(expandHome(repoPath));
  const msg = String(message ?? "").trim();
  if (!msg) throw new Error("Mensaje de commit requerido");
  if (!isGitRepo(abs)) throw new Error("No es un repositorio git");

  const steps = [
    { id: "apply", label: "Aplicar cuenta al repo" },
    { id: "verify", label: "Verificar identidad y firma" },
    { id: "stage", label: "Agregar cambios (git add -A)" },
    { id: "commit", label: "Crear commit firmado" },
  ];
  const total = steps.length;

  const tick = (index, status, detail) => {
    const step = steps[index];
    onProgress({
      step: index + 1,
      total,
      id: step.id,
      label: step.label,
      status,
      detail,
    });
  };

  const runStep = (index, fn) => {
    tick(index, "running");
    try {
      fn();
      tick(index, "ok");
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      tick(index, "fail", detail);
      throw e;
    }
  };

  runStep(0, () => {
    ensureAndApply(config, abs);
    installProjectCursorRule(abs);
  });

  runStep(1, () => {
    const check = verifyRepoGit(config, abs, { apply: false });
    if (!check.ok) {
      const err = new Error(`Verificación fallida:\n${formatVerifyReport(check)}`);
      err.verify = check;
      throw err;
    }
  });

  runStep(2, () => {
    runGit(config, abs, ["add", "-A"]);
  });

  runStep(3, () => {
    runGit(config, abs, ["commit", "-m", msg]);
  });

  return getProjectDetail(config, abs);
}

/**
 * Push con pasos visibles + verificación de sync al remoto.
 * @param {import("./lib.mjs").GitIdentityConfig} config
 * @param {string} repoPath
 * @param {(evt: { step: number; total: number; id: string; label: string; status: "running" | "ok" | "fail"; detail?: string }) => void} onProgress
 */
function pushProjectWithProgress(config, repoPath, onProgress) {
  const abs = path.resolve(expandHome(repoPath));
  if (!isGitRepo(abs)) throw new Error("No es un repositorio git");

  const steps = [
    { id: "apply", label: "Aplicar cuenta al repo" },
    { id: "verify", label: "Verificar identidad y firma" },
    { id: "push", label: "Push al remoto" },
    { id: "status", label: "Verificar estado vs remoto" },
  ];
  const total = steps.length;

  const tick = (index, status, detail) => {
    const step = steps[index];
    onProgress({
      step: index + 1,
      total,
      id: step.id,
      label: step.label,
      status,
      detail,
    });
  };

  const runStep = (index, fn) => {
    tick(index, "running");
    try {
      const detail = fn();
      tick(index, "ok", typeof detail === "string" ? detail : undefined);
      return detail;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      tick(index, "fail", detail);
      throw e;
    }
  };

  runStep(0, () => {
    ensureAndApply(config, abs);
    installProjectCursorRule(abs);
  });

  runStep(1, () => {
    const check = verifyRepoGit(config, abs, { apply: false });
    if (!check.ok) {
      const err = new Error(`Verificación fallida:\n${formatVerifyReport(check)}`);
      err.verify = check;
      throw err;
    }
  });

  runStep(2, () => {
    const result = spawnSync("git", ["push"], {
      cwd: abs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) {
      const msg = (result.stderr || result.stdout || `git push falló (${result.status})`).trim();
      throw new Error(msg);
    }
    return (result.stderr || result.stdout || "OK").trim().slice(0, 200) || "OK";
  });

  /** @type {ReturnType<typeof getPushStatus> | undefined} */
  let pushStatus;
  runStep(3, () => {
    pushStatus = getPushStatus(config, abs, { fetch: true });
    if (!pushStatus.pushOk && pushStatus.ahead > 0) {
      throw new Error(`Tras el push aún hay commits por subir (↑${pushStatus.ahead})`);
    }
    return pushStatus.sync?.label || "estado OK";
  });

  return {
    detail: getProjectDetail(config, abs),
    pushStatus,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

function mime(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function serveStatic(res, urlPath) {
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const file = path.normalize(path.join(PUBLIC_DIR, rel.replace(/^\//, "")));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const data = fs.readFileSync(file);
  res.writeHead(200, { "Content-Type": mime(file) });
  res.end(data);
}

function profilesPayload(config) {
  return config.profiles.map((p) => {
    const ssh = testSsh(p);
    const gh =
      p.githubUser ||
      (ssh.ok ? (ssh.message.match(/Hi\s+([^!]+)!/i)?.[1] ?? null) : null);
    return {
      id: p.id,
      label: p.label,
      email: p.email,
      githubUser: gh,
      sshOk: ssh.ok,
      sshMessage: ssh.message,
      hasPublicKey: !!readPublicKey(p),
    };
  });
}

async function handleApi(req, res, url) {
  const config = loadConfig();

  if (req.method === "GET" && url.pathname === "/api/state") {
    return json(res, 200, {
      websitesRoot: WEBSITES_ROOT,
      port: PORT,
      lan: lanAddresses(),
      profiles: profilesPayload(config),
      mappings: config.mappings.map((m) => ({
        path: m.path,
        profileId: m.profileId,
        name: basenameDisplay(m.path),
      })),
    });
  }

  if (req.method === "GET" && url.pathname === "/api/repos") {
    const profileId = url.searchParams.get("profile");
    const q = url.searchParams.get("q") ?? "";
    const profile = getProfile(config, profileId);
    if (!profile) return json(res, 404, { error: "Cuenta no encontrada" });

    try {
      if (!resolveGithubUser(config, profile) && !profile.githubUser) {
        return json(res, 400, { error: "Sin usuario GitHub en esta cuenta" });
      }
      const ssh = testSsh(profile);
      if (!ssh.ok) {
        return json(res, 400, { error: `SSH no conectado: ${ssh.message}` });
      }

      let repos = listGithubRepos(profile);
      repos = filterRepos(repos, q);

      const matchIndex = buildLocalMatchesBySlug(config);
      const local = scanLocalGitRepos(WEBSITES_ROOT);
      const localBySlug = new Map(local.map((r) => [r.slug, r.path]));

      const items = repos.map((r) => {
        const matches = matchIndex.get(r.fullName.toLowerCase()) ?? [];
        const slug = r.fullName.toLowerCase();
        const localPath = matches[0]?.path ?? localBySlug.get(slug) ?? null;
        return {
          fullName: r.fullName,
          name: r.name,
          isPrivate: r.isPrivate,
          sshUrl: r.sshUrl,
          localPath,
          cloned: !!localPath,
        };
      });

      return json(res, 200, { count: items.length, repos: items });
    } catch (e) {
      return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/local") {
    const root = path.resolve(expandHome(url.searchParams.get("root") || WEBSITES_ROOT));
    const repos = scanLocalGitRepos(root).map((r) => {
      const st = isGitRepo(r.path) ? repoStatus(config, r.path) : null;
      return {
        path: r.path,
        name: basenameDisplay(r.path),
        origin: r.origin,
        slug: r.slug,
        profileId: st?.profile?.id ?? null,
        branch: st?.branch ?? null,
      };
    });
    return json(res, 200, { root, repos });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    const activePath = url.searchParams.get("project") ?? "";
    const limit = Number(url.searchParams.get("limit") || 35);
    const dashboard = getDashboard(config, { activePath, commitLimit: limit });
    return json(res, 200, {
      websitesRoot: WEBSITES_ROOT,
      port: PORT,
      lan: lanAddresses(),
      profiles: profilesPayload(config),
      mappings: config.mappings.map((m) => ({
        path: m.path,
        profileId: m.profileId,
        name: basenameDisplay(m.path),
      })),
      ...dashboard,
    });
  }

  if (req.method === "GET" && url.pathname === "/api/projects") {
    return json(res, 200, { projects: listProjects(config) });
  }

  if (req.method === "GET" && url.pathname === "/api/project") {
    const p = url.searchParams.get("path");
    if (!p) return json(res, 400, { error: "path requerido" });
    const limit = Number(url.searchParams.get("limit") || 30);
    const detail = getProjectDetail(config, p, { commitLimit: limit });
    if (!detail.ok) return json(res, 404, detail);
    return json(res, 200, detail);
  }

  if (req.method === "GET" && url.pathname === "/api/repo-status") {
    const p = url.searchParams.get("path");
    if (!p) return json(res, 400, { error: "path requerido" });
    const st = repoStatus(config, path.resolve(expandHome(p)));
    return json(res, 200, {
      path: st.path,
      git: st.git,
      branch: st.branch,
      origin: st.origin,
      profileId: st.profile?.id ?? null,
      user: st.user,
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return json(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }

    if (url.pathname === "/api/sync") {
      syncAll(config);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === "/api/ssh-test") {
      const profileId = body.profileId;
      const list = profileId
        ? [getProfile(config, profileId)].filter(Boolean)
        : config.profiles;
      const results = list.map((p) => {
        const r = testSsh(p);
        return { id: p.id, ok: r.ok, message: r.message };
      });
      return json(res, 200, { results });
    }

    if (url.pathname === "/api/apply") {
      const repoPath = path.resolve(expandHome(body.path || WEBSITES_ROOT));
      try {
        const r = ensureAndApply(config, repoPath);
        return json(res, 200, {
          ok: true,
          profileId: r.profile.id,
          email: r.profile.email,
          origin: r.originAfter,
        });
      } catch (e) {
        return json(res, 400, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/map") {
      const profileId = body.profileId;
      const repoPath = body.path;
      if (!profileId || !repoPath) return json(res, 400, { error: "profileId y path requeridos" });
      try {
        mapProject(config, repoPath, profileId);
        return json(res, 200, { ok: true });
      } catch (e) {
        return json(res, 400, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/unmap") {
      if (!body.path) return json(res, 400, { error: "path requerido" });
      unmapProject(config, body.path);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === "/api/pull") {
      const profile = getProfile(config, body.profileId);
      if (!profile) return json(res, 404, { error: "Cuenta no encontrada" });
      const fullName = body.fullName;
      if (!fullName) return json(res, 400, { error: "fullName requerido" });

      try {
        const repos = listGithubRepos(profile);
        const repo = repos.find((r) => r.fullName.toLowerCase() === fullName.toLowerCase());
        if (!repo) return json(res, 404, { error: "Repo no encontrado" });

        const dest =
          body.destPath ||
          path.join(WEBSITES_ROOT, localFolderNameForRepo(repo, new Set()));
        pullRepoAt(config, profile, dest, repo.sshUrl);
        return json(res, 200, { ok: true, dest });
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/bulk/preview") {
      const profile = getProfile(config, body.profileId);
      if (!profile) return json(res, 404, { error: "Cuenta no encontrada" });
      const fullNames = Array.isArray(body.fullNames) ? body.fullNames : [];
      const baseDir = path.resolve(expandHome(body.baseDir || WEBSITES_ROOT));

      try {
        const all = listGithubRepos(profile);
        const byName = new Map(all.map((r) => [r.fullName.toLowerCase(), r]));
        const used = new Set();
        const plan = [];
        for (const fn of fullNames) {
          const repo = byName.get(String(fn).toLowerCase());
          if (!repo) continue;
          const dest = path.join(baseDir, localFolderNameForRepo(repo, used));
          const exists = fs.existsSync(dest);
          plan.push({
            fullName: repo.fullName,
            dest,
            action: exists && isGitRepo(dest) ? "pull" : exists ? "conflict" : "clone",
          });
        }
        return json(res, 200, { baseDir, plan });
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/bulk/run") {
      const profile = getProfile(config, body.profileId);
      if (!profile) return json(res, 404, { error: "Cuenta no encontrada" });
      const fullNames = Array.isArray(body.fullNames) ? body.fullNames : [];
      const baseDir = path.resolve(expandHome(body.baseDir || WEBSITES_ROOT));

      if (fullNames.length === 0) return json(res, 400, { error: "Selecciona al menos un repo" });

      try {
        const all = listGithubRepos(profile);
        const byName = new Map(all.map((r) => [r.fullName.toLowerCase(), r]));
        const picked = fullNames
          .map((fn) => byName.get(String(fn).toLowerCase()))
          .filter(Boolean);

        if (body.stream) {
          const stream = ndjsonStream(res);
          stream.send({ type: "start", total: picked.length });
          const results = bulkPullRepos(config, profile, picked, baseDir, (evt) => {
            stream.send({ type: "progress", ...evt });
          });
          stream.send({ type: "complete", ok: results.ok, fail: results.fail });
          stream.end();
          return;
        }

        const results = bulkPullRepos(config, profile, picked, baseDir);
        return json(res, 200, results);
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/project/apply") {
      const repoPath = path.resolve(expandHome(body.path));
      try {
        const r = ensureAndApply(config, repoPath);
        installProjectCursorRule(repoPath);
        return json(res, 200, { ok: true, profileId: r.profile.id });
      } catch (e) {
        return json(res, 400, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/project/pull") {
      const repoPath = path.resolve(expandHome(body.path));
      try {
        funnelGit(config, repoPath, ["pull", "--ff-only"], { verify: false, apply: true });
        return json(res, 200, { ok: true, detail: getProjectDetail(config, repoPath) });
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/project/push-status") {
      const repoPath = path.resolve(expandHome(body.path));
      try {
        const pushStatus = getPushStatus(config, repoPath, {
          fetch: body.fetch !== false,
        });
        return json(res, 200, {
          ok: true,
          pushStatus,
          detail: getProjectDetail(config, repoPath),
        });
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/project/push") {
      const repoPath = path.resolve(expandHome(body.path));
      try {
        if (body.stream) {
          const stream = ndjsonStream(res);
          stream.send({ type: "start", total: 4 });
          try {
            const result = pushProjectWithProgress(config, repoPath, (evt) => {
              stream.send({ type: "progress", ...evt });
            });
            stream.send({
              type: "complete",
              ok: true,
              detail: result.detail,
              pushStatus: result.pushStatus,
            });
          } catch (e) {
            stream.send({
              type: "complete",
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
          stream.end();
          return;
        }

        const result = pushProjectWithProgress(config, repoPath, () => {});
        return json(res, 200, {
          ok: true,
          detail: result.detail,
          pushStatus: result.pushStatus,
        });
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/project/commit") {
      const repoPath = path.resolve(expandHome(body.path));
      const message = String(body.message ?? "").trim();
      if (!message) return json(res, 400, { error: "Mensaje de commit requerido" });

      try {
        if (body.stream) {
          const stream = ndjsonStream(res);
          stream.send({ type: "start", total: 4 });
          try {
            const detail = commitProjectWithProgress(config, repoPath, message, (evt) => {
              stream.send({ type: "progress", ...evt });
            });
            stream.send({ type: "complete", ok: true, detail });
          } catch (e) {
            stream.send({
              type: "complete",
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
          stream.end();
          return;
        }

        const detail = commitProjectWithProgress(config, repoPath, message, () => {});
        return json(res, 200, { ok: true, detail });
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/project/onboard") {
      const { path: repoPath, profileId } = body;
      if (!repoPath || !profileId) return json(res, 400, { error: "path y profileId requeridos" });
      try {
        onboardProject(config, repoPath, profileId);
        return json(res, 200, { ok: true, detail: getProjectDetail(config, repoPath) });
      } catch (e) {
        return json(res, 400, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/git") {
      const repoPath = path.resolve(expandHome(body.path));
      const args = Array.isArray(body.args) ? body.args : [];
      if (args.length === 0) return json(res, 400, { error: "args requeridos" });
      try {
        runGit(config, repoPath, args);
        return json(res, 200, { ok: true });
      } catch (e) {
        return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (url.pathname === "/api/github-user") {
      const profile = getProfile(config, body.profileId);
      if (!profile) return json(res, 404, { error: "Cuenta no encontrada" });
      const user = String(body.githubUser || "").replace(/^@/, "").trim();
      if (!user) return json(res, 400, { error: "githubUser requerido" });
      profile.githubUser = user;
      saveConfig(config);
      return json(res, 200, { ok: true, githubUser: user });
    }

    if (url.pathname === "/api/public-key") {
      const profile = getProfile(config, body.profileId);
      if (!profile) return json(res, 404, { error: "Cuenta no encontrada" });
      const pub = readPublicKey(profile);
      if (!pub) return json(res, 404, { error: "Sin llave pública" });
      return json(res, 200, { key: pub });
    }
  }

  json(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, url);
    } catch (e) {
      json(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  serveStatic(res, url.pathname);
});

server.listen(PORT, HOST, () => {
  const ips = lanAddresses();
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Pime Git — Portal web local                    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Red LAN: http://${ip}:${PORT}`);
  console.log("\n  Sin clave — solo usar en tu red de confianza.");
  console.log("  Ctrl+C para detener.\n");
});
