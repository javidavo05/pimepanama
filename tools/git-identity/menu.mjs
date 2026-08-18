import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import path from "node:path";
import {
  addProfile,
  basenameDisplay,
  copyToClipboardMac,
  ensureAndApply,
  findLocalMatchesForRepo,
  bulkPullRepos,
  filterRepos,
  getProfile,
  isGitRepo,
  listGithubRepos,
  loadConfig,
  mapProject,
  openMac,
  parseGithubUserFromSsh,
  parseRepoSelection,
  pickFromList,
  promptLine,
  promptYesNo,
  pullRepoAt,
  readPublicKey,
  repoStatus,
  resolveGithubUser,
  runGit,
  saveConfig,
  slugifyId,
  syncAll,
  testSsh,
  unmapProject,
  WEBSITES_ROOT,
  localFolderNameForRepo,
} from "./lib.mjs";

function clear() {
  console.log("\x1Bc");
}

function header() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Pime Git — Cuentas GitHub por proyecto (Mac)   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
}

function printStatus(cwd) {
  const config = loadConfig();
  const st = repoStatus(config, cwd);
  console.log(`📁 Carpeta: ${st.path}`);
  if (st.git) {
    console.log(`🌿 Rama: ${st.branch || "(sin rama)"}`);
    console.log(`🔗 origin: ${st.origin || "(sin remote)"}`);
    console.log(`👤 git: ${st.user.name} <${st.user.email}>`);
  } else {
    console.log("⚠️  No es un repositorio git");
  }
  if (st.profile) {
    console.log(`✅ Cuenta asignada: ${st.profile.label} (${st.profile.id})`);
  } else {
    console.log("❌ Sin cuenta asignada a este proyecto");
  }
  console.log();
}

function printAccounts(config) {
  console.log("── Cuentas GitHub ──\n");
  for (const p of config.profiles) {
    const pub = readPublicKey(p);
    const ssh = testSsh(p);
    console.log(`  [${p.id}] ${p.label}`);
    console.log(`      ${p.name} <${p.email}>`);
    console.log(`      SSH: git@${p.sshHost}`);
    console.log(`      Estado: ${ssh.ok ? "✓ conectado" : "✗ sin llave en GitHub"}`);
    if (pub) console.log(`      PubKey: ${pub.slice(0, 40)}…`);
    console.log();
  }

  console.log("── Proyectos mapeados ──\n");
  if (config.mappings.length === 0) {
    console.log("  (ninguno)\n");
    return;
  }
  for (const m of config.mappings) {
    const p = getProfile(config, m.profileId);
    console.log(`  ${basenameDisplay(m.path)}`);
    console.log(`      ${m.path}`);
    console.log(`      → ${p?.label ?? m.profileId}\n`);
  }
}

async function wizardAddAccount(rl) {
  const config = loadConfig();
  console.log("\n── Nueva cuenta GitHub ──\n");

  const label = await promptLine(rl, "Nombre corto (ej. Cliente X)");
  let id = slugifyId(await promptLine(rl, "ID interno", slugifyId(label)));
  if (!id) id = slugifyId(`cuenta-${Date.now()}`);
  if (getProfile(config, id)) {
    console.log(`\n❌ Ya existe la cuenta "${id}"`);
    return;
  }

  const name = await promptLine(rl, "Nombre para commits (git user.name)");
  const email = await promptLine(rl, "Email para commits (git user.email)");
  const sign = await promptYesNo(rl, "¿Firmar commits con SSH?", true);

  const profile = {
    id,
    label: label || id,
    name,
    email,
    sshHost: `github.com-${id}`,
    sshKey: `~/.ssh/id_ed25519_${id}`,
    signingKey: `~/.ssh/id_ed25519_${id}.pub`,
    gpgSign: sign,
  };

  addProfile(config, profile);
  const pub = readPublicKey(profile);

  console.log(`\n✅ Cuenta "${id}" creada.`);
  if (pub) {
    console.log("\nLlave pública (añádela en GitHub → Settings → SSH keys):\n");
    console.log(pub);
    if (copyToClipboardMac(pub)) console.log("\n📋 Copiada al portapapeles.");
    if (await promptYesNo(rl, "¿Abrir GitHub para pegar la llave?", true)) {
      openMac("https://github.com/settings/ssh/new");
    }
  }
  console.log("\nSiguiente paso: asigna esta cuenta a un proyecto (opción 3).");
}

