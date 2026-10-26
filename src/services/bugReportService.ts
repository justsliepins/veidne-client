import { API_BASE_URL } from '@/config/constants';

export interface BugReportRequest {
  subject: string;
  body: string;
  email?: string;
  image?: File;
}

export async function submitBugReport(req: BugReportRequest): Promise<void> {
  const formData = new FormData();
  formData.append('subject', req.subject);
  formData.append('body', req.body);
  if (req.email) formData.append('email', req.email);
  if (req.image) formData.append('image', req.image);

  const res = await fetch(`${API_BASE_URL}/bug-report`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed' }));
    throw new Error(data.error ?? 'Failed to submit bug report');
  }
}
