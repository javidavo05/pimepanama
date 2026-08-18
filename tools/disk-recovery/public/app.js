const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let state = {
  volumes: [],
  selectedVolume: null,
  session: null,
  selected: new Set(),
  filterName: "",
  filterExt: "",
  appState: null,
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg, ms = 4000) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, ms);
}

function bytesHuman(n) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function sourceLabel(s) {
  const map = {
    trash: "Papelera",
    recycle: "Recycle Bin",
    orphan: "Resto oculto",
    carved: "PhotoRec",
    deleted: "Índice HFS (borrado)",
    catalog: "Índice HFS (catálogo)",
  };
  return map[s] ?? s;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function loadState() {
  const data = await api("/api/state");
  state.appState = data;
  const urls = $("#urls");
  urls.innerHTML = [
    `<div>${esc(data.urls.local)}</div>`,
    ...data.urls.lan.map((u) => `<div>${esc(u)}</div>`),
  ].join("");
  $("#restore-dir").value = data.defaultRestoreDir;

  const pr = $("#photorec-status");
  if (data.photorec.installed) {
    pr.textContent = "PhotoRec: instalado";
    pr.className = "pill ok";
  } else {
    pr.textContent = "PhotoRec: no instalado";
    pr.className = "pill miss";
  }

  const sudoPill = $("#sudo-status");
  if (sudoPill) {
    if (data.sudo?.configured && data.sudo?.probe?.ok) {
      sudoPill.textContent = "sudo: activo";
      sudoPill.className = "pill ok";
    } else if (data.sudo?.configured) {
      sudoPill.textContent = "sudo: error";
      sudoPill.className = "pill miss";
    } else {
      sudoPill.textContent = "sudo: no config";
      sudoPill.className = "pill";
    }
  }

  renderSystemBanners(data);
}

function renderSystemBanners(data) {
  const ok = $("#system-ok");
  const hints = $("#system-hints");
  const body = $("#system-hints-body");
  const btnFda = $("#btn-fda");
  const btnUnmount = $("#btn-unmount-hint");

  const photorecOk = data.photorec?.installed;
  const sudoOk = data.sudo?.configured && data.sudo?.probe?.ok;
  const allReady = photorecOk && sudoOk;

  const issues = [];
  if (!photorecOk) {
    issues.push("Instala PhotoRec: <code>brew install testdisk</code>");
  }
  if (!data.sleuthkit?.installed && (getMode() === "zip" || getMode() === "deep")) {
    issues.push("Índice HFS rápido: <code>brew install sleuthkit</code> (opcional, acelera mucho)");
  }
  if (!sudoOk) {
    issues.push("Configura sudo en <code>~/.pime-disk-recovery/sudo-password</code>");
  }

  const vol = state.volumes.find((v) => v.mountPoint === state.selectedVolume);
  if (vol?.trash?.needsFda) {
    issues.push("Acceso total al disco (FDA) para leer .Trashes sin sudo");
    btnFda.hidden = false;
  } else {
    btnFda.hidden = true;
  }

  if (getMode() === "deep" || getMode() === "zip" || getMode() === "zip-full") {
    btnUnmount.hidden = false;
  } else {
    btnUnmount.hidden = true;
  }

  if (allReady && issues.length === 0) {
    ok.hidden = false;
    hints.hidden = true;
    return;
  }

  ok.hidden = true;
  if (issues.length === 0) {
    hints.hidden = true;
    return;
  }

  hints.hidden = false;
  body.innerHTML = `<strong>Pendiente:</strong><ul>${issues.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

function updateDeepHint() {
  const deep = $("#deep-hint");
  const zip = $("#zip-hint");
  const zipFull = $("#zip-full-hint");
  const mode = getMode();
  if (deep) deep.hidden = mode !== "deep";
  if (zip) zip.hidden = mode !== "zip";
  if (zipFull) zipFull.hidden = mode !== "zip-full";
  renderSystemBanners(state.appState ?? {});
}

function isLiveScanMode() {
  const mode = getMode();
  return mode === "zip" || mode === "zip-full" || mode === "deep";
}

async function loadVolumes() {
  const data = await api("/api/volumes");
  state.volumes = data.volumes ?? [];
  renderVolumes();
  renderSystemBanners(state.appState ?? {});
}

function renderVolumes() {
  const el = $("#volumes");
  if (!state.volumes.length) {
    el.innerHTML = '<p class="empty">No hay discos externos montados en /Volumes/. Conecta el disco y pulsa Actualizar.</p>';
    return;
  }
  el.innerHTML = state.volumes
    .map(
      (v) => `
    <label class="volume-card ${state.selectedVolume === v.mountPoint ? "selected" : ""}">
      <input type="radio" name="volume" value="${esc(v.mountPoint)}" ${state.selectedVolume === v.mountPoint ? "checked" : ""} />
      <div class="volume-meta">
        <strong>${esc(v.name)}</strong>
        <span>${esc(v.mountPoint)} · ${esc(v.fileSystem)} · ${esc(v.sizeHuman)} · ${esc(v.protocol)}${v.readOnly ? " · solo lectura" : ""}${v.trash && !v.trash.effectiveOk ? " · ⚠ papelera bloqueada" : v.trash?.effectiveOk && !v.trash?.direct?.ok ? " · papelera vía sudo" : ""}</span>
      </div>
    </label>`
    )
    .join("");

  $$('input[name="volume"]').forEach((inp) => {
    inp.addEventListener("change", () => {
      state.selectedVolume = inp.value;
      const vol = state.volumes.find((v) => v.mountPoint === inp.value);
      const hint = $("#volume-perm-hint");
      if (vol?.trash && !vol.trash.effectiveOk) {
        hint.hidden = false;
        hint.textContent =
          "⚠ Papelera bloqueada. Activa Acceso total al disco o usa escaneo profundo (PhotoRec).";
      } else if (vol?.trash && !vol.trash.direct?.ok && vol.trash.sudo?.ok) {
        hint.hidden = false;
        hint.textContent = "Papelera accesible vía sudo (no hace falta FDA).";
        hint.className = "perm-hint ok-hint";
      } else {
        hint.hidden = true;
        hint.textContent = "";
        hint.className = "perm-hint";
      }
      renderSystemBanners(state.appState ?? {});
      updateDeepHint();
      renderVolumes();
      $("#btn-scan").disabled = !state.selectedVolume;
    });
  });
}

function getMode() {
  const checked = $('input[name="mode"]:checked');
  return checked?.value ?? "trash";
}

function fileExtension(name) {
  const base = String(name ?? "");
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return "";
  return base.slice(idx + 1).toLowerCase();
}

/** @returns {string[]} */
function parseExtensionFilter(raw) {
  return String(raw ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().replace(/^\*?\./, "").toLowerCase())
    .filter(Boolean);
}

function matchesFilters(file) {
  const nameQ = state.filterName.trim().toLowerCase();
  const extTokens = parseExtensionFilter(state.filterExt);
  const ext = fileExtension(file.name);

  if (nameQ) {
    const haystack = `${file.name} ${file.relativePath ?? ""}`.toLowerCase();
    if (!haystack.includes(nameQ)) return false;
  }

  if (extTokens.length > 0) {
    if (!extTokens.includes(ext)) return false;
  }

  return true;
}

function filteredFiles() {
  if (!state.session?.files) return [];
  let files = state.session.files.filter(matchesFilters);
  if (state.session.mode === "zip") {
    files = [...files].sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));
  }
  return files;
}

function updateFilterSummary() {
  const total = state.session?.files?.length ?? 0;
  const visible = filteredFiles().length;
  const el = $("#filter-summary");
  const parts = [];

  if (state.filterName.trim()) parts.push(`nombre «${state.filterName.trim()}»`);
  if (state.filterExt.trim()) {
    const exts = parseExtensionFilter(state.filterExt).map((e) => `.${e}`).join(", ");
    parts.push(`extensión ${exts}`);
  }

  if (!parts.length) {
    el.textContent = total ? `Mostrando los ${total} archivo(s)` : "Sin archivos";
    return;
  }

  el.textContent =
    visible === total
      ? `${visible} archivo(s) · filtro: ${parts.join(" + ")}`
      : `${visible} de ${total} archivo(s) · filtro: ${parts.join(" + ")}`;
}

function syncExtChips() {
  const active = new Set(parseExtensionFilter(state.filterExt));
  $$("#ext-chips .chip").forEach((btn) => {
    btn.classList.toggle("active", active.has(btn.dataset.ext ?? ""));
  });
}

function renderResults() {
  const files = filteredFiles();
  const total = state.session?.files?.length ?? 0;
  const isZip = state.session?.mode === "zip";
  $("#results-count").textContent = isZip ? `${total} .zip` : String(total);
  $("#btn-restore-stop").hidden = !isZip || state.session?.status !== "running";
  updateFilterSummary();
  syncExtChips();

  const tbody = $("#results-body");
  if (!files.length) {
    const msg = total
      ? "Ningún archivo coincide con los filtros actuales"
      : isZip && state.session?.status === "running"
        ? "Buscando .zip… aparecerán aquí al encontrarse"
        : "Sin archivos en este escaneo";
    tbody.innerHTML = `<tr><td colspan="8" class="empty">${esc(msg)}</td></tr>`;
    updateSelectedCount();
    return;
  }

  tbody.innerHTML = files
    .map((f) => {
      const checked = state.selected.has(f.id) ? "checked" : "";
      const mod = f.modifiedAt ? new Date(f.modifiedAt).toLocaleString("es-PA") : "—";
      const ext = fileExtension(f.name);
      return `<tr>
        <td><input type="checkbox" data-id="${esc(f.id)}" ${checked} /></td>
        <td title="${esc(f.relativePath)}">${esc(f.name)}</td>
        <td><span class="tag ext">${ext ? `.${esc(ext)}` : "—"}</span></td>
        <td><span class="tag ${esc(f.source)}">${esc(sourceLabel(f.source))}</span></td>
        <td><strong>${esc(bytesHuman(f.sizeBytes))}</strong></td>
        <td><span class="tag ${esc(f.confidence)}">${esc(f.confidence)}</span></td>
        <td>${esc(mod)}</td>
        <td><button type="button" class="btn ghost btn-sm btn-restore-one" data-id="${esc(f.id)}">Restaurar</button></td>
      </tr>`;
    })
    .join("");

  $$("#results-body input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) state.selected.add(cb.dataset.id);
      else state.selected.delete(cb.dataset.id);
      updateSelectedCount();
    });
  });
  $$("#results-body .btn-restore-one").forEach((btn) => {
    btn.addEventListener("click", () => restoreFilesByIds([btn.dataset.id]));
  });
  updateSelectedCount();
}

function appendSessionFile(file) {
  if (!state.session) return;
  const exists = state.session.files.some((f) => f.absolutePath === file.absolutePath);
  if (exists) return;
  state.session.files.push(file);
  $("#results-card").hidden = false;
  $("#restore-card").hidden = false;
  renderResults();
}

function updateSelectedCount() {
  const n = state.selected.size;
  $("#selected-count").textContent = `${n} seleccionado${n !== 1 ? "s" : ""}`;
  $("#btn-restore").disabled = n === 0;
}

async function runScan() {
  if (!state.selectedVolume) return;
  const mode = getMode();
  const live = isLiveScanMode();
  $("#btn-scan").disabled = true;
  $("#btn-cancel-scan").hidden = !live;
  $("#scan-progress-card").hidden = false;
  if (live) {
    $("#results-card").hidden = false;
    $("#restore-card").hidden = false;
    state.session = { id: null, mode, status: "running", files: [] };
    state.filterExt = mode === "zip" ? "zip" : "";
    $("#filter-ext").value = state.filterExt;
    renderResults();
  } else {
    $("#results-card").hidden = true;
    $("#restore-card").hidden = true;
  }
  const logEl = $("#scan-log");
  logEl.textContent = "";

  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volumePath: state.selectedVolume,
        mode,
        stream: true,
      }),
    });

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const evt = JSON.parse(line);
        if (evt.type === "log") {
          logEl.textContent += `${evt.message}\n`;
          logEl.scrollTop = logEl.scrollHeight;
        }
        if (evt.type === "started") {
          state.session = { ...state.session, ...evt.session, files: state.session?.files ?? [] };
        }
        if (evt.type === "file") {
          if (!state.session) state.session = { files: [], status: "running" };
          appendSessionFile(evt.file);
        }
        if (evt.type === "done") {
          state.session = evt.session;
        }
        if (evt.type === "error") throw new Error(evt.error);
      }
    }

    if (state.session?.status === "error") {
      throw new Error(state.session.error ?? "Error en escaneo");
    }

    state.selected = new Set();
    if (mode !== "zip") {
      state.filterName = "";
      state.filterExt = "";
      $("#filter-name").value = "";
      $("#filter-ext").value = "";
    }
    $("#results-card").hidden = false;
    $("#restore-card").hidden = false;
    renderResults();
    const n = state.session.files.length;
    toast(mode === "zip" ? `Listo: ${n} .zip encontrado(s)` : `Escaneo listo: ${n} archivo(s)`);
  } catch (e) {
    const msg = e.message ?? String(e);
    toast(msg, 6000);
    logEl.textContent += `\nError: ${msg}`;
    if (/Permission denied|resource busy|desmontar/i.test(msg)) {
      const hints = $("#system-hints");
      const body = $("#system-hints-body");
      const btnUnmount = $("#btn-unmount-hint");
      $("#system-ok").hidden = true;
      hints.hidden = false;
      body.innerHTML =
        "<strong>PhotoRec necesita el disco desmontado.</strong> Cierra apps que usen el volumen y pulsa <em>Desmontar disco seleccionado</em>.";
      btnUnmount.hidden = false;
    }
  } finally {
    $("#btn-scan").disabled = !state.selectedVolume;
    $("#btn-cancel-scan").hidden = true;
    $("#scan-progress-card").hidden = false;
  }
}

async function restoreFilesByIds(fileIds, { stopScanAfter = false } = {}) {
  if (!state.session || !fileIds.length) return;
  const destination = $("#restore-dir").value.trim();
  if (!destination) {
    toast("Indica carpeta destino");
    return;
  }

  $("#btn-restore").disabled = true;
  $("#btn-restore-stop").disabled = true;
  const logEl = $("#restore-log");
  logEl.hidden = false;
  logEl.textContent = "";

  try {
    const res = await fetch("/api/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scanId: state.session.id,
        fileIds,
        destination,
        stream: true,
      }),
    });

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let result = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const evt = JSON.parse(line);
        if (evt.type === "progress") {
          const mark = evt.status === "ok" ? "✓" : evt.status === "fail" ? "✗" : "…";
          logEl.textContent += `${mark} ${evt.name}${evt.restoredPath ? ` → ${evt.restoredPath}` : ""}${evt.error ? ` (${evt.error})` : ""}\n`;
          logEl.scrollTop = logEl.scrollHeight;
        }
        if (evt.type === "done") result = evt.result;
        if (evt.type === "error") throw new Error(evt.error);
      }
    }

    toast(`Restaurados: ${result?.restored ?? 0} · Fallos: ${result?.failed ?? 0}`, 6000);
    if (result?.destination) {
      logEl.textContent += `\nCarpeta: ${result.destination}\n`;
    }
    if (stopScanAfter) {
      await api("/api/scan/cancel", { method: "POST" });
      toast("Escaneo detenido");
    }
  } catch (e) {
    toast(e.message, 6000);
    logEl.textContent += `\nError: ${e.message}`;
  } finally {
    updateSelectedCount();
    $("#btn-restore-stop").disabled = false;
  }
}

async function runRestore() {
  if (!state.session || state.selected.size === 0) return;
  await restoreFilesByIds([...state.selected]);
}

function onFilterChange() {
  renderResults();
}

function clearFilters() {
  state.filterName = "";
  state.filterExt = "";
  $("#filter-name").value = "";
  $("#filter-ext").value = "";
  renderResults();
}

function toggleExtChip(ext) {
  const tokens = new Set(parseExtensionFilter(state.filterExt));
  if (tokens.has(ext)) tokens.delete(ext);
  else tokens.add(ext);
  state.filterExt = [...tokens].join(", ");
  $("#filter-ext").value = state.filterExt;
  renderResults();
}

$("#btn-refresh-volumes").addEventListener("click", () => loadVolumes().catch((e) => toast(e.message)));
$("#btn-cancel-scan").addEventListener("click", async () => {
  try {
    const r = await api("/api/scan/cancel", { method: "POST" });
    toast(r.message ?? "Deteniendo…");
  } catch (e) {
    toast(e.message);
  }
});
$("#btn-scan").addEventListener("click", () => runScan());
$("#btn-restore").addEventListener("click", () => runRestore());
$("#btn-restore-stop").addEventListener("click", () => {
  if (state.selected.size === 0) {
    toast("Selecciona al menos un .zip");
    return;
  }
  restoreFilesByIds([...state.selected], { stopScanAfter: true });
});
$("#filter-name").addEventListener("input", (e) => {
  state.filterName = e.target.value;
  onFilterChange();
});
$("#filter-ext").addEventListener("input", (e) => {
  state.filterExt = e.target.value;
  onFilterChange();
});
$("#btn-clear-filters").addEventListener("click", clearFilters);
$("#btn-fda").addEventListener("click", async () => {
  try {
    await api("/api/open-full-disk-access", { method: "POST" });
    toast("Abriendo Ajustes → Privacidad → Acceso total al disco");
  } catch (e) {
    toast(e.message);
  }
});
$("#btn-unmount-hint").addEventListener("click", async () => {
  if (!state.selectedVolume) {
    toast("Selecciona un disco primero");
    return;
  }
  if (!confirm(`¿Desmontar "${state.selectedVolume}"? Cierra apps que lo usen.`)) return;
  try {
    await api("/api/unmount", {
      method: "POST",
      body: JSON.stringify({ volumePath: state.selectedVolume }),
    });
    toast("Disco desmontado. Ya puedes iniciar PhotoRec.");
    await loadVolumes();
  } catch (e) {
    toast(e.message, 6000);
  }
});
$$('input[name="mode"]').forEach((inp) => {
  inp.addEventListener("change", updateDeepHint);
});
$$("#ext-chips .chip").forEach((btn) => {
  btn.addEventListener("click", () => toggleExtChip(btn.dataset.ext ?? ""));
});
$("#btn-select-all").addEventListener("click", () => {
  for (const f of filteredFiles()) state.selected.add(f.id);
  renderResults();
});
$("#btn-select-none").addEventListener("click", () => {
  state.selected.clear();
  renderResults();
});
$("#check-all").addEventListener("change", (e) => {
  if (e.target.checked) {
    for (const f of filteredFiles()) state.selected.add(f.id);
  } else {
    for (const f of filteredFiles()) state.selected.delete(f.id);
  }
  renderResults();
});

loadState()
  .then(() => loadVolumes())
  .then(() => updateDeepHint())
  .catch((e) => toast(e.message));
