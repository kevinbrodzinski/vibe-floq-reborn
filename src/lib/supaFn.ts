export function supaFn(path: string, accessToken: string | null, body: unknown) {
  const url = `https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}