async function wizardMapProject(rl, cwd) {
  const config = loadConfig();
  if (config.profiles.length === 0) {
    console.log("\nPrimero añade una cuenta (opción 2).");
    return;
  }

  const defaultPath = cwd;
  const repoPath = await promptLine(rl, "Ruta del proyecto", defaultPath);
  const labels = config.profiles.map((p) => `${p.id} — ${p.label} <${p.email}>`);
  const idx = await pickFromList(rl, "Cuenta para este proyecto:", labels);
  if (idx == null) return;

  const profile = config.profiles[idx];
  mapProject(config, repoPath, profile.id);

  if (path.resolve(repoPath) === path.resolve(cwd)) {
    try {
      ensureAndApply(config, cwd);
      console.log(`\n✅ Aplicado en el repo actual con cuenta "${profile.id}".`);
    } catch (e) {
      console.log(`\n✅ Mapeo guardado. ${e.message}`);
    }
  } else {
    console.log(`\n✅ Mapeo guardado: ${repoPath} → ${profile.id}`);
  }
}

async function wizardUnmap(rl, cwd) {
  const config = loadConfig();
  const repoPath = await promptLine(rl, "Ruta del proyecto", cwd);
  try {
    unmapProject(config, repoPath);
    console.log(`\n✅ Mapeo eliminado para ${repoPath}`);
  } catch (e) {
    console.log(`\n❌ ${e.message}`);
  }
}

async function wizardCopyKey(rl) {
  const config = loadConfig();
  const labels = config.profiles.map((p) => `${p.id} — ${p.email}`);
  const idx = await pickFromList(rl, "Cuenta:", labels);
  if (idx == null) return;
  const pub = readPublicKey(config.profiles[idx]);
  if (!pub) {
    console.log("\n❌ No hay llave pública generada.");
    return;
  }
  console.log(`\n${pub}`);
  if (copyToClipboardMac(pub)) console.log("\n📋 Copiada al portapapeles.");
}

