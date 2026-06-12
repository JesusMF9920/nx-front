/**
 * Genera una contraseña temporal fuerte y aleatoria (cliente). El admin la
 * copia y la comparte en privado; el usuario la cambia en su primer ingreso.
 * Usa crypto.getRandomValues (sin sesgo de módulo) y garantiza al menos un
 * carácter de cada clase para cumplir reglas comunes.
 */
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // sin l/o (confusión visual)
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I/O
const DIGIT = "23456789"; // sin 0/1
const SYMBOL = "!@#$%*?-_";
const ALL = LOWER + UPPER + DIGIT + SYMBOL;

function pick(chars: string): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return chars[arr[0] % chars.length];
}

function shuffle(items: string[]): string[] {
  // Fisher–Yates con bytes aleatorios.
  for (let i = items.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function generateTempPassword(length = 16): string {
  const out = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMBOL)];
  while (out.length < length) out.push(pick(ALL));
  return shuffle(out).join("");
}
