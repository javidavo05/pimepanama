"use client";

import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";
import { projects } from "../data/projects";

const GOLD = "#8B6A2E";
const INK = "#1C1C1C";
const MUTED = "#555555";
const SITE = "pimepanama.com";

/**
 * Print-only resume document. Hidden on screen (`hidden`), revealed only in
 * @media print where the animated <main> is hidden. This guarantees a clean,
 * paginated, recruiter-ready PDF regardless of the on-screen animations.
 */
export function PrintResume() {
  const { lang } = useLang();
  const c = content[lang];

  const education = c.experience.entries.filter((e) => e.company.includes("ENEB"));
  const jobs = c.experience.entries.filter((e) => !e.company.includes("ENEB"));

  const heading = (text: string) => (
    <h2
      style={{
        fontFamily: "var(--font-syne)",
        fontSize: "11pt",
        fontWeight: 800,
        color: GOLD,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        margin: "0 0 8px",
        paddingBottom: "4px",
        borderBottom: `1px solid rgba(139,106,46,0.3)`,
      }}
    >
      {text}
    </h2>
  );

  return (
    <div
      id="print-resume"
      className="hidden"
      style={{ color: INK, fontFamily: "ui-sans-serif, system-ui, sans-serif", lineHeight: 1.45 }}
    >
      {/* Header */}
      <header style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
        <img
          src="/resume/javier-vallejo.jpg"
          alt="Javier Vallejo"
          style={{ width: "82px", height: "100px", objectFit: "cover", objectPosition: "top", borderRadius: "8px", border: `1.5px solid ${GOLD}` }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "var(--font-syne)", fontSize: "26pt", fontWeight: 800, margin: 0, color: INK, lineHeight: 1.05 }}>
            {c.hero.name}
          </h1>
          <p style={{ fontFamily: "var(--font-syne)", fontSize: "10.5pt", fontWeight: 700, color: GOLD, margin: "4px 0 8px" }}>
            {c.hero.title}
          </p>
          <div style={{ fontSize: "8.5pt", color: MUTED, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
            <span>📍 {lang === "es" ? "Ciudad de Panamá, Panamá" : "Panama City, Panama"}</span>
            <span>✉ {c.contact.items[0].value}</span>
            <span>✆ +507 64 795 352</span>
            <span>in/javier-vallejo</span>
            <span>{SITE}</span>
          </div>
        </div>
      </header>

      {/* Summary */}
      <section style={{ marginBottom: "14px", breakInside: "avoid" }}>
        {heading(c.print.summary)}
        <p style={{ fontSize: "9pt", color: INK, margin: "0 0 5px" }}>{c.summary.p1}</p>
        <p style={{ fontSize: "9pt", color: INK, margin: "0 0 5px" }}>{c.summary.p2}</p>
        <p style={{ fontSize: "9pt", color: INK, margin: 0 }}>{c.summary.p3}</p>
      </section>

      {/* Metrics */}
      <section style={{ marginBottom: "14px", breakInside: "avoid" }}>
        {heading(c.print.metrics)}
        <div style={{ display: "flex", gap: "10px" }}>
          {c.hero.stats.map((s) => (
            <div key={s.label} style={{ flex: 1, textAlign: "center", border: "1px solid rgba(139,106,46,0.25)", borderRadius: "6px", padding: "6px 4px" }}>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "15pt", fontWeight: 800, color: GOLD }}>{s.value}</div>
              <div style={{ fontSize: "7pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section style={{ marginBottom: "14px" }}>
        {heading(c.print.experience)}
        {jobs.map((e, i) => (
          <div key={i} style={{ marginBottom: "10px", breakInside: "avoid" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-syne)", fontSize: "10pt", fontWeight: 700, color: INK }}>
                {e.role} · <span style={{ color: GOLD }}>{e.company}</span>
              </span>
              <span style={{ fontSize: "8pt", color: MUTED, whiteSpace: "nowrap" }}>{e.period}</span>
            </div>
            <p style={{ fontSize: "8.5pt", color: MUTED, margin: "2px 0 0" }}>{e.description}</p>
          </div>
        ))}
      </section>

      {/* Selected Projects */}
      <section style={{ marginBottom: "14px" }}>
        {heading(c.print.projects)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px" }}>
          {projects.map((p) => (
            <div key={p.id} style={{ breakInside: "avoid", marginBottom: "4px" }}>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "9pt", fontWeight: 700, color: INK }}>
                {p.title[lang]}
              </div>
              <div style={{ fontSize: "7.5pt", color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>
                {p.category[lang]}
              </div>
              <p style={{ fontSize: "8pt", color: MUTED, margin: 0 }}>{p.description[lang]}</p>
              {p.demoSlug ? (
                <div style={{ fontSize: "7.5pt", color: GOLD, marginTop: "2px" }}>
                  ▸ {c.print.demoNote} {SITE}/{lang}/portfolio/demos/{p.demoSlug}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section style={{ marginBottom: "14px", breakInside: "avoid" }}>
        {heading(c.print.skills)}
        {c.tech.groups.map((g) => (
          <div key={g.title} style={{ fontSize: "8.5pt", marginBottom: "3px" }}>
            <span style={{ fontWeight: 700, color: INK }}>{g.title}: </span>
            <span style={{ color: MUTED }}>{g.skills.join(" · ")}</span>
          </div>
        ))}
      </section>

      {/* Education + Languages */}
      <section style={{ display: "flex", gap: "24px", breakInside: "avoid" }}>
        <div style={{ flex: 1.4 }}>
          {heading(c.print.education)}
          {education.map((e, i) => (
            <div key={i}>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "9pt", fontWeight: 700, color: INK }}>{e.role}</div>
              <div style={{ fontSize: "8pt", color: GOLD }}>{e.company} · {e.period}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {heading(c.print.languages)}
          <div style={{ fontSize: "8.5pt", color: MUTED }}>{c.print.languagesList}</div>
        </div>
      </section>
    </div>
  );
}
