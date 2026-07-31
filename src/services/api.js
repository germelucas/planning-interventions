// Point d'entrée unique des échanges HTTP avec le backend.
export async function api(url, options = {}) {
  const endpoint = `/api/handler?path=${encodeURIComponent(url)}`;
  const requestId =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      ...options.headers,
    },
  });

  // L'identifiant relie une action du navigateur à son log côté serveur.
  console.debug("[planning:api]", {
    requestId,
    method: options.method || "GET",
    url,
    status: response.status,
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Le service API est indisponible (${response.status}).`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}
