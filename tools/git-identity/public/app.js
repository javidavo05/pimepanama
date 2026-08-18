/** @typedef {{ id: string; label: string; email: string; githubUser: string | null; sshOk: boolean; sshMessage: string }} Profile */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const REFRESH_MS = 20000;

/** @type {Profile[]} */
let profiles = [];
let selectedProfileId = null;
/** @type {{ fullName: string; name: string; isPrivate: boolean; localPath: string | null; cloned: boolean }[]} */
let allRepos = [];
/** @type {Set<string>} */
const selected = new Set();
let websitesRoot = "";
let filterTimer = null;
let activeProjectPath = localStorage.getItem("pime-git-project") || "";
/** @type {unknown[]} */
let projectList = [];
let refreshTimer = null;
let dashboardLoading = false;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** @param {string} path @param {Record<string, unknown>} body @param {(evt: Record<string, unknown>) => void} onEvent */
async function apiStream(path, body, onEvent) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  if (!res.body) throw new Error("Sin respuesta del servidor");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line));
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer));
}

/**
 * @param {{
 *   panel: HTMLElement;
 *   titleEl: HTMLElement;
 *   pctEl: HTMLElement;
 *   barEl: HTMLElement;
 *   fillEl: HTMLElement;
 *   stepsEl: HTMLElement;
 * }} els
 */
function createProgressController(els) {
  /** @type {Map<string, HTMLLIElement>} */
  const stepEls = new Map();

  const setPct = (pct) => {
    const n = Math.max(0, Math.min(100, Math.round(pct)));
    els.fillEl.style.width = `${n}%`;
    els.pctEl.textContent = `${n}%`;
    els.barEl.setAttribute("aria-valuenow", String(n));
  };

  return {
    start(title, total = 0) {
      els.panel.hidden = false;
      els.panel.classList.remove("is-success", "is-error");
      els.titleEl.textContent = title;
      els.stepsEl.innerHTML = "";
      stepEls.clear();
      setPct(0);
      if (total > 0) els.pctEl.textContent = `0 / ${total}`;
    },
    setTitle(title) {
      els.titleEl.textContent = title;
    },
    setPct,
    upsertStep(key, label, status, detail) {
      let li = stepEls.get(key);
      if (!li) {
        li = document.createElement("li");
        li.innerHTML = `<span class="step-icon">…</span><span class="step-text"></span>`;
        els.stepsEl.appendChild(li);
        stepEls.set(key, li);
      }
      li.className = status === "running" ? "is-running" : status === "ok" ? "is-ok" : status === "fail" ? "is-fail" : "";
      const icon = status === "running" ? "…" : status === "ok" ? "✓" : status === "fail" ? "✗" : "·";
      const text = li.querySelector(".step-text");
      if (text) {
        text.textContent = label;
        const oldDetail = li.querySelector(".step-detail");
        if (oldDetail) oldDetail.remove();
        if (detail && status === "fail") {
          const d = document.createElement("span");
          d.className = "step-detail";
          d.textContent = detail;
          text.appendChild(d);
        }
      }
      li.querySelector(".step-icon").textContent = icon;
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    finish(ok, title) {
      els.panel.classList.toggle("is-success", ok);
      els.panel.classList.toggle("is-error", !ok);
      els.titleEl.textContent = title;
      setPct(100);
    },
    hide() {
      els.panel.hidden = true;
    },
  };
}

const importProgress = createProgressController({
  panel: $("#import-progress"),
  titleEl: $("#import-progress-title"),
  pctEl: $("#import-progress-pct"),
  barEl: $("#import-progress-bar"),
  fillEl: $("#import-progress-fill"),
  stepsEl: $("#import-progress-steps"),
});

function toast(msg, ms = 3500) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, ms);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sigClass(sig) {
  if (sig === "G" || sig === "U") return "sig-ok";
  if (sig === "N" || sig === "E") return "sig-miss";
  return "sig-bad";
}

