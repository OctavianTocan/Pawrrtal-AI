import { Layer } from 'effect';
import { HttpAgentProvidersLive } from './AgentProviders/Http';
import { HttpAgentTurnsLive } from './AgentTurns/Http';
import { HttpProjectsLive } from './Projects/Http';
import { HttpSessionsLive } from './Sessions/Http';
import { HttpSystemLive } from './System/Http';

/** Merged runtime layers for every non-admin HttpApi group. */
export const CoreModulesLive = Layer.mergeAll(
  HttpSystemLive,
  HttpProjectsLive,
  HttpSessionsLive,
  HttpAgentProvidersLive,
  HttpAgentTurnsLive
);
