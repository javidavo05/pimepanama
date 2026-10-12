/**
 * Estado del repositorio de un proyecto tal como lo muestra el panel «Código del proyecto». Solo lo guardado
 * en la base (el mapa del repo y quién puede leerlo): no llama a GitHub. Lo usan la API y el detalle del
 * proyecto, que lo manda ya armado para que el panel no aparezca vacío y luego salte de tamaño.
 */
import { describeRepoShort } from "./describe";
import { parseRepoSnapshot } from "./snapshot";

export type EstadoRepo = {
  owner: string | null;
  repo: string | null;
  branch: string | null;
  syncedAt: string | null;
  hasToken: boolean;
  account: string | null;
  summary: string | null;
  stats: {
    files: number;
    pages: number;
    apiRoutes: number;
    dataModels: number;
    dependencies: number;
    docs: string[];
    lastCommit: { sha: string; message: string; date: string } | null;
    truncated: boolean;
  } | null;
};

export function estadoRepo(
  p: { repoOwner: string | null; repoName: string | null; repoBranch: string | null; repoSnapshot: unknown; repoSyncedAt: Date | null; githubAccount?: { login: string } | null },
  hasToken: boolean,
): EstadoRepo {
  const snapshot = parseRepoSnapshot(p.repoSnapshot);
  return {
    owner: p.repoOwner,
    repo: p.repoName,
    branch: p.repoBranch,
    syncedAt: p.repoSyncedAt?.toISOString() ?? null,
    hasToken,
    account: p.githubAccount?.login ?? null,
    summary: snapshot ? describeRepoShort(snapshot) : null,
    stats: snapshot
      ? {
          files: snapshot.totalFiles,
          pages: snapshot.pages.length,
          apiRoutes: snapshot.apiRoutes.length,
          dataModels: snapshot.dataModels.length,
          dependencies: snapshot.dependencies.length,
          docs: snapshot.docs.map((d) => d.path),
          lastCommit: snapshot.commits[0] ?? null,
          truncated: snapshot.treeTruncated,
        }
      : null,
  };
}
