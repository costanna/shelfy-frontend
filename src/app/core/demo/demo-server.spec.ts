import { DEMO_DB_KEY } from './demo';
import { DemoApiError, handleDemoRequest, resetDemoServer } from './demo-server';

// Respostes JSON lliures: als tests només en mirem uns quants camps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function loginAs(email: string): string {
  const response = handleDemoRequest({
    method: 'POST',
    path: '/auth/login',
    body: { email, password: 'demo1234' },
  });
  return (response.body as Json).token;
}

const call = (
  token: string | null,
  method: string,
  path: string,
  body: unknown = null,
  query = '',
) =>
  handleDemoRequest({ method, path, token, body, params: new URLSearchParams(query) }).body as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const errorOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof DemoApiError) return { status: error.status, message: error.message };
    throw error;
  }
  throw new Error('expected an error');
};

describe('demo server (Shelfy)', () => {
  let laia: string;
  let pau: string;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('shelfy.demo', '1');
    localStorage.setItem('shelfy.lang', 'es');
    resetDemoServer();
    laia = loginAs('laia@shelfy.dev');
    pau = loginAs('pau@shelfy.dev');
  });

  it('hands out a JWT-shaped token that AuthService accepts, and rejects a wrong password', () => {
    const payload = JSON.parse(atob(laia.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.exp * 1000).toBeGreaterThan(Date.now());
    expect(
      errorOf(() =>
        handleDemoRequest({
          method: 'POST',
          path: '/auth/login',
          body: { email: 'laia@shelfy.dev', password: 'x' },
        }),
      ),
    ).toEqual({ status: 401, message: 'Email o contraseña incorrectos' });
  });

  it('lists only the owner’s books, with status, text and sort filters', () => {
    const all = call(laia, 'GET', '/books', null, 'size=50');
    expect(all.totalElements).toBe(8);
    const reading = call(laia, 'GET', '/books', null, 'status=READING');
    expect(reading.content.map((b: Json) => b.title).sort()).toEqual([
      'El problema de los tres cuerpos',
      'El temor de un hombre sabio',
    ]);
    expect(call(laia, 'GET', '/books', null, 'q=rothfuss').totalElements).toBe(2);
    const byTitle = call(laia, 'GET', '/books', null, 'sort=title,asc&size=3');
    expect(byTitle.content[0].title).toBe('1984');
    expect(call(laia, 'GET', '/books/counts')).toEqual({
      wantToRead: 1,
      reading: 2,
      read: 4,
      wantToBuy: 1,
    });
  });

  it('applies the reading rules: progress starts a book, reread archives the previous read', () => {
    const wanted = call(laia, 'GET', '/books', null, 'status=WANT_TO_READ').content[0];
    const progressed = call(laia, 'PATCH', `/books/${wanted.id}/progress`, { currentPage: 9999 });
    expect(progressed).toMatchObject({ status: 'READING', currentPage: wanted.pageCount });
    expect(progressed.startedAt).not.toBeNull();

    const read = call(laia, 'GET', '/books', null, 'q=1984').content[0];
    expect(
      errorOf(() => call(laia, 'PATCH', `/books/${read.id}/progress`, { currentPage: 3 })).status,
    ).toBe(400);
    const reread = call(laia, 'POST', `/books/${read.id}/reread`);
    expect(reread).toMatchObject({ status: 'READING', finishedAt: null });
    expect(reread.readHistory).toHaveLength(1);
  });

  it('moves books to the trash, restores them and only purges from the trash', () => {
    const book = call(laia, 'GET', '/books', null, 'q=sapiens').content[0];
    expect(errorOf(() => call(laia, 'DELETE', `/books/${book.id}/permanent`)).message).toBe(
      'Primero mueve el libro a la papelera',
    );
    call(laia, 'DELETE', `/books/${book.id}`);
    expect(call(laia, 'GET', '/books/trash').totalElements).toBe(1);
    call(laia, 'POST', `/books/${book.id}/restore`);
    expect(call(laia, 'GET', '/books/trash').totalElements).toBe(0);
  });

  it('shows a review only to its author and their followers, and notifies likes', () => {
    const wind = call(laia, 'GET', '/books', null, 'q=nombre del viento').content[0];
    const [review] = call(laia, 'GET', `/books/${wind.id}/reviews`);
    expect(review.likesCount).toBe(1);

    call(pau, 'POST', `/reviews/${review.id}/like`);
    expect(call(laia, 'GET', '/notifications/unread-count').count).toBe(2);

    const stranger = call(null, 'POST', '/auth/register', {
      name: 'Nova',
      email: 'nova@x.com',
      password: 'demo1234',
    });
    expect(stranger.requiresVerification).toBe(false);
    const nova = loginAs('nova@x.com');
    expect(errorOf(() => call(nova, 'POST', `/reviews/${review.id}/like`)).status).toBe(404);
  });

  it('builds the feed and the recommendations from the people you follow', () => {
    const feed = call(laia, 'GET', '/feed', null, 'limit=30');
    expect(feed.map((i: Json) => i.actorName)).toEqual(expect.arrayContaining(['Pau', 'Mar']));
    expect(feed.some((i: Json) => i.type === 'REVIEWED')).toBe(true);

    const titles = call(laia, 'GET', '/books/recommendations').items.map((i: Json) => i.title);
    expect(titles).toContain('El Hobbit');
    expect(titles).not.toContain('Sapiens. De animales a dioses'); // Laia already has it
  });

  it('computes streaks, goals and stats like the backend', () => {
    expect(call(laia, 'GET', '/reading-log/streak')).toEqual({
      currentStreak: 5,
      longestStreak: 5,
    });
    const goal = call(laia, 'GET', '/reading-goals/current');
    expect(goal.targetBooks).toBe(24);
    const stats = call(laia, 'GET', '/stats');
    expect(stats).toMatchObject({ totalBooksRead: 4, totalBooks: 8, currentlyReading: 2 });
  });

  it('exports the library as CSV and imports it back', async () => {
    const blob = call(laia, 'GET', '/books/export') as Blob;
    const csv = await blob.text();
    expect(csv.split('\r\n')[0]).toBe(
      'title,author,isbn,status,pageCount,series,seriesPosition,format,startedAt,finishedAt,categories,synopsis',
    );

    const result = call(pau, 'POST', '/books/import', {
      csv: 'title,author,status\nNuevo,Autora,READ\n,Sin título,READ\n',
    });
    expect(result).toMatchObject({ imported: 1, skipped: 1 });
  });

  it('keeps every change after a reload', () => {
    const wanted = call(laia, 'GET', '/books', null, 'status=WANT_TO_BUY').content[0];
    call(laia, 'DELETE', `/books/${wanted.id}`);
    expect(localStorage.getItem(DEMO_DB_KEY)).not.toBeNull();

    resetDemoServer(); // como al recargar la página
    expect(call(laia, 'GET', '/books/trash').totalElements).toBe(1);
  });
});
