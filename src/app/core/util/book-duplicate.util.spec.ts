import { OwnedBookRef, findLikelyDuplicate } from './book-duplicate.util';

describe('findLikelyDuplicate', () => {
  const owned: OwnedBookRef[] = [
    { id: 1, title: 'Cien años de soledad', author: 'Gabriel García Márquez' },
    { id: 2, title: 'El nombre del viento', author: 'Patrick Rothfuss' },
  ];

  it('matches the same title regardless of accents, case or punctuation', () => {
    const match = findLikelyDuplicate('cien anos de soledad', 'Otro autor', owned);

    expect(match?.id).toBe(1);
  });

  it('matches a same-author edition with a different subtitle', () => {
    const match = findLikelyDuplicate(
      'El nombre del viento: Crónica del asesino de reyes, día 1',
      'Patrick Rothfuss',
      owned,
    );

    expect(match?.id).toBe(2);
  });

  it('does not flag a different book by the same author as a duplicate', () => {
    const match = findLikelyDuplicate('El temor de un hombre sabio', 'Patrick Rothfuss', owned);

    expect(match).toBeNull();
  });

  it('does not flag an unrelated book as a duplicate', () => {
    const match = findLikelyDuplicate('1984', 'George Orwell', owned);

    expect(match).toBeNull();
  });

  it('returns null for an empty title', () => {
    expect(findLikelyDuplicate('', 'Someone', owned)).toBeNull();
  });
});
