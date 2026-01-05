import pino from 'pino'

export const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
})

export function createLogger(context: Record<string, any>): pino.Logger {
  return logger.child(context)
}

