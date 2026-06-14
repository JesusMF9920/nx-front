import { THEME_STORAGE_KEY } from "./theme";

/**
 * Script SÍNCRONO para el `<head>`: fija `data-theme` en `<html>` ANTES del
 * primer paint, evitando el flash claro→oscuro (FOUC). Corre antes que React,
 * así que no puede importar nada en runtime — por eso es un string con la lógica
 * de `resolveTheme` en línea. La clave sí viene del módulo para no desincronizar.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(p!=="light"&&p!=="dark"&&p!=="system"){p="system";}var dark=p==="dark"||(p==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",dark?"dark":"light");}catch(e){}})();`;
