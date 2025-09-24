// TypeScript assertions to bypass Supabase typing issues temporarily
// This file provides helper functions to cast types properly for database operations

export const castToAny = <T>(value: T): any => value as any;

export const castSupabaseInsert = <T>(value: T): any => value as any;

export const castSupabaseFilter = <T>(value: T): any => value as any;

export const castSupabaseArray = <T>(value: T[]): any => value as any;

export const castString = (value: string): any => value as any;

export const castStringArray = (value: string[]): any => value as any;