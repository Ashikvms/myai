import winston from 'winston';

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'pushToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'ANTHROPIC_API_KEY',
];

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redact(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

const redactFormat = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      (info as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      (info as Record<string, unknown>)[key] = redact(value);
    }
  }
  return info;
});

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  ),
  defaultMeta: { service: 'life-admin-api' },
  transports: [new winston.transports.Console()],
});
