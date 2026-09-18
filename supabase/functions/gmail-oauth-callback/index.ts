import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface StatePayload {
  appUrl?: string;
  origin?: string;
  redirectUri?: string;
  timestamp?: number;
  nonce?: string;
  clientId?: string;
  clientSecret?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  console.log("[Gmail OAuth Edge] Callback received");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Parse state if present
  let stateData: StatePayload = {};
  if (state) {
    try {
      const decoded = atob(state);
      stateData = JSON.parse(decoded);
    } catch {
      try {
        const decoded = decodeURIComponent(atob(decodeURIComponent(state)));
        stateData = JSON.parse(decoded);
      } catch (e) {
        console.warn("[Gmail OAuth Edge] Could not parse OAuth state:", e);
      }
    }
  }

  const appUrl = stateData.appUrl || stateData.origin || Deno.env.get("APP_URL") || "https://uioutbox01.ai.studio";
  const cleanAppUrl = appUrl.replace(/\/+$/, "");

  // 1. Handle OAuth error from Google
  if (error) {
    const errorMsg = errorDescription || error || "Google authorization was denied or cancelled.";
    console.warn(`[Gmail OAuth Edge] Google OAuth error returned: ${error}`);

    const errorHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Authorization Cancelled - UIOutbox</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="background:#09090b;color:#f87171;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;">
    <div style="padding:32px;background:#18181b;border:1px solid #7f1d1d;border-radius:16px;max-width:420px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;font-size:24px;">✕</div>
      <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#f4f4f5;">Authorization Cancelled</h2>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 24px 0;line-height:1.5;">${errorMsg}</p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button onclick="window.close()" style="padding:10px 20px;background:#27272a;color:#fff;border:1px solid #3f3f46;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Close Window</button>
        <a href="${cleanAppUrl}/settings?gmail=error&reason=${encodeURIComponent(errorMsg)}" style="padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;">Return to App</a>
      </div>
    </div>
    <script>
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'GMAIL_OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'GMAIL_OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
        }
        localStorage.setItem('uioutbox_gmail_auth_result', JSON.stringify({ status: 'error', error: ${JSON.stringify(errorMsg)}, time: Date.now() }));
      } catch (e) {}
      setTimeout(() => {
        if (window.opener) {
          window.close();
        } else {
          window.location.replace('${cleanAppUrl}/settings?gmail=error&reason=${encodeURIComponent(errorMsg)}');
        }
      }, 2500);
    </script>
  </body>
