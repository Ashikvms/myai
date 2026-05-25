/**
 * Tests for `services/google-calendar.ts` — pull / push / dedup paths.
 *
 * Strategy:
 *   - Prisma is a tiny in-memory store (events, appointments, users).
 *   - The Google Calendar SDK is injected via the `calendarOverride`
 *     option on each call, so we never import the real `@googleapis/calendar`
 *     in test code.
 *   - `getGoogleClient` is mocked at the module boundary to return a
 *     trivial object — it's never used directly because the override
 *     skips real client construction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock env / logger ─────────────────────────────────────────────

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    ENCRYPTION_KEY: 'a'.repeat(64),
    ENCRYPTION_KEY_VERSION: 1,
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'sec',
    GOOGLE_CALENDAR_SCOPES: 'https://www.googleapis.com/auth/calendar',
    GOOGLE_GMAIL_SCOPES: 'https://www.googleapis.com/auth/gmail.readonly',
    GOOGLE_LINK_REDIRECT_URI: 'http://localhost:3001/cb',
  },
}));

vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Mock google-oauth.getGoogleClient to bypass token decrypt ──────

vi.mock('../services/google-oauth', async () => {
  const actual = await vi.importActual<typeof import('../services/google-oauth')>(
    '../services/google-oauth',
  );
  return {
    ...actual,
    getGoogleClient: vi.fn().mockResolvedValue({}),
  };
});

// ── In-memory prisma mock ─────────────────────────────────────────

interface UserRow {
  id: string;
  googleScopes: string[];
  googleCalendarLastSyncedAt: Date | null;
}
interface AppointmentRow {
  id: string;
  userId: string;
  title: string;
  dateTime: Date;
  endTime: Date | null;
  location: string | null;
  notes: string | null;
  source: string | null;
  sourceRef: string | null;
  updatedAt: Date;
}
interface GoogleCalendarEventRow {
  id: string;
  userId: string;
  googleEventId: string;
  calendarId: string;
  summary: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  location: string | null;
  attendees: unknown;
  syncedAt: Date;
  etag: string | null;
  appointmentId: string | null;
}

const users: Record<string, UserRow> = {};
const appointments: Record<string, AppointmentRow> = {};
const gcalEvents: Record<string, GoogleCalendarEventRow> = {};
let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: Record<string, any> = {
  user: {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => users[where.id] ?? null),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
      const u = users[where.id];
      if (!u) throw new Error('not found');
      Object.assign(u, data);
      return u;
    }),
  },
  appointment: {
    create: vi.fn(async ({ data }: { data: Omit<AppointmentRow, 'id' | 'updatedAt'> & { updatedAt?: Date } }) => {
      const id = nextId('appt');
      appointments[id] = { id, updatedAt: new Date(), ...data } as AppointmentRow;
      return appointments[id];
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<AppointmentRow> }) => {
      const a = appointments[where.id];
      if (!a) throw new Error('not found');
      Object.assign(a, data, { updatedAt: new Date() });
      return a;
    }),
    findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: { googleEvents?: boolean } }) => {
      const a = appointments[where.id];
      if (!a) return null;
      if (include?.googleEvents) {
        const events = Object.values(gcalEvents).filter((e) => e.appointmentId === a.id);
        return { ...a, googleEvents: events };
      }
      return a;
    }),
  },
  googleCalendarEvent: {
    findUnique: vi.fn(async ({ where, include }: {
      where: { userId_googleEventId?: { userId: string; googleEventId: string }; appointmentId?: string };
      include?: { appointment?: boolean };
    }) => {
      let row: GoogleCalendarEventRow | undefined;
      if (where.userId_googleEventId) {
        row = Object.values(gcalEvents).find(
          (e) =>
            e.userId === where.userId_googleEventId!.userId &&
            e.googleEventId === where.userId_googleEventId!.googleEventId,
        );
      } else if (where.appointmentId) {
        row = Object.values(gcalEvents).find((e) => e.appointmentId === where.appointmentId);
      }
      if (!row) return null;
      if (include?.appointment) {
        return { ...row, appointment: row.appointmentId ? appointments[row.appointmentId] ?? null : null };
      }
      return row;
    }),
    create: vi.fn(async ({ data }: { data: Omit<GoogleCalendarEventRow, 'id'> }) => {
      const id = nextId('gcal');
      gcalEvents[id] = { id, ...data };
      return gcalEvents[id];
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<GoogleCalendarEventRow> }) => {
      const e = gcalEvents[where.id];
      if (!e) throw new Error('not found');
      Object.assign(e, data);
      return e;
    }),
    upsert: vi.fn(async ({
      where,
      create,
      update,
    }: {
      where: { userId_googleEventId: { userId: string; googleEventId: string } };
      create: Omit<GoogleCalendarEventRow, 'id'>;
      update: Partial<GoogleCalendarEventRow>;
    }) => {
      const existing = Object.values(gcalEvents).find(
        (e) => e.userId === where.userId_googleEventId.userId && e.googleEventId === where.userId_googleEventId.googleEventId,
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const id = nextId('gcal');
      gcalEvents[id] = { id, ...create };
      return gcalEvents[id];
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      const e = gcalEvents[where.id];
      delete gcalEvents[where.id];
      return e;
    }),
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
};

vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));

// ── Test seam: fake calendar client ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function makeFakeCalendar(
  listResponses: Array<{ items?: Array<Record<string, unknown>>; nextPageToken?: string }>,
): {
  events: {
    list: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  _spies: {
    insert: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
} {
  const insert = vi.fn().mockImplementation(async ({ requestBody }) => {
    return {
      data: {
        id: `gid-pushed-${idCounter}`,
        etag: '"insertEtag"',
        ...requestBody,
      },
    };
  });
  const patch = vi.fn().mockImplementation(async ({ eventId, requestBody }) => {
    return {
      data: {
        id: eventId,
        etag: '"patchEtag"',
        ...requestBody,
      },
    };
  });
  const del = vi.fn().mockResolvedValue({});
  const list = vi
    .fn()
    .mockImplementation(async () => ({ data: listResponses.shift() ?? { items: [] } }));

  return {
    events: { list, insert, patch, delete: del },
    _spies: { insert, patch, del, list },
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('google-calendar.syncCalendarEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(users)) delete users[k];
    for (const k of Object.keys(appointments)) delete appointments[k];
    for (const k of Object.keys(gcalEvents)) delete gcalEvents[k];
    idCounter = 0;
  });

  it('creates an Appointment row for each new Google event', async () => {
    users['u-1'] = {
      id: 'u-1',
      googleScopes: ['https://www.googleapis.com/auth/calendar'],
      googleCalendarLastSyncedAt: null,
    };
    const cal = makeFakeCalendar([
      {
        items: [
          {
            id: 'g-evt-1',
            etag: '"e1"',
            summary: 'Dentist',
            description: 'Cleaning',
            location: 'Downtown',
            start: { dateTime: '2026-06-01T15:00:00Z' },
            end: { dateTime: '2026-06-01T16:00:00Z' },
          },
        ],
      },
    ]);

    const { syncCalendarEvents } = await import('../services/google-calendar');
    const result = await syncCalendarEvents('u-1', { calendarOverride: cal as never });

    expect(result.fetched).toBe(1);
    expect(result.appointmentsCreated).toBe(1);
    expect(result.upserted).toBe(1);
    expect(Object.values(appointments)).toHaveLength(1);
    expect(Object.values(appointments)[0]!.source).toBe('google_calendar');
    expect(Object.values(appointments)[0]!.sourceRef).toBe('g-evt-1');
    expect(Object.values(gcalEvents)).toHaveLength(1);
    expect(Object.values(gcalEvents)[0]!.googleEventId).toBe('g-evt-1');
  });

  it('dedupes events already in our DB (no duplicate Appointment)', async () => {
    users['u-2'] = {
      id: 'u-2',
      googleScopes: ['https://www.googleapis.com/auth/calendar'],
      googleCalendarLastSyncedAt: null,
    };
    appointments['a-pre'] = {
      id: 'a-pre',
      userId: 'u-2',
      title: 'Old title',
      dateTime: new Date('2026-06-01T15:00:00Z'),
      endTime: new Date('2026-06-01T16:00:00Z'),
      location: null,
      notes: null,
      source: 'google_calendar',
      sourceRef: 'g-evt-2',
      updatedAt: new Date('2026-05-01T00:00:00Z'),
    };
    gcalEvents['gc-pre'] = {
      id: 'gc-pre',
      userId: 'u-2',
      googleEventId: 'g-evt-2',
      calendarId: 'primary',
      summary: 'Old title',
      description: null,
      startAt: new Date('2026-06-01T15:00:00Z'),
      endAt: new Date('2026-06-01T16:00:00Z'),
      location: null,
      attendees: null,
      syncedAt: new Date('2026-05-15T00:00:00Z'), // After appointment.updatedAt
      etag: '"old"',
      appointmentId: 'a-pre',
    };

    const cal = makeFakeCalendar([
      {
        items: [
          {
            id: 'g-evt-2',
            etag: '"newetag"',
            summary: 'New title',
            start: { dateTime: '2026-06-01T15:00:00Z' },
            end: { dateTime: '2026-06-01T16:00:00Z' },
          },
        ],
      },
    ]);

    const { syncCalendarEvents } = await import('../services/google-calendar');
    const result = await syncCalendarEvents('u-2', { calendarOverride: cal as never });

    expect(result.appointmentsCreated).toBe(0);
    expect(result.appointmentsUpdated).toBe(1);
    expect(Object.values(appointments)).toHaveLength(1);
    expect(appointments['a-pre']!.title).toBe('New title');
  });

  it('skips users without the Calendar scope', async () => {
    users['u-3'] = { id: 'u-3', googleScopes: [], googleCalendarLastSyncedAt: null };
    const cal = makeFakeCalendar([]);
    const { syncCalendarEvents } = await import('../services/google-calendar');
    const result = await syncCalendarEvents('u-3', { calendarOverride: cal as never });
    expect(result.fetched).toBe(0);
    expect(cal._spies.list).not.toHaveBeenCalled();
  });

  it('pushes local-to-Google when Appointment.updatedAt > GoogleCalendarEvent.syncedAt', async () => {
    users['u-4'] = {
      id: 'u-4',
      googleScopes: ['https://www.googleapis.com/auth/calendar'],
      googleCalendarLastSyncedAt: null,
    };
    appointments['a-local'] = {
      id: 'a-local',
      userId: 'u-4',
      title: 'Locally edited',
      dateTime: new Date('2026-06-02T10:00:00Z'),
      endTime: new Date('2026-06-02T11:00:00Z'),
      location: 'New loc',
      notes: 'Local notes',
      source: 'google_calendar',
      sourceRef: 'g-evt-3',
      updatedAt: new Date('2026-05-20T00:00:00Z'),
    };
    gcalEvents['gc-local'] = {
      id: 'gc-local',
      userId: 'u-4',
      googleEventId: 'g-evt-3',
      calendarId: 'primary',
      summary: 'Old',
      description: null,
      startAt: new Date('2026-06-02T10:00:00Z'),
      endAt: new Date('2026-06-02T11:00:00Z'),
      location: null,
      attendees: null,
      syncedAt: new Date('2026-05-10T00:00:00Z'), // before appointment.updatedAt
      etag: '"e3"',
      appointmentId: 'a-local',
    };
    const cal = makeFakeCalendar([
      {
        items: [
          {
            id: 'g-evt-3',
            etag: '"newer"',
            summary: 'Stale remote',
            start: { dateTime: '2026-06-02T10:00:00Z' },
            end: { dateTime: '2026-06-02T11:00:00Z' },
          },
        ],
      },
    ]);

    const { syncCalendarEvents } = await import('../services/google-calendar');
    const result = await syncCalendarEvents('u-4', { calendarOverride: cal as never });

    expect(result.pushedToGoogle).toBe(1);
    expect(cal._spies.patch).toHaveBeenCalledOnce();
    // Local appointment should NOT have been overwritten with the stale remote.
    expect(appointments['a-local']!.title).toBe('Locally edited');
  });
});

describe('google-calendar.pushAppointmentToCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(users)) delete users[k];
    for (const k of Object.keys(appointments)) delete appointments[k];
    for (const k of Object.keys(gcalEvents)) delete gcalEvents[k];
    idCounter = 0;
  });

  it('inserts a new Google event when no link exists', async () => {
    users['u-1'] = {
      id: 'u-1',
      googleScopes: ['https://www.googleapis.com/auth/calendar'],
      googleCalendarLastSyncedAt: null,
    };
    appointments['a-new'] = {
      id: 'a-new',
      userId: 'u-1',
      title: 'Brunch',
      dateTime: new Date('2026-06-10T15:00:00Z'),
      endTime: new Date('2026-06-10T16:00:00Z'),
      location: null,
      notes: null,
      source: 'manual',
      sourceRef: null,
      updatedAt: new Date(),
    };
    const cal = makeFakeCalendar([]);

    const { pushAppointmentToCalendar } = await import('../services/google-calendar');
    const result = await pushAppointmentToCalendar('a-new', { calendarOverride: cal as never });

    expect(cal._spies.insert).toHaveBeenCalledOnce();
    expect(cal._spies.patch).not.toHaveBeenCalled();
    expect(result.googleEventId).toMatch(/^gid-pushed-/);
    // Linkage row is created
    expect(Object.values(gcalEvents)).toHaveLength(1);
    expect(Object.values(gcalEvents)[0]!.appointmentId).toBe('a-new');
  });

  it('patches an existing Google event when a link exists', async () => {
    users['u-2'] = {
      id: 'u-2',
      googleScopes: ['https://www.googleapis.com/auth/calendar'],
      googleCalendarLastSyncedAt: null,
    };
    appointments['a-upd'] = {
      id: 'a-upd',
      userId: 'u-2',
      title: 'Updated title',
      dateTime: new Date('2026-06-11T15:00:00Z'),
      endTime: null,
      location: null,
      notes: null,
      source: 'manual',
      sourceRef: null,
      updatedAt: new Date(),
    };
    gcalEvents['gc-upd'] = {
      id: 'gc-upd',
      userId: 'u-2',
      googleEventId: 'g-existing-9',
      calendarId: 'primary',
      summary: 'Old title',
      description: null,
      startAt: appointments['a-upd']!.dateTime,
      endAt: new Date('2026-06-11T16:00:00Z'),
      location: null,
      attendees: null,
      syncedAt: new Date(),
      etag: '"e"',
      appointmentId: 'a-upd',
    };
    const cal = makeFakeCalendar([]);
    const { pushAppointmentToCalendar } = await import('../services/google-calendar');
    const result = await pushAppointmentToCalendar('a-upd', { calendarOverride: cal as never });

    expect(cal._spies.insert).not.toHaveBeenCalled();
    expect(cal._spies.patch).toHaveBeenCalledOnce();
    expect(result.googleEventId).toBe('g-existing-9');
  });

  it('throws when the user has no Calendar scope', async () => {
    users['u-3'] = { id: 'u-3', googleScopes: [], googleCalendarLastSyncedAt: null };
    appointments['a-x'] = {
      id: 'a-x',
      userId: 'u-3',
      title: 't',
      dateTime: new Date(),
      endTime: null,
      location: null,
      notes: null,
      source: 'manual',
      sourceRef: null,
      updatedAt: new Date(),
    };
    const cal = makeFakeCalendar([]);
    const { pushAppointmentToCalendar } = await import('../services/google-calendar');
    await expect(pushAppointmentToCalendar('a-x', { calendarOverride: cal as never })).rejects.toThrow(
      /Calendar scope/,
    );
  });
});
