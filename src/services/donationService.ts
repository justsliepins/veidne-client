import { API_BASE_URL } from '@/config/constants';

export interface CreateSessionRequest {
  amountCents: number; currency: string; successUrl: string; cancelUrl: string;
}

export interface CheckoutSession {
  /** Stripe-hosted Checkout page to send the user to. */
  sessionUrl: string;
  /** Stripe's live/test flag for the key that created the session. */
  livemode: boolean;
}

export async function createDonationSession(req: CreateSessionRequest): Promise<CheckoutSession> {
  const res = await fetch(`${API_BASE_URL}/donations/create-session`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`POST /donations/create-session failed: ${res.status}`);
  return res.json();
}

export type DonationStatus = 'Pending' | 'Completed' | 'Failed';

export interface DonationSession {
  amountCents: number; currency: string; status: DonationStatus;
}

/** Looks up a Checkout Session the API created. Resolves null when the API
 *  does not know the id (404); throws on any other failure. */
export async function getDonationSession(sessionId: string): Promise<DonationSession | null> {
  const res = await fetch(`${API_BASE_URL}/donations/session/${encodeURIComponent(sessionId)}`, {
    credentials: 'include',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /donations/session failed: ${res.status}`);
  return res.json();
}
