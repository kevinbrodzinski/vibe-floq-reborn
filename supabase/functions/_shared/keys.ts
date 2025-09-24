// Environment variable utilities for edge functions

export function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return Deno.env.get(key) || defaultValue;
}