function renderUrls(state) {
  const lines = [`http://localhost:${state.port}`];
  for (const ip of state.lan) lines.push(`http://${ip}:${state.port}`);
  $("#urls").innerHTML = lines.map((u) => `<div>${u}</div>`).join("");
  $("#base-dir").value = state.websitesRoot;
  $("#local-root").value = state.websitesRoot;
}

function renderProfiles() {
  const el = $("#profiles");
  if (!profiles.length) {
    el.innerHTML = '<p class="empty">Sin cuentas configuradas</p>';
    return;
  }
  el.innerHTML = profiles
    .map(
      (p) => `
    <div class="profile-card ${p.id === selectedProfileId ? "selected" : ""}" data-id="${p.id}">
      <h3>${esc(p.label)}</h3>
      <p>${esc(p.email)}</p>
      <p>@${esc(p.githubUser || "?")}</p>
      <span class="badge ${p.sshOk ? "ok" : "bad"}">${p.sshOk ? "SSH OK" : "SSH ✗"}</span>
    </div>`
    )
    .join("");

  $$(".profile-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedProfileId = card.dataset.id;
      renderProfiles();
      loadRepos();
    });
  });
}

function renderProjectsSidebar(projects, activePath) {
  $("#projects-count").textContent = String(projects.length);
  const list = $("#projects-sidebar-list");
  if (!projects.length) {
    list.innerHTML = '<p class="empty" style="padding:0.5rem;font-size:0.8rem;color:var(--muted)">Importa un repo o mapea una carpeta.</p>';
    return;
  }
  list.innerHTML = projects
    .map((p) => {
      const s = p.summary;
      const branch = s?.branch || "—";
      const changes = s?.clean ? "limpio" : `${s?.changedCount ?? "?"} cambios`;
      const verifyCls = s?.verifyOk ? "ok" : "bad";
      const sync = s?.sync;
      const syncCls = sync?.kind === "ok" ? "ok" : sync?.kind === "bad" ? "bad" : "warn";
      const syncLabel = sync?.label || (s?.ahead || s?.behind
        ? `${s.ahead ? `↑${s.ahead}` : ""}${s.behind ? ` ↓${s.behind}` : ""}`.trim()
        : "sync?");
      const cursorCls = s?.hasCursorRule ? "ok" : "warn";
      return `<button type="button" class="project-pick ${p.path === activePath ? "active" : ""}" data-path="${esc(p.path)}">
        <span class="name">${esc(p.name)}</span>
        <span class="meta">${esc(branch)} · ${esc(changes)}</span>
        <span class="tags">
          <span class="mini-tag">${esc(p.profileId || "sin cuenta")}</span>
          <span class="mini-tag ${verifyCls}">${s?.verifyOk ? "✓ verify" : "✗ verify"}</span>
          <span class="mini-tag ${syncCls}">${esc(syncLabel)}</span>
          <span class="mini-tag ${cursorCls}">${s?.hasCursorRule ? "cursor" : "sin regla"}</span>
        </span>
      </button>`;
    })
    .join("");

  $$(".project-pick").forEach((btn) => {
    btn.addEventListener("click", () => selectProject(btn.dataset.path, false));
  });
}

function selectProject(path, switchTab = false) {
  activeProjectPath = path;
  localStorage.setItem("pime-git-project", path);
  if (switchTab) {
    $$(".tab").forEach((t) => t.classList.remove("active"));
    $$(".panel").forEach((p) => p.classList.remove("active"));
    $('.tab[data-tab="project"]').classList.add("active");
    $("#panel-project").classList.add("active");
  }
  refreshDashboard({ silent: true });
}

