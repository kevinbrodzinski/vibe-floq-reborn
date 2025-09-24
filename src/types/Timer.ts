/**
 * Cross-platform timer type aliases
 * Web: setTimeout/setInterval return number
 * Native: setTimeout/setInterval return NodeJS.Timeout
 */
export type TimerId = ReturnType<typeof setTimeout>;
export type IntervalId = ReturnType<typeof setInterval>;