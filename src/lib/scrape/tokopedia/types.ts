import type { DraftProductSnapshot } from '@/lib/domain/contracts';

export interface TokopediaResolvedPage {
  initialUrl: string;
  finalUrl: string;
  html: string;
  response: Response;
  redirects: readonly string[];
}

export type TokopediaScrapeFailureReason = 'invalid_url' | 'network' | 'blocked' | 'unreliable';

export interface TokopediaScrapeSuccess {
  ok: true;
  finalUrl: string;
  snapshot: DraftProductSnapshot;
}

export interface TokopediaScrapeFailure {
  ok: false;
  finalUrl?: string;
  reason: TokopediaScrapeFailureReason;
  message: string;
}

export type TokopediaScrapeResult = TokopediaScrapeSuccess | TokopediaScrapeFailure;

export interface TokopediaScrapeOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRedirects?: number;
}