function showPushStatus(ps, { title } = {}) {
  const box = $("#push-status-box");
  if (!box || !ps) return;
  const kind = ps.pushOk ? "ok" : ps.sync?.kind || "warn";
  const lines = [
    title || "Estado vs remoto",
    `Rama: ${ps.branch || "—"} ${ps.upstream ? `→ ${ps.upstream}` : "(sin upstream)"}`,
    `HEAD: ${ps.head || "—"}`,
    `Sync: ${ps.sync?.label || "—"}`,
    ps.fetched ? "Remoto actualizado (fetch OK)" : ps.fetchError ? `Fetch: ${ps.fetchError}` : "Sin fetch",
    ps.verifyOk ? "Identidad: OK" : "Identidad: falló verify",
  ];
  if (ps.issues?.length) {
    for (const i of ps.issues) lines.push(`✗ ${i}`);
  }
  box.hidden = false;
  box.className = `push-status-box ${kind}`;
  box.textContent = lines.join("\n");

  const pill = $("#sync-status-pill");
  if (pill && ps.sync) {
    pill.textContent = ps.sync.label;
    pill.className = `stat-pill ${ps.sync.kind === "ok" ? "ok" : ps.sync.kind === "bad" ? "bad" : "warn"}`;
  }
}

function renderProjectDetail(d) {
  const el = $("#project-detail");
  if (!d || !d.ok) {
    el.className = "project-detail empty-state";
    el.textContent = d?.error || "Sin proyecto seleccionado.";
    return;
  }

  const syncLabel = d.sync?.label
    || (d.ahead || d.behind
      ? `${d.ahead ? `↑${d.ahead}` : ""}${d.behind ? ` ↓${d.behind}` : ""}`.trim()
      : "al día");
  const syncCls = d.sync?.kind === "ok" ? "ok" : d.sync?.kind === "bad" ? "bad" : d.sync ? "warn" : "";

  el.className = "project-detail";
  el.innerHTML = `
    <div class="project-header">
      <div>
        <h2>${esc(d.name)}</h2>
        <div class="project-meta">${esc(d.path)}</div>
      </div>
      <div class="project-actions">
        <button type="button" class="btn ghost" id="btn-proj-apply">Aplicar</button>
        <button type="button" class="btn ghost" id="btn-proj-verify-push">Verificar estado</button>
        <button type="button" class="btn ghost" id="btn-proj-pull">Pull</button>
        <button type="button" class="btn gold" id="btn-proj-push">Push</button>
      </div>
    </div>
    <div class="stat-row">
      <span class="stat-pill ${d.verify.ok ? "ok" : "bad"}">${d.verify.ok ? "✓ Verificado" : "✗ Verificación"}</span>
      <span class="stat-pill">${esc(d.profileLabel || d.profileId || "sin cuenta")}</span>
      <span class="stat-pill">${esc(d.branch || "—")} ${d.upstream ? `→ ${esc(d.upstream)}` : ""}</span>
      <span class="stat-pill ${d.clean ? "ok" : "warn"}">${d.clean ? "limpio" : `${d.changedFiles} cambios`}</span>
      <span class="stat-pill ${syncCls}" id="sync-status-pill">${esc(syncLabel)}</span>
      <span class="stat-pill ${d.hasCursorRule ? "ok" : "warn"}">${d.hasCursorRule ? "regla Cursor" : "sin regla"}</span>
    </div>
    <div class="push-status-box" id="push-status-box" hidden></div>
    <div class="progress-panel" id="push-progress" hidden>
      <div class="progress-head">
        <span class="progress-title" id="push-progress-title">Push…</span>
        <span class="progress-pct" id="push-progress-pct">0%</span>
      </div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="push-progress-bar">
        <div class="progress-fill" id="push-progress-fill"></div>
      </div>
      <ul class="progress-steps" id="push-progress-steps"></ul>
    </div>
    ${!d.verify.ok ? `<div class="log">${d.verify.issues.map((i) => `✗ ${esc(i)}`).join("\n")}</div>` : ""}
    ${d.changedList?.length ? `<div class="changed-list">${d.changedList.map((c) => `${esc(c.index)} ${esc(c.file)}`).join("<br/>")}</div>` : ""}
    ${
      !d.clean
        ? `<div class="commit-bar">
        <label>Mensaje del commit
          <input type="text" id="commit-message" placeholder="Describe los cambios…" />
        </label>
        <button type="button" class="btn gold" id="btn-proj-commit">Commit</button>
      </div>
      <div class="progress-panel" id="commit-progress" hidden>
        <div class="progress-head">
          <span class="progress-title" id="commit-progress-title">Commit…</span>
          <span class="progress-pct" id="commit-progress-pct">0%</span>
        </div>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="commit-progress-bar">
          <div class="progress-fill" id="commit-progress-fill"></div>
        </div>
        <ul class="progress-steps" id="commit-progress-steps"></ul>
      </div>`
        : ""
    }
    <div class="commits-wrap">
      <h3>Commits recientes (${d.commits.length})</h3>
      <div class="table-wrap" style="max-height:320px">
        <table class="commits-table">
          <thead><tr><th>Hash</th><th>Mensaje</th><th>Autor</th><th>Firma</th><th>Fecha</th></tr></thead>
          <tbody>
            ${
              d.commits.length
                ? d.commits.map((c) => `<tr>
                <td class="hash">${esc(c.short)}</td>
                <td>${esc(c.subject)}</td>
                <td>${esc(c.author)}</td>
                <td class="${sigClass(c.signature)}">${esc(c.signatureLabel)}</td>
                <td>${fmtDate(c.date)}</td>
              </tr>`).join("")
                : '<tr><td colspan="5" class="empty">Sin commits</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>`;

  $("#btn-proj-apply").addEventListener("click", async () => {
    try {
      await api("/api/project/apply", { method: "POST", body: { path: d.path } });
      toast("Cuenta aplicada");
      refreshDashboard();
    } catch (e) { toast(e.message, 5000); }
  });
  $("#btn-proj-verify-push").addEventListener("click", async () => {
    const btn = $("#btn-proj-verify-push");
    btn.disabled = true;
    try {
      const data = await api("/api/project/push-status", {
        method: "POST",
        body: { path: d.path, fetch: true },
      });
      showPushStatus(data.pushStatus, { title: "Verificación de estado (fetch + sync)" });
      toast(data.pushStatus?.pushOk ? "Remoto al día" : data.pushStatus?.sync?.label || "Estado actualizado");
      await refreshDashboard({ silent: true });
      showPushStatus(data.pushStatus, { title: "Verificación de estado (fetch + sync)" });
    } catch (e) {
      toast(e.message, 5000);
    } finally {
      btn.disabled = false;
    }
  });
  $("#btn-proj-pull").addEventListener("click", async () => {
    try {
      await api("/api/project/pull", { method: "POST", body: { path: d.path } });
      toast("Pull OK");
      refreshDashboard();
    } catch (e) { toast(e.message, 5000); }
  });

  const pushProgress = createProgressController({
    panel: $("#push-progress"),
    titleEl: $("#push-progress-title"),
    pctEl: $("#push-progress-pct"),
    barEl: $("#push-progress-bar"),
    fillEl: $("#push-progress-fill"),
    stepsEl: $("#push-progress-steps"),
  });

  $("#btn-proj-push").addEventListener("click", async () => {
    const btn = $("#btn-proj-push");
    btn.disabled = true;
    pushProgress.start("Preparando push…", 4);

    /** @type {Record<string, unknown> | null} */
    let result = null;

    try {
      await apiStream("/api/project/push", { path: d.path }, (evt) => {
        if (evt.type === "start") {
          pushProgress.start("Push al remoto…", Number(evt.total) || 4);
        }
        if (evt.type === "progress") {
          const step = Number(evt.step) || 0;
          const total = Number(evt.total) || 4;
          const pct = total ? ((step - (evt.status === "running" ? 0.35 : 1)) / total) * 100 : 0;
          pushProgress.setPct(Math.max(5, pct));
          pushProgress.upsertStep(
            String(evt.id),
            String(evt.label),
            String(evt.status),
            evt.detail ? String(evt.detail) : undefined
          );
          if (evt.status === "running") {
            pushProgress.setTitle(`${evt.label}…`);
          }
        }
        if (evt.type === "complete") {
          result = evt;
        }
      });

      if (result?.ok) {
        pushProgress.finish(true, "✓ Push OK — estado verificado");
        toast(result.pushStatus?.sync?.label || "Push OK");
        await refreshDashboard({ silent: true });
        if (result.pushStatus) {
          showPushStatus(result.pushStatus, { title: "Estado tras push" });
        }
      } else {
        pushProgress.finish(false, "✗ Push falló");
        toast(String(result?.error || "Push falló"), 6000);
      }
    } catch (e) {
      pushProgress.finish(false, "✗ Push falló");
      toast(e.message, 6000);
    } finally {
      btn.disabled = false;
    }
  });

  const commitBtn = $("#btn-proj-commit");
  if (commitBtn) {
    const commitProgress = createProgressController({
      panel: $("#commit-progress"),
      titleEl: $("#commit-progress-title"),
      pctEl: $("#commit-progress-pct"),
      barEl: $("#commit-progress-bar"),
      fillEl: $("#commit-progress-fill"),
      stepsEl: $("#commit-progress-steps"),
    });
    const msgInput = $("#commit-message");

    commitBtn.addEventListener("click", async () => {
      const message = msgInput?.value.trim();
      if (!message) {
        toast("Escribe un mensaje de commit", 4000);
        msgInput?.focus();
        return;
      }

      commitBtn.disabled = true;
      commitProgress.start("Preparando commit…", 4);

      /** @type {Record<string, unknown> | null} */
      let result = null;

      try {
        await apiStream("/api/project/commit", { path: d.path, message }, (evt) => {
          if (evt.type === "start") {
            commitProgress.start("Creando commit…", Number(evt.total) || 4);
          }
          if (evt.type === "progress") {
            const step = Number(evt.step) || 0;
            const total = Number(evt.total) || 4;
            const pct = total ? ((step - (evt.status === "running" ? 0.35 : 1)) / total) * 100 : 0;
            commitProgress.setPct(Math.max(5, pct));
            commitProgress.upsertStep(
              String(evt.id),
              String(evt.label),
              String(evt.status),
              evt.detail ? String(evt.detail) : undefined
            );
            if (evt.status === "running") {
              commitProgress.setTitle(`${evt.label}…`);
            }
          }
          if (evt.type === "complete") {
            result = evt;
          }
        });

        if (result?.ok) {
          commitProgress.finish(true, "✓ Commit creado con éxito");
          toast("Commit OK");
          await refreshDashboard({ silent: true });
        } else {
          commitProgress.finish(false, "✗ Commit falló");
          toast(String(result?.error || "Commit falló"), 6000);
        }
      } catch (e) {
        commitProgress.finish(false, "✗ Commit falló");
        toast(e.message, 6000);
      } finally {
        commitBtn.disabled = false;
      }
    });
  }
}

