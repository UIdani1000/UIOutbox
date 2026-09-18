// =============================================================================
// Email Provider Service Interface
// Allows swappable sending infrastructure (Gmail / Google Workspace, Resend, SendGrid, etc.)
// =============================================================================

import { SendEmailPayload, SendEmailResult, GmailAuthStatus } from '../../types';

export type { SendEmailPayload, SendEmailResult };

export interface IEmailProvider {
  readonly id: string;
  readonly name: string;
  readonly isConnected: boolean;

  /**
   * Send an approved outreach email
   */
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;

  /**
   * Verify sender signature and authentication
   */
  verifySender(email: string): Promise<boolean>;

  /**
   * Check connection status
   */
  checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'disconnected'; details?: string; authStatus?: GmailAuthStatus }>;
}

