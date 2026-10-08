import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "var(--s-6)" }}>
      <div style={{ display: "grid", gap: "var(--s-4)", maxWidth: 480 }}>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800 }}>Pime v2 en construcción</h1>
        <p style={{ color: "var(--slate)" }}>
          El sitio nuevo se arma paso por paso. El estado de cada parte está en el tablero de avance.
        </p>
        <Link href="/avance" style={{ color: "var(--accent)", fontWeight: 600 }}>Ver el tablero de avance</Link>
      </div>
    </main>
  );
}