/** Carga automática: proyectos + estado + commits (reemplaza pime-git project / projects). */
async function refreshDashboard({ silent = false } = {}) {
  if (dashboardLoading) return;
  dashboardLoading = true;
  const hint = $("#auto-refresh-hint");
  if (hint) hint.textContent = "…";

  try {
    const q = activeProjectPath ? `?project=${encodeURIComponent(activeProjectPath)}` : "";
    const data = await api(`/api/dashboard${q}`);

    websitesRoot = data.websitesRoot;
    profiles = data.profiles;
    projectList = data.projects;

    if (data.activePath) {
      activeProjectPath = data.activePath;
      localStorage.setItem("pime-git-project", activeProjectPath);
    }

    renderUrls(data);
    renderProfiles();
    renderProjectsSidebar(data.projects, data.activePath);
    renderProjectDetail(data.detail);
    renderMaps(data.mappings);

    if (!silent) toast("Proyectos actualizados");
  } catch (e) {
    if (!silent) toast(e.message, 5000);
  } finally {
    dashboardLoading = false;
    if (hint) hint.textContent = "auto";
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => refreshDashboard({ silent: true }), REFRESH_MS);
}

// ——— Import repos ———

function visibleRepos() {
  const q = $("#filter").value.trim().toLowerCase();
  if (!q) return allRepos;
  return allRepos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.fullName.split("/")[0].toLowerCase().includes(q)
  );
}

