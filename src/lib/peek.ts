export function openFloqPeek(id: string) {
  // web
  if (typeof window !== "undefined" && "dispatchEvent" in window) {
    window.dispatchEvent(new CustomEvent("floq:peek", { detail: { id } }));
    return;
  }
  // native (RN): replace with your nav or sheet opener
  // e.g., navigate("FloqDetail", { id });
}