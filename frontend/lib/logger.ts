// Stub for electron-log/renderer (not available in web mode)
const createScope = (name: string) => {
  const scopedLog = (...args: unknown[]) => console.log(`[${name}]`, ...args)
  scopedLog.info = (...args: unknown[]) => console.info(`[${name}]`, ...args)
  scopedLog.warn = (...args: unknown[]) => console.warn(`[${name}]`, ...args)
  scopedLog.error = (...args: unknown[]) => console.error(`[${name}]`, ...args)
  scopedLog.debug = (...args: unknown[]) => console.debug(`[${name}]`, ...args)
  scopedLog.verbose = (...args: unknown[]) => console.debug(`[${name}]`, ...args)
  return scopedLog
}

const log = {
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  verbose: console.debug,
  scope: createScope,
}

// Export scoped loggers for renderer process
export const rendererLog = log.scope('renderer')
export const searchLog = log.scope('search')

export default log