function updateSelectedCount() {
  const n = selected.size;
  $("#selected-count").textContent = `${n} seleccionado${n === 1 ? "" : "s"}`;
  const has = n > 0 && selectedProfileId;
  $("#btn-preview").disabled = !has;
  $("#btn-import").disabled = !has;
}

function renderRepoTable() {
  const repos = visibleRepos();
  const tbody = $("#repo-rows");
  if (!selectedProfileId) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">Elige una cuenta arriba</td></tr>';
    return;
  }
  if (!repos.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">Sin repos (prueba otro filtro)</td></tr>';
    return;
  }

  tbody.innerHTML = repos
    .map((r) => {
      const checked = selected.has(r.fullName) ? "checked" : "";
      const local = r.cloned ? `<span class="tag local">local</span>` : `<span class="tag miss">—</span>`;
      const priv = r.isPrivate ? '<span class="tag priv">priv</span>' : "";
      return `<tr data-name="${esc(r.fullName)}">
        <td><input type="checkbox" class="repo-check" data-name="${esc(r.fullName)}" ${checked} /></td>
        <td><span class="repo-name">${esc(r.fullName)}</span>${priv}</td>
        <td>${local}</td>
      </tr>`;
    })
    .join("");

  $$(".repo-check").forEach((cb) => {
    cb.addEventListener("change", () => {
      const name = cb.dataset.name;
      if (cb.checked) selected.add(name);
      else selected.delete(name);
      updateSelectedCount();
    });
  });
}

