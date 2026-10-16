/**
 * Importar clientes desde CSV (fase 6 del CRM): qué columnas se pueden traer, la sugerencia automática de a qué campo
 * va cada columna y la revisión de cada fila (errores y correos repetidos). Puro: lo usan la vista previa en el
 * navegador y la acción que crea los clientes, para que las dos cuenten lo mismo.
 */
import { normalizar } from "./buscar";

export const CAMPOS_IMPORTAR = [
  { id: "name", label: "Nombre", leyenda: "Persona o razón social. Si falta, se usa la empresa.", claves: ["nombre", "name", "cliente", "nombre completo", "full name", "razon social", "nombre cliente"] },
  { id: "company", label: "Empresa", leyenda: "Nombre comercial.", claves: ["empresa", "company", "compania", "organizacion", "negocio", "comercio", "nombre comercial"] },
  { id: "email", label: "Correo", leyenda: "Sirve para no crear el mismo cliente dos veces.", claves: ["correo", "email", "e-mail", "mail", "correo electronico", "email address"] },
  { id: "phone", label: "Teléfono", leyenda: "", claves: ["telefono", "phone", "celular", "movil", "whatsapp", "tel"] },
  { id: "ruc", label: "RUC", leyenda: "", claves: ["ruc", "dv", "nit", "tax id", "cedula", "identificacion", "rut"] },
  { id: "contacto", label: "Persona de contacto", leyenda: "Queda como contacto principal del cliente.", claves: ["contacto", "persona de contacto", "contact", "contact name", "representante", "encargado"] },
  { id: "cargo", label: "Cargo del contacto", leyenda: "", claves: ["cargo", "puesto", "title", "job title", "rol", "posicion"] },
  { id: "address", label: "Dirección", leyenda: "", claves: ["direccion", "address", "domicilio", "ubicacion"] },
  { id: "city", label: "Ciudad", leyenda: "", claves: ["ciudad", "city", "provincia", "distrito"] },
  { id: "country", label: "País", leyenda: "Si falta, Panamá.", claves: ["pais", "country"] },
  { id: "fuente", label: "Fuente", leyenda: "De dónde llegó: referido, web, feria…", claves: ["fuente", "source", "origen", "canal", "como nos conocio"] },
  { id: "industria", label: "Industria", leyenda: "", claves: ["industria", "industry", "sector", "rubro", "giro"] },
  { id: "etiquetas", label: "Etiquetas", leyenda: "Varias separadas por coma, | o /.", claves: ["etiquetas", "tags", "etiqueta", "tag", "categorias", "grupo"] },
  { id: "notes", label: "Notas", leyenda: "", claves: ["notas", "notes", "comentarios", "observaciones", "descripcion"] },
] as const;

export type CampoImportar = (typeof CAMPOS_IMPORTAR)[number]["id"];
/** Columna del archivo → campo (o "" para no traerla). */
export type Mapeo = Record<number, CampoImportar | "">;

const llave = (s: string) => normalizar(s).replace(/[_\-.:]+/g, " ").replace(/\s+/g, " ").trim();

/** Sugerencia por nombre de columna: primero coincidencia exacta, después la que contiene la clave. Un campo, una columna. */
export function sugerirMapeo(encabezados: string[]): Mapeo {
  const mapeo: Mapeo = {};
  const usados = new Set<string>();
  const ks = encabezados.map(llave);
  for (const exacta of [true, false]) {
    ks.forEach((k, i) => {
      if (mapeo[i] || !k) return;
      // Sin coincidencia exacta gana la clave más larga contenida: «nombre del contacto» va a contacto, no a nombre.
      let mejor: { id: CampoImportar; largo: number } | null = null;
      for (const c of CAMPOS_IMPORTAR) {
        if (usados.has(c.id)) continue;
        for (const cl of c.claves) {
          const ok = exacta ? k === cl : cl.length >= 4 && k.includes(cl);
          if (ok && (!mejor || cl.length > mejor.largo)) mejor = { id: c.id, largo: cl.length };
        }
      }
      if (mejor) { mapeo[i] = mejor.id; usados.add(mejor.id); }
    });
  }
  ks.forEach((_, i) => { if (!mapeo[i]) mapeo[i] = ""; });
  return mapeo;
}

