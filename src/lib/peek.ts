/**
 * Global peek functionality for floq items
 */

export function openFloqPeek(id: string) {
  window.dispatchEvent(new CustomEvent("floq:peek", { detail: { id } }));
}