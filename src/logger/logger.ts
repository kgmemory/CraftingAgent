import pino from 'pino'

const isBrowser = typeof window !== 'undefined'

export const logger = pino(
  {
    level: 'info',
    base: isBrowser ? {} : { pid: process.pid, hostname: require('os').hostname() },
  },
  isBrowser ? pino.destination({ sync: false }) : pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  })
)

export function createLogger(context: Record<string, any>): pino.Logger {
  return logger.child(context)
}

