export function setCSSVar(name: string, value: string | undefined) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(name, value ?? '');
}

export function setVibeRing(hex?: string) {
  setCSSVar('--vibe-ring', hex ?? '');
}