export function supaFn(path: string, accessToken: string, body: unknown) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}