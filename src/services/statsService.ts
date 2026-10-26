import { API_BASE_URL } from '@/config/constants';

export interface Stats {
  documentsGenerated: number;
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE_URL}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export interface SocialProofUser {
  colorIndex: number;
  letter: string;
}

export interface SocialProof {
  count: number;
  recentUsers: SocialProofUser[];
}

export async function fetchSocialProof(): Promise<SocialProof> {
  const res = await fetch(`${API_BASE_URL}/social-proof`);
  if (!res.ok) throw new Error('Failed to fetch social proof');
  return res.json();
}
