import pino from 'pino'

const isBrowser = typeof window !== 'undefined'

export const logger = pino({
  level: 'info',
  base: isBrowser ? {} : undefined,
  browser: isBrowser
    ? {
        asObject: false,
        write: {
          trace: (o) => console.debug(o),
          debug: (o) => console.debug(o),
          info: (o) => console.info(o),
          warn: (o) => console.warn(o),
          error: (o) => console.error(o),
          fatal: (o) => console.error(o),
        },
      }
    : undefined,
})

export function createLogger(context: Record<string, any>): pino.Logger {
  return logger.child(context)
}

