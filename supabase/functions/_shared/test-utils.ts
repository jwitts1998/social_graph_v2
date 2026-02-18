/**
 * Mock helpers for Deno tests of Supabase Edge Functions.
 */

/** Minimal mock Supabase client for unit tests */
export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQuery = {
    select: () => mockQuery,
    insert: () => mockQuery,
    upsert: () => mockQuery,
    update: () => mockQuery,
    delete: () => mockQuery,
    eq: () => mockQuery,
    neq: () => mockQuery,
    in: () => mockQuery,
    gte: () => mockQuery,
    lte: () => mockQuery,
    order: () => mockQuery,
    limit: () => mockQuery,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };

  return {
    from: (_table: string) => mockQuery,
    rpc: (_fn: string, _params?: unknown) =>
      Promise.resolve({ data: null, error: null }),
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    ...overrides,
  };
}

/** Minimal mock OpenAI client for unit tests */
export function createMockOpenAIClient(overrides: Record<string, unknown> = {}) {
  return {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { content: '{}' } }],
          }),
      },
    },
    embeddings: {
      create: () =>
        Promise.resolve({
          data: [{ embedding: new Array(1536).fill(0) }],
        }),
    },
    ...overrides,
  };
}
