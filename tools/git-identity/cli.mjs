#!/usr/bin/env node
/**
 * Pime Git — gestor local Mac de cuentas GitHub por proyecto.
 *
 * Menú interactivo (recomendado):
 *   pime-git
 *   npm run pime-git
 *
 * CLI:
 *   pime-git menu
 *   pime-git status [ruta]
 *   pime-git accounts
 *   pime-git account add [--id --label --name --email]
 *   pime-git map <ruta> <cuenta>
 *   pime-git unmap <ruta>
 *   pime-git apply [ruta]
 *   pime-git verify [ruta]        Validar cuenta, firma y SSH
 *   pime-git commit -m "..."      Commit vía funnel (firmado)
 *   pime-git pull [ruta]
 *   pime-git push [ruta]        Push vía funnel (validado)
 *   pime-git bulk <cuenta> --dir <carpeta> --select "1,3,5-8" [--filter texto]
 *   pime-git web                  Portal HTML en red local (:3847)
 *   pime-git git [ruta] -- <args git...>
 *   pime-git doctor
 *   pime-git sync
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CONFIG_PATH,
  addProfile,
  applyToRepo,
  basenameDisplay,
  bulkPullRepos,
  copyToClipboardMac,
  defaultConfig,
  ensureAndApply,
  expandHome,
  filterRepos,
  getProfile,
  installProjectCursorRule,
  installRepoHooks,
  listGithubRepos,
  loadConfig,
  mapProject,
  openMac,
  parseRepoSelection,
  readPublicKey,
  repoStatus,
  resolveGithubUser,
  resolveProfileForPath,
  runGit,
  saveConfig,
  slugifyId,
  syncAll,
  testSsh,
  unmapProject,
  WEBSITES_ROOT,
  localFolderNameForRepo,
} from "./lib.mjs";
import {
  formatVerifyReport,
  funnelGit,
  installCursorRule,
  runHook,
  verifyRepoGit,
} from "./funnel.mjs";
import { runMenu } from "./menu.mjs";

function funnelOpts(flags) {
  return { verify: !flags["no-verify"], apply: true };
}

function resolveRepoArg(maybePath, fallback = process.cwd()) {
  if (!maybePath) return fallback;
  const candidate = path.resolve(expandHome(maybePath));
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
  return fallback;
}

function isRepoPath(p) {
  const candidate = path.resolve(expandHome(p));
  return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
}

function help() {
  console.log(`
Pime Git — cuentas GitHub por proyecto (Mac)

Menú interactivo:
  pime-git                    Abre el menú (o: npm run pime-git)

Comandos:
  menu                        Menú interactivo
  status [ruta]               Cuenta y git del proyecto
  accounts                    Lista cuentas y mapeos
  account add                 Nueva cuenta (flags o asistente)
  map <ruta> <cuenta>         Asignar cuenta a carpeta
  unmap <ruta>                Quitar asignación
  apply [ruta]                Aplicar cuenta (user.email + SSH remote)
  verify [ruta]               Validar mapeo, firma SSH, email y origin
  commit -m "msg" [ruta]      Commit con funnel (firma por cuenta)
  pull [ruta]                 git pull con la cuenta correcta
  push [ruta] [--] [args]     git push con validación funnel
  hooks install [ruta]        Instalar pre-commit/pre-push en el repo
  cursor-rule                 Instalar regla Cursor en ~/.cursor/rules/
  bulk <cuenta>               Importar varios repos en una carpeta
    --dir <carpeta>           Carpeta base (default: ~/Documents/Websites)
    --select "1,3,5-8|all"    Números del listado o owner/repo
    --filter <texto>          Filtrar repos antes de seleccionar
    --dry-run                 Mostrar plan sin ejecutar
  web                         Portal HTML en red local (puerto 3847)
  git [ruta] -- <args>        Cualquier comando git
  doctor                      Probar SSH de cada cuenta
  sync                        Actualizar ~/.gitconfig y ~/.ssh/config
  key copy <cuenta>           Copiar llave pública al portapapeles
  key show <cuenta>           Mostrar llave pública

Config: ${CONFIG_PATH}
`);
}

function cmdAccounts(config) {
  console.log("Cuentas:\n");
  for (const p of config.profiles) {
    const ssh = testSsh(p);
    console.log(`  ${p.id.padEnd(14)} ${p.label}`);
    console.log(`    ${p.name} <${p.email}>`);
    console.log(`    git@${p.sshHost}  ${ssh.ok ? "✓" : "✗"}`);
    console.log();
  }
  console.log("Proyectos:\n");
  for (const m of config.mappings) {
    console.log(`  ${basenameDisplay(m.path)} → ${m.profileId}`);
    console.log(`    ${m.path}`);
  }
  console.log();
}

function cmdStatus(config, targetPath) {
  const st = repoStatus(config, targetPath ?? process.cwd());
  console.log(`Ruta:    ${st.path}`);
  console.log(`Git:     ${st.git ? "sí" : "no"}`);
  if (st.git) {
    console.log(`Rama:    ${st.branch || "—"}`);
    console.log(`Origin:  ${st.origin || "—"}`);
    console.log(`Usuario: ${st.user.name} <${st.user.email}>`);
  }
  if (st.profile) {
    console.log(`Cuenta:  ${st.profile.label} (${st.profile.id})`);
  } else {
    console.log("Cuenta:  (sin asignar)");
  }
}

async function cmdAccountAdd(config, flags, interactive) {
  let id = flags.id ? slugifyId(flags.id) : "";
  let label = flags.label ?? "";
  let name = flags.name ?? "";
  let email = flags.email ?? "";

  if (interactive || (!id && !name && !email)) {
    const readline = await import("node:readline/promises");
    const { stdin, stdout } = await import("node:process");
    const { promptLine, promptYesNo } = await import("./lib.mjs");
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      label = await promptLine(rl, "Nombre corto", label);
      id = slugifyId(await promptLine(rl, "ID interno", id || slugifyId(label)));
      name = await promptLine(rl, "git user.name", name);
      email = await promptLine(rl, "git user.email", email);
      const sign = await promptYesNo(rl, "Firmar commits", true);
      flags.sign = sign ? "true" : "false";
    } finally {
      rl.close();
    }
  }

  if (!id || !name || !email) {
    console.error("Uso: account add --id X --name \"...\" --email you@mail.com");
    process.exit(1);
  }

  const profile = {
    id,
    label: label || id,
    name,
    email,
    sshHost: flags["ssh-host"] ?? `github.com-${id}`,
    sshKey: flags["ssh-key"] ?? `~/.ssh/id_ed25519_${id}`,
    signingKey: flags["signing-key"] ?? `~/.ssh/id_ed25519_${id}.pub`,
    gpgSign: flags.sign !== "false",
  };

  addProfile(config, profile);
  const pub = readPublicKey(profile);
  console.log(`Cuenta "${id}" creada.`);
  if (pub) {
    console.log("\n" + pub);
    if (copyToClipboardMac(pub)) console.log("\n(copiada al portapapeles)");
    if (process.platform === "darwin") openMac("https://github.com/settings/ssh/new");
  }
}

function cmdKey(config, sub, accountId) {
  const profile = getProfile(config, accountId);
  if (!profile) {
    console.error(`Cuenta desconocida: ${accountId}`);
    process.exit(1);
  }
  const pub = readPublicKey(profile);
  if (!pub) {
    console.error("No hay llave pública.");
    process.exit(1);
  }
  if (sub === "copy") {
    if (copyToClipboardMac(pub)) console.log(`Llave de "${accountId}" copiada.`);
    else console.log(pub);
  } else {
    console.log(pub);
  }
}

function cmdDoctor(config) {
  console.log("SSH por cuenta:\n");
  for (const p of config.profiles) {
    const keyOk = fs.existsSync(expandHome(p.sshKey));
    const res = keyOk ? testSsh(p) : { ok: false, message: "falta llave SSH" };
    console.log(`  ${p.id.padEnd(14)} ${res.ok ? "✓" : "✗"}  ${res.message}`);
  }
  console.log();
}

function cmdBulk(config, accountId, flags) {
  const profile = getProfile(config, accountId);
  if (!profile) {
    console.error(`Cuenta desconocida: ${accountId}`);
    process.exit(1);
  }

  const ssh = testSsh(profile);
  if (!ssh.ok) {
    console.error(`SSH no conectado para "${accountId}": ${ssh.message}`);
    process.exit(1);
  }

  if (!resolveGithubUser(config, profile) && !profile.githubUser) {
    console.error(`Sin githubUser para "${accountId}". Configúralo en el menú o en ~/.pime-git/config.json`);
    process.exit(1);
  }

  let repos;
  try {
    repos = listGithubRepos(profile);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }

  if (flags.filter) repos = filterRepos(repos, String(flags.filter));

  const selection = flags.select ?? flags.repos ?? "";
  const picked = parseRepoSelection(selection, repos);

  if (picked.length === 0) {
    console.error("Ningún repo seleccionado. Usa --select \"1,3\" o --select all");
    console.error(`Repos disponibles: ${repos.length} (usa --filter para acotar)`);
    process.exit(1);
  }

  const baseDir = path.resolve(expandHome(flags.dir ?? WEBSITES_ROOT));
  const used = new Set();
  const plan = picked.map((repo) => ({
    repo,
    dest: path.join(baseDir, localFolderNameForRepo(repo, used)),
  }));

  console.log(`\nPlan (${plan.length} repos) → ${baseDir}\n`);
  for (const p of plan) {
    const exists = fs.existsSync(p.dest);
    const tag = exists ? "pull" : "clone";
    console.log(`  ${p.repo.fullName}`);
    console.log(`    → ${p.dest}  [${tag}]`);
  }

  if (flags["dry-run"]) return;

  console.log("\nImportando…\n");
  const results = bulkPullRepos(config, profile, picked, baseDir);

  console.log(`\n✓ ${results.ok.length} correctos`);
  if (results.fail.length > 0) {
    console.log(`✗ ${results.fail.length} fallidos:`);
    for (const f of results.fail) process.exitCode = 1;
    for (const f of results.fail) console.log(`  ${f.repo.fullName}: ${f.error}`);
  }
}

function parseArgv(argv) {
  const flags = {};
  const positional = [];
  let gitArgs = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      gitArgs = argv.slice(i + 1);
      break;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional, gitArgs };
}

const { flags, positional, gitArgs } = parseArgv(process.argv.slice(2));
const cmd = positional[0] ?? (process.stdin.isTTY ? "menu" : "help");
const config = loadConfig();

async function main() {
  switch (cmd) {
    case "help":
    case "-h":
    case "--help":
      help();
      break;
    case "menu":
      await runMenu(process.cwd());
      break;
    case "accounts":
    case "list":
      cmdAccounts(config);
      break;
    case "status":
      cmdStatus(config, positional[1]);
      break;
    case "account":
      if (positional[1] === "add") await cmdAccountAdd(config, flags, false);
      else {
        console.error("Uso: account add");
        process.exit(1);
      }
      break;
    case "add":
      await cmdAccountAdd(config, flags, true);
      break;
    case "map": {
      mapProject(config, positional[1], positional[2]);
      console.log(`OK: ${positional[1]} → ${positional[2]} (hooks funnel si es repo git)`);
      break;
    }
    case "unmap":
      unmapProject(config, positional[1]);
      console.log(`OK: mapeo eliminado`);
      break;
    case "apply": {
      const r = ensureAndApply(config, positional[1] ?? process.cwd());
      console.log(`Aplicado: ${r.profile.id} <${r.profile.email}>`);
      if (r.originBefore !== r.originAfter && r.originAfter) {
        console.log(`origin → ${r.originAfter}`);
      }
      break;
    }
    case "verify": {
      const repo = positional[1] ?? process.cwd();
      const r = verifyRepoGit(config, repo, { apply: flags.apply });
      console.log(formatVerifyReport(r));
      if (!r.ok) process.exit(1);
      break;
    }
    case "commit": {
      const msg = flags.m;
      if (!msg) {
        console.error('Uso: pime-git commit -m "mensaje" [ruta]');
        process.exit(1);
      }
      const repo = resolveRepoArg(
        positional[1] && !String(positional[1]).startsWith("-") ? positional[1] : undefined
      );
      const commitArgs = ["commit", "-m", msg];
      if (flags.amend) commitArgs.push("--amend");
      if (flags.a || flags.all) commitArgs.push("-a");
      funnelGit(config, repo, commitArgs, funnelOpts(flags));
      break;
    }
    case "pull":
      funnelGit(config, positional[1] ?? process.cwd(), ["pull", "--ff-only"], {
        verify: false,
        apply: true,
      });
      break;
    case "push": {
      let repo = process.cwd();
      let args = ["push"];
      if (positional[1]) {
        if (isRepoPath(positional[1])) {
          repo = path.resolve(expandHome(positional[1]));
          if (positional[2]) args = ["push", ...positional.slice(2)];
        } else {
          args = ["push", ...positional.slice(1)];
        }
      }
      if (gitArgs?.length) args = ["push", ...gitArgs];
      funnelGit(config, repo, args, funnelOpts(flags));
      break;
    }
    case "bulk":
      cmdBulk(config, positional[1], flags);
      break;
    case "web":
      await import("./server.mjs");
      break;
    case "git": {
      const repo = resolveRepoArg(positional[1]);
      const args = gitArgs ?? positional.slice(isRepoPath(positional[1]) ? 2 : 1);
      if (args.length === 0) {
        console.error("Uso: git [ruta] -- <comando git>");
        process.exit(1);
      }
      if (args[0] === "commit" || args[0] === "push") {
        funnelGit(config, repo, args, funnelOpts(flags));
      } else {
        runGit(config, repo, args);
      }
      break;
    }
    case "hook-run":
      runHook(positional[1]);
      break;
    case "hooks":
      if (positional[1] === "install") {
        const target = installRepoHooks(positional[2] ?? process.cwd());
        console.log(`Hooks instalados en ${target}`);
      } else {
        console.error("Uso: hooks install [ruta]");
        process.exit(1);
      }
      break;
    case "cursor-rule": {
      const dest = installCursorRule();
      console.log(`Regla Cursor instalada: ${dest}`);
      break;
    }
    case "doctor":
      cmdDoctor(config);
      break;
    case "sync":
    case "install":
      syncAll(config);
      try {
        const dest = installCursorRule();
        console.log(`Regla Cursor: ${dest}`);
      } catch {
        /* plantilla opcional */
      }
      console.log("Config sincronizada (~/.gitconfig + ~/.ssh/config)");
      break;
    case "key":
      cmdKey(config, positional[1], positional[2]);
      break;
    case "init":
      saveConfig(defaultConfig());
      syncAll(loadConfig());
      console.log(`Config reiniciada: ${CONFIG_PATH}`);
      break;
    default:
      console.error(`Comando desconocido: ${cmd}`);
      help();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
