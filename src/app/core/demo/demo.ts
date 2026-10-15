/**
 * Demo al navegador (botó "Prova la demo" del login). Mentre està activa, l'API es respon dins
 * del navegador (vegeu demo.interceptor.ts) amb tres lectors d'exemple que se segueixen entre ells
 * —llibres, ressenyes, notes, registre de lectura, feed i notificacions— i tot es desa al
 * localStorage d'aquest navegador: es manté en recarregar i en canviar d'usuari. "Torna a
 * començar" recupera les dades d'exemple i "Surt de la demo" torna a l'API real. A la demo no es
 * crida mai el servidor, així que tampoc es desperta.
 */
const DEMO_FLAG_KEY = 'shelfy.demo';
export const DEMO_DB_KEY = 'shelfy.demo.db';
export const DEMO_PASSWORD = 'demo1234';

// Les mateixes claus que AuthService: entrar o sortir de la demo tanca la sessió.
const SESSION_KEYS = ['shelfy.token', 'shelfy.user'];

export interface DemoReader {
  key: 'laia' | 'pau' | 'mar';
  email: string;
  name: string;
  alias: string;
}

export const DEMO_READERS: readonly DemoReader[] = [
  { key: 'laia', email: 'laia@shelfy.dev', name: 'Laia', alias: 'laia_llegeix' },
  { key: 'pau', email: 'pau@shelfy.dev', name: 'Pau', alias: 'pau_lector' },
  { key: 'mar', email: 'mar@shelfy.dev', name: 'Mar', alias: 'mar_reads' },
];

/** Navegació de pàgina sencera; embolcallada perquè els tests la puguin substituir. */
export const demoNavigation = {
  restart(): void {
    window.location.assign('/login');
  },
};

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function clearSession(): void {
  try {
    SESSION_KEYS.forEach((key) => storage()?.removeItem(key));
  } catch {
    // Res desat, res a esborrar.
  }
}

export function isDemoChosen(): boolean {
  try {
    return storage()?.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function startDemo(): void {
  try {
    storage()?.setItem(DEMO_FLAG_KEY, '1');
  } catch {
    // Sense emmagatzematge la demo no es pot recordar.
  }
  clearSession();
  demoNavigation.restart();
}

/** En sortir es conserven les dades: qui torna a la demo troba el que hi va deixar. */
export function exitDemo(): void {
  try {
    storage()?.removeItem(DEMO_FLAG_KEY);
  } catch {
    // Res a esborrar.
  }
  clearSession();
  demoNavigation.restart();
}

export function resetDemo(): void {
  try {
    storage()?.removeItem(DEMO_DB_KEY);
  } catch {
    // Res a esborrar.
  }
  clearSession();
  demoNavigation.restart();
}
