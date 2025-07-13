interface PostHogEvent {
  event: string;
  distinct_id: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export class PostHogClient {
  private apiKey: string;
  private host: string;

  constructor(apiKey?: string, host = 'https://eu.posthog.com') {
    this.apiKey = apiKey || Deno.env.get('POSTHOG_API_KEY') || '';
    this.host = host;
  }

  async capture(event: string, distinctId: string, properties?: Record<string, any>) {
    if (!this.apiKey) {
      console.warn('PostHog API key not configured, skipping event capture');
      return;
    }

    const payload: PostHogEvent = {
      event,
      distinct_id: distinctId,
      properties: {
        ...properties,
        $lib: 'supabase-edge-function',
        $lib_version: '1.0.0',
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn('PostHog capture failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('PostHog capture error:', error);
    }
  }
}

export const posthog = new PostHogClient();