"use server";
"use server";
/* eslint-disable @next/next/no-img-element */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { defaultLocale, isValidLocale } from "@/lib/i18n";

const background = "linear-gradient(135deg, #01030a 0%, #04102a 40%, #020615 100%)";

const copy = {
  en: {
    headline: "PIME Panama",
    subheadline: "Turnkey industrial engineering across Latin America.",
    body: "Consulting • Premium Equipment • Predictive Maintenance",
  },
  es: {
    headline: "PIME Panama",
    subheadline: "Ingeniería industrial llave en mano para Latinoamérica.",
    body: "Consultoría • Equipos de Alta Gama • Mantenimiento Predictivo",
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(_request: NextRequest, context: any) {
  const logoResponse = await fetch(new URL("../../../../../public/pime-icon.svg", import.meta.url));
  const svg = await logoResponse.text();

  const requestedLocale = context?.params?.locale ?? "";
  const locale = isValidLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const strings = copy[locale];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: background,
          color: "#F8FAFC",
          fontFamily: "Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            padding: "64px 96px",
            borderRadius: 40,
            background: "rgba(2, 12, 32, 0.55)",
            border: "1px solid rgba(96, 165, 250, 0.35)",
            boxShadow: "0 35px 80px -45px rgba(37, 99, 235, 0.8)",
          }}
        >
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
            alt="PIME Panama"
            width={160}
            height={160}
          />
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 720,
            }}
          >
            <span style={{ fontSize: 52, fontWeight: 700 }}>{strings.headline}</span>
            <span style={{ fontSize: 30, fontWeight: 500, color: "rgba(226, 232, 240, 0.9)" }}>
              {strings.subheadline}
            </span>
            <span style={{ fontSize: 26, fontWeight: 400, color: "rgba(148, 163, 184, 0.9)" }}>
              {strings.body}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}


