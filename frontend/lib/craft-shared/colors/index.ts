/**
 * Colors module - re-exports all color types, resolution, and validation.
 *
 * Import via: `import { EntityColor, resolveEntityColor } from './colors'`
 */
export {
  type SystemColorName,
  type SystemColor,
  type CustomColor,
  type EntityColor,
  SYSTEM_COLOR_NAMES,
} from './types'

export {
  resolveEntityColor,
  parseSystemColor,
  isSystemColorName,
  isSystemColor,
  deriveDarkVariant,
  type ParsedSystemColor,
} from './resolve'

export {
  isValidCSSColor,
  isValidSystemColor,
  isValidEntityColor,
  EntityColorSchema,
} from './validate'

export {
  DEFAULT_STATUS_COLORS,
  DEFAULT_STATUS_FALLBACK,
  getDefaultStatusColor,
} from './defaults'

export {
  migrateColorValue,
  migrateStatusColors,
  migrateLabelColors,
} from './migrate'
