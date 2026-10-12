/**
 * La empresa interna (Client.internal, migración 0048) es la propia Pime Panamá para sus productos. Lo que
 * le toca a ella no es dinero de clientes: no entra a «Por cobrar», «Vencido», «Entró este mes» ni a los
 * reportes de ingresos. Este filtro se agrega a las consultas de documentos y pagos. Conserva los que no
 * tienen cliente (comprobado contra la base: NOT sobre la relación no descarta los nulos).
 */
export const SIN_INTERNOS = { NOT: { client: { is: { internal: true } } } } as const;
