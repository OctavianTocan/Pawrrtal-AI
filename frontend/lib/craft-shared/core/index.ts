/**
 * Core utilities
 */

export { debug } from './debug';
export { normalizePath, pathStartsWith, stripPathPrefix } from './paths';

// Re-export core types needed by protocol layer and renderer
export type {
  AttachmentType,
  Message,
  MessageRole,
  PermissionRequest,
  PermissionRequestType,
  ToolStatus,
  TypedError,
  TokenUsage,
  ContentBadge,
  ToolDisplayMeta,
  AnnotationV1,
  StoredAttachment,
  CredentialInputMode,
  AuthRequestType,
  AuthStatus,
  StoredMessage,
} from './message';
export { generateMessageId } from './message';
export { storedToMessage, messageToStored } from './message-mapper';
export type { SessionMetadata, StoredSession } from './session';
export type { AuthType, McpAuthType, OAuthCredentials, Workspace } from './workspace';
