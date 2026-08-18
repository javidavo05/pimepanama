"use client";

import { useCallback, useEffect, useRef } from "react";

interface EmailRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

type Cmd =
  | { cmd: string; arg?: string }
  | { action: "link" };

const TOOLBAR: Array<{
  title: string;
  label: string;
  run: Cmd;
  active?: RegExp;
}> = [
  { title: "Negrita", label: "B", run: { cmd: "bold" }, active: /<(b|strong)\b/i },
  { title: "Cursiva", label: "I", run: { cmd: "italic" }, active: /<(i|em)\b/i },
  { title: "Subrayado", label: "U", run: { cmd: "underline" }, active: /<u\b/i },
  { title: "Tachado", label: "S", run: { cmd: "strikeThrough" }, active: /<(s|strike|del)\b/i },
];

const BLOCKS = [
  { title: "Párrafo", label: "P", run: { cmd: "formatBlock", arg: "p" } },
  { title: "Título grande", label: "H1", run: { cmd: "formatBlock", arg: "h2" } },
  { title: "Título mediano", label: "H2", run: { cmd: "formatBlock", arg: "h3" } },
  { title: "Título pequeño", label: "H3", run: { cmd: "formatBlock", arg: "h4" } },
];

const SIZES = [
  { title: "Pequeño", label: "A-", run: { cmd: "fontSize", arg: "2" } },
  { title: "Normal", label: "A", run: { cmd: "fontSize", arg: "3" } },
  { title: "Grande", label: "A+", run: { cmd: "fontSize", arg: "5" } },
];

const COLORS = [
  { name: "Negro", value: "#111111" },
  { name: "Gris", value: "#666666" },
  { name: "Azul Pime", value: "#1AA7F0" },
  { name: "Verde", value: "#16a34a" },
  { name: "Rojo", value: "#dc2626" },
];

function ToolbarButton({
  title,
  label,
  onClick,
  active,
  className = "",
}: {
  title: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
        active
          ? "bg-[#1AA7F0]/20 text-[#1AA7F0] border border-[#1AA7F0]/30"
          : "text-white/55 hover:text-white/80 hover:bg-white/[0.06] border border-transparent"
      } ${className}`}
    >
      {label}
    </button>
  );
}

export function EmailRichEditor({
  value,
  onChange,
  placeholder = "Escribe tu mensaje...",
}: EmailRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value);

  const syncToParent = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    const cleaned = html === "<br>" ? "" : html;
    lastValue.current = cleaned;
    onChange(cleaned);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || value === lastValue.current) return;
    el.innerHTML = value || "";
    lastValue.current = value;
  }, [value]);

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(run: Cmd) {
    focusEditor();
    if ("action" in run) {
      if (run.action === "link") {
        const url = window.prompt("URL del enlace:", "https://");
        if (url?.trim()) {
          document.execCommand("createLink", false, url.trim());
        }
      }
      syncToParent();
      return;
    }
    document.execCommand(run.cmd, false, run.arg);
    syncToParent();
  }

  function insertHorizontalRule() {
    focusEditor();
    document.execCommand("insertHorizontalRule", false);
    syncToParent();
  }

  return (
    <div className="rounded-lg border border-white/[0.07] overflow-hidden bg-[#0a0a10] min-w-0">
      {/* Toolbar — scroll horizontal en móvil */}
      <div className="flex items-center gap-0.5 p-1.5 sm:p-2 border-b border-white/[0.06] bg-white/[0.02] overflow-x-auto overscroll-x-contain flex-nowrap sm:flex-wrap [-webkit-overflow-scrolling:touch]">
        <ToolbarButton title="Deshacer" label="↶" onClick={() => runCommand({ cmd: "undo" })} />
        <ToolbarButton title="Rehacer" label="↷" onClick={() => runCommand({ cmd: "redo" })} />
        <span className="w-px h-5 bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

        {TOOLBAR.map((t) => (
          <ToolbarButton
            key={t.title}
            title={t.title}
            label={t.label}
            onClick={() => runCommand(t.run)}
            className={t.label === "B" ? "font-bold" : t.label === "I" ? "italic" : t.label === "U" ? "underline" : "line-through"}
          />
        ))}

        <span className="w-px h-5 bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

        {BLOCKS.map((t) => (
          <ToolbarButton key={t.title} title={t.title} label={t.label} onClick={() => runCommand(t.run)} />
        ))}

        <span className="w-px h-5 bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

        {SIZES.map((t) => (
          <ToolbarButton key={t.title} title={t.title} label={t.label} onClick={() => runCommand(t.run)} />
        ))}

        <span className="w-px h-5 bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

        <ToolbarButton title="Lista con viñetas" label="•≡" onClick={() => runCommand({ cmd: "insertUnorderedList" })} />
        <ToolbarButton title="Lista numerada" label="1." onClick={() => runCommand({ cmd: "insertOrderedList" })} />
        <ToolbarButton title="Enlace" label="🔗" onClick={() => runCommand({ action: "link" })} />
        <ToolbarButton title="Quitar formato" label="✕" onClick={() => runCommand({ cmd: "removeFormat" })} />
        <ToolbarButton title="Línea divisoria" label="—" onClick={insertHorizontalRule} />

        <span className="w-px h-5 bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

        <ToolbarButton title="Alinear izquierda" label="⫷" onClick={() => runCommand({ cmd: "justifyLeft" })} />
        <ToolbarButton title="Centrar" label="≡" onClick={() => runCommand({ cmd: "justifyCenter" })} />
        <ToolbarButton title="Alinear derecha" label="⫸" onClick={() => runCommand({ cmd: "justifyRight" })} />

        <span className="w-px h-5 bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

        <div className="flex items-center gap-1 px-1 shrink-0">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.name}
              onMouseDown={(e) => {
                e.preventDefault();
                focusEditor();
                document.execCommand("foreColor", false, c.value);
                syncToParent();
              }}
              className="w-4 h-4 rounded-full border border-white/20 shrink-0 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      {/* Editing surface — fondo claro como el correo final */}
      <div className="relative bg-white">
        {!value && (
          <p className="absolute top-3 left-3 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncToParent}
          onBlur={syncToParent}
          className="min-h-[140px] sm:min-h-[220px] sm:max-h-[360px] overflow-y-auto px-3 sm:px-4 py-3 text-sm text-gray-900 leading-relaxed outline-none touch-manipulation [&_a]:text-[#1AA7F0] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:text-base [&_h4]:font-semibold [&_p]:my-0 [&_p]:mb-3"
          style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
        />
      </div>
    </div>
  );
}
