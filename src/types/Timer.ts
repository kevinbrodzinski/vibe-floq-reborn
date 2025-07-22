/**
 * Works in both DOM (number) and Node (NodeJS.Timeout) environments
 */
export type TimerId = ReturnType<typeof setTimeout>;