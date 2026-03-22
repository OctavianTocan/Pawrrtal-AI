/**
 * Renderer-side Performance Instrumentation
 *
 * Tracks session switch timing from click to render complete.
 * Logs via console in web mode (electron-log not available).
 *
 * Usage:
 *   // In SessionList click handler:
 *   rendererPerf.startSessionSwitch(sessionId)
 *
 *   // In ChatTabPanel when session loads:
 *   rendererPerf.markSessionSwitch(sessionId, 'session.loaded')
 *
 *   // When render is complete:
 *   rendererPerf.endSessionSwitch(sessionId)
 */

// Stub for electron-log/renderer
const log = {
  scope: (name: string) => {
    const scopedLog = (...args: unknown[]) => console.log(`[${name}]`, ...args)
    scopedLog.info = (...args: unknown[]) => console.info(`[${name}]`, ...args)
    scopedLog.warn = (...args: unknown[]) => console.warn(`[${name}]`, ...args)
    scopedLog.error = (...args: unknown[]) => console.error(`[${name}]`, ...args)
    scopedLog.debug = (...args: unknown[]) => console.debug(`[${name}]`, ...args)
    return scopedLog
  }
}

const perfLog = log.scope('perf')

interface SessionSwitchMetric {
  sessionId: string
  startTime: number
  marks: Array<{ name: string; elapsed: number }>
}

const activeMetrics = new Map<string, SessionSwitchMetric>()

export const rendererPerf = {
  startSessionSwitch(sessionId: string) {
    activeMetrics.set(sessionId, {
      sessionId,
      startTime: performance.now(),
      marks: [],
    })
  },

  markSessionSwitch(sessionId: string, name: string) {
    const metric = activeMetrics.get(sessionId)
    if (!metric) return
    metric.marks.push({
      name,
      elapsed: performance.now() - metric.startTime,
    })
  },

  endSessionSwitch(sessionId: string) {
    const metric = activeMetrics.get(sessionId)
    if (!metric) return
    const total = performance.now() - metric.startTime
    perfLog.info?.(`Session switch ${sessionId}: ${total.toFixed(1)}ms`, metric.marks)
    activeMetrics.delete(sessionId)
  },
}
