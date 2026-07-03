/** Projects HTTP wire-shape tests via `HttpApiTest.groups`. */

import { NodeHttpServer } from '@effect/platform-node';
import { assert } from '@effect/vitest';
import { Api } from '@pawrrtal/api-core';
import { ProjectCreateInput, ProjectUpdateInput } from '@pawrrtal/api-core/Modules/Projects/Domain';
import { ProjectNotFoundError } from '@pawrrtal/api-core/Modules/Projects/Errors';
import { Effect, Exit, Layer } from 'effect';
import { HttpApiTest } from 'effect/unstable/httpapi';
import { describe, it } from 'vitest';
import {
  AllowedUserMiddlewareStubLive,
  AuthClientMiddlewareStubLive,
  AuthMiddlewareStubLive
} from '../../_helpers/AuthStub';
import type { ProjectsTestClient } from '../../_helpers/ProjectsStub';
import { FAKE_PROJECT_ID, fakeProject, makeHandlerLayer } from '../../_helpers/ProjectsStub';

describe('Projects.Http (handler stubs)', () => {
  const platformLayer = NodeHttpServer.layerHttpServices;

  const getClient = async (handlerLayer: ReturnType<typeof makeHandlerLayer>): Promise<ProjectsTestClient> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* HttpApiTest.groups(Api, ['projects']).pipe(
          Effect.scoped,
          Effect.provide(handlerLayer),
          Effect.provide(Layer.mergeAll(AuthMiddlewareStubLive, AllowedUserMiddlewareStubLive)),
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

  it('GET /api/v1/projects returns 200 with the list', async () => {
    const handler = makeHandlerLayer({
      list: () => Effect.succeed([fakeProject({ name: 'a' }), fakeProject({ name: 'b' })])
    });
    const client = await getClient(handler);
    const list = await Effect.runPromise(client.projects.list());
    assert.strictEqual(list.length, 2);
    const first = list[0];
    assert.isDefined(first);
    assert.strictEqual(first.name, 'a');
  });

  it('POST /api/v1/projects returns 201 with the new project', async () => {
    const handler = makeHandlerLayer({});
    const client = await getClient(handler);
    const created = await Effect.runPromise(
      client.projects.create({ payload: new ProjectCreateInput({ name: 'fresh' }) })
    );
    assert.strictEqual(created.name, 'fresh');
  });

  it('PATCH /api/v1/projects/:id returns 200 with the renamed project', async () => {
    const handler = makeHandlerLayer({});
    const client = await getClient(handler);
    const updated = await Effect.runPromise(
      client.projects.update({
        params: { project_id: FAKE_PROJECT_ID },
        payload: new ProjectUpdateInput({ name: 'renamed' })
      })
    );
    assert.strictEqual(updated.name, 'renamed');
  });

  it('PATCH on a missing project fails with ProjectNotFoundError', async () => {
    const handler = makeHandlerLayer({
      update: () => Effect.fail(new ProjectNotFoundError({ project_id: FAKE_PROJECT_ID }))
    });
    const client = await getClient(handler);
    const exit = await Effect.runPromise(
      client.projects
        .update({
          params: { project_id: FAKE_PROJECT_ID },
          payload: new ProjectUpdateInput({ name: 'x' })
        })
        .pipe(Effect.exit)
    );
    assert.isTrue(Exit.isFailure(exit));
  });

  it('DELETE /api/v1/projects/:id returns 204 No Content', async () => {
    const handler = makeHandlerLayer({});
    const client = await getClient(handler);
    await Effect.runPromise(client.projects.delete({ params: { project_id: FAKE_PROJECT_ID } }));
  });

  it('DELETE on a missing project fails with ProjectNotFoundError', async () => {
    const handler = makeHandlerLayer({
      delete: () => Effect.fail(new ProjectNotFoundError({ project_id: FAKE_PROJECT_ID }))
    });
    const client = await getClient(handler);
    const exit = await Effect.runPromise(
      client.projects.delete({ params: { project_id: FAKE_PROJECT_ID } }).pipe(Effect.exit)
    );
    assert.isTrue(Exit.isFailure(exit));
  });
});