</html>`;

    return new Response(errorHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 2. Validate authorization code
  if (!code) {
    console.warn("[Gmail OAuth Edge] Authorization code missing in callback request");
    return new Response("Authorization code is missing from OAuth callback.", { status: 400 });
  }

  console.log("[Gmail OAuth Edge] Authorization code present");

  // 3. Resolve credentials and redirect URI
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || stateData.clientId;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || stateData.clientSecret;

  if (!clientId || !clientSecret) {
    console.error("[Gmail OAuth Edge] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    const errorMsg = "Google OAuth credentials not configured in Supabase Edge Function environment.";
    return new Response(
      `<!DOCTYPE html><html><body style="background:#09090b;color:#f87171;font-family:sans-serif;padding:30px;text-align:center;"><h3>Configuration Error</h3><p>${errorMsg}</p><button onclick="window.close()">Close</button></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Exact redirect URI used during authorization URL generation
  const redirectUri = stateData.redirectUri || `${url.origin}${url.pathname}`;

  try {
    // 4. Exchange authorization code with Google OAuth endpoint
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`[Gmail OAuth Edge] Google token exchange failed with status ${tokenRes.status}:`, errText);
      const errorMsg = `Google OAuth exchange failed: ${errText}`;
      return new Response(
        `<!DOCTYPE html><html><body style="background:#09090b;color:#f87171;font-family:sans-serif;padding:30px;text-align:center;"><h3>Token Exchange Failed</h3><p>${errorMsg}</p><button onclick="window.close()">Close</button></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const tokenData = await tokenRes.json();
    console.log("[Gmail OAuth Edge] Token exchange successful");

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = typeof tokenData.expires_in === "number" ? tokenData.expires_in : 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
    const scopes = tokenData.scope ? tokenData.scope.split(" ") : [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ];

    // 5. Resolve authenticated Gmail profile
    let userEmail = "big.nssien@gmail.com";
    try {
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.email) userEmail = profileData.email;
      } else {
        const gmailProfRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (gmailProfRes.ok) {
          const gmData = await gmailProfRes.json();
          if (gmData.emailAddress) userEmail = gmData.emailAddress;
        }
      }
    } catch (profileErr) {
      console.warn("[Gmail OAuth Edge] Could not fetch profile details:", profileErr);
    }

    console.log("[Gmail OAuth Edge] Gmail profile resolved");

    // 6. Initialize Supabase client
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ||
      stateData.supabaseUrl ||
      "";
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      stateData.supabaseKey ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      console.error("[Gmail OAuth Edge] Missing Supabase database credentials");
      throw new Error("Supabase URL or Key missing in Edge Function environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log("[Gmail OAuth Edge] Persisting connection to Supabase");

    const normalizedEmail = userEmail.toLowerCase().trim();
    const nowIso = new Date().toISOString();

    // Check if existing record has a refresh token we should preserve if Google didn't return one
    let effectiveRefreshToken = refreshToken;
    if (!effectiveRefreshToken) {
      const { data: existingRec } = await supabase
        .from("gmail_oauth_connections")
        .select("refresh_token")
        .eq("sender_email", normalizedEmail)
        .maybeSingle();

      if (existingRec?.refresh_token) {
        effectiveRefreshToken = existingRec.refresh_token;
      }
    }

    const payload = {
      sender_email: normalizedEmail,
      access_token: accessToken,
      refresh_token: effectiveRefreshToken || null,
      token_expiry: tokenExpiry,
      scopes,
      connection_status: "connected",
      updated_at: nowIso,
    };

    // Upsert record into gmail_oauth_connections
    const { data: existingData } = await supabase
      .from("gmail_oauth_connections")
      .select("id")
      .eq("sender_email", normalizedEmail)
      .maybeSingle();

    let saveError: any = null;
    if (existingData?.id) {
      const { error: updErr } = await supabase
        .from("gmail_oauth_connections")
        .update(payload)
        .eq("id", existingData.id);
      saveError = updErr;
    } else {
      const { error: insErr } = await supabase
        .from("gmail_oauth_connections")
        .insert({
          ...payload,
          created_at: nowIso,
        });
      saveError = insErr;
    }

    if (saveError) {
      // Try fallback upsert
      const { error: upsertErr } = await supabase
        .from("gmail_oauth_connections")
        .upsert({ ...payload, created_at: nowIso });
      if (upsertErr) {
        console.error("[Gmail OAuth Edge] Database persistence error:", upsertErr);
        throw new Error(`Failed to save Gmail credentials to database: ${upsertErr.message}`);
      }
    }

    console.log("[Gmail OAuth Edge] Connection stored successfully");

    // 7. Immediately read the record back from Supabase to verify persistence
    const { data: verifyData, error: verifyErr } = await supabase
      .from("gmail_oauth_connections")
      .select("id, sender_email, access_token, connection_status")
      .eq("sender_email", normalizedEmail)
      .eq("connection_status", "connected")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyErr || !verifyData || !verifyData.access_token) {
      console.error("[Gmail OAuth Edge] Persistence verification failed:", verifyErr);
      throw new Error("Database persistence verification failed after writing connection.");
    }

    console.log("[Gmail OAuth Edge] Persistence verification successful");
    console.log("[Gmail OAuth Edge] Redirecting to application");

    // 8. Return success response that communicates completion and redirects popup to UIOutbox settings
    const successHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Gmail Connected - UIOutbox</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="background:#09090b;color:#4ade80;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;">
    <div style="padding:32px;background:#18181b;border:1px solid #166534;border-radius:16px;max-width:420px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;font-size:24px;">✓</div>
      <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#f4f4f5;">Gmail Connected Successfully</h2>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 8px 0;line-height:1.5;">Authorized Account:</p>
      <div style="font-family:monospace;font-size:13px;color:#4ade80;background:#052e16;padding:8px 12px;border-radius:8px;border:1px solid #166534;margin-bottom:24px;word-break:break-all;">${userEmail}</div>
      <p style="font-size:12px;color:#71717a;margin:0 0 20px 0;">Redirecting to UIOutbox Settings...</p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <a href="${cleanAppUrl}/settings?gmail=connected&email=${encodeURIComponent(userEmail)}" style="padding:10px 20px;background:#22c55e;color:#000;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">Go to Settings</a>
      </div>
    </div>
    <script>
      const email = ${JSON.stringify(userEmail)};
      const targetUrl = '${cleanAppUrl}/settings?gmail=connected&email=' + encodeURIComponent(email);
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'GMAIL_OAUTH_SUCCESS', email: email }, '*');
          window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', email: email }, '*');
          window.opener.postMessage('gmail_oauth_success', '*');
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'GMAIL_OAUTH_SUCCESS', email: email }, '*');
          window.parent.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', email: email }, '*');
          window.parent.postMessage('gmail_oauth_success', '*');
        }
        localStorage.setItem('uioutbox_gmail_auth_result', JSON.stringify({ status: 'connected', email: email, time: Date.now() }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('uioutbox_oauth_channel');
          bc.postMessage({ type: 'GMAIL_OAUTH_SUCCESS', email: email });
          setTimeout(() => bc.close(), 1000);
        }
      } catch (e) {
        console.warn('Post message error:', e);
      }
      // Redirect popup/window back to application Settings route
      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 400);
    </script>
  </body>
</html>`;

    return new Response(successHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("[Gmail OAuth Edge] Fatal exception during OAuth callback:", err);
    const errorMsg = err.message || "An unexpected error occurred during Gmail OAuth authorization.";

    const errorHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Connection Error - UIOutbox</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="background:#09090b;color:#f87171;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;">
    <div style="padding:32px;background:#18181b;border:1px solid #7f1d1d;border-radius:16px;max-width:420px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;font-size:24px;">✕</div>
      <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#f4f4f5;">Connection Failed</h2>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 24px 0;line-height:1.5;">${errorMsg}</p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button onclick="window.close()" style="padding:10px 20px;background:#27272a;color:#fff;border:1px solid #3f3f46;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Close Window</button>
        <a href="${cleanAppUrl}/settings?gmail=error&reason=${encodeURIComponent(errorMsg)}" style="padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;">Return to Settings</a>
      </div>
    </div>
    <script>
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'GMAIL_OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
        }
        localStorage.setItem('uioutbox_gmail_auth_result', JSON.stringify({ status: 'error', error: ${JSON.stringify(errorMsg)}, time: Date.now() }));
      } catch (e) {}
      setTimeout(() => {
        if (window.opener) {
          window.close();
        } else {
          window.location.replace('${cleanAppUrl}/settings?gmail=error&reason=${encodeURIComponent(errorMsg)}');
        }
      }, 2500);
    </script>
  </body>
</html>`;

    return new Response(errorHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
