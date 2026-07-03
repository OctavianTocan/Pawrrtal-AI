import { NodeHttpServer } from '@effect/platform-node';
import { HttpAllowedUserLive } from '@pawrrtal/api/src/Modules/Authentication/Http';
import { Api } from '@pawrrtal/api-core';
import { AuthorizationError } from '@pawrrtal/api-core/Modules/Auth/Errors';
import { Cause, ConfigProvider, Effect, Exit, Layer } from 'effect';
import { HttpApiTest } from 'effect/unstable/httpapi';
import { assert, describe, it } from 'vitest';
import { AuthClientMiddlewareStubLive, AuthMiddlewareStubLive } from '../../_helpers/AuthStub';
import type { ProjectsTestClient } from '../../_helpers/ProjectsStub';
import { fakeProject, makeHandlerLayer } from '../../_helpers/ProjectsStub';

/** Extracts the AuthorizationError from an Effect failure cause. */
const findAuthorizationError = <A>(exit: Exit.Exit<A, object>): AuthorizationError | null => {
  if (!Exit.isFailure(exit)) {
    return null;
  }
  const errors = exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error);
  return errors.find((error): error is AuthorizationError => error instanceof AuthorizationError) ?? null;
};

describe('Authentication.AllowedUser', (): void => {
  const platformLayer = NodeHttpServer.layerHttpServices;

  // Build a client for the handler layer.
  const getClient = async (
    handlerLayer: ReturnType<typeof makeHandlerLayer>,
    env: Record<string, string> = {}
  ): Promise<ProjectsTestClient> => {
    const provider = ConfigProvider.fromEnv({ env });
    return Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* HttpApiTest.groups(Api, ['projects']).pipe(
          Effect.scoped,
          Effect.provide(handlerLayer),
          Effect.provide(AuthMiddlewareStubLive),
          Effect.provide(HttpAllowedUserLive.pipe(Layer.provide(ConfigProvider.layer(provider)))),
          Effect.provide(AuthClientMiddlewareStubLive),
          Effect.provide(platformLayer)
        );
        return {
          projects: {
            list: () => client.projects.list({ responseMode: 'decoded-only' }),
            create: (request) => client.projects.create({ ...request, responseMode: 'decoded-only' }),
            update: (request) => client.projects.update({ ...request, responseMode: 'decoded-only' }),
            delete: (request) => client.projects.delete({ ...request, responseMode: 'decoded-only' })
          }
        } satisfies ProjectsTestClient;
      })
    );
  };

  it('should return a 403 if the user is not allowed to access the resource', async (): Promise<void> => {
    const handler = makeHandlerLayer({
      list: () => Effect.succeed([])
    });

    const client = await getClient(handler, { ALLOWED_EMAILS: 'other@example.com' });

    const exit = await Effect.runPromise(client.projects.list().pipe(Effect.exit));
    assert.isTrue(Exit.isFailure(exit));
    const authError = findAuthorizationError(exit);
    assert.isNotNull(authError);
    assert.strictEqual(authError?.message, 'This Pawrrtal deployment is private.');
  });

  it('should let everyone through if the allowlist is empty', async (): Promise<void> => {
    const handler = makeHandlerLayer({
      list: () => Effect.succeed([fakeProject({ name: 'y' })])
    });
    const client = await getClient(handler, { ALLOWED_EMAILS: '' });
    const list = await Effect.runPromise(client.projects.list());
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0]?.name, 'y');
  });

  it('should admit listed email case-insensitive', async (): Promise<void> => {
    const handler = makeHandlerLayer({
      list: () => Effect.succeed([fakeProject({ name: 'y' })])
    });
    const client = await getClient(handler, { ALLOWED_EMAILS: 'Test@Example.com' });
    const list = await Effect.runPromise(client.projects.list());
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0]?.name, 'y');
  });

  it('should block unlisted email with a generic message', async (): Promise<void> => {
    const handler = makeHandlerLayer({
      list: () => Effect.succeed([])
    });
    const client = await getClient(handler, { ALLOWED_EMAILS: 'other@example.com' });
    const exit = await Effect.runPromise(client.projects.list().pipe(Effect.exit));
    assert.isTrue(Exit.isFailure(exit));
    const authError = findAuthorizationError(exit);
    assert.isNotNull(authError);
    assert.strictEqual(authError?.message, 'This Pawrrtal deployment is private.');
  });

  it('should parse comma-separated values', async (): Promise<void> => {
    const handler = makeHandlerLayer({
      list: () => Effect.succeed([fakeProject({ name: 'y' })])
    });
    const client = await getClient(handler, { ALLOWED_EMAILS: 'other@example.com, test@example.com' });
    const list = await Effect.runPromise(client.projects.list());
    assert.strictEqual(list.length, 1);
  });

  it('should be empty when unset', async (): Promise<void> => {
    const handler = makeHandlerLayer({
      list: () => Effect.succeed([fakeProject({ name: 'y' })])
    });
    const client = await getClient(handler, {});
    const list = await Effect.runPromise(client.projects.list());
    assert.strictEqual(list.length, 1);
  });
});
