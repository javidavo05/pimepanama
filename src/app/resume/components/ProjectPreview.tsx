"use client";

import type { Project } from "../data/projects";

/**
 * Browser-framed preview of a project. If a real screenshot exists it is shown;
 * otherwise a convincing faux-dashboard placeholder is rendered, tinted by the
 * project's accent color. Swap in real screenshots via project.screenshotUrl.
 */
export function ProjectPreview({ project }: { project: Project }) {
  const { accentColor, initials, screenshotUrl } = project;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border" style={{ borderColor: "rgba(238,238,232,0.08)" }}>
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(238,238,232,0.06)" }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#febc2e" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#28c840" }} />
        <div
          className="ml-3 flex h-5 flex-1 items-center rounded-md px-2.5 text-[8px] font-medium tracking-wide"
          style={{ backgroundColor: "rgba(0,0,0,0.25)", color: "rgba(238,238,232,0.45)" }}
        >
          app.{project.id.replace(/-/g, "")}.com
        </div>
      </div>

      {/* Screen */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {screenshotUrl ? (
          <img src={screenshotUrl} alt={project.title} className="h-full w-full object-cover object-top" />
        ) : (
          <FauxDashboard accentColor={accentColor} initials={initials} />
        )}
      </div>
    </div>
  );
}

function FauxDashboard({ accentColor, initials }: { accentColor: string; initials: string }) {
  return (
    <div
      className="absolute inset-0 flex"
      style={{ background: `linear-gradient(135deg, ${accentColor}14 0%, rgba(13,31,24,0.92) 70%)` }}
    >
      {/* Sidebar */}
      <div className="hidden w-[22%] flex-col gap-2.5 p-3 sm:flex" style={{ borderRight: "1px solid rgba(238,238,232,0.06)" }}>
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-extrabold"
            style={{ backgroundColor: accentColor, color: "#fff", fontFamily: "var(--font-syne)" }}
          >
            {initials}
          </div>
          <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: "rgba(238,238,232,0.18)" }} />
        </div>
        {[0.5, 0.7, 0.4, 0.6, 0.45].map((w, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: i === 0 ? accentColor : "rgba(238,238,232,0.12)" }} />
            <div className="h-1.5 rounded-full" style={{ width: `${w * 100}%`, backgroundColor: "rgba(238,238,232,0.1)" }} />
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        {/* Topbar */}
        <div className="flex items-center justify-between">
          <div className="h-2 w-16 rounded-full" style={{ backgroundColor: "rgba(238,238,232,0.22)" }} />
          <div className="h-4 w-12 rounded-md" style={{ backgroundColor: accentColor, opacity: 0.85 }} />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-md p-2" style={{ backgroundColor: "rgba(238,238,232,0.04)", border: "1px solid rgba(238,238,232,0.06)" }}>
              <div className="mb-1.5 h-1 w-6 rounded-full" style={{ backgroundColor: "rgba(238,238,232,0.18)" }} />
              <div className="h-2.5 w-9 rounded-sm" style={{ backgroundColor: i === 1 ? accentColor : "rgba(238,238,232,0.28)" }} />
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="flex flex-1 items-end gap-1.5 rounded-md p-2" style={{ backgroundColor: "rgba(238,238,232,0.03)", border: "1px solid rgba(238,238,232,0.06)" }}>
          {[0.45, 0.7, 0.35, 0.85, 0.55, 0.95, 0.6, 0.75].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h * 100}%`, backgroundColor: accentColor, opacity: 0.35 + h * 0.5 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
