/**
 * Global peek functionality for floq items
 */

export function openFloqPeek(id: string, stage?: "watch" | "consider" | "commit") {
  window.dispatchEvent(new CustomEvent("floq:peek", { detail: { id, stage } }));
}