import { test } from "node:test";
import assert from "node:assert/strict";
import { bloqueDeBoveda, detectarCredenciales, enmascarar } from "./detectar";

const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.firmafirmafirmafirmafirma`;

test("separa cada credencial de un .env pegado", () => {
  const texto = [
    "GITHUB_TOKEN=ghp_" + "a".repeat(36),
    "VERCEL_TOKEN=" + "B".repeat(24),
    "SUPABASE_ACCESS_TOKEN=sbp_" + "c".repeat(40),
    "NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY=" + jwt({ iss: "supabase", ref: "abcdefghijklmnopqrst", role: "service_role" }),
    "DATABASE_URL=postgresql://postgres.abcdefghijklmnopqrst:Cl%40ve-Segura9@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    "RESEND_API_KEY=re_12345678_abcdefghijklmnopqrst",
  ].join("\n");
  const hs = detectarCredenciales(texto);
  const tipo = (t: string) => hs.filter((h) => h.tipo === t);
  assert.equal(tipo("github_token").length, 1);
  assert.equal(tipo("vercel_token")[0].clave, "VERCEL_TOKEN");
  assert.equal(tipo("supabase_token").length, 1);
  assert.deepEqual(tipo("supabase_ref").map((h) => h.valor), ["abcdefghijklmnopqrst"]);
  assert.equal(tipo("supabase_service_role")[0].ref, "abcdefghijklmnopqrst");
  assert.equal(tipo("db_password")[0].valor, "Cl@ve-Segura9");
  assert.equal(tipo("otro")[0].servicio, "Resend");
});

test("lee tokens sueltos en un chat y el repo de su enlace", () => {
  const texto = `te paso todo:\nvercel: ${"Z".repeat(24)}\ngithub github_pat_${"x".repeat(60)}\nrepo https://github.com/cliente-uno/tienda.git`;
  const hs = detectarCredenciales(texto);
  assert.ok(hs.some((h) => h.tipo === "vercel_token"));
  assert.ok(hs.some((h) => h.tipo === "github_token"));
  assert.deepEqual(hs.filter((h) => h.tipo === "repo").map((h) => h.valor), ["cliente-uno/tienda"]);
});

test("no repite una credencial ni muestra el secreto completo", () => {
  const t = "ghp_" + "q".repeat(36);
  const hs = detectarCredenciales(`${t}\nGITHUB_TOKEN=${t}`);
  assert.equal(hs.length, 1);
  assert.equal(hs[0].clave, "GITHUB_TOKEN");
  assert.equal(enmascarar(hs[0]), "ghp_…qqqq");
});

test("la bóveda guarda lo que no es una cuenta", () => {
  const hs = detectarCredenciales("SUPABASE_DB_PASSWORD=unaClaveLarga123\nGITHUB_TOKEN=ghp_" + "a".repeat(36));
  const b = bloqueDeBoveda(hs, new Date("2026-10-17T12:00:00Z"));
  assert.match(b, /SUPABASE_DB_PASSWORD=unaClaveLarga123/);
  assert.doesNotMatch(b, /GITHUB_TOKEN/);
});
