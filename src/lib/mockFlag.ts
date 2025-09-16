import * as React from "react";

const STORAGE_KEY = "floqs:mocks";

function envDefault() {
  return (import.meta as any)?.env?.VITE_FLOQS_MOCKS === "1";
}

export function getMockFlag(): boolean {
  if (typeof window === "undefined") return envDefault();
  const s = localStorage.getItem(STORAGE_KEY);
  if (s === "1") return true;
  if (s === "0") return false;
  return envDefault();
}

export function setMockFlag(val: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, val ? "1" : "0");
  window.dispatchEvent(new CustomEvent("floqs:mock_toggle", { detail: { value: val } }));
}

export function useMockRuntimeFlag(): [boolean, (v: boolean) => void] {
  const [flag, setFlag] = React.useState(getMockFlag());
  React.useEffect(() => {
    const on = () => setFlag(getMockFlag());
    window.addEventListener("floqs:mock_toggle", on);
    return () => window.removeEventListener("floqs:mock_toggle", on);
  }, []);
  return [flag, setMockFlag];
}

export function initMockFromQueryOnce() {
  if (typeof window === "undefined") return;
  if ((window as any).__floqsMockInit) return;
  const url = new URL(window.location.href);
  const q = url.searchParams.get("mock");
  if (q === "1" || q === "true") setMockFlag(true);
  if (q === "0" || q === "false") setMockFlag(false);
  (window as any).__floqsMockInit = true;
}