/** @returns {string | undefined} nueva carpeta de trabajo si cambió */
async function wizardGitPull(rl, config, cwd) {
  console.log("\n── Git pull: cuenta → repo → carpeta ──\n");

  const accountLabels = config.profiles.map((p) => {
    const ssh = testSsh(p);
    const gh = p.githubUser || (ssh.ok ? parseGithubUserFromSsh(ssh.message) : "?");
    return `${p.id} — ${p.label} (@${gh}) ${ssh.ok ? "✓ SSH" : "✗ SSH"}`;
  });

  const pidx = await pickFromList(rl, "1) Cuenta GitHub:", accountLabels);
  if (pidx == null) return;

  const profile = config.profiles[pidx];
  const ssh = testSsh(profile);
  if (!ssh.ok) {
    console.log(`\n❌ SSH no conectado para "${profile.id}".`);
    console.log(`   pime-git key copy ${profile.id}  → pegar en GitHub`);
    return;
  }

  const githubUser = resolveGithubUser(config, profile);
  if (!githubUser) {
    const manual = await promptLine(rl, "Usuario GitHub (@owner)", "");
    if (!manual) return;
    profile.githubUser = manual.replace(/^@/, "");
    saveConfig(config);
  }

  const user = profile.githubUser;
  console.log(`\nExplorando repos de @${user}…`);

  let repos;
  try {
    repos = listGithubRepos(profile);
  } catch (e) {
    console.log(`\n❌ ${e.message}`);
    return;
  }

  console.log(`\n${repos.length} repos disponibles (catálogo + GitHub).`);
  const filterQuery = await promptLine(
    rl,
    "Filtrar (nombre u org, vacío = todos)",
    ""
  );
  repos = filterRepos(repos, filterQuery);

  if (repos.length === 0) {
    console.log("\nNingún repo coincide con el filtro.");
    return;
  }

  if (repos.length > 15) {
    console.log(`Mostrando ${repos.length} resultados. Usa filtro para acotar (ej. sembradores, apex).`);
  }

  const pageSize = 20;
  let page = 0;
  let selected = null;

  while (!selected) {
    const start = page * pageSize;
    const slice = repos.slice(start, start + pageSize);
    const repoLabels = slice.map((r) => {
      const lock = r.isPrivate ? "🔒" : "○";
      return `${lock} ${r.fullName}`;
    });
    const hasMore = start + pageSize < repos.length;
    const hasPrev = page > 0;
    if (hasMore) repoLabels.push("→ Ver más repos…");
    if (hasPrev) repoLabels.push("← Página anterior");

    const title = `2) Repos de @${user} (${start + 1}-${start + slice.length} de ${repos.length})`;
    const ridx = await pickFromList(rl, title, repoLabels);
    if (ridx == null) return;

    let nav = slice.length;
    if (hasMore && ridx === nav++) {
      page++;
      continue;
    }
    if (hasPrev && ridx === nav++) {
      page--;
      continue;
    }
    selected = slice[ridx];
  }

  console.log(`\nRepo: ${selected.fullName}`);
  console.log(`URL:  ${selected.url}`);
  console.log(`SSH:  ${selected.sshUrl}`);

  const matches = findLocalMatchesForRepo(config, selected.fullName);
  const destLabels = matches.map(
    (m) => `📂 ${basenameDisplay(m.path)} — ${m.path} [${m.source}]`
  );
  destLabels.push(`➕ Clonar en ${WEBSITES_ROOT}/`);
  destLabels.push("📁 Escribir otra ruta");

  const didx = await pickFromList(rl, "3) ¿Dónde hacer pull?", destLabels);
  if (didx == null) return;

  try {
    if (didx < matches.length) {
      const target = matches[didx].path;
      console.log(`\nPull en ${target}…`);
      pullRepoAt(config, profile, target, selected.sshUrl);
      console.log(`\n✅ Listo: ${target}`);
      return target;
    }

    if (destLabels[didx].startsWith("➕")) {
      const defaultDest = path.join(WEBSITES_ROOT, selected.name);
      const target = path.resolve(await promptLine(rl, "Ruta destino", defaultDest));
      console.log(`\n${fs.existsSync(target) ? "Pull" : "Clonar"} en ${target}…`);
      pullRepoAt(config, profile, target, selected.sshUrl);
      console.log(`\n✅ Listo: ${target}`);
      return target;
    }

    const target = path.resolve(await promptLine(rl, "Ruta del proyecto", cwd));
    console.log(`\n${fs.existsSync(target) ? "Pull" : "Clonar"} en ${target}…`);
    pullRepoAt(config, profile, target, selected.sshUrl);
    console.log(`\n✅ Listo: ${target}`);
    return target;
  } catch (e) {
    console.log(`\n❌ ${e.message}`);
    if (/Permission denied \(publickey\)/i.test(String(e.message))) {
      console.log(`\nAñade la llave en GitHub: pime-git key copy ${profile.id}`);
    }
  }
}

