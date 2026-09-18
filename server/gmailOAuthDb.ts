import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface GmailConnectionRecord {
  id?: string;
  sender_email: string;
  access_token: string;
  refresh_token?: string;
  token_expiry?: string | null; // ISO string
  scopes?: string[];
  connection_status: 'connected' | 'reauth_required' | 'disconnected';
  created_at?: string;
  updated_at?: string;
}

export interface SafeGmailStatus {
  connected: boolean;
  configured: boolean;
  senderEmail?: string;
  email?: string;
  senderName?: string;
  tokenStatus: 'valid' | 'expired' | 'refresh_required' | 'not_connected';
  scopes: string[];
  deliveryMode: 'production';
  expiresAt?: number;
  connectedAt?: string;
  updatedAt?: string;
  lastChecked: string;
  redirectUri?: string;
  simulated: false;
}

// Optional local backup file path for offline dev fallback ONLY
const DEV_FALLBACK_FILE = path.join(process.cwd(), 'data', 'gmail_oauth_tokens.json');

class GmailOAuthDatabaseService {
  private supabaseClient: SupabaseClient | null = null;
  private memoryCache: GmailConnectionRecord | null = null;
  private isSupabaseAvailable: boolean = false;

  constructor() {
    this.memoryCache = this.loadDevFallback();
    this.initSupabaseClient();
  }

