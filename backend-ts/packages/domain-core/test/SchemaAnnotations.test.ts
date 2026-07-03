/** Public domain schemas should generate described JSON schema documents. */

import { assert, describe, it } from '@effect/vitest';
import { Schema } from 'effect';
import { AgentProviderRead } from '../src/Modules/AgentProviders/Domain';
import { AgentProviderEventRead, AgentTurnRead, ProviderSessionRead } from '../src/Modules/AgentTurns/Domain';
import { AgentSessionBindingRead, SessionRead } from '../src/Modules/Sessions/Domain';

const schemas = [
  AgentProviderRead,
  AgentProviderEventRead,
  AgentTurnRead,
  ProviderSessionRead,
  AgentSessionBindingRead,
  SessionRead
] as const;

describe('domain-core schema annotations', (): void => {
  it('generates JSON schema documents with descriptions', (): void => {
    for (const schema of schemas) {
      const document = Schema.toJsonSchemaDocument(schema, { generateDescriptions: true });
      const rendered = JSON.stringify(document);
      assert.include(rendered, '"description"');
      assert.include(rendered, '"dialect":"draft-2020-12"');
    }
  });
});
