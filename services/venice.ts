export async function editImage(prompt: string, currentImageUrl?: string): Promise<string> {
    const resp = await fetch('/api/venice-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageUrl: currentImageUrl })
    });
  
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Edit failed (${resp.status}): ${text}`);
    }
  
    const data = await resp.json();
    if (!data?.imageUrl) throw new Error('No imageUrl returned');
    return data.imageUrl as string;
  }