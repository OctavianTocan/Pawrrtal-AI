/**
 * Public surface of the chat-artifact subsystem.
 *
 * @fileoverview The chat assistant message imports `<ArtifactCard>` to
 * render preview chips inline. The card opens its own `<ArtifactDialog>`
 * on click, so the dialog does not need to be re-exported here.
 */

export { ArtifactCard } from './ArtifactCard';
