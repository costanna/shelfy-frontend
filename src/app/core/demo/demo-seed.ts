import { BookFormat, BookStatus } from '../models/book.model';
import { Language } from '../models/user.model';
import { DEMO_PASSWORD, DEMO_READERS } from './demo';

/**
 * Dades d'exemple de la demo. Tres lectors que se segueixen (Laia ↔ Pau, Laia ↔ Mar), perquè el
 * feed, les recomanacions i les notificacions tinguin contingut. Les categories i els textos de
 * les ressenyes segueixen l'idioma de l'app en crear la demo (el francès fa servir l'anglès).
 */

export interface DbUser {
  id: number;
  email: string;
  password: string;
  name: string;
  alias: string | null;
  themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
  languagePreference: Language;
  avatarUpdatedAt: string | null;
  avatarDataUrl: string | null;
  remindersEnabled: boolean;
  reminderHour: number;
}

export interface DbCategory {
  id: number;
  ownerId: number;
  name: string;
}

export interface DbBook {
  id: number;
  ownerId: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  isbn: string | null;
  synopsis: string | null;
  pageCount: number | null;
  currentPage: number | null;
  series: string | null;
  seriesPosition: number | null;
  format: BookFormat | null;
  status: BookStatus;
  startedAt: string | null;
  finishedAt: string | null;
  categoryIds: number[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DbReadEvent {
  id: number;
  bookId: number;
  startedAt: string | null;
  finishedAt: string;
}

export interface DbReview {
  id: number;
  bookId: number;
  userId: number;
  rating: number;
  text: string | null;
  createdAt: string;
}

export interface DbComment {
  id: number;
  reviewId: number;
  userId: number;
  text: string;
  createdAt: string;
}

export interface DbNote {
  id: number;
  bookId: number;
  userId: number;
  content: string;
  pageReference: number | null;
  createdAt: string;
}

export interface DemoDb {
  version: number;
  seq: number;
  users: DbUser[];
  categories: DbCategory[];
  books: DbBook[];
  readEvents: DbReadEvent[];
  reviews: DbReview[];
  reviewLikes: { reviewId: number; userId: number }[];
  comments: DbComment[];
  notes: DbNote[];
  readingLog: { ownerId: number; bookId: number; date: string }[];
  goals: { ownerId: number; year: number; targetBooks: number }[];
  follows: { followerId: number; followedId: number; createdAt: string }[];
  notifications: {
    id: number;
    recipientId: number;
    actorId: number;
    type: string;
    readAt: string | null;
    createdAt: string;
  }[];
}

export const DEMO_DB_VERSION = 1;

type Lang = 'es' | 'ca' | 'en' | 'fr';
interface Localized {
  es: string;
  ca: string;
  en: string;
}
const pick = (text: Localized, lang: Lang) => (lang === 'fr' ? text.en : text[lang]);

/** Les mateixes categories de fàbrica que CategoryService del backend. */
export const DEFAULT_CATEGORIES: { key: string; es: string; ca: string; en: string; fr: string }[] =
  [
    { key: 'fiction', es: 'Ficción', ca: 'Ficció', en: 'Fiction', fr: 'Fiction' },
    { key: 'non-fiction', es: 'No ficción', ca: 'No-ficció', en: 'Non-fiction', fr: 'Non-fiction' },
    { key: 'fantasy', es: 'Fantasía', ca: 'Fantasia', en: 'Fantasy', fr: 'Fantasy' },
    {
      key: 'sci-fi',
      es: 'Ciencia ficción',
      ca: 'Ciència-ficció',
      en: 'Science fiction',
      fr: 'Science-fiction',
    },
    {
      key: 'mystery-thriller',
      es: 'Misterio y thriller',
      ca: 'Misteri i thriller',
      en: 'Mystery & thriller',
      fr: 'Mystère et thriller',
    },
    { key: 'romance', es: 'Romance', ca: 'Romance', en: 'Romance', fr: 'Romance' },
    { key: 'biography', es: 'Biografía', ca: 'Biografia', en: 'Biography', fr: 'Biographie' },
    { key: 'poetry', es: 'Poesía', ca: 'Poesia', en: 'Poetry', fr: 'Poésie' },
    { key: 'history', es: 'Historia', ca: 'Història', en: 'History', fr: 'Histoire' },
    { key: 'science', es: 'Ciencia', ca: 'Ciència', en: 'Science', fr: 'Sciences' },
    { key: 'children', es: 'Infantil', ca: 'Infantil', en: 'Children', fr: 'Jeunesse' },
    { key: 'young-adult', es: 'Juvenil', ca: 'Juvenil', en: 'Young adult', fr: 'Young adult' },
    { key: 'theatre', es: 'Teatro', ca: 'Teatre', en: 'Theatre', fr: 'Théâtre' },
    {
      key: 'comics-manga',
      es: 'Cómic y manga',
      ca: 'Còmic i manga',
      en: 'Comics & manga',
      fr: 'BD et mangas',
    },
    { key: 'classics', es: 'Clásicos', ca: 'Clàssics', en: 'Classics', fr: 'Classiques' },
    { key: 'horror', es: 'Terror', ca: 'Terror', en: 'Horror', fr: 'Horreur' },
  ];

const cover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

interface SeedBook {
  owner: 'laia' | 'pau' | 'mar';
  title: string;
  author: string;
  isbn: string;
  pages: number;
  status: BookStatus;
  started?: number; // dies enrere
  finished?: number;
  currentPage?: number;
  series?: string;
  seriesPosition?: number;
  format?: BookFormat;
  categories: string[]; // claus de DEFAULT_CATEGORIES
  createdDaysAgo: number;
  review?: { rating: number; daysAgo: number; text: Localized };
  pastReads?: { started: number; finished: number }[];
}

const SEED_BOOKS: SeedBook[] = [
  // Laia: la usuària principal de la demo
  {
    owner: 'laia',
    title: 'El nombre del viento',
    author: 'Patrick Rothfuss',
    isbn: '9788401337208',
    pages: 880,
    status: 'READ',
    started: 140,
    finished: 118,
    series: 'Crónica del asesino de reyes',
    seriesPosition: 1,
    format: 'PHYSICAL',
    categories: ['fantasy', 'fiction'],
    createdDaysAgo: 150,
    review: {
      rating: 5,
      daysAgo: 117,
      text: {
        es: 'La mejor fantasía que he leído en años: Kvothe narra con una voz que no se olvida.',
        ca: 'La millor fantasia que he llegit en anys: en Kvothe explica amb una veu que no s’oblida.',
        en: 'The best fantasy I have read in years: Kvothe tells his story in an unforgettable voice.',
      },
    },
  },
  {
    owner: 'laia',
    title: 'El temor de un hombre sabio',
    author: 'Patrick Rothfuss',
    isbn: '9788401339639',
    pages: 1200,
    status: 'READING',
    started: 12,
    currentPage: 420,
    series: 'Crónica del asesino de reyes',
    seriesPosition: 2,
    format: 'EBOOK',
    categories: ['fantasy', 'fiction'],
    createdDaysAgo: 40,
  },
  {
    owner: 'laia',
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '9788497596824',
    pages: 784,
    status: 'READ',
    started: 60,
    finished: 41,
    format: 'PHYSICAL',
    categories: ['sci-fi', 'classics'],
    createdDaysAgo: 700,
    pastReads: [{ started: 720, finished: 690 }],
    review: {
      rating: 4,
      daysAgo: 40,
      text: {
        es: 'Relectura y sigue funcionando: denso al principio, pero Arrakis te atrapa.',
        ca: 'Rellegit i continua funcionant: dens al principi, però Arrakis t’atrapa.',
        en: 'A reread and it still works: dense at first, but Arrakis pulls you in.',
      },
    },
  },
  {
    owner: 'laia',
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    isbn: '9788497592208',
    pages: 496,
    status: 'READ',
    started: 32,
    finished: 16,
    format: 'PHYSICAL',
    categories: ['classics', 'fiction'],
    createdDaysAgo: 35,
  },
  {
    owner: 'laia',
    title: 'El problema de los tres cuerpos',
    author: 'Liu Cixin',
    isbn: '9788466659734',
    pages: 416,
    status: 'READING',
    started: 3,
    currentPage: 80,
    format: 'EBOOK',
    categories: ['sci-fi'],
    createdDaysAgo: 4,
  },
  {
    owner: 'laia',
    title: '1984',
    author: 'George Orwell',
    isbn: '9788499890944',
    pages: 352,
    status: 'READ',
    started: 230,
    finished: 214,
    format: 'PHYSICAL',
    categories: ['classics', 'sci-fi'],
    createdDaysAgo: 240,
  },
  {
    owner: 'laia',
    title: 'Sapiens. De animales a dioses',
    author: 'Yuval Noah Harari',
    isbn: '9788499926223',
    pages: 496,
    status: 'WANT_TO_READ',
    categories: ['non-fiction', 'history'],
    createdDaysAgo: 20,
  },
  {
    owner: 'laia',
    title: 'La sombra del viento',
    author: 'Carlos Ruiz Zafón',
    isbn: '9788408163435',
    pages: 576,
    status: 'WANT_TO_BUY',
    categories: ['mystery-thriller', 'fiction'],
    createdDaysAgo: 8,
  },
  // Pau
  {
    owner: 'pau',
    title: 'El Hobbit',
    author: 'J. R. R. Tolkien',
    isbn: '9788445000663',
    pages: 320,
    status: 'READ',
    started: 15,
    finished: 5,
    categories: ['fantasy', 'classics'],
    createdDaysAgo: 16,
    review: {
      rating: 4,
      daysAgo: 5,
      text: {
        es: 'Una aventura redonda. Bilbo y Smaug en su mejor momento.',
        ca: 'Una aventura rodona. En Bilbo i l’Smaug en el seu millor moment.',
        en: 'A perfectly rounded adventure. Bilbo and Smaug at their best.',
      },
    },
  },
  {
    owner: 'pau',
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '9788497596824',
    pages: 784,
    status: 'READING',
    started: 2,
    currentPage: 150,
    categories: ['sci-fi'],
    createdDaysAgo: 3,
  },
  {
    owner: 'pau',
    title: 'Los juegos del hambre',
    author: 'Suzanne Collins',
    isbn: '9788427202122',
    pages: 400,
    status: 'READ',
    started: 30,
    finished: 22,
    categories: ['young-adult', 'sci-fi'],
    createdDaysAgo: 31,
    review: {
      rating: 3,
      daysAgo: 22,
      text: {
        es: 'Se lee muy rápido, aunque el triángulo amoroso me sobra.',
        ca: 'Es llegeix molt de pressa, tot i que el triangle amorós em sobra.',
        en: 'A very quick read, although I could do without the love triangle.',
      },
    },
  },
  {
    owner: 'pau',
    title: 'Fahrenheit 451',
    author: 'Ray Bradbury',
    isbn: '9788490321478',
    pages: 176,
    status: 'WANT_TO_READ',
    categories: ['classics', 'sci-fi'],
    createdDaysAgo: 10,
  },
  // Mar
  {
    owner: 'mar',
    title: 'Harry Potter y la piedra filosofal',
    author: 'J. K. Rowling',
    isbn: '9788478884452',
    pages: 256,
    status: 'READ',
    started: 9,
    finished: 2,
    categories: ['fantasy', 'young-adult'],
    createdDaysAgo: 10,
    review: {
      rating: 5,
      daysAgo: 2,
      text: {
        es: 'Releerlo de adulta es todavía mejor. Hogwarts siempre será casa.',
        ca: 'Rellegir-lo de gran és encara millor. Hogwarts sempre serà casa.',
        en: 'Rereading it as an adult is even better. Hogwarts will always be home.',
      },
    },
  },
  {
    owner: 'mar',
    title: 'Rayuela',
    author: 'Julio Cortázar',
    isbn: '9788420437484',
    pages: 736,
    status: 'READING',
    started: 1,
    currentPage: 60,
    categories: ['classics', 'fiction'],
    createdDaysAgo: 1,
  },
  {
    owner: 'mar',
    title: 'El principito',
    author: 'Antoine de Saint-Exupéry',
    isbn: '9788498381498',
    pages: 96,
    status: 'READ',
    started: 31,
    finished: 30,
    categories: ['classics', 'children'],
    createdDaysAgo: 32,
  },
  {
    owner: 'mar',
    title: 'Sapiens. De animales a dioses',
    author: 'Yuval Noah Harari',
    isbn: '9788499926223',
    pages: 496,
    status: 'READ',
    started: 25,
    finished: 11,
    categories: ['non-fiction', 'history'],
    createdDaysAgo: 26,
    review: {
      rating: 4,
      daysAgo: 11,
      text: {
        es: 'Te cambia la forma de mirar la historia de la humanidad.',
        ca: 'Et canvia la manera de mirar la història de la humanitat.',
        en: 'It changes how you look at the history of humankind.',
      },
    },
  },
];

const day = (daysAgo: number, now: Date) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const instant = (daysAgo: number, now: Date, hour = 19) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function createInitialDb(language: Language, now = new Date()): DemoDb {
  const lang: Lang = language;
  const db: DemoDb = {
    version: DEMO_DB_VERSION,
    seq: 0,
    users: [],
    categories: [],
    books: [],
    readEvents: [],
    reviews: [],
    reviewLikes: [],
    comments: [],
    notes: [],
    readingLog: [],
    goals: [],
    follows: [],
    notifications: [],
  };
  const next = () => ++db.seq;
  const userIds = new Map<string, number>();

  for (const reader of DEMO_READERS) {
    const id = next();
    userIds.set(reader.key, id);
    db.users.push({
      id,
      email: reader.email,
      password: DEMO_PASSWORD,
      name: reader.name,
      alias: reader.alias,
      themePreference: 'SYSTEM',
      languagePreference: language,
      avatarUpdatedAt: null,
      avatarDataUrl: null,
      remindersEnabled: false,
      reminderHour: 20,
    });
  }

  // Cada lector comença amb les categories de fàbrica, com en registrar-se.
  const categoryIds = new Map<string, number>();
  for (const [key, ownerId] of userIds) {
    for (const def of DEFAULT_CATEGORIES) {
      const id = next();
      categoryIds.set(`${key}:${def.key}`, id);
      db.categories.push({ id, ownerId, name: def[lang] });
    }
  }

  for (const seed of SEED_BOOKS) {
    const id = next();
    const ownerId = userIds.get(seed.owner)!;
    db.books.push({
      id,
      ownerId,
      title: seed.title,
      author: seed.author,
      coverUrl: cover(seed.isbn),
      isbn: seed.isbn,
      synopsis: null,
      pageCount: seed.pages,
      currentPage: seed.currentPage ?? null,
      series: seed.series ?? null,
      seriesPosition: seed.seriesPosition ?? null,
      format: seed.format ?? null,
      status: seed.status,
      startedAt: seed.started !== undefined ? day(seed.started, now) : null,
      finishedAt: seed.finished !== undefined ? day(seed.finished, now) : null,
      categoryIds: seed.categories.map((key) => categoryIds.get(`${seed.owner}:${key}`)!),
      createdAt: instant(seed.createdDaysAgo, now, 10),
      updatedAt: instant(
        Math.min(seed.createdDaysAgo, seed.finished ?? seed.started ?? seed.createdDaysAgo),
        now,
        21,
      ),
      deletedAt: null,
    });
    for (const past of seed.pastReads ?? []) {
      db.readEvents.push({
        id: next(),
        bookId: id,
        startedAt: day(past.started, now),
        finishedAt: day(past.finished, now),
      });
    }
    if (seed.review) {
      db.reviews.push({
        id: next(),
        bookId: id,
        userId: ownerId,
        rating: seed.review.rating,
        text: pick(seed.review.text, lang),
        createdAt: instant(seed.review.daysAgo, now, 22),
      });
    }
  }

  const laia = userIds.get('laia')!;
  const pau = userIds.get('pau')!;
  const mar = userIds.get('mar')!;

  db.follows.push(
    { followerId: laia, followedId: pau, createdAt: instant(60, now) },
    { followerId: laia, followedId: mar, createdAt: instant(30, now) },
    { followerId: pau, followedId: laia, createdAt: instant(20, now) },
    { followerId: mar, followedId: laia, createdAt: instant(1, now) },
  );
  db.notifications.push(
    {
      id: next(),
      recipientId: laia,
      actorId: pau,
      type: 'NEW_FOLLOWER',
      readAt: instant(19, now),
      createdAt: instant(20, now),
    },
    {
      id: next(),
      recipientId: laia,
      actorId: mar,
      type: 'NEW_FOLLOWER',
      readAt: null,
      createdAt: instant(1, now),
    },
  );

  // Interacció amb la ressenya de Laia d'"El nombre del viento"
  const windReview = db.reviews.find(
    (r) =>
      r.userId === laia &&
      db.books.find((b) => b.id === r.bookId)?.title === 'El nombre del viento',
  )!;
  db.reviewLikes.push({ reviewId: windReview.id, userId: mar });
  db.comments.push({
    id: next(),
    reviewId: windReview.id,
    userId: pau,
    createdAt: instant(100, now),
    text: pick(
      {
        es: '¡Me lo apunto para este verano!',
        ca: 'M’ho apunto per aquest estiu!',
        en: 'Adding it to my summer list!',
      },
      lang,
    ),
  });

  // Laia està llegint "El temor…": notes i una ratxa de dies llegint
  const fear = db.books.find(
    (b) => b.ownerId === laia && b.title === 'El temor de un hombre sabio',
  )!;
  const threeBodies = db.books.find(
    (b) => b.ownerId === laia && b.title === 'El problema de los tres cuerpos',
  )!;
  db.notes.push(
    {
      id: next(),
      bookId: fear.id,
      userId: laia,
      pageReference: 212,
      createdAt: instant(8, now, 23),
      content: pick(
        {
          es: 'La escena en la Universidad con Elodin, genial.',
          ca: 'L’escena a la Universitat amb l’Elodin, genial.',
          en: 'The University scene with Elodin is brilliant.',
        },
        lang,
      ),
    },
    {
      id: next(),
      bookId: fear.id,
      userId: laia,
      pageReference: 398,
      createdAt: instant(1, now, 23),
      content: pick(
        {
          es: 'Apuntar: buscar el mapa de los Cuatro Rincones.',
          ca: 'Apuntar: buscar el mapa dels Quatre Racons.',
          en: 'Note to self: look up the map of the Four Corners.',
        },
        lang,
      ),
    },
  );
  for (const daysAgo of [0, 1, 2, 3, 4, 6, 7]) {
    db.readingLog.push({ ownerId: laia, bookId: fear.id, date: day(daysAgo, now) });
  }
  for (const daysAgo of [0, 2]) {
    db.readingLog.push({ ownerId: laia, bookId: threeBodies.id, date: day(daysAgo, now) });
  }
  db.goals.push({ ownerId: laia, year: now.getFullYear(), targetBooks: 24 });

  return db;
}
