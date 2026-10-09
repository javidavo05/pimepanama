import { FooterIndice, FooterTelefono, FooterTarjeta } from "@/components/sections/footer-variants";

/* Revisión de tres direcciones de footer. Javier elige en el artifact; la elegida pasa a footer.tsx. */
export default function FooterReview() {
  const OPCIONES = [
    { id: "a", t: "A · Índice de documento", d: "Filas numeradas grandes a toda la anchura, como el índice de la propuesta; teléfono y propuesta al lado.", C: FooterIndice },
    { id: "b", t: "B · Teléfono protagonista", d: "Oscuro y compacto: el número como titular, WhatsApp y propuesta; navegación en una línea.", C: FooterTelefono },
    { id: "c", t: "C · Tarjeta de contacto", d: "Una tarjeta de presentación real que se guarda en el teléfono (vCard), con propuesta y navegación al lado.", C: FooterTarjeta },
  ];
  return (
    <main style={{ display: "grid", gap: "48px", padding: "48px 0" }}>
      {OPCIONES.map((o) => (
        <section key={o.id} id={o.id} style={{ display: "grid", gap: "12px" }}>
          <div className="wrap"><p className="caps">{o.t}</p><p className="meta" style={{ maxWidth: "70ch" }}>{o.d}</p></div>
          <div style={{ border: "1px dashed var(--line-strong)" }}><o.C lang="es" /></div>
        </section>
      ))}
    </main>
  );
}
