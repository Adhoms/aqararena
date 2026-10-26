/** Where the visitor's light/dark choice is saved. Light is the default. */
export const THEME_STORAGE_KEY = "theme";

/** Runs in <head> before the first paint, so a saved dark choice never flashes light first. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
