let lastError: string | null = null;

export function getLastVeniceError() {
  return lastError;
}

export async function editImage(prompt: string, currentImageUrl: string): Promise<string> {
  lastError = null;
  console.log('[Venice] Request', { prompt, currentImageUrl });
  const resp = await fetch('/api/venice-edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageUrl: currentImageUrl })
  });

  const raw = await resp.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch {
    console.warn('[Venice] Non-JSON response', raw.slice(0, 200));
  }

  if (!resp.ok) {
    lastError = `(${resp.status}) ${data?.error || raw.slice(0, 120)}`;
    console.error('[Venice] Error response', { status: resp.status, data });
    throw new Error(lastError);
  }

  const imageUrl =
    data.imageUrl ||
    data.image_url ||
    (Array.isArray(data.images) ? data.images[0]?.url : undefined) ||
    data.url ||
    (data?.data && Array.isArray(data.data) ? data.data[0]?.url : undefined);

  if (!imageUrl) {
    // If base64 maybe present inside data.image
    if (typeof data.image === 'string' && data.image.length > 100) {
      return `data:image/png;base64,${data.image}`;
    }
    lastError = 'No imageUrl found in successful response';
    console.error('[Venice] Missing image URL', data);
    throw new Error(lastError);
  }

  console.log('[Venice] Success', { imageUrl });
  return imageUrl;
}