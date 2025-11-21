let lastError: string | null = null;
let lastDebugMeta: any = null;

export function getLastVeniceError() {
  return lastError;
}

export function getLastVeniceDebug() {
  return lastDebugMeta;
}

export async function editImage(
  prompt: string,
  currentImageUrl: string,
  debug: boolean = true
): Promise<string> {
  lastError = null;
  lastDebugMeta = null;

  const resp = await fetch(`/api/venice-edit${debug ? '?debug=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageUrl: currentImageUrl, debug })
  });

  const raw = await resp.text();
  let data: any = {};
  try {
    data = JSON.parse(raw);
  } catch {
    lastError = 'Non-JSON response from proxy';
    throw new Error(lastError);
  }

  if (!resp.ok) {
    lastError = data?.error || `Status ${resp.status}`;
    lastDebugMeta = data?.meta;
    throw new Error(lastError);
  }

  lastDebugMeta = data?.meta;
  const imageUrl =
    data?.imageUrl ||
    data?.image_url ||
    (Array.isArray(data?.images) ? data.images[0]?.url : undefined) ||
    data?.url ||
    (data?.data && Array.isArray(data.data) ? data.data[0]?.url : undefined);

  if (!imageUrl) {
    lastError = 'No imageUrl in success response';
    throw new Error(lastError);
  }

  return imageUrl;
}