async function pickAccountProfile(rl, config) {
  const accountLabels = config.profiles.map((p) => {
    const ssh = testSsh(p);
    const gh = p.githubUser || (ssh.ok ? parseGithubUserFromSsh(ssh.message) : "?");
    return `${p.id} — ${p.label} (@${gh}) ${ssh.ok ? "✓ SSH" : "✗ SSH"}`;
  });

  const pidx = await pickFromList(rl, "Cuenta GitHub:", accountLabels);
  if (pidx == null) return null;

  const profile = config.profiles[pidx];
  const ssh = testSsh(profile);
  if (!ssh.ok) {
    console.log(`\n❌ SSH no conectado para "${profile.id}".`);
    console.log(`   pime-git key copy ${profile.id}`);
    return null;
  }

  const githubUser = resolveGithubUser(config, profile);
  if (!githubUser) {
    const manual = await promptLine(rl, "Usuario GitHub (@owner)", "");
    if (!manual) return null;
    profile.githubUser = manual.replace(/^@/, "");
    saveConfig(config);
  }

  return profile;
}

async function loadFilteredRepos(rl, profile) {
  const user = profile.githubUser;
  console.log(`\nCargando repos de @${user}…`);

  let repos;
  try {
    repos = listGithubRepos(profile);
  } catch (e) {
    console.log(`\n❌ ${e.message}`);
    return null;
  }

  console.log(`${repos.length} repos en catálogo.`);
  const filterQuery = await promptLine(rl, "Filtrar (vacío = todos)", "");
  repos = filterRepos(repos, filterQuery);

  if (repos.length === 0) {
    console.log("\nNingún repo coincide con el filtro.");
    return null;
  }

  return repos;
}

function printNumberedRepos(repos, max = 60) {
  const show = repos.slice(0, max);
  for (let i = 0; i < show.length; i++) {
    console.log(`  ${String(i + 1).padStart(3)}) ${show[i].fullName}`);
  }
  if (repos.length > max) {
    console.log(`  … y ${repos.length - max} más (usa filtro o pega owner/repo)`);
  }
}

/** @returns {string | undefined} */
async function wizardBulkImport(rl, config) {
  console.log("\n── Importar múltiples repos ──\n");
  console.log("Clona o hace pull de varios repos en una carpeta base.\n");

  const profile = await pickAccountProfile(rl, config);
  if (!profile) return;

  const repos = await loadFilteredRepos(rl, profile);
  if (!repos) return;

  console.log(`\n${repos.length} repos listos.`);
  printNumberedRepos(repos);

  console.log(
    "\nSelección: números (1,3,5-8), all, o pegar owner/repo (uno por línea)."
  );
  const selection = await promptLine(rl, "Repos a importar", "");
  const picked = parseRepoSelection(selection, repos);

  if (picked.length === 0) {
    console.log("\n❌ Ningún repo seleccionado.");
    return;
  }

  const baseDir = path.resolve(
    await promptLine(rl, "Carpeta base destino", WEBSITES_ROOT)
  );

  const used = new Set();
  const plan = picked.map((repo) => ({
    repo,
    dest: path.join(baseDir, localFolderNameForRepo(repo, used)),
  }));

  console.log(`\n── Plan (${plan.length} repos) ──\n`);
  for (const p of plan) {
    const exists = fs.existsSync(p.dest);
    const tag = exists && isGitRepo(p.dest) ? "pull" : exists ? "⚠ existe" : "clone";
    console.log(`  ${p.repo.fullName}`);
    console.log(`    → ${p.dest}  [${tag}]`);
  }

  if (!(await promptYesNo(rl, `¿Importar ${plan.length} repos en ${baseDir}?`, true))) {
    console.log("\nCancelado.");
    return;
  }

  console.log("\nImportando…\n");
  const results = bulkPullRepos(config, profile, picked, baseDir);

  console.log(`\n── Resultado ──`);
  console.log(`  ✓ ${results.ok.length} correctos`);
  if (results.fail.length > 0) {
    console.log(`  ✗ ${results.fail.length} fallidos:`);
    for (const f of results.fail) {
      console.log(`    ${f.repo.fullName}: ${f.error}`);
    }
  }

  if (results.ok.length > 0) {
    console.log("\nImportados:");
    for (const o of results.ok) console.log(`  ${o.dest}`);
    return baseDir;
  }
}

