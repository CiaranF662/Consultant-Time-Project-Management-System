/**
 * Error logging utility for API routes
 * Provides structured logging for debugging and monitoring
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export interface LogContext {
  userId?: string;
  projectId?: string;
  phaseId?: string;
  allocationId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Formats a log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const { level, message, timestamp, context, error } = entry;

  let output = `[${timestamp}] ${level}: ${message}`;

  if (context && Object.keys(context).length > 0) {
    output += `\n  Context: ${JSON.stringify(context, null, 2)}`;
  }

  if (error) {
    output += `\n  Error: ${error.name} - ${error.message}`;
    if (error.stack) {
      output += `\n  Stack: ${error.stack}`;
    }
  }

  return output;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  const formattedLog = formatLogEntry(entry);

  // In production, you could send to external logging service
  // For now, log to console with appropriate method
  switch (level) {
    case LogLevel.ERROR:
      console.error(formattedLog);
      break;
    case LogLevel.WARN:
      console.warn(formattedLog);
      break;
    case LogLevel.DEBUG:
      if (process.env.NODE_ENV === 'development') {
        console.debug(formattedLog);
      }
      break;
    default:
      console.log(formattedLog);
  }

  // In production, you might also want to:
  // - Send to external service (e.g., Sentry, LogRocket, Datadog)
  // - Store in database for audit trail
  // - Send alerts for critical errors
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: LogContext) {
  log(LogLevel.INFO, message, context);
}

/**
 * Log warning message
 */
export function logWarning(message: string, context?: LogContext) {
  log(LogLevel.WARN, message, context);
}

/**
 * Log error message
 */
export function logError(message: string, error?: Error, context?: LogContext) {
  log(LogLevel.ERROR, message, context, error);
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message: string, context?: LogContext) {
  log(LogLevel.DEBUG, message, context);
}

/**
 * Log API request
 */
export function logApiRequest(method: string, endpoint: string, context?: LogContext) {
  logInfo(`API Request: ${method} ${endpoint}`, {
    ...context,
    method,
    endpoint
  });
}

/**
 * Log API response
 */
export function logApiResponse(
  method: string,
  endpoint: string,
  status: number,
  context?: LogContext
) {
  const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;
  log(level, `API Response: ${method} ${endpoint} - ${status}`, {
    ...context,
    method,
    endpoint,
    status
  });
}

/**
 * Log database operation
 */
export function logDatabaseOperation(
  operation: string,
  model: string,
  context?: LogContext
) {
  logDebug(`Database ${operation}: ${model}`, {
    ...context,
    operation,
    model
  });
}

/**
 * Log authentication event
 */
export function logAuthEvent(event: string, userId?: string, success: boolean = true) {
  const level = success ? LogLevel.INFO : LogLevel.WARN;
  log(level, `Auth Event: ${event}`, {
    userId,
    success
  });
}

/**
 * Log authorization failure
 */
export function logAuthorizationFailure(
  userId: string,
  action: string,
  resource: string,
  context?: LogContext
) {
  logWarning(`Authorization Failed: User ${userId} attempted ${action} on ${resource}`, {
    ...context,
    userId,
    action,
    resource
  });
}

/**
 * Log validation error
 */
export function logValidationError(
  endpoint: string,
  errors: Array<{ field: string; message: string }>,
  context?: LogContext
) {
  logWarning(`Validation Failed: ${endpoint}`, {
    ...context,
    endpoint,
    validationErrors: errors
  });
}