async function loadRepos() {
  if (!selectedProfileId) return;
  const q = $("#filter").value.trim();
  $("#repo-rows").innerHTML = '<tr><td colspan="3" class="empty">Cargando…</td></tr>';
  try {
    const data = await api(`/api/repos?profile=${encodeURIComponent(selectedProfileId)}&q=${encodeURIComponent(q)}`);
    allRepos = data.repos;
    renderRepoTable();
  } catch (e) {
    $("#repo-rows").innerHTML = `<tr><td colspan="3" class="empty">${esc(e.message)}</td></tr>`;
    allRepos = [];
  }
}

function selectVisible(all) {
  for (const r of visibleRepos()) {
    if (all) selected.add(r.fullName);
    else selected.delete(r.fullName);
  }
  renderRepoTable();
  updateSelectedCount();
}

async function runPreview() {
  const data = await api("/api/bulk/preview", {
    method: "POST",
    body: { profileId: selectedProfileId, fullNames: [...selected], baseDir: $("#base-dir").value },
  });
  $("#preview-body").innerHTML = data.plan
    .map((p) => `<div class="preview-line"><span class="act">[${p.action}]</span> ${esc(p.fullName)}<br/>→ ${esc(p.dest)}</div>`)
    .join("");
  $("#modal-preview").hidden = false;
}

