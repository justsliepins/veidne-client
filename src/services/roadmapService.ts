import { apiGet, apiPost, apiDelete } from './api';

export interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  hasVoted: boolean;
}

interface RoadmapResponse {
  items: RoadmapItem[];
}

interface VoteResponse {
  voteCount: number;
  hasVoted: boolean;
}

export function fetchRoadmapItems(): Promise<RoadmapItem[]> {
  return apiGet<RoadmapResponse>('/roadmap').then((r) => r.items);
}

export function voteForItem(id: number): Promise<VoteResponse> {
  return apiPost<VoteResponse>(`/roadmap/${id}/vote`);
}

export function unvoteItem(id: number): Promise<VoteResponse> {
  return apiDelete<VoteResponse>(`/roadmap/${id}/vote`);
}
