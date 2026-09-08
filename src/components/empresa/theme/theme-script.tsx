/**
 * Script síncrono que fija `data-theme` en <html> antes del primer pintado.
 * Sin esto la app arranca con el tema del servidor (oscuro) y salta al claro
 * cuando hidrata React: un flash blanco/negro en cada navegación dura.
 *
 * Se renderiza al principio del layout de /empresa y corre durante el parseo,
 * así que no hay ventana de pintado previa. Es server-only y no hidrata.
 */
export const THEME_STORAGE_KEY = "pime-theme";

const SCRIPT = `(function(){try{
var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";
var r=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;
document.documentElement.setAttribute("data-theme",r);
}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
