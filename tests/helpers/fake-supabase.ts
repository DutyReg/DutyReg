import { vi } from "vitest";

export interface FakeResult {
  data?: unknown;
  error?: unknown;
}

export type ResultOrQueue = FakeResult | FakeResult[];

export interface FakeSupabaseConfig {
  tables?: Record<string, ResultOrQueue>;
  rpc?: Record<string, ResultOrQueue>;
  user?: unknown;
}

/**
 * Narrow the fake client to the real SupabaseClient type at the mock
 * boundary (the mocked `createClient` expects one).
 */
export function asSupabaseClient(client: FakeSupabaseClient) {
  return client as never;
}

export interface FakeCall {
  table: string;
  method: string;
  args: unknown[];
}

interface Builder {
  select: (...args: unknown[]) => Builder;
  insert: (...args: unknown[]) => Builder;
  update: (...args: unknown[]) => Builder;
  delete: (...args: unknown[]) => Builder;
  eq: (...args: unknown[]) => Builder;
  or: (...args: unknown[]) => Builder;
  order: (...args: unknown[]) => Builder;
  single: () => Promise<FakeResult>;
  maybeSingle: () => Promise<FakeResult>;
  returns: () => Promise<FakeResult>;
  then: (onFulfilled: (value: FakeResult) => unknown) => Promise<unknown>;
}

export interface FakeSupabaseClient {
  from: (table: string) => Builder;
  rpc: (name: string, args?: unknown) => Promise<FakeResult>;
  auth: {
    getUser: () => Promise<{ data: { user: unknown }; error: null }>;
    signInWithPassword: () => Promise<FakeResult>;
    signUp: () => Promise<FakeResult>;
    signOut: () => Promise<{ error: null }>;
  };
  history: FakeCall[];
}

/**
 * Scriptable Supabase client for tests.
 *
 * Terminal calls (single / maybeSingle / returns, or awaiting a builder
 * directly) consume results from a per-table queue in call order, falling
 * back to `{ data: null }`. `rpc` results are keyed by function name.
 * Every call is recorded in `history` for assertions.
 */
export function fakeSupabase(config: FakeSupabaseConfig = {}): FakeSupabaseClient {
  const tables: Record<string, FakeResult[]> = {};
  const rpcs: Record<string, FakeResult[]> = {};
  const history: FakeCall[] = [];

  const toQueue = (value: ResultOrQueue | undefined) => {
    const list = value === undefined ? [] : Array.isArray(value) ? value : [value];
    return [...list];
  };

  for (const [key, value] of Object.entries(config.tables ?? {})) {
    tables[key] = toQueue(value);
  }
  for (const [key, value] of Object.entries(config.rpc ?? {})) {
    rpcs[key] = toQueue(value);
  }

  const take = (queue: FakeResult[]): FakeResult => queue.shift() ?? { data: null };

  const query = (table: string): Builder => {
    const record = (method: string, ...args: unknown[]) => {
      history.push({ table, method, args });
    };

    const build: Builder = {
      then(onFulfilled) {
        return Promise.resolve(take(tables[table] ?? [])).then(onFulfilled);
      },
      select(...args) {
        record("select", ...args);
        return build;
      },
      insert(...args) {
        record("insert", ...args);
        return build;
      },
      update(...args) {
        record("update", ...args);
        return build;
      },
      delete(...args) {
        record("delete", ...args);
        return build;
      },
      eq(...args) {
        record("eq", ...args);
        return build;
      },
      or(...args) {
        record("or", ...args);
        return build;
      },
      order(...args) {
        record("order", ...args);
        return build;
      },
      single() {
        return Promise.resolve(take(tables[table] ?? []));
      },
      maybeSingle() {
        return Promise.resolve(take(tables[table] ?? []));
      },
      returns() {
        return Promise.resolve(take(tables[table] ?? []));
      },
    };

    return build;
  };

  return {
    from: (table: string) => query(table),
    rpc: vi.fn(async (name: string, args?: unknown) => {
      history.push({ table: "rpc", method: name, args: args === undefined ? [] : [args] });
      return take(rpcs[name] ?? []);
    }),
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: config.user ?? null },
        error: null,
      })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null }, error: null })),
      signUp: vi.fn(async () => ({ data: { user: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    history,
  };
}
