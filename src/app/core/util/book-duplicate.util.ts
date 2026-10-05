/**
 * Detección de "¿ya tengo este libro?" al añadir uno nuevo. Es deliberadamente
 * una heurística con límites claros, no una coincidencia exacta:
 *
 * - Mismo título normalizado (sin acentos/mayúsculas/puntuación) → coincide,
 *   sea cual sea el autor. Cubre reediciones, mayúsculas distintas, etc.
 * - Mismo autor normalizado + solapamiento alto de palabras del título →
 *   coincide. Cubre variaciones de subtítulo/edición de un mismo libro.
 *
 * Lo que esto NO puede detectar de forma fiable: una traducción con un
 * título completamente distinto en otro idioma (p. ej. "1984" vs "Mil
 * novecientos ochenta y cuatro") — eso necesitaría un identificador de "obra"
 * compartido entre ediciones (Open Library lo tiene a nivel de dato, pero
 * Shelfy no lo guarda todavía), no comparación de texto.
 */

export interface OwnedBookRef {
  id: number;
  title: string;
  author: string | null;
}

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'e', 'o', 'a', 'en',
  'the', 'of', 'and',
]);

export function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function significantWords(normalized: string): Set<string> {
  return new Set(normalized.split(' ').filter((word) => word.length > 2 && !STOPWORDS.has(word)));
}

function titleOverlapRatio(a: string, b: string): number {
  const wordsA = significantWords(a);
  const wordsB = significantWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      shared++;
    }
  }
  return shared / Math.min(wordsA.size, wordsB.size);
}

export function findLikelyDuplicate(
  candidateTitle: string,
  candidateAuthor: string | null | undefined,
  owned: readonly OwnedBookRef[],
): OwnedBookRef | null {
  const title = candidateTitle?.trim();
  if (!title) {
    return null;
  }
  const normTitle = normalizeForMatch(title);
  const normAuthor = candidateAuthor?.trim() ? normalizeForMatch(candidateAuthor) : null;

  for (const book of owned) {
    const bookNormTitle = normalizeForMatch(book.title);
    if (normTitle === bookNormTitle) {
      return book;
    }

    const bookNormAuthor = book.author?.trim() ? normalizeForMatch(book.author) : null;
    if (
      normAuthor &&
      bookNormAuthor &&
      normAuthor === bookNormAuthor &&
      titleOverlapRatio(normTitle, bookNormTitle) >= 0.6
    ) {
      return book;
    }
  }
  return null;
}
