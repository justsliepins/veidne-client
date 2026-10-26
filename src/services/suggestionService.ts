import { API_BASE_URL } from '@/config/constants';

export async function submitSuggestion(req: { title: string; description: string; stripeSessionId: string }): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/suggestions`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? 'Failed'); }
}
