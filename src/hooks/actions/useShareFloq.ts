export function useShareFloq() {
  return {
    share: async ({ floqId, name }: { floqId: string; name?: string }) => {
      const url = `${window.location.origin}/floq/${floqId}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: name ?? "Floq", url });
        } else {
          await navigator.clipboard.writeText(url);
        }
      } catch {}
    },
  };
}