type LogFields = Record<string, unknown>

function base(level: string, msg: string, fields?: LogFields) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  }
  console.log(JSON.stringify(line))
}

export const log = {
  info(msg: string, fields?: LogFields) {
    base('info', msg, fields)
  },
  warn(msg: string, fields?: LogFields) {
    base('warn', msg, fields)
  },
  error(msg: string, fields?: LogFields) {
    base('error', msg, fields)
  },
}
