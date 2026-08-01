import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

export interface VercelRequest extends IncomingMessage {
  method?: string;
  headers: IncomingHttpHeaders;
  query: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
}

export interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
}