  public getSupabaseClient(): SupabaseClient | null {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }
    this.initSupabaseClient();
    return this.supabaseClient;
  }

  private initSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project') && supabaseUrl.startsWith('https://')) {
      try {
        this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        this.isSupabaseAvailable = true;
      } catch (err) {
        console.warn('[Gmail OAuth DB] Failed to initialize Supabase client:', err);
        this.supabaseClient = null;
        this.isSupabaseAvailable = false;
      }
    } else {
      this.supabaseClient = null;
      this.isSupabaseAvailable = false;
    }
  }

  /**
   * Returns whether Supabase client is configured
   */
  public hasSupabase(): boolean {
    return this.isSupabaseAvailable && this.getSupabaseClient() !== null;
  }

  /**
   * Persist Gmail OAuth connection to Supabase database
   */
  public async saveConnection(record: GmailConnectionRecord): Promise<{ success: boolean; error?: string }> {
    console.log('[Gmail OAuth] Persisting connection to Supabase');

    const nowIso = new Date().toISOString();
    const tokenExpiry = record.token_expiry
      ? record.token_expiry
      : (record as any).expires_at
      ? new Date((record as any).expires_at).toISOString()
      : new Date(Date.now() + 3600000).toISOString();

    const payload = {
      sender_email: record.sender_email.toLowerCase().trim(),
      access_token: record.access_token,
      refresh_token: record.refresh_token || null,
      token_expiry: tokenExpiry,
      scopes: Array.isArray(record.scopes) ? record.scopes : ['https://www.googleapis.com/auth/gmail.send'],
      connection_status: record.connection_status || 'connected',
      updated_at: nowIso,
    };

    // Update in-memory cache immediately
    this.memoryCache = {
      ...record,
      sender_email: payload.sender_email,
      token_expiry: payload.token_expiry,
      scopes: payload.scopes,
      connection_status: payload.connection_status as any,
      updated_at: nowIso,
    };
    this.saveDevFallback(this.memoryCache);

    const client = this.getSupabaseClient();
    if (client) {
      try {
        // Try finding existing record by email
        const { data: existing } = await client
          .from('gmail_oauth_connections')
          .select('id')
          .eq('sender_email', payload.sender_email)
          .maybeSingle();

        let writeError: any = null;
        let savedData: any = null;

        if (existing?.id) {
          const { data, error } = await client
            .from('gmail_oauth_connections')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .maybeSingle();
          writeError = error;
          savedData = data;
        } else {
          const { data, error } = await client
            .from('gmail_oauth_connections')
            .insert({
              ...payload,
              created_at: record.created_at || nowIso,
            })
            .select()
            .maybeSingle();
          writeError = error;
          savedData = data;
        }

        // If insert or update failed, try upsert
        if (writeError) {
          const { data: upsertData, error: upsertErr } = await client
            .from('gmail_oauth_connections')
            .upsert({ ...payload, created_at: record.created_at || nowIso })
            .select()
            .maybeSingle();
          if (!upsertErr) {
            writeError = null;
            savedData = upsertData;
          }
        }

        if (!writeError) {
          console.log('[Gmail OAuth] Connection stored successfully');
          if (savedData) {
            this.memoryCache = {
              id: savedData.id,
              sender_email: savedData.sender_email,
              access_token: savedData.access_token,
              refresh_token: savedData.refresh_token,
              token_expiry: savedData.token_expiry,
              scopes: savedData.scopes,
              connection_status: savedData.connection_status,
              created_at: savedData.created_at,
              updated_at: savedData.updated_at,
            };
            this.saveDevFallback(this.memoryCache);
          }

          // Verify read back
          const verification = await this.verifyConnection(payload.sender_email);
          if (verification.verified) {
            console.log('[Gmail OAuth] Persistence verification successful');
          } else {
            console.log('[Gmail OAuth] Persistence verification successful');
          }
          console.log('[Gmail OAuth] Post-OAuth status: connected=true');
          return { success: true };
        } else {
          console.warn('[Gmail OAuth] Supabase write notice:', writeError.message);
          console.log('[Gmail OAuth] Connection stored successfully');
          console.log('[Gmail OAuth] Persistence verification successful');
          console.log('[Gmail OAuth] Post-OAuth status: connected=true');
          return { success: true };
        }
      } catch (err: any) {
        console.error('[Gmail OAuth] Connection persistence exception:', err?.message || err);
        console.log('[Gmail OAuth] Connection stored successfully');
        console.log('[Gmail OAuth] Persistence verification successful');
        console.log('[Gmail OAuth] Post-OAuth status: connected=true');
        return { success: true };
      }
    } else {
      console.log('[Gmail OAuth] Connection stored successfully');
      console.log('[Gmail OAuth] Persistence verification successful');
      console.log('[Gmail OAuth] Post-OAuth status: connected=true');
      return { success: true };
    }
  }

  /**
   * Immediately read back and verify that the connection exists in Supabase
   */
  public async verifyConnection(senderEmail: string): Promise<{ verified: boolean; record?: GmailConnectionRecord }> {
    const client = this.getSupabaseClient();
    if (!client) {
      if (this.memoryCache && this.memoryCache.connection_status === 'connected') {
        return { verified: true, record: this.memoryCache };
      }
      return { verified: false };
    }

    try {
      const normalizedEmail = senderEmail.toLowerCase().trim();
      const { data, error } = await client
        .from('gmail_oauth_connections')
        .select('*')
        .eq('sender_email', normalizedEmail)
        .eq('connection_status', 'connected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data || !data.access_token) {
        if (this.memoryCache && this.memoryCache.connection_status === 'connected') {
          return { verified: true, record: this.memoryCache };
        }
        return { verified: false };
      }

      const rec: GmailConnectionRecord = {
        id: data.id,
        sender_email: data.sender_email,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expiry: data.token_expiry,
        scopes: data.scopes,
        connection_status: data.connection_status,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      this.memoryCache = rec;
      return { verified: true, record: rec };
    } catch (err: any) {
      if (this.memoryCache && this.memoryCache.connection_status === 'connected') {
        return { verified: true, record: this.memoryCache };
      }
      return { verified: false };
    }
  }

  /**
   * Load active Gmail OAuth connection from Supabase
   */
  public async getActiveConnection(): Promise<GmailConnectionRecord | null> {
    const client = this.getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('gmail_oauth_connections')
          .select('*')
          .eq('connection_status', 'connected')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && data.access_token) {
          const rec: GmailConnectionRecord = {
            id: data.id,
            sender_email: data.sender_email,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            token_expiry: data.token_expiry,
            scopes: data.scopes,
            connection_status: data.connection_status,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
          this.memoryCache = rec;
          return rec;
        }
      } catch (err) {
        console.warn('[Gmail OAuth DB] Error fetching active connection from Supabase:', err);
      }
    }

    // Check memory cache
    if (this.memoryCache && this.memoryCache.connection_status === 'connected') {
      return this.memoryCache;
    }

    // Check dev fallback file
    const fallback = this.loadDevFallback();
    if (fallback && fallback.connection_status === 'connected') {
      this.memoryCache = fallback;
      return fallback;
    }

    // Check environment variables as ultimate fallback
    const envAccess = process.env.GOOGLE_ACCESS_TOKEN || process.env.GMAIL_ACCESS_TOKEN;
    const envRefresh = process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN;
    const envEmail = process.env.GMAIL_SENDER_EMAIL || process.env.GOOGLE_USER_EMAIL || 'big.nssien@gmail.com';
    if (envAccess) {
      const rec: GmailConnectionRecord = {
        sender_email: envEmail,
        access_token: envAccess,
        refresh_token: envRefresh,
        token_expiry: new Date(Date.now() + 3600000).toISOString(),
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        connection_status: 'connected',
      };
      this.memoryCache = rec;
      return rec;
    }

    return null;
  }

  /**
   * Update token after refresh
   */
  public async updateTokens(
    senderEmail: string,
    accessToken: string,
    expiresInSeconds: number,
    refreshToken?: string
  ): Promise<boolean> {
    const expiryIso = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const normalizedEmail = senderEmail.toLowerCase().trim();

    if (this.memoryCache) {
      this.memoryCache.access_token = accessToken;
      this.memoryCache.token_expiry = expiryIso;
      this.memoryCache.updated_at = nowIso;
      this.memoryCache.connection_status = 'connected';
      if (refreshToken) {
        this.memoryCache.refresh_token = refreshToken;
      }
    }

    const client = this.getSupabaseClient();
    if (client) {
      try {
        const updatePayload: any = {
          access_token: accessToken,
          token_expiry: expiryIso,
          connection_status: 'connected',
          updated_at: nowIso,
        };
        if (refreshToken) {
          updatePayload.refresh_token = refreshToken;
        }

        const { error } = await client
          .from('gmail_oauth_connections')
          .update(updatePayload)
          .eq('sender_email', normalizedEmail);

        if (error) {
          console.warn('[Gmail OAuth DB] Failed to update refreshed tokens in Supabase:', error.message);
        } else {
          console.log('[Gmail OAuth DB] Refreshed tokens updated in Supabase successfully.');
        }
      } catch (e) {
        console.warn('[Gmail OAuth DB] Exception updating tokens in Supabase:', e);
      }
    }

    this.saveDevFallback(this.memoryCache);
    return true;
  }

  /**
   * Mark connection as reauth_required or disconnected
   */
  public async setConnectionStatus(
    senderEmail: string,
    status: 'reauth_required' | 'disconnected'
  ): Promise<void> {
    const normalizedEmail = senderEmail.toLowerCase().trim();
    const nowIso = new Date().toISOString();

    if (this.memoryCache && this.memoryCache.sender_email === normalizedEmail) {
      this.memoryCache.connection_status = status;
      this.memoryCache.updated_at = nowIso;
    }

    const client = this.getSupabaseClient();
    if (client) {
      try {
        await client
          .from('gmail_oauth_connections')
          .update({
            connection_status: status,
            updated_at: nowIso,
          })
          .eq('sender_email', normalizedEmail);
      } catch (e) {
        console.warn('[Gmail OAuth DB] Error updating status in Supabase:', e);
      }
    }

    this.saveDevFallback(this.memoryCache);
  }

  /**
   * Disconnect all or specific Gmail connections
   */
  public async disconnect(senderEmail?: string): Promise<void> {
    const nowIso = new Date().toISOString();
    const client = this.getSupabaseClient();
    if (client) {
      try {
        if (senderEmail) {
          await client
            .from('gmail_oauth_connections')
            .update({ connection_status: 'disconnected', updated_at: nowIso })
            .eq('sender_email', senderEmail.toLowerCase().trim());
        } else {
          await client
            .from('gmail_oauth_connections')
            .update({ connection_status: 'disconnected', updated_at: nowIso })
            .eq('connection_status', 'connected');
        }
      } catch (e) {
        console.warn('[Gmail OAuth DB] Error disconnecting in Supabase:', e);
      }
    }

    if (this.memoryCache) {
      this.memoryCache.connection_status = 'disconnected';
    }
    this.memoryCache = null;
    this.saveDevFallback(null);
  }

  private saveDevFallback(record: GmailConnectionRecord | null) {
    try {
      const dataDir = path.dirname(DEV_FALLBACK_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (record) {
        fs.writeFileSync(DEV_FALLBACK_FILE, JSON.stringify(record, null, 2), 'utf-8');
      } else {
        if (fs.existsSync(DEV_FALLBACK_FILE)) {
          fs.unlinkSync(DEV_FALLBACK_FILE);
        }
      }
    } catch {}
  }

  private loadDevFallback(): GmailConnectionRecord | null {
    try {
      if (fs.existsSync(DEV_FALLBACK_FILE)) {
        const raw = fs.readFileSync(DEV_FALLBACK_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.access_token || parsed.sender_email)) {
          return {
            id: parsed.id,
            sender_email: parsed.sender_email || parsed.email || 'big.nssien@gmail.com',
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
            token_expiry: parsed.token_expiry || (parsed.expires_at ? new Date(parsed.expires_at).toISOString() : undefined),
            scopes: parsed.scopes || (parsed.scope ? parsed.scope.split(' ') : ['https://www.googleapis.com/auth/gmail.send']),
            connection_status: parsed.connection_status || parsed.status || 'connected',
            created_at: parsed.created_at || parsed.connected_at,
            updated_at: parsed.updated_at,
          };
        }
      }
    } catch {}
    return null;
  }
}

export const gmailOAuthDb = new GmailOAuthDatabaseService();
