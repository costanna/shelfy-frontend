import { BOOK_STATUSES, BookStatus } from '../models/book.model';
import { Language } from '../models/user.model';
import { DEMO_DB_KEY, isDemoChosen } from './demo';
import {
  DEFAULT_CATEGORIES,
  DEMO_DB_VERSION,
  DbBook,
  DbUser,
  DemoDb,
  createInitialDb,
} from './demo-seed';

/**
 * Substitut de l'API de Shelfy dins del navegador, per a la demo: les mateixes rutes, formes de
 * resposta, regles i missatges d'error que els serveis del backend (BookService, ReviewService,
 * FeedService, ReadingLogService…), perquè la UI no noti la diferència.
 */

export class DemoApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface DemoResponse {
  status: number;
  body: unknown;
}

const LANGUAGES: Language[] = ['ca', 'es', 'en', 'fr'];
const TOKEN_LIFETIME_MS = 30 * 24 * 3600 * 1000;

const notFound = (resource: string, id: unknown) =>
  new DemoApiError(404, `${resource} no encontrado con id ${id}`);
const badRequest = (message: string) => new DemoApiError(400, message);
const conflict = (message: string) => new DemoApiError(409, message);

// ---- dades ----

let db: DemoDb | null = null;

function currentLanguage(): Language {
  try {
    const stored = localStorage.getItem('shelfy.lang') as Language | null;
    if (stored && LANGUAGES.includes(stored)) return stored;
  } catch {
    // Es fa servir l'idioma del navegador.
  }
  const browser = navigator.language?.slice(0, 2) as Language;
  return LANGUAGES.includes(browser) ? browser : 'es';
}

function load(): DemoDb {
  if (db) return db;
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_DB_KEY) ?? 'null') as DemoDb | null;
    if (saved?.version === DEMO_DB_VERSION) {
      db = saved;
      return db;
    }
  } catch {
    // Còpia malmesa: es tornen a fer servir les dades d'exemple.
  }
  db = createInitialDb(currentLanguage());
  return db;
}

function save(): void {
  if (!db || !isDemoChosen()) return;
  try {
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
  } catch {
    // Emmagatzematge ple o blocat: la demo segueix funcionant, però sense memòria.
  }
}

/** Per als tests: oblida la còpia en memòria perquè la següent petició la torni a llegir. */
export function resetDemoServer(): void {
  db = null;
}

const next = () => ++load().seq;

// ---- dates (LocalDate "YYYY-MM-DD", Instant ISO) ----

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toLocalDate(new Date());
const now = () => new Date().toISOString();
const dateValue = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const daysBetween = (from: string, to: string) =>
  Math.round((dateValue(to) - dateValue(from)) / 86_400_000);
const startOfDayInstant = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
};

// ---- sessió (token amb forma de JWT: AuthService en llegeix la caducitat) ----

