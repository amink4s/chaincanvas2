let lastError: string | null = null;
let lastDebug: any = null;

export function getLastVeniceError() {
  return lastError;
}
export function getLastVeniceDebug() {
  return lastDebug;
}

/**
 * Calls proxy which returns a dataUrl (base64 image).
 */
export async function editImage(prompt: string, currentImageUrl: string, debug = true): Promise<string> {
  lastError = null;
  lastDebug = null;

  const resp = await fetch(`/api/venice-edit${debug ? '?debug=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageUrl: currentImageUrl, debug })
  });

  const text = await resp.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    lastError = 'Non-JSON response from proxy';
    throw new Error(lastError);
  }

  if (!resp.ok) {
    lastError = data?.error || `Status ${resp.status}`;
    lastDebug = data?.meta;
    throw new Error(lastError);
  }

  lastDebug = data?.meta;
  const dataUrl: string | undefined = data?.dataUrl;
  if (!dataUrl) {
    lastError = 'No dataUrl in success response';
    throw new Error(lastError);
  }
  return dataUrl;
}