export const correoValido = (e: string) => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i.test(e);

export type FilaImportar = {
  fila: number; // número de fila en el archivo (1 = encabezados)
  name: string; company: string | null; email: string | null; phone: string | null; ruc: string | null;
  contacto: string | null; cargo: string | null; address: string | null; city: string | null; country: string | null;
  fuente: string | null; industria: string | null; etiquetas: string[]; notes: string | null;
};
export type Revision = FilaImportar & { estado: "crear" | "error" | "repetido"; motivo?: string };

const corto = (v: string | undefined, max = 200) => { const s = (v ?? "").trim().slice(0, max); return s || null; };
export const separarEtiquetas = (v: string | null | undefined) =>
  [...new Set(String(v ?? "").split(/[,|/;]/).map((t) => t.trim().slice(0, 40)).filter(Boolean))].slice(0, 20);

/** Lee una fila con el mapeo elegido. */
export function leerFila(celdas: string[], mapeo: Mapeo, fila: number): FilaImportar {
  const v: Partial<Record<CampoImportar, string>> = {};
  for (const [i, campo] of Object.entries(mapeo)) {
    if (!campo) continue;
    const c = (celdas[Number(i)] ?? "").trim();
    if (c) v[campo] = v[campo] ? `${v[campo]} ${c}` : c; // dos columnas al mismo campo (Nombre + Apellido) se juntan
  }
  const company = corto(v.company);
  return {
    fila,
    name: corto(v.name) ?? company ?? "",
    company, email: corto(v.email)?.toLowerCase() ?? null, phone: corto(v.phone, 40), ruc: corto(v.ruc, 40),
    contacto: corto(v.contacto, 120), cargo: corto(v.cargo, 80), address: corto(v.address, 300), city: corto(v.city, 80),
    country: corto(v.country, 60), fuente: corto(v.fuente, 60), industria: corto(v.industria, 60),
    etiquetas: separarEtiquetas(v.etiquetas), notes: corto(v.notes, 2000),
  };
}

/**
 * Revisa todas las filas de datos (sin la de encabezados). Se salta la que no tiene nombre ni empresa, la de correo
 * inválido y la de correo que ya tiene un cliente o que se repite más arriba en el mismo archivo.
 */
export function revisarFilas(datos: string[][], mapeo: Mapeo, correosExistentes: Iterable<string>) {
  const existentes = new Set([...correosExistentes].map((e) => e.trim().toLowerCase()).filter(Boolean));
  const vistos = new Set<string>();
  const filas: Revision[] = datos.map((celdas, i) => {
    const f = leerFila(celdas, mapeo, i + 2);
    if (!f.name) return { ...f, estado: "error", motivo: "Sin nombre ni empresa" };
    if (f.email && !correoValido(f.email)) return { ...f, estado: "error", motivo: "Correo inválido" };
    if (f.email && existentes.has(f.email)) return { ...f, estado: "repetido", motivo: "Ya hay un cliente con este correo" };
    if (f.email && vistos.has(f.email)) return { ...f, estado: "repetido", motivo: "Correo repetido en el archivo" };
    if (f.email) vistos.add(f.email);
    return { ...f, estado: "crear" };
  });
  return {
    filas,
    crear: filas.filter((f) => f.estado === "crear").length,
    repetidos: filas.filter((f) => f.estado === "repetido").length,
    errores: filas.filter((f) => f.estado === "error").length,
  };
}

/** ¿Lleva contacto principal? Si trae persona, correo o teléfono. */
export function contactoDeFila(f: FilaImportar): { nombre: string; email: string | null; telefono: string | null; cargo: string | null } | null {
  if (!f.contacto && !f.email && !f.phone) return null;
  return { nombre: f.contacto ?? f.name, email: f.email, telefono: f.phone, cargo: f.cargo };
}

export const MAX_FILAS_IMPORTAR = 1000;