async function runImport() {
  const log = $("#import-log");
  log.hidden = true;
  log.textContent = "";
  $("#btn-import").disabled = true;
  $("#btn-preview-run").disabled = true;
  $("#btn-preview").disabled = true;

  const total = selected.size;
  importProgress.start(`Importando ${total} repo${total === 1 ? "" : "s"}…`, total);

  /** @type {{ ok: { dest: string; repo: { fullName: string } }[]; fail: { repo: { fullName: string }; error: string }[] } | null} */
  let result = null;

  try {
    await apiStream(
      "/api/bulk/run",
      { profileId: selectedProfileId, fullNames: [...selected], baseDir: $("#base-dir").value },
      (evt) => {
        if (evt.type === "start") {
          importProgress.start(`Importando ${evt.total} repo${evt.total === 1 ? "" : "s"}…`, Number(evt.total));
        }
        if (evt.type === "progress") {
          const current = Number(evt.current) || 0;
          const t = Number(evt.total) || total;
          const pct = t ? ((current - (evt.phase === "start" ? 0.5 : 0)) / t) * 100 : 0;
          importProgress.setPct(Math.max(2, pct));
          importProgress.setTitle(
            evt.phase === "start"
              ? `[${current}/${t}] ${evt.repo}…`
              : `[${current}/${t}] ${evt.repo}`
          );

          const key = String(evt.repo);
          if (evt.phase === "start") {
            importProgress.upsertStep(key, `${evt.repo} → clonando/pull…`, "running");
          } else {
            importProgress.upsertStep(
              key,
              evt.ok ? `✓ ${evt.repo}` : `✗ ${evt.repo}`,
              evt.ok ? "ok" : "fail",
              evt.error ? String(evt.error) : undefined
            );
          }
        }
        if (evt.type === "complete") {
          result = evt;
        }
      }
    );

    const ok = result?.ok ?? [];
    const fail = result?.fail ?? [];
    const success = fail.length === 0;

    importProgress.finish(
      success,
      success
        ? `✓ ${ok.length} importado${ok.length === 1 ? "" : "s"} con éxito`
        : `✗ ${fail.length} fallido${fail.length === 1 ? "" : "s"}, ${ok.length} correcto${ok.length === 1 ? "" : "s"}`
    );

    let text = success ? `✓ ${ok.length} correctos\n` : `✗ ${fail.length} fallidos, ${ok.length} correctos\n`;
    for (const o of ok) text += `  ${o.dest}\n`;
    for (const f of fail) text += `  ${f.repo?.fullName}: ${f.error}\n`;
    log.textContent = text;
    log.hidden = false;

    toast(success ? `Listo: ${ok.length} importados` : `${fail.length} fallaron`, success ? 3500 : 6000);

    if (ok[0]?.dest) {
      activeProjectPath = ok[0].dest;
      selectProject(ok[0].dest, true);
    } else {
      await refreshDashboard({ silent: true });
    }
    await loadRepos();
  } catch (e) {
    importProgress.finish(false, "✗ Importación falló");
    log.hidden = false;
    log.textContent = `Error: ${e.message}`;
    toast(e.message, 5000);
  } finally {
    const has = selected.size > 0 && selectedProfileId;
    $("#btn-import").disabled = !has;
    $("#btn-preview").disabled = !has;
    $("#btn-preview-run").disabled = false;
    $("#modal-preview").hidden = true;
  }
}

async function scanLocal() {
  const data = await api(`/api/local?root=${encodeURIComponent($("#local-root").value)}`);
  const el = $("#local-cards");
  if (!data.repos.length) {
    el.innerHTML = '<p class="empty">No hay repos git en esta carpeta</p>';
    return;
  }
  el.innerHTML = data.repos.map((r) => `
    <div class="card">
      <div>
        <strong>${esc(r.name)}</strong>
        <div class="path">${esc(r.path)}</div>
      </div>
      <div class="actions">
        <button type="button" class="btn ghost btn-open-project" data-path="${esc(r.path)}">Gestionar</button>
        <button type="button" class="btn ghost btn-apply" data-path="${esc(r.path)}">Aplicar</button>
        <button type="button" class="btn ghost btn-pull" data-path="${esc(r.path)}">Pull</button>
      </div>
    </div>`).join("");

  $$(".btn-open-project").forEach((btn) => btn.addEventListener("click", () => selectProject(btn.dataset.path, true)));
  $$(".btn-apply").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api("/api/project/apply", { method: "POST", body: { path: btn.dataset.path } });
        toast("Aplicado");
        refreshDashboard({ silent: true });
      } catch (e) { toast(e.message, 5000); }
    });
  });
  $$(".btn-pull").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api("/api/project/pull", { method: "POST", body: { path: btn.dataset.path } });
        toast("Pull OK");
        refreshDashboard({ silent: true });
      } catch (e) { toast(e.message, 5000); }
    });
  });
}