const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function tokenFor(user: DbUser): string {
  const exp = Math.floor((Date.now() + TOKEN_LIFETIME_MS) / 1000);
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: String(user.id), exp })}.demo`;
}

function viewerFrom(token: string | null): DbUser {
  try {
    const payload = JSON.parse(
      atob((token ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    const user = load().users.find((u) => u.id === Number(payload.sub));
    if (user) return user;
  } catch {
    // Token absent o il·legible.
  }
  throw new DemoApiError(401, 'Necesitas iniciar sesión');
}

// ---- formes de resposta ----

const toUser = (u: DbUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  alias: u.alias,
  themePreference: u.themePreference,
  languagePreference: u.languagePreference,
  avatarUpdatedAt: u.avatarUpdatedAt,
  remindersEnabled: u.remindersEnabled,
  reminderHour: u.reminderHour,
});

const categoriesOf = (book: DbBook) =>
  load()
    .categories.filter((c) => book.categoryIds.includes(c.id))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map((c) => ({ id: c.id, name: c.name }));

const toBook = (b: DbBook) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  coverUrl: b.coverUrl,
  isbn: b.isbn,
  synopsis: b.synopsis,
  pageCount: b.pageCount,
  currentPage: b.currentPage,
  series: b.series,
  seriesPosition: b.seriesPosition,
  format: b.format,
  status: b.status,
  startedAt: b.startedAt,
  finishedAt: b.finishedAt,
  readHistory: load()
    .readEvents.filter((e) => e.bookId === b.id)
    .sort((x, y) => y.finishedAt.localeCompare(x.finishedAt))
    .map((e) => ({ startedAt: e.startedAt, finishedAt: e.finishedAt })),
  categories: categoriesOf(b),
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

function page<T>(items: T[], pageNumber: number, size: number) {
  const totalPages = Math.ceil(items.length / size);
  return {
    content: items.slice(pageNumber * size, pageNumber * size + size),
    page: pageNumber,
    size,
    totalElements: items.length,
    totalPages,
    last: pageNumber >= totalPages - 1,
  };
}

const userById = (id: number) => load().users.find((u) => u.id === id);
const isFollowing = (followerId: number, followedId: number) =>
  load().follows.some((f) => f.followerId === followerId && f.followedId === followedId);
const followersCount = (id: number) => load().follows.filter((f) => f.followedId === id).length;

const reviewResponse = (reviewId: number, viewerId: number) => {
  const r = load().reviews.find((x) => x.id === reviewId)!;
  const likes = load().reviewLikes.filter((l) => l.reviewId === r.id);
  return {
    id: r.id,
    rating: r.rating,
    text: r.text,
    createdAt: r.createdAt,
    bookId: r.bookId,
    authorName: userById(r.userId)?.name ?? '',
    likesCount: likes.length,
    likedByMe: likes.some((l) => l.userId === viewerId),
  };
};

// ---- regles compartides ----

function ownedBook(ownerId: number, id: unknown): DbBook {
  const book = load().books.find(
    (b) => b.id === Number(id) && b.ownerId === ownerId && !b.deletedAt,
  );
  if (!book) throw notFound('Libro', id);
  return book;
}

function touch(book: DbBook): void {
  book.updatedAt = now();
}

function setStatus(book: DbBook, status: BookStatus): void {
  if (book.status !== status) book.status = status;
}

// BookService.archivePreviousRead
function archivePreviousRead(
  book: DbBook,
  previousStatus: BookStatus,
  startedAt: string | null,
  finishedAt: string | null,
): void {
  if (previousStatus === 'READ' && finishedAt) {
    load().readEvents.push({ id: next(), bookId: book.id, startedAt, finishedAt });
    book.currentPage = null;
  }
}

const clampPage = (currentPage: number | null, pageCount: number | null) =>
  currentPage !== null && pageCount !== null && currentPage > pageCount ? pageCount : currentPage;

const numberOrNull = (value: unknown) =>
  value === null || value === undefined || value === '' ? null : Number(value);
const textOrNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);

// BookService.applyRequest
function applyBookRequest(book: DbBook, body: Record<string, unknown>, ownerId: number): void {
  const title = String(body['title'] ?? '').trim();
  if (!title) throw badRequest('El título es obligatorio');
  const status = body['status'] as BookStatus;
  if (!BOOK_STATUSES.includes(status)) throw badRequest('El estado es obligatorio');
  const previousStatus = book.status;
  const previousStartedAt = book.startedAt;
  const previousFinishedAt = book.finishedAt;
  const pageCount = numberOrNull(body['pageCount']);
  Object.assign(book, {
    title,
    author: textOrNull(body['author']),
    coverUrl: textOrNull(body['coverUrl']),
    isbn: textOrNull(body['isbn']),
    synopsis: textOrNull(body['synopsis']),
    pageCount,
    currentPage: clampPage(numberOrNull(body['currentPage']), pageCount),
    series: textOrNull(body['series']),
    seriesPosition: numberOrNull(body['seriesPosition']),
    format: body['format'] ?? null,
  });
  if (previousStatus === 'READ' && status !== 'READ') {
    archivePreviousRead(book, previousStatus, previousStartedAt, previousFinishedAt);
  }
  setStatus(book, status);
  book.startedAt = textOrNull(body['startedAt']);
  book.finishedAt = textOrNull(body['finishedAt']);
  const requested = ((body['categoryIds'] as number[] | undefined) ?? []).map(Number);
  book.categoryIds = load()
    .categories.filter((c) => c.ownerId === ownerId && requested.includes(c.id))
    .map((c) => c.id);
  if (book.status === 'WANT_TO_READ' || book.status === 'WANT_TO_BUY') book.currentPage = null;
  touch(book);
}

function hardDeleteBook(bookId: number): void {
  const data = load();
  const reviewIds = data.reviews.filter((r) => r.bookId === bookId).map((r) => r.id);
  data.reviewLikes = data.reviewLikes.filter((l) => !reviewIds.includes(l.reviewId));
  data.comments = data.comments.filter((c) => !reviewIds.includes(c.reviewId));
  data.reviews = data.reviews.filter((r) => r.bookId !== bookId);
  data.notes = data.notes.filter((n) => n.bookId !== bookId);
  data.readEvents = data.readEvents.filter((e) => e.bookId !== bookId);
  data.readingLog = data.readingLog.filter((l) => l.bookId !== bookId);
  data.books = data.books.filter((b) => b.id !== bookId);
}

// ReviewService.findVisible: la teva o d'algú que segueixes
function visibleReview(viewerId: number, reviewId: unknown) {
  const review = load().reviews.find((r) => r.id === Number(reviewId));
  if (!review || (review.userId !== viewerId && !isFollowing(viewerId, review.userId))) {
    throw notFound('Reseña', reviewId);
  }
  return review;
}

function notify(recipientId: number, actorId: number, type: string): void {
  load().notifications.push({
    id: next(),
    recipientId,
    actorId,
    type,
    readAt: null,
    createdAt: now(),
  });
}

const activeBooks = (ownerId: number) =>
  load().books.filter((b) => b.ownerId === ownerId && !b.deletedAt);

function booksReadInYear(ownerId: number, year: number): number {
  const ids = new Set(activeBooks(ownerId).map((b) => b.id));
  const current = activeBooks(ownerId).filter(
    (b) => b.status === 'READ' && b.finishedAt?.startsWith(String(year)),
  ).length;
  const archived = load().readEvents.filter(
    (e) => ids.has(e.bookId) && e.finishedAt.startsWith(String(year)),
  ).length;
  return current + archived;
}

// ReadingLogService.currentStreak / longestStreak
function streaks(dates: string[]) {
  const desc = [...new Set(dates)].sort().reverse();
  if (desc.length === 0) return { currentStreak: 0, longestStreak: 0 };
  let current = 0;
  if (daysBetween(desc[0], today()) <= 1) {
    current = 1;
    for (let i = 1; i < desc.length && daysBetween(desc[i], desc[i - 1]) === 1; i++) current++;
  }
  const asc = [...desc].reverse();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < asc.length; i++) {
    run = daysBetween(asc[i - 1], asc[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { currentStreak: current, longestStreak: longest };
}

const SORTS: Record<string, (a: DbBook, b: DbBook) => number> = {
  'createdAt,desc': (a, b) => b.createdAt.localeCompare(a.createdAt),
  'title,asc': (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  'author,asc': (a, b) =>
    (a.author ?? '￿').localeCompare(b.author ?? '￿', undefined, { sensitivity: 'base' }),
  'pageCount,desc': (a, b) => (b.pageCount ?? -1) - (a.pageCount ?? -1),
};

// ---- CSV (BookCsvService) ----

const CSV_HEADER = [
  'title',
  'author',
  'isbn',
  'status',
  'pageCount',
  'series',
  'seriesPosition',
  'format',
  'startedAt',
  'finishedAt',
  'categories',
  'synopsis',
];
const csvEscape = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

function importCsv(ownerId: number, text: string) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = (row: string[], name: string) => {
    const index = header.indexOf(name.toLowerCase());
    const value = index >= 0 ? row[index]?.trim() : '';
    return value ? value : null;
  };
  let imported = 0;
  let skipped = 0;
  const messages: string[] = [];
  if (!header.includes('title')) {
    return { imported: 0, skipped: 0, messages: ['Falta la columna obligatoria "title".'] };
  }
  rows.slice(1).forEach((row, i) => {
    const rowNumber = i + 2;
    const title = col(row, 'title');
    if (!title) {
      skipped++;
      messages.push(`Fila ${rowNumber}: omitida, falta el título.`);
      return;
    }
    let status = (col(row, 'status') ?? 'WANT_TO_READ')
      .toUpperCase()
      .replace(/ /g, '_') as BookStatus;
    if (!BOOK_STATUSES.includes(status)) {
      messages.push(
        `Fila ${rowNumber}: estado '${col(row, 'status')}' no válido, se usa WANT_TO_READ.`,
      );
      status = 'WANT_TO_READ';
    }
    const categoryIds = (col(row, 'categories') ?? '')
      .split(';')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => {
        const existing = load().categories.find(
          (c) => c.ownerId === ownerId && c.name.toLowerCase() === name.toLowerCase(),
        );
        if (existing) return existing.id;
        const id = next();
        load().categories.push({ id, ownerId, name });
        return id;
      });
    const created = now();
    load().books.push({
      id: next(),
      ownerId,
      title,
      author: col(row, 'author'),
      coverUrl: null,
      isbn: col(row, 'isbn'),
      synopsis: col(row, 'synopsis'),
      pageCount: numberOrNull(col(row, 'pageCount')),
      currentPage: null,
      series: col(row, 'series'),
      seriesPosition: numberOrNull(col(row, 'seriesPosition')),
      format: (col(row, 'format')?.toUpperCase() as DbBook['format']) ?? null,
      status,
      startedAt: col(row, 'startedAt'),
      finishedAt: col(row, 'finishedAt'),
      categoryIds,
      createdAt: created,
      updatedAt: created,
      deletedAt: null,
    });
    imported++;
  });
  return { imported, skipped, messages };
}

// ---- rutes ----

interface Ctx {
  match: RegExpExecArray;
  params: URLSearchParams;
  body: Record<string, unknown>;
  token: string | null;
}
type Handler = (ctx: Ctx) => unknown;

const NO_CONTENT: DemoResponse = { status: 204, body: null };

const routes: [string, RegExp, Handler][] = [
  // autenticació
  [
    'POST',
    /^\/auth\/login$/,
    ({ body }) => {
      const user = load().users.find(
        (u) =>
          u.email.toLowerCase() ===
          String(body['email'] ?? '')
            .trim()
            .toLowerCase(),
      );
      if (!user || user.password !== body['password'])
        throw new DemoApiError(401, 'Email o contraseña incorrectos');
      return {
        token: tokenFor(user),
        tokenType: 'Bearer',
        expiresIn: TOKEN_LIFETIME_MS,
        user: toUser(user),
      };
    },
  ],
  [
    'POST',
    /^\/auth\/register$/,
    ({ body }) => {
      const email = String(body['email'] ?? '').trim();
      if (load().users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw conflict('Ya existe una cuenta con ese email');
      }
      const language = currentLanguage();
      const user: DbUser = {
        id: next(),
        email,
        password: String(body['password'] ?? ''),
        name: String(body['name'] ?? '').trim() || email,
        alias: null,
        themePreference: 'SYSTEM',
        languagePreference: language,
        avatarUpdatedAt: null,
        avatarDataUrl: null,
        remindersEnabled: false,
        reminderHour: 20,
      };
      load().users.push(user);
      for (const def of DEFAULT_CATEGORIES)
        load().categories.push({ id: next(), ownerId: user.id, name: def[language] });
      // A la demo no s'envien correus: el compte queda verificat i es pot entrar de seguida.
      return { status: 201, body: { message: 'Cuenta creada', requiresVerification: false } };
    },
  ],
  [
    'POST',
    /^\/auth\/(resend-verification|forgot-password)$/,
    () => ({
      message: 'En la demo no se envían correos.',
    }),
  ],
  [
    'POST',
    /^\/auth\/reset-password$/,
    () => {
      throw badRequest('En la demo no se envían correos: el enlace no es válido.');
    },
  ],
  [
    'GET',
    /^\/auth\/verify-email$/,
    () => {
      throw badRequest('En la demo no se envían correos: el enlace no es válido.');
    },
  ],

  // usuari
  ['GET', /^\/users\/me$/, ({ token }) => toUser(viewerFrom(token))],
  [
    'PATCH',
    /^\/users\/me\/preferences$/,
    ({ token, body }) => {
      const user = viewerFrom(token);
      for (const key of [
        'themePreference',
        'languagePreference',
        'remindersEnabled',
        'reminderHour',
      ] as const) {
        if (body[key] !== undefined && body[key] !== null)
          Object.assign(user, { [key]: body[key] });
      }
      return toUser(user);
    },
  ],
  [
    'PATCH',
    /^\/users\/me\/alias$/,
    ({ token, body }) => {
      const user = viewerFrom(token);
      const alias = String(body['alias'] ?? '').trim();
      if (
        load().users.some((u) => u.id !== user.id && u.alias?.toLowerCase() === alias.toLowerCase())
      ) {
        throw conflict('Ese alias ya está en uso');
      }
      user.alias = alias;
      return toUser(user);
    },
  ],
  [
    'POST',
    /^\/users\/me\/avatar$/,
    ({ token, body }) => {
      const user = viewerFrom(token);
      user.avatarDataUrl = String(body['dataUrl']);
      user.avatarUpdatedAt = now();
      return toUser(user);
    },
  ],
  [
    'DELETE',
    /^\/users\/me\/avatar$/,
    ({ token }) => {
      const user = viewerFrom(token);
      user.avatarDataUrl = null;
      user.avatarUpdatedAt = null;
      return toUser(user);
    },
  ],
  [
    'DELETE',
    /^\/users\/me$/,
    ({ token, body }) => {
      const user = viewerFrom(token);
      if (body['password'] !== user.password) throw badRequest('Contraseña incorrecta');
      const data = load();
      for (const book of data.books.filter((b) => b.ownerId === user.id)) hardDeleteBook(book.id);
      const ownReviews = data.reviews.filter((r) => r.userId === user.id).map((r) => r.id);
      data.reviews = data.reviews.filter((r) => r.userId !== user.id);
      data.reviewLikes = data.reviewLikes.filter(
        (l) => l.userId !== user.id && !ownReviews.includes(l.reviewId),
      );
      data.comments = data.comments.filter(
        (c) => c.userId !== user.id && !ownReviews.includes(c.reviewId),
      );
      data.categories = data.categories.filter((c) => c.ownerId !== user.id);
      data.goals = data.goals.filter((g) => g.ownerId !== user.id);
      data.follows = data.follows.filter(
        (f) => f.followerId !== user.id && f.followedId !== user.id,
      );
      data.notifications = data.notifications.filter(
        (n) => n.recipientId !== user.id && n.actorId !== user.id,
      );
      data.users = data.users.filter((u) => u.id !== user.id);
      return NO_CONTENT;
    },
  ],

  // gent
  [
    'GET',
    /^\/users\/search$/,
    ({ token, params }) => {
      const viewer = viewerFrom(token);
      const query = (params.get('q') ?? params.get('query') ?? '').trim().toLowerCase();
      const found = query
        ? load().users.filter((u) => u.id !== viewer.id && u.alias?.toLowerCase().includes(query))
        : [];
      return page(
        found.map((u) => ({
          id: u.id,
          alias: u.alias,
          name: u.name,
          avatarUpdatedAt: u.avatarUpdatedAt,
          followersCount: followersCount(u.id),
          followedByMe: isFollowing(viewer.id, u.id),
        })),
        Number(params.get('page') ?? 0),
        Number(params.get('size') ?? 20),
      );
    },
  ],
  [
    'GET',
    /^\/users\/(\d+)\/profile$/,
    ({ token, match }) => {
      const viewer = viewerFrom(token);
      const target = userById(Number(match[1]));
      if (!target) throw notFound('Usuario', match[1]);
      const own = viewer.id === target.id;
      const followedByMe = own || isFollowing(viewer.id, target.id);
      const visible = own || followedByMe;
      return {
        id: target.id,
        alias: target.alias,
        name: target.name,
        avatarUpdatedAt: target.avatarUpdatedAt,
        followersCount: followersCount(target.id),
        followingCount: load().follows.filter((f) => f.followerId === target.id).length,
        followedByMe,
        own,
        visible,
        books: visible ? publicBooks(target.id).slice(0, 100) : [],
      };
    },
  ],
  [
    'GET',
    /^\/users\/(\d+)\/profile\/books$/,
    ({ token, match, params }) => {
      const viewer = viewerFrom(token);
      const targetId = Number(match[1]);
      if (!userById(targetId)) throw notFound('Usuario', targetId);
      const size = Number(params.get('size') ?? 20);
      const pageNumber = Number(params.get('page') ?? 0);
      if (viewer.id !== targetId && !isFollowing(viewer.id, targetId))
        return page([], pageNumber, size);
      return page(publicBooks(targetId), pageNumber, size);
    },
  ],
  [
    'POST',
    /^\/users\/(\d+)\/follow$/,
    ({ token, match }) => {
      const viewer = viewerFrom(token);
      const targetId = Number(match[1]);
      if (viewer.id === targetId) throw badRequest('No puedes seguirte a ti mismo');
      if (isFollowing(viewer.id, targetId)) throw conflict('Ya sigues a este usuario');
      if (!userById(targetId)) throw notFound('Usuario', targetId);
      load().follows.push({ followerId: viewer.id, followedId: targetId, createdAt: now() });
      notify(targetId, viewer.id, 'NEW_FOLLOWER');
      return NO_CONTENT;
    },
  ],
  [
    'DELETE',
    /^\/users\/(\d+)\/follow$/,
    ({ token, match }) => {
      const viewer = viewerFrom(token);
      load().follows = load().follows.filter(
        (f) => !(f.followerId === viewer.id && f.followedId === Number(match[1])),
      );
      return NO_CONTENT;
    },
  ],

  // llibres
  [
    'GET',
    /^\/books$/,
    ({ token, params }) => {
      const owner = viewerFrom(token);
      const status = params.get('status');
      const categoryId = params.get('categoryId');
      const q = (params.get('q') ?? '').trim().toLowerCase().slice(0, 100);
      const sort = SORTS[params.get('sort') ?? 'createdAt,desc'];
      if (!sort) throw badRequest(`Orden no permitido: ${params.get('sort')}`);
      const books = activeBooks(owner.id)
        .filter((b) => !status || b.status === status)
        .filter((b) => !categoryId || b.categoryIds.includes(Number(categoryId)))
        .filter(
          (b) =>
            !q || b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q),
        )
        .sort(sort);
      return page(
        books.map(toBook),
        Number(params.get('page') ?? 0),
        Number(params.get('size') ?? 12),
      );
    },
  ],
  [
    'GET',
    /^\/books\/counts$/,
    ({ token }) => {
      const books = activeBooks(viewerFrom(token).id);
      const count = (status: BookStatus) => books.filter((b) => b.status === status).length;
      return {
        wantToRead: count('WANT_TO_READ'),
        reading: count('READING'),
        read: count('READ'),
        wantToBuy: count('WANT_TO_BUY'),
      };
    },
  ],
  [
    'GET',
    /^\/books\/keys$/,
    ({ token }) =>
      activeBooks(viewerFrom(token).id).map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
      })),
  ],
  [
    'GET',
    /^\/books\/trash$/,
    ({ token, params }) => {
      const owner = viewerFrom(token);
      const deleted = load()
        .books.filter((b) => b.ownerId === owner.id && b.deletedAt)
        .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
      return page(
        deleted.map(toBook),
        Number(params.get('page') ?? 0),
        Number(params.get('size') ?? 12),
      );
    },
  ],
  ['GET', /^\/books\/recommendations$/, ({ token }) => recommendations(viewerFrom(token).id)],
  [
    'GET',
    /^\/books\/export$/,
    ({ token }) => {
      const lines = [CSV_HEADER.join(',')];
      for (const b of activeBooks(viewerFrom(token).id)) {
        lines.push(
          [
            b.title,
            b.author ?? '',
            b.isbn ?? '',
            b.status,
            b.pageCount?.toString() ?? '',
            b.series ?? '',
            b.seriesPosition?.toString() ?? '',
            b.format ?? '',
            b.startedAt ?? '',
            b.finishedAt ?? '',
            categoriesOf(b)
              .map((c) => c.name)
              .join('; '),
            b.synopsis ?? '',
          ]
            .map(csvEscape)
            .join(','),
        );
      }
      return new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    },
  ],
  [
    'POST',
    /^\/books\/import$/,
    ({ token, body }) => importCsv(viewerFrom(token).id, String(body['csv'] ?? '')),
  ],
  [
    'GET',
    /^\/books\/(\d+)$/,
    ({ token, match }) => toBook(ownedBook(viewerFrom(token).id, match[1])),
  ],
  [
    'POST',
    /^\/books$/,
    ({ token, body }) => {
      const owner = viewerFrom(token);
      const created = now();
      const book: DbBook = {
        id: next(),
        ownerId: owner.id,
        title: '',
        author: null,
        coverUrl: null,
        isbn: null,
        synopsis: null,
        pageCount: null,
        currentPage: null,
        series: null,
        seriesPosition: null,
        format: null,
        status: 'WANT_TO_READ',
        startedAt: null,
        finishedAt: null,
        categoryIds: [],
        createdAt: created,
        updatedAt: created,
        deletedAt: null,
      };
      applyBookRequest(book, body, owner.id);
      load().books.push(book);
      return { status: 201, body: toBook(book) };
    },
  ],
  [
    'PUT',
    /^\/books\/(\d+)$/,
    ({ token, match, body }) => {
      const owner = viewerFrom(token);
      const book = ownedBook(owner.id, match[1]);
      applyBookRequest(book, body, owner.id);
      return toBook(book);
    },
  ],
  [
    'DELETE',
    /^\/books\/(\d+)$/,
    ({ token, match }) => {
      ownedBook(viewerFrom(token).id, match[1]).deletedAt = now();
      return NO_CONTENT;
    },
  ],
  [
    'POST',
    /^\/books\/(\d+)\/restore$/,
    ({ token, match }) => {
      const owner = viewerFrom(token);
      const book = load().books.find((b) => b.id === Number(match[1]) && b.ownerId === owner.id);
      if (!book) throw notFound('Libro', match[1]);
      if (!book.deletedAt) throw badRequest('El libro no está en la papelera');
      book.deletedAt = null;
      return toBook(book);
    },
  ],
  [
    'DELETE',
    /^\/books\/(\d+)\/permanent$/,
    ({ token, match }) => {
      const owner = viewerFrom(token);
      const book = load().books.find((b) => b.id === Number(match[1]) && b.ownerId === owner.id);
      if (!book) throw notFound('Libro', match[1]);
      if (!book.deletedAt) throw badRequest('Primero mueve el libro a la papelera');
      hardDeleteBook(book.id);
      return NO_CONTENT;
    },
  ],
  [
    'PATCH',
    /^\/books\/(\d+)\/reading-dates$/,
    ({ token, match, body }) => {
      const book = ownedBook(viewerFrom(token).id, match[1]);
      const startedAt = textOrNull(body['startedAt']);
      const finishedAt = textOrNull(body['finishedAt']);
      if (startedAt && finishedAt && finishedAt < startedAt) {
        throw badRequest('La fecha de fin no puede ser anterior a la de inicio');
      }
      const previous = {
        status: book.status,
        startedAt: book.startedAt,
        finishedAt: book.finishedAt,
      };
      book.startedAt = startedAt;
      book.finishedAt = finishedAt;
      if (finishedAt) {
        setStatus(book, 'READ');
      } else if (startedAt) {
        if (
          previous.status === 'WANT_TO_READ' ||
          previous.status === 'WANT_TO_BUY' ||
          previous.status === 'READ'
        ) {
          archivePreviousRead(book, previous.status, previous.startedAt, previous.finishedAt);
          setStatus(book, 'READING');
        }
      } else if (previous.status === 'READ' || previous.status === 'READING') {
        setStatus(book, 'WANT_TO_READ');
        book.currentPage = null;
      }
      touch(book);
      return toBook(book);
    },
  ],
  [
    'PATCH',
    /^\/books\/(\d+)\/progress$/,
    ({ token, match, body }) => {
      const book = ownedBook(viewerFrom(token).id, match[1]);
      if (book.status === 'READ') {
        throw badRequest(
          'Este libro ya está marcado como leído; usa "Volver a leer" si quieres actualizar su progreso',
        );
      }
      book.currentPage = clampPage(numberOrNull(body['currentPage']), book.pageCount);
      if (book.status === 'WANT_TO_READ' || book.status === 'WANT_TO_BUY')
        setStatus(book, 'READING');
      if (book.status === 'READING' && !book.startedAt) book.startedAt = today();
      touch(book);
      return toBook(book);
    },
  ],
  [
    'POST',
    /^\/books\/(\d+)\/reread$/,
    ({ token, match }) => {
      const book = ownedBook(viewerFrom(token).id, match[1]);
      if (book.status !== 'READ')
        throw badRequest('Solo puedes volver a leer un libro que ya has terminado');
      archivePreviousRead(book, book.status, book.startedAt, book.finishedAt);
      setStatus(book, 'READING');
      book.startedAt = today();
      book.finishedAt = null;
      touch(book);
      return toBook(book);
    },
  ],

  // notes
  [
    'GET',
    /^\/books\/(\d+)\/notes$/,
    ({ token, match }) => {
      const book = ownedBook(viewerFrom(token).id, match[1]);
      return load()
        .notes.filter((n) => n.bookId === book.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ id, content, pageReference, createdAt, bookId }) => ({
          id,
          content,
          pageReference,
          createdAt,
          bookId,
        }));
    },
  ],
  [
    'POST',
    /^\/books\/(\d+)\/notes$/,
    ({ token, match, body }) => {
      const user = viewerFrom(token);
      const book = ownedBook(user.id, match[1]);
      const content = String(body['content'] ?? '').trim();
      if (!content) throw badRequest('La nota no puede estar vacía');
      const note = {
        id: next(),
        bookId: book.id,
        userId: user.id,
        content,
        pageReference: numberOrNull(body['pageReference']),
        createdAt: now(),
      };
      load().notes.push(note);
      return {
        status: 201,
        body: {
          id: note.id,
          content,
          pageReference: note.pageReference,
          createdAt: note.createdAt,
          bookId: book.id,
        },
      };
    },
  ],
  [
    'DELETE',
    /^\/books\/(\d+)\/notes\/(\d+)$/,
    ({ token, match }) => {
      const user = viewerFrom(token);
      ownedBook(user.id, match[1]);
      const note = load().notes.find(
        (n) => n.id === Number(match[2]) && n.bookId === Number(match[1]) && n.userId === user.id,
      );
      if (!note) throw notFound('Nota', match[2]);
      load().notes = load().notes.filter((n) => n.id !== note.id);
      return NO_CONTENT;
    },
  ],

  // ressenyes
  [
    'GET',
    /^\/books\/(\d+)\/reviews$/,
    ({ token, match }) => {
      const user = viewerFrom(token);
      const book = ownedBook(user.id, match[1]);
      return load()
        .reviews.filter((r) => r.bookId === book.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => reviewResponse(r.id, user.id));
    },
  ],
  [
    'POST',
    /^\/books\/(\d+)\/reviews$/,
    ({ token, match, body }) => {
      const user = viewerFrom(token);
      const book = ownedBook(user.id, match[1]);
      const rating = Number(body['rating']);
      if (!(rating >= 1 && rating <= 5)) throw badRequest('La valoración debe estar entre 1 y 5');
      const review = {
        id: next(),
        bookId: book.id,
        userId: user.id,
        rating,
        text: textOrNull(body['text']),
        createdAt: now(),
      };
      load().reviews.push(review);
      return { status: 201, body: reviewResponse(review.id, user.id) };
    },
  ],
  [
    'PUT',
    /^\/books\/(\d+)\/reviews\/(\d+)$/,
    ({ token, match, body }) => {
      const user = viewerFrom(token);
      ownedBook(user.id, match[1]);
      const review = load().reviews.find(
        (r) => r.id === Number(match[2]) && r.bookId === Number(match[1]) && r.userId === user.id,
      );
      if (!review) throw notFound('Reseña', match[2]);
      review.rating = Number(body['rating']);
      review.text = textOrNull(body['text']);
      return reviewResponse(review.id, user.id);
    },
  ],
  [
    'DELETE',
    /^\/books\/(\d+)\/reviews\/(\d+)$/,
    ({ token, match }) => {
      const user = viewerFrom(token);
      ownedBook(user.id, match[1]);
      const review = load().reviews.find(
        (r) => r.id === Number(match[2]) && r.bookId === Number(match[1]) && r.userId === user.id,
      );
      if (!review) throw notFound('Reseña', match[2]);
      const data = load();
      data.reviewLikes = data.reviewLikes.filter((l) => l.reviewId !== review.id);
      data.comments = data.comments.filter((c) => c.reviewId !== review.id);
      data.reviews = data.reviews.filter((r) => r.id !== review.id);
      return NO_CONTENT;
    },
  ],
  [
    'POST',
    /^\/reviews\/(\d+)\/like$/,
    ({ token, match }) => {
      const viewer = viewerFrom(token);
      const review = visibleReview(viewer.id, match[1]);
      if (!load().reviewLikes.some((l) => l.reviewId === review.id && l.userId === viewer.id)) {
        load().reviewLikes.push({ reviewId: review.id, userId: viewer.id });
        if (review.userId !== viewer.id) notify(review.userId, viewer.id, 'NEW_REVIEW_LIKE');
      }
      return reviewResponse(review.id, viewer.id);
    },
  ],
  [
    'DELETE',
    /^\/reviews\/(\d+)\/like$/,
    ({ token, match }) => {
      const viewer = viewerFrom(token);
      const review = visibleReview(viewer.id, match[1]);
      load().reviewLikes = load().reviewLikes.filter(
        (l) => !(l.reviewId === review.id && l.userId === viewer.id),
      );
      return reviewResponse(review.id, viewer.id);
    },
  ],
  [
    'GET',
    /^\/reviews\/(\d+)\/comments$/,
    ({ token, match }) => {
      const review = visibleReview(viewerFrom(token).id, match[1]);
      return load()
        .comments.filter((c) => c.reviewId === review.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((c) => ({
          id: c.id,
          text: c.text,
          createdAt: c.createdAt,
          authorId: c.userId,
          authorName: userById(c.userId)?.name ?? '',
        }));
    },
  ],
  [
    'POST',
    /^\/reviews\/(\d+)\/comments$/,
    ({ token, match, body }) => {
      const viewer = viewerFrom(token);
      const review = visibleReview(viewer.id, match[1]);
      const text = String(body['text'] ?? '').trim();
      if (!text) throw badRequest('El comentario no puede estar vacío');
      const comment = {
        id: next(),
        reviewId: review.id,
        userId: viewer.id,
        text,
        createdAt: now(),
      };
      load().comments.push(comment);
      if (review.userId !== viewer.id) notify(review.userId, viewer.id, 'NEW_REVIEW_COMMENT');
      return {
        status: 201,
        body: {
          id: comment.id,
          text,
          createdAt: comment.createdAt,
          authorId: viewer.id,
          authorName: viewer.name,
        },
      };
    },
  ],
  [
    'DELETE',
    /^\/reviews\/(\d+)\/comments\/(\d+)$/,
    ({ token, match }) => {
      const viewer = viewerFrom(token);
      visibleReview(viewer.id, match[1]);
      const comment = load().comments.find(
        (c) => c.id === Number(match[2]) && c.reviewId === Number(match[1]),
      );
      if (!comment || comment.userId !== viewer.id) throw notFound('Comentario', match[2]);
      load().comments = load().comments.filter((c) => c.id !== comment.id);
      return NO_CONTENT;
    },
  ],

  // categories
  [
    'GET',
    /^\/categories$/,
    ({ token }) => {
      const owner = viewerFrom(token);
      return load()
        .categories.filter((c) => c.ownerId === owner.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, name: c.name }));
    },
  ],
  [
    'POST',
    /^\/categories$/,
    ({ token, body }) => {
      const owner = viewerFrom(token);
      const name = String(body['name'] ?? '').trim();
      if (!name) throw badRequest('El nombre es obligatorio');
      if (
        load().categories.some(
          (c) => c.ownerId === owner.id && c.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw conflict('Ya tienes una categoría con ese nombre');
      }
      const category = { id: next(), ownerId: owner.id, name };
      load().categories.push(category);
      return { status: 201, body: { id: category.id, name } };
    },
  ],
  [
    'POST',
    /^\/categories\/seed-defaults$/,
    ({ token }) => {
      const owner = viewerFrom(token);
      const lang = owner.languagePreference;
      const own = () => load().categories.filter((c) => c.ownerId === owner.id);
      for (const def of DEFAULT_CATEGORIES) {
        const names = [def.es, def.ca, def.en, def.fr];
        const existing = own().find((c) => names.includes(c.name));
        if (!existing) load().categories.push({ id: next(), ownerId: owner.id, name: def[lang] });
        else if (existing.name !== def[lang]) existing.name = def[lang];
      }
      return own()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, name: c.name }));
    },
  ],
  [
    'PUT',
    /^\/categories\/(\d+)$/,
    ({ token, match, body }) => {
      const owner = viewerFrom(token);
      const category = load().categories.find(
        (c) => c.id === Number(match[1]) && c.ownerId === owner.id,
      );
      if (!category) throw notFound('Categoría', match[1]);
      const name = String(body['name'] ?? '').trim();
      if (
        category.name.toLowerCase() !== name.toLowerCase() &&
        load().categories.some(
          (c) => c.ownerId === owner.id && c.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw conflict('Ya tienes una categoría con ese nombre');
      }
      category.name = name;
      return { id: category.id, name };
    },
  ],
  [
    'DELETE',
    /^\/categories\/(\d+)$/,
    ({ token, match }) => {
      const owner = viewerFrom(token);
      const id = Number(match[1]);
      if (!load().categories.some((c) => c.id === id && c.ownerId === owner.id))
        throw notFound('Categoría', id);
      load().categories = load().categories.filter((c) => c.id !== id);
      for (const book of load().books) book.categoryIds = book.categoryIds.filter((c) => c !== id);
      return NO_CONTENT;
    },
  ],

  // feed i notificacions
  [
    'GET',
    /^\/feed$/,
    ({ token, params }) =>
      feed(viewerFrom(token).id, Number(params.get('limit') ?? 30), params.get('before')),
  ],
  [
    'GET',
    /^\/notifications$/,
    ({ token, params }) => {
      const user = viewerFrom(token);
      const items = load()
        .notifications.filter((n) => n.recipientId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n) => {
          const actor = userById(n.actorId);
          return {
            id: n.id,
            type: n.type,
            actorId: n.actorId,
            actorAlias: actor?.alias ?? null,
            actorName: actor?.name ?? '',
            read: n.readAt !== null,
            createdAt: n.createdAt,
          };
        });
      return page(items, Number(params.get('page') ?? 0), Number(params.get('size') ?? 10));
    },
  ],
  [
    'GET',
    /^\/notifications\/unread-count$/,
    ({ token }) => {
      const user = viewerFrom(token);
      return {
        count: load().notifications.filter((n) => n.recipientId === user.id && !n.readAt).length,
      };
    },
  ],
  [
    'POST',
    /^\/notifications\/read-all$/,
    ({ token }) => {
      const user = viewerFrom(token);
      for (const n of load().notifications)
        if (n.recipientId === user.id && !n.readAt) n.readAt = now();
      return NO_CONTENT;
    },
  ],

  // registre de lectura, objectiu i estadístiques
  [
    'GET',
    /^\/reading-log$/,
    ({ token, params }) => {
      const owner = viewerFrom(token);
      const year = Number(params.get('year'));
      const month = Number(params.get('month'));
      if (!(month >= 1 && month <= 12)) throw badRequest('El mes debe estar entre 1 y 12');
      const prefix = `${year}-${pad(month)}-`;
      const byDate = new Map<string, { id: number; title: string; coverUrl: string | null }[]>();
      for (const entry of load().readingLog.filter(
        (l) => l.ownerId === owner.id && l.date.startsWith(prefix),
      )) {
        const book = load().books.find((b) => b.id === entry.bookId);
        if (!book) continue;
        byDate.set(entry.date, [
          ...(byDate.get(entry.date) ?? []),
          { id: book.id, title: book.title, coverUrl: book.coverUrl },
        ]);
      }
      return {
        year,
        month,
        days: [...byDate]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, books]) => ({ date, books })),
      };
    },
  ],
  [
    'GET',
    /^\/reading-log\/streak$/,
    ({ token }) => {
      const owner = viewerFrom(token);
      return streaks(
        load()
          .readingLog.filter((l) => l.ownerId === owner.id)
          .map((l) => l.date),
      );
    },
  ],
  [
    'GET',
    /^\/reading-log\/summary$/,
    ({ token }) => {
      const owner = viewerFrom(token);
      const byBook = new Map<number, string[]>();
      for (const entry of load().readingLog.filter((l) => l.ownerId === owner.id)) {
        byBook.set(entry.bookId, [...(byBook.get(entry.bookId) ?? []), entry.date]);
      }
      return [...byBook]
        .map(([bookId, dates]) => ({
          bookId,
          title: load().books.find((b) => b.id === bookId)?.title ?? '',
          dates: dates.sort(),
        }))
        .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    },
  ],
  [
    'POST',
    /^\/reading-log$/,
    ({ token, body }) => {
      const owner = viewerFrom(token);
      const date = String(body['date']);
      const bookId = Number(body['bookId']);
      if (
        !load().readingLog.some(
          (l) => l.ownerId === owner.id && l.bookId === bookId && l.date === date,
        )
      ) {
        ownedBook(owner.id, bookId);
        load().readingLog.push({ ownerId: owner.id, bookId, date });
      }
      return NO_CONTENT;
    },
  ],
  [
    'DELETE',
    /^\/reading-log$/,
    ({ token, params }) => {
      const owner = viewerFrom(token);
      const bookId = Number(params.get('bookId'));
      const date = params.get('date');
      load().readingLog = load().readingLog.filter(
        (l) => !(l.ownerId === owner.id && l.bookId === bookId && l.date === date),
      );
      return NO_CONTENT;
    },
  ],
  [
    'GET',
    /^\/reading-goals\/current$/,
    ({ token }) => {
      const owner = viewerFrom(token);
      const year = new Date().getFullYear();
      const goal = load().goals.find((g) => g.ownerId === owner.id && g.year === year);
      return {
        year,
        targetBooks: goal?.targetBooks ?? null,
        booksRead: booksReadInYear(owner.id, year),
      };
    },
  ],
  [
    'PUT',
    /^\/reading-goals\/current$/,
    ({ token, body }) => {
      const owner = viewerFrom(token);
      const year = new Date().getFullYear();
      const targetBooks = Number(body['targetBooks']);
      const goal = load().goals.find((g) => g.ownerId === owner.id && g.year === year);
      if (goal) goal.targetBooks = targetBooks;
      else load().goals.push({ ownerId: owner.id, year, targetBooks });
      return { year, targetBooks, booksRead: booksReadInYear(owner.id, year) };
    },
  ],
  ['GET', /^\/stats$/, ({ token }) => stats(viewerFrom(token).id)],

  // notificacions push: a la demo no se n'envien
  ['POST', /^\/push\/subscriptions$/, () => ({ status: 201, body: null })],
  ['DELETE', /^\/push\/subscriptions$/, () => NO_CONTENT],
];

function publicBooks(userId: number) {
  return activeBooks(userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl,
      synopsis: b.synopsis,
      pageCount: b.pageCount,
      status: b.status,
      categories: categoriesOf(b),
      reviews: load()
        .reviews.filter((r) => r.bookId === b.id && r.userId === userId)
        .map(({ id, rating, text, createdAt }) => ({ id, rating, text, createdAt })),
    }));
}

// FeedService.getFeed
function feed(userId: number, limit: number, before: string | null) {
  const followed = load()
    .follows.filter((f) => f.followerId === userId)
    .map((f) => f.followedId);
  if (followed.length === 0) return [];
  const item = (book: DbBook, type: string, rating: number | null, occurredAt: string) => {
    const actor = userById(book.ownerId)!;
    return {
      type,
      actorId: actor.id,
      actorAlias: actor.alias,
      actorName: actor.name,
      bookId: book.id,
      bookTitle: book.title,
      bookCoverUrl: book.coverUrl,
      rating,
      occurredAt,
    };
  };
  const books = load().books.filter((b) => followed.includes(b.ownerId) && !b.deletedAt);
  const items = [
    ...books
      .filter((b) => b.status === 'READING')
      .map((b) =>
        item(
          b,
          'STARTED_READING',
          null,
          b.startedAt ? startOfDayInstant(b.startedAt) : b.updatedAt,
        ),
      ),
    ...books
      .filter((b) => b.status === 'READ')
      .map((b) =>
        item(
          b,
          'FINISHED_READING',
          null,
          b.finishedAt
            ? startOfDayInstant(b.finishedAt)
            : b.startedAt
              ? startOfDayInstant(b.startedAt)
              : b.updatedAt,
        ),
      ),
    ...load()
      .reviews.filter((r) => followed.includes(r.userId))
      .map((r) => ({ review: r, book: load().books.find((b) => b.id === r.bookId) }))
      .filter((x): x is { review: (typeof x)['review']; book: DbBook } => !!x.book)
      .map(({ review, book }) => item(book, 'REVIEWED', review.rating, review.createdAt)),
  ];
  return items
    .filter((i) => !before || i.occurredAt < before)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}

// RecommendationService.getRecommendations
function recommendations(ownerId: number) {
  const key = (title: string, author: string | null) =>
    `${title.trim().toLowerCase()}\u0000${(author ?? '').trim().toLowerCase()}`;
  const ownRead = activeBooks(ownerId).filter((b) => b.status === 'READ');
  const authorCounts = new Map<string, { name: string; count: number }>();
  for (const book of ownRead) {
    const author = book.author?.trim();
    if (!author) continue;
    const entry = authorCounts.get(author.toLowerCase()) ?? { name: author, count: 0 };
    entry.count++;
    authorCounts.set(author.toLowerCase(), entry);
  }
  const basedOnAuthor =
    [...authorCounts.values()].sort((a, b) => b.count - a.count)[0]?.name ?? null;
  const owned = new Set(activeBooks(ownerId).map((b) => key(b.title, b.author)));
  const followed = load()
    .follows.filter((f) => f.followerId === ownerId)
    .map((f) => f.followedId);
  const buckets = new Map<
    string,
    { title: string; author: string | null; coverUrl: string | null; readerCount: number }
  >();
  for (const book of load().books.filter(
    (b) => followed.includes(b.ownerId) && !b.deletedAt && b.status === 'READ',
  )) {
    const k = key(book.title, book.author);
    if (owned.has(k)) continue;
    const acc = buckets.get(k) ?? {
      title: book.title.trim(),
      author: book.author?.trim() || null,
      coverUrl: book.coverUrl,
      readerCount: 0,
    };
    acc.readerCount++;
    acc.coverUrl ??= book.coverUrl;
    buckets.set(k, acc);
  }
  return {
    basedOnAuthor,
    items: [...buckets.values()].sort((a, b) => b.readerCount - a.readerCount).slice(0, 10),
  };
}

// StatsService.getStats
function stats(ownerId: number) {
  const books = activeBooks(ownerId);
  const ids = new Set(books.map((b) => b.id));
  const duration = (
    bookId: number,
    title: string,
    startedAt: string | null,
    finishedAt: string,
    current: boolean,
  ) => ({
    bookId,
    title,
    startedAt,
    finishedAt,
    daysReading: startedAt ? daysBetween(startedAt, finishedAt) + 1 : 0,
    current,
  });
  const completions = [
    ...books
      .filter((b) => b.status === 'READ' && b.finishedAt)
      .map((b) => duration(b.id, b.title, b.startedAt, b.finishedAt!, true)),
    ...load()
      .readEvents.filter((e) => ids.has(e.bookId))
      .map((e) =>
        duration(
          e.bookId,
          books.find((b) => b.id === e.bookId)!.title,
          e.startedAt,
          e.finishedAt,
          false,
        ),
      ),
  ];
  const byMonth = new Map<string, number>();
  for (const c of completions)
    byMonth.set(c.finishedAt.slice(0, 7), (byMonth.get(c.finishedAt.slice(0, 7)) ?? 0) + 1);
  return {
    totalBooksRead: books.filter((b) => b.status === 'READ').length,
    totalBooks: books.length,
    currentlyReading: books.filter((b) => b.status === 'READING').length,
    readingDurations: completions
      .filter((c) => c.startedAt)
      .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)),
    booksByMonth: [...byMonth]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([ym, count]) => ({
        year: Number(ym.slice(0, 4)),
        month: Number(ym.slice(5, 7)),
        count,
      })),
  };
}

/** Avatar desat a la demo (data URL), per mostrar-lo sense demanar-lo al servidor. */
export function demoAvatar(userId: number): string | null {
  return load().users.find((u) => u.id === userId)?.avatarDataUrl ?? null;
}

const isResponse = (value: unknown): value is DemoResponse =>
  typeof value === 'object' &&
  value !== null &&
  !(value instanceof Blob) &&
  'status' in value &&
  'body' in value &&
  Object.keys(value).length === 2;

/** Respon una petició a l'API (camí relatiu a la base, p. ex. "/books"). */
export function handleDemoRequest(request: {
  method: string;
  path: string;
  params?: URLSearchParams;
  body?: unknown;
  token?: string | null;
}): DemoResponse {
  for (const [method, pattern, handler] of routes) {
    if (method !== request.method) continue;
    const match = pattern.exec(request.path);
    if (!match) continue;
    const result = handler({
      match,
      params: request.params ?? new URLSearchParams(),
      body: (request.body as Record<string, unknown> | null) ?? {},
      token: request.token ?? null,
    });
    save();
    return isResponse(result) ? result : { status: 200, body: result };
  }
  throw new DemoApiError(404, `${request.method} ${request.path} no está disponible en la demo`);
}