export async function runMenu(startDir = process.cwd()) {
  const rl = readline.createInterface({ input, output });
  let cwd = startDir;

  try {
    while (true) {
      clear();
      header();
      printStatus(cwd);

      console.log("1) Ver cuentas y proyectos");
      console.log("2) Añadir cuenta GitHub nueva");
      console.log("3) Asignar cuenta → proyecto");
      console.log("4) Quitar asignación de proyecto");
      console.log("5) Aplicar cuenta al repo actual");
      console.log("6) Git pull (cuenta → repo → carpeta)");
      console.log("7) Git push");
      console.log("8) Probar conexión SSH (todas las cuentas)");
      console.log("9) Sincronizar config Mac (~/.gitconfig + ~/.ssh/config)");
      console.log("10) Copiar llave pública al portapapeles");
      console.log("11) Cambiar carpeta de trabajo");
      console.log("12) Importar múltiples repos (carpeta base)");
      console.log("0) Salir\n");

      const choice = (await rl.question("Opción: ")).trim();
      const config = loadConfig();

      switch (choice) {
        case "1":
          clear();
          header();
          printAccounts(config);
          await rl.question("\nEnter para continuar…");
          break;
        case "2":
          await wizardAddAccount(rl);
          await rl.question("\nEnter para continuar…");
          break;
        case "3":
          await wizardMapProject(rl, cwd);
          await rl.question("\nEnter para continuar…");
          break;
        case "4":
          await wizardUnmap(rl, cwd);
          await rl.question("\nEnter para continuar…");
          break;
        case "5":
          try {
            const r = ensureAndApply(config, cwd);
            console.log(`\n✅ ${r.profile.label} <${r.profile.email}>`);
            if (r.originBefore && r.originAfter && r.originBefore !== r.originAfter) {
              console.log(`origin: ${r.originBefore} → ${r.originAfter}`);
            }
          } catch (e) {
            console.log(`\n❌ ${e.message}`);
          }
          await rl.question("\nEnter para continuar…");
          break;
        case "6": {
          const newCwd = await wizardGitPull(rl, config, cwd);
          if (newCwd) cwd = newCwd;
          await rl.question("\nEnter para continuar…");
          break;
        }
        case "7":
          try {
            runGit(config, cwd, ["push"]);
          } catch (e) {
            const msg = String(e.message || e);
            console.log(`\n❌ ${msg}`);
            if (/Permission denied \(publickey\)/i.test(msg) || /publickey/i.test(msg)) {
              const st = repoStatus(config, cwd);
              if (st.profile) {
                console.log(
                  `\nLa llave de "${st.profile.id}" no está en GitHub (${st.profile.email}).`
                );
                console.log(`  pime-git key copy ${st.profile.id}`);
              }
            }
            await rl.question("\nEnter para continuar…");
          }
          break;
        case "8":
          clear();
          header();
          console.log("── Test SSH ──\n");
          for (const p of config.profiles) {
            const res = testSsh(p);
            console.log(`  ${p.id.padEnd(14)} ${res.ok ? "✓" : "✗"}  ${res.message}`);
          }
          await rl.question("\nEnter para continuar…");
          break;
        case "9":
          syncAll(config);
          console.log("\n✅ ~/.gitconfig y ~/.ssh/config actualizados.");
          await rl.question("\nEnter para continuar…");
          break;
        case "10":
          await wizardCopyKey(rl);
          await rl.question("\nEnter para continuar…");
          break;
        case "11":
          cwd = path.resolve(await promptLine(rl, "Nueva carpeta", cwd));
          break;
        case "12": {
          const bulkDir = await wizardBulkImport(rl, config);
          if (bulkDir) cwd = bulkDir;
          await rl.question("\nEnter para continuar…");
          break;
        }
        case "0":
        case "q":
          return;
        default:
          console.log("\nOpción inválida.");
          await rl.question("\nEnter para continuar…");
      }
    }
  } finally {
    rl.close();
  }
}
