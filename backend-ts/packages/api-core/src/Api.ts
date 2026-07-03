import { HttpApi, OpenApi } from 'effect/unstable/httpapi';
import { AgentProvidersApi } from './Modules/AgentProviders/Api';
import { AgentTurnsApi } from './Modules/AgentTurns/Api';
import { ProjectsApi } from './Modules/Projects/Api';
import { SessionsApi } from './Modules/Sessions/Api';
import { SystemApi } from './Modules/System/Api';

/** Root HttpApi at `/api/v1`; handlers live in `apps/api`. */
export class Api extends HttpApi.make('api')
  .add(SystemApi)
  .add(ProjectsApi)
  .add(SessionsApi)
  .add(AgentProvidersApi)
  .add(AgentTurnsApi)
  .prefix('/api/v1')
  .annotate(OpenApi.Title, 'Pawrrtal API')
  .annotate(OpenApi.Version, '1.0.0')
  .annotate(OpenApi.Description, 'Pawrrtal API') {}
