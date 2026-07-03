/** HTTP/OpenAPI contract for Pawrrtal Sessions. */

import { Ids } from '@pawrrtal/domain-core';
import { SessionCreateInput, SessionRead, SessionUpdateInput } from '@pawrrtal/domain-core/Modules/Sessions/Domain';
import { SessionConflictError, SessionNotFoundError } from '@pawrrtal/domain-core/Modules/Sessions/Errors';
import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from 'effect/unstable/httpapi';
import { AllowedUserMiddlewareService, AuthenticationMiddlewareService } from '../Auth/Api';

/** Authenticated Session CRUD for `/api/v1/sessions`. */
export class SessionsApi extends HttpApiGroup.make('sessions')
  .add(
    HttpApiEndpoint.get('list', '/', {
      success: Schema.Array(SessionRead)
    })
      .annotate(OpenApi.Summary, 'List sessions')
      .annotate(OpenApi.Description, 'List Pawrrtal Sessions visible to the authenticated caller')
  )
  .add(
    HttpApiEndpoint.post('create', '/', {
      payload: SessionCreateInput,
      success: SessionRead.pipe(HttpApiSchema.status('Created')),
      error: SessionConflictError
    })
      .annotate(OpenApi.Summary, 'Create session')
      .annotate(OpenApi.Description, 'Create a Workspace-bound Pawrrtal Session')
  )
  .add(
    HttpApiEndpoint.get('get', '/:session_id', {
      params: {
        session_id: Ids.session
      },
      success: SessionRead,
      error: SessionNotFoundError
    })
      .annotate(OpenApi.Summary, 'Get session')
      .annotate(OpenApi.Description, 'Read one Pawrrtal Session by id')
  )
  .add(
    HttpApiEndpoint.patch('update', '/:session_id', {
      params: {
        session_id: Ids.session
      },
      payload: SessionUpdateInput,
      success: SessionRead,
      error: SessionNotFoundError
    })
      .annotate(OpenApi.Summary, 'Update session')
      .annotate(OpenApi.Description, 'Update mutable Pawrrtal Session metadata')
  )
  .add(
    HttpApiEndpoint.delete('remove', '/:session_id', {
      params: {
        session_id: Ids.session
      },
      success: HttpApiSchema.NoContent,
      error: SessionNotFoundError
    })
      .annotate(OpenApi.Summary, 'Remove session')
      .annotate(OpenApi.Description, 'Archive or remove one Pawrrtal Session')
  )
  .middleware(AllowedUserMiddlewareService)
  .middleware(AuthenticationMiddlewareService)
  .prefix('/sessions') {}