function renderMaps(mappings) {
  const el = $("#map-cards");
  if (!mappings?.length) {
    el.innerHTML = '<p class="empty">Sin mapeos — se crean al importar desde el portal.</p>';
    return;
  }
  el.innerHTML = mappings.map((m) => `
    <div class="card">
      <div>
        <strong>${esc(m.name)}</strong> → <span style="color:var(--gold)">${esc(m.profileId)}</span>
        <div class="path">${esc(m.path)}</div>
      </div>
      <div class="actions">
        <button type="button" class="btn ghost btn-map-open" data-path="${esc(m.path)}">Gestionar</button>
        <button type="button" class="btn ghost btn-map-apply" data-path="${esc(m.path)}">Aplicar</button>
        <button type="button" class="btn ghost btn-map-pull" data-path="${esc(m.path)}">Pull</button>
      </div>
    </div>`).join("");

  $$(".btn-map-open").forEach((btn) => btn.addEventListener("click", () => selectProject(btn.dataset.path, true)));
  $$(".btn-map-apply").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api("/api/project/apply", { method: "POST", body: { path: btn.dataset.path } });
        toast("Aplicado");
        refreshDashboard({ silent: true });
      } catch (e) { toast(e.message, 5000); }
    });
  });
  $$(".btn-map-pull").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api("/api/project/pull", { method: "POST", body: { path: btn.dataset.path } });
        toast("Pull OK");
        refreshDashboard({ silent: true });
      } catch (e) { toast(e.message, 5000); }
    });
  });
}

// Tabs
$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("active"));
    $$(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $(`#panel-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "project") refreshDashboard({ silent: true });
    if (tab.dataset.tab === "local") scanLocal().catch(() => {});
  });
});

$("#btn-reload").addEventListener("click", loadRepos);
$("#filter").addEventListener("input", () => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    if (allRepos.length) renderRepoTable();
    else loadRepos();
  }, 280);
});
$("#btn-select-all").addEventListener("click", () => selectVisible(true));
$("#btn-select-none").addEventListener("click", () => selectVisible(false));
$("#check-page").addEventListener("change", () => {
  const on = $("#check-page").checked;
  for (const r of visibleRepos()) {
    if (on) selected.add(r.fullName);
    else selected.delete(r.fullName);
  }
  renderRepoTable();
  updateSelectedCount();
});
$("#btn-preview").addEventListener("click", () => runPreview().catch((e) => toast(e.message, 5000)));
$("#btn-import").addEventListener("click", () => runImport());
$("#btn-preview-close").addEventListener("click", () => { $("#modal-preview").hidden = true; });
$("#btn-preview-run").addEventListener("click", () => runImport());
$("#btn-scan-local").addEventListener("click", () => scanLocal().catch((e) => toast(e.message, 5000)));

$("#btn-sync").addEventListener("click", async () => {
  try {
    await api("/api/sync", { method: "POST", body: {} });
    $("#config-log").textContent = "✓ Config sincronizada";
    toast("Config sincronizada");
    refreshDashboard({ silent: true });
  } catch (e) { $("#config-log").textContent = e.message; }
});

$("#btn-ssh-all").addEventListener("click", async () => {
  try {
    const data = await api("/api/ssh-test", { method: "POST", body: {} });
    $("#config-log").textContent = data.results.map((r) => `${r.ok ? "✓" : "✗"} ${r.id}: ${r.message}`).join("\n");
  } catch (e) { $("#config-log").textContent = e.message; }
});

async function init() {
  await refreshDashboard({ silent: true });
  startAutoRefresh();

  if (profiles.length) {
    selectedProfileId = profiles.find((p) => p.sshOk)?.id || profiles[0].id;
    renderProfiles();
    loadRepos();
  }

  scanLocal().catch(() => {});
}

init().catch((e) => toast(`Error al iniciar: ${e.message}`, 8000));
