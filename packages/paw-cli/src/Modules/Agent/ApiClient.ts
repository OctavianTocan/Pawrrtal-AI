/** Public HTTP client helpers for provider/session operator commands. */

import { Effect, Schema } from 'effect';
import { ExternalError, failUsage, type UsageError, VerificationError } from '../../Helpers/Errors';
import { ActiveCliContext } from '../../Infrastructure/ActiveContext';

type HttpMethod = 'GET' | 'POST';

/** Reads the configured backend URL for commands that require Pawrrtal API access. */
const backendBaseUrl: Effect.Effect<string, UsageError, ActiveCliContext> = Effect.gen(function* () {
  const context = yield* ActiveCliContext;
  if (context.backendTarget === null) {
    return yield* failUsage(
      'No backend target is configured.',
      'Set PAW_BACKEND_URL or pass --backend-url before running provider/session commands.'
    );
  }
  return context.backendTarget.replace(/\/$/, '');
});

/** Builds an API URL under `/api/v1`. */
const apiUrl = (baseUrl: string, path: string): string => `${baseUrl}/api/v1${path}`;

/** Runs a JSON HTTP request and decodes the response with an Effect Schema. */
export function requestJson<S extends Schema.Constraint>(
  method: HttpMethod,
  path: string,
  schema: S,
  body: string | null = null
): Effect.Effect<S['Type'], UsageError | ExternalError | VerificationError, ActiveCliContext | S['DecodingServices']> {
  return Effect.gen(function* () {
    const baseUrl = yield* backendBaseUrl;
    const value = yield* Effect.tryPromise({
      try: async () => {
        const response = await fetch(apiUrl(baseUrl, path), {
          method,
          headers:
            body === null
              ? { accept: 'application/json' }
              : { accept: 'application/json', 'content-type': 'application/json' },
          body,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || `${method} ${path} failed with ${response.status}`);
        }
        return text.length === 0 ? null : JSON.parse(text);
      },
      catch: (cause) =>
        new ExternalError({
          message: 'Backend request failed.',
          hint: 'Check PAW_BACKEND_URL and backend availability.',
          details: String(cause),
        }),
    });

    return yield* Schema.decodeEffect(schema)(value).pipe(
      Effect.mapError((schemaError) =>
        new VerificationError({
          message: 'Backend response did not match the CLI schema.',
          details: String(schemaError),
        })
      )
    );
  });
}
