/** naive @mention extractor: returns array of usernames without '@' */
export const extractMentions = (text: string): string[] =>
  [...text.matchAll(/@([\w._-]{2,32})/g)].map((m) => m[1].toLowerCase());