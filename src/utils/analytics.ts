const VISITOR_ID_KEY = 'aws_dashboard_visitor_id';
const API_URL = import.meta.env.VITE_API_URL || '';

function generateVisitorId(): string {
  return 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export type AnalyticsEvent =
  | 'page_view'
  | 'click_free_test'
  | 'view_instructions'
  | 'click_connect'
  | 'connect_success'
  | 'connect_error';

interface TrackOptions {
  metadata?: Record<string, unknown>;
}

export async function track(event: AnalyticsEvent, options: TrackOptions = {}): Promise<void> {
  const visitorId = getVisitorId();

  try {
    await fetch(`${API_URL}/api/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorId,
        event,
        metadata: options.metadata || null,
        referrer: document.referrer || null,
      }),
    });
  } catch (error) {
    // Silently fail - don't break the app if analytics fails
    console.warn('Analytics tracking failed:', error);
  }
}

// Convenience functions
export const trackPageView = (page: string) => track('page_view', { metadata: { page } });
export const trackClickFreeTest = () => track('click_free_test');
export const trackViewInstructions = (step?: number) => track('view_instructions', { metadata: { step } });
export const trackClickConnect = () => track('click_connect');
export const trackConnectSuccess = (workspaceId: string) => track('connect_success', { metadata: { workspaceId } });
export const trackConnectError = (error: string) => track('connect_error', { metadata: { error } });
