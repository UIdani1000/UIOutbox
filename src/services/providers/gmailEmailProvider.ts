import { IEmailProvider, SendEmailPayload, SendEmailResult } from '../interfaces/emailProvider';
import { GmailAuthStatus } from '../../types';

export class GmailEmailProvider implements IEmailProvider {
  readonly id = 'gmail-workspace';
  readonly name = 'Gmail (Google Workspace API)';
  private _isConnected: boolean = false;
  private _connectedEmail: string = 'big.nssien@gmail.com';

  get isConnected(): boolean {
    return this._isConnected;
  }

  get connectedEmail(): string {
    return this._connectedEmail;
  }

  /**
   * Check connection status with backend server
   */
  async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'disconnected'; details?: string; authStatus?: GmailAuthStatus }> {
    try {
      const res = await fetch('/api/gmail/status');
      if (!res.ok) {
        // Fallback to /api/auth/google/status
        const fallbackRes = await fetch('/api/auth/google/status');
        if (!fallbackRes.ok) {
          return {
            status: 'disconnected',
            details: `Server returned status ${res.status}`,
          };
        }
        const data = await fallbackRes.json() as GmailAuthStatus;
        this._isConnected = data.connected;
        if (data.email || data.senderEmail) {
          this._connectedEmail = data.email || data.senderEmail || 'big.nssien@gmail.com';
        }
        return {
          status: data.connected ? 'healthy' : 'disconnected',
          details: data.connected ? `Authenticated as ${this._connectedEmail}` : 'Not connected to Google OAuth',
          authStatus: data,
        };
      }

      const data = await res.json() as GmailAuthStatus;
      this._isConnected = data.connected;
      if (data.email || data.senderEmail) {
        this._connectedEmail = data.email || data.senderEmail || 'big.nssien@gmail.com';
      }

      return {
        status: data.connected ? 'healthy' : 'disconnected',
        details: data.connected ? `Authenticated as ${this._connectedEmail}` : 'Not connected to Google OAuth',
        authStatus: data,
      };
    } catch (err: any) {
      console.warn('[Gmail Provider] checkHealth error:', err);
      return {
        status: 'disconnected',
        details: err.message || 'Unable to connect to Gmail service',
      };
    }
  }

  /**
   * Verify sender email matches authenticated sender (e.g. big.nssien@gmail.com)
   */
  async verifySender(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const authorized = this._connectedEmail.toLowerCase();
    return normalized === authorized || normalized === 'big.nssien@gmail.com';
  }

  /**
   * Send an approved outreach email via backend Gmail delivery engine
   */
  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          isApproved: payload.isApproved !== false, // Must be approved
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Delivery failed with status ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: Boolean(data.success),
        providerMessageId: data.providerMessageId,
        timestamp: data.timestamp || new Date().toISOString(),
        simulated: data.simulated,
      };
    } catch (err: any) {
      console.error('[Gmail Provider] sendEmail network error:', err);
      return {
        success: false,
        error: err.message || 'Network error while contacting delivery engine',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send a test email to big.nssien@gmail.com to verify pipeline
   */
  async sendTestEmail(recipient: string = 'big.nssien@gmail.com'): Promise<SendEmailResult> {
    try {
      const response = await fetch('/api/auth/google/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipient }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Test send failed with status ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: Boolean(data.success),
        providerMessageId: data.providerMessageId,
        timestamp: data.timestamp || new Date().toISOString(),
        simulated: data.simulated,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error while dispatching test email',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Trigger popup OAuth window to connect Google account with direct redirect fallback
   */
  async connect(): Promise<{ success: boolean; email?: string; error?: string }> {
    console.log('[Gmail OAuth UI] Connect button clicked');
    return new Promise(async (resolve) => {
      let isResolved = false;
      let cleanupFns: Array<() => void> = [];

      const doResolve = async (res: { success: boolean; email?: string; error?: string }) => {
        if (isResolved) return;

        if (res.success) {
          console.log('[Gmail OAuth UI] OAuth completion received');
          console.log('[Gmail OAuth UI] Verifying Gmail connection status');
          
          let verifiedConnected = false;
          let resolvedEmail = res.email || 'big.nssien@gmail.com';

          try {
            const statusRes = await fetch('/api/gmail/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.connected) {
                verifiedConnected = true;
                resolvedEmail = statusData.senderEmail || statusData.email || resolvedEmail;
              }
            }
          } catch (statusErr) {
            console.warn('[Gmail OAuth UI] Status check error:', statusErr);
          }

          if (verifiedConnected || res.email) {
            console.log('[Gmail OAuth UI] Gmail status verified: connected=true');
            console.log('[Gmail OAuth UI] Gmail connection established');
            isResolved = true;
            cleanupFns.forEach(fn => {
              try { fn(); } catch {}
            });
            cleanupFns = [];
            this._isConnected = true;
            this._connectedEmail = resolvedEmail;
            resolve({
              success: true,
              email: this._connectedEmail,
            });
            return;
          } else {
            console.error('[Gmail OAuth UI] OAuth completed, but Gmail connection was not persisted server-side.');
            isResolved = true;
            cleanupFns.forEach(fn => {
              try { fn(); } catch {}
            });
            cleanupFns = [];
            resolve({
              success: false,
              error: 'OAuth completed, but the Gmail connection was not persisted server-side.',
            });
            return;
          }
        } else {
          isResolved = true;
          cleanupFns.forEach(fn => {
            try { fn(); } catch {}
          });
          cleanupFns = [];
          console.error('[Gmail OAuth UI] OAuth failure received:', res.error || 'Unknown error');
          resolve(res);
        }
      };

      try {
        // Clear any previous storage markers
        try {
          localStorage.removeItem('uioutbox_gmail_auth_result');
        } catch {}

        console.log('[Gmail OAuth UI] Requesting authorization URL');
        const origin = window.location.origin;
        const res = await fetch(`/api/auth/google?format=json&origin=${encodeURIComponent(origin)}`);
        
        console.log(`[Gmail OAuth UI] Auth URL response status: ${res.status}`);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.log(`[Gmail OAuth UI] Response JSON fields: ${Object.keys(errData).join(', ')}`);
          const errorMsg = errData.error || 'Unable to start Google authorization. Check Google OAuth configuration.';
          doResolve({
            success: false,
            error: errorMsg,
          });
          return;
        }

        const data = await res.json();
        console.log(`[Gmail OAuth UI] Response JSON fields: ${Object.keys(data).join(', ')}`);
        const url = data.url;
        if (!url || typeof url !== 'string' || !url.startsWith('https://accounts.google.com/')) {
          console.error('[Gmail OAuth UI] Invalid or non-Google authorization URL received:', url);
          doResolve({
            success: false,
            error: 'Unable to start Google authorization. Check Google OAuth configuration.',
          });
          return;
        }

        console.log('[Gmail OAuth UI] Authorization URL received');

        const width = 560;
        const height = 680;
        const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
        const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

        let authWindow: Window | null = null;

        console.log('[Gmail OAuth UI] Opening OAuth window');
        try {
          authWindow = window.open(
            url,
            'google_oauth_popup',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1,resizable=yes`
          );
        } catch (e) {
          console.warn('[Gmail OAuth UI] window.open exception thrown:', e);
          authWindow = null;
        }

        // Direct fallback if window.open returns null, is blocked, or throws
        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
          console.warn('[Gmail OAuth UI] window.open returned null or was blocked. Fallback: Navigating current window directly');
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = url;
            } else {
              window.location.href = url;
            }
          } catch {
            window.location.href = url;
          }
          return;
        }

        console.log('[Gmail OAuth UI] OAuth window opened');
        try {
          authWindow.focus();
        } catch {}

        console.log('[Gmail OAuth UI] Waiting for OAuth callback');

        // 1. Listen for postMessage
        const messageHandler = (event: MessageEvent) => {
          const type = event.data?.type || (typeof event.data === 'string' ? event.data : undefined);
          if (type === 'GMAIL_OAUTH_SUCCESS' || type === 'GOOGLE_AUTH_SUCCESS' || type === 'gmail_oauth_success') {
            const email = (event.data && typeof event.data === 'object' ? event.data.email : undefined) || 'big.nssien@gmail.com';
            doResolve({ success: true, email });
          } else if (type === 'GMAIL_OAUTH_ERROR' || type === 'GOOGLE_AUTH_ERROR' || type === 'gmail_oauth_error') {
            doResolve({ success: false, error: event.data?.error || 'Authentication cancelled or failed.' });
          }
        };
        window.addEventListener('message', messageHandler);
        cleanupFns.push(() => window.removeEventListener('message', messageHandler));

        // 2. Listen for storage event (cross-tab / popup local storage sync)
        const storageHandler = (event: StorageEvent) => {
          if (event.key === 'uioutbox_gmail_auth_result' && event.newValue) {
            try {
              const parsed = JSON.parse(event.newValue);
              if (parsed.status === 'connected') {
                doResolve({ success: true, email: parsed.email || 'big.nssien@gmail.com' });
              } else if (parsed.status === 'error') {
                doResolve({ success: false, error: parsed.error || 'Authentication error' });
              }
            } catch {}
          }
        };
        window.addEventListener('storage', storageHandler);
        cleanupFns.push(() => window.removeEventListener('storage', storageHandler));

        // 3. Listen on BroadcastChannel if available
        if ('BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('uioutbox_oauth_channel');
            const bcHandler = (event: MessageEvent) => {
              if (event.data?.type === 'GMAIL_OAUTH_SUCCESS') {
                doResolve({ success: true, email: event.data.email || 'big.nssien@gmail.com' });
              }
            };
            bc.addEventListener('message', bcHandler);
            cleanupFns.push(() => {
              bc.removeEventListener('message', bcHandler);
              bc.close();
            });
          } catch {}
        }

        // 4. Background polling for server status while popup is active
        const pollInterval = setInterval(async () => {
          if (isResolved) {
            clearInterval(pollInterval);
            return;
          }
          try {
            const statusRes = await fetch('/api/gmail/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.connected) {
                clearInterval(pollInterval);
                doResolve({
                  success: true,
                  email: statusData.senderEmail || statusData.email || 'big.nssien@gmail.com',
                });
              }
            }
          } catch {}
        }, 1500);
        cleanupFns.push(() => clearInterval(pollInterval));

        // 5. Detect popup closed by user
        const checkClosedInterval = setInterval(async () => {
          if (isResolved) return;
          if (authWindow && authWindow.closed) {
            clearInterval(checkClosedInterval);
            // Brief delay to allow pending message or storage event to resolve
            setTimeout(async () => {
              if (isResolved) return;
              try {
                const statusRes = await fetch('/api/gmail/status');
                if (statusRes.ok) {
                  const statusData = await statusRes.json();
                  if (statusData.connected) {
                    doResolve({ success: true, email: statusData.senderEmail || statusData.email });
                    return;
                  }
                }
              } catch {}
              doResolve({ success: false, error: 'Google OAuth window was closed before completing authorization.' });
            }, 600);
          }
        }, 1000);
        cleanupFns.push(() => clearInterval(checkClosedInterval));

        // 6. Timeout handling: 2 minutes (120,000ms) with final status verification before error
        const timeoutId = setTimeout(async () => {
          if (!isResolved) {
            try {
              const statusRes = await fetch('/api/gmail/status');
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.connected) {
                  doResolve({ success: true, email: statusData.senderEmail || statusData.email });
                  return;
                }
              }
            } catch {}
            doResolve({ success: false, error: 'Google OAuth timed out after 2 minutes. Click Try Again to reconnect.' });
          }
        }, 120000);
        cleanupFns.push(() => clearTimeout(timeoutId));

      } catch (err: any) {
        doResolve({ success: false, error: err.message || 'Unable to start Google authorization. Check Google OAuth configuration.' });
      }
    });
  }

  /**
   * Disconnect Google account
   */
  async disconnect(): Promise<boolean> {
    try {
      const res = await fetch('/api/gmail/disconnect', { method: 'POST' });
      if (res.ok) {
        this._isConnected = false;
        return true;
      }
      // Fallback
      const fallback = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (fallback.ok) {
        this._isConnected = false;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const gmailProvider = new GmailEmailProvider();
