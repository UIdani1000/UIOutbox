import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Database, 
  Copy, 
  Check, 
  ShieldCheck, 
  Layers, 
  Mail, 
  RefreshCw,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Lock,
  Sliders,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { SUPABASE_SCHEMA_SQL } from '../lib/schemaSql';

export const SettingsPage: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    supabaseStatus, 
    refreshData, 
    clearDatabase,
    resetToDefaults,
    gmailStatus,
    connectGmail,
    disconnectGmail,
    sendTestEmail,
    deliverySettings,
    updateDeliverySettings,
    todaySentCount,
    checkGmailStatus
  } = useCRM();
  
  const [displayName, setDisplayName] = useState(profile.display_name || 'UI Dani');
  const [businessName, setBusinessName] = useState(profile.business_name || 'UIDani');
  const [email, setEmail] = useState(profile.email || 'big.nssien@gmail.com');
  const [website, setWebsite] = useState(profile.website || 'https://bignssien.wixstudio.com/uidani');
  const [isSaved, setIsSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Delivery settings form state
  const [dailyLimit, setDailyLimit] = useState(deliverySettings.dailySendLimit || 50);
  const [delaySec, setDelaySec] = useState(deliverySettings.delayBetweenSendsSec || 4);
  const [testRecipient, setTestRecipient] = useState(deliverySettings.testRecipientEmail || 'big.nssien@gmail.com');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Test email state
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; messageId?: string; simulated?: boolean } | null>(null);

  // AI Router Health State
  const [aiProviders, setAiProviders] = useState<Array<{
    name: string;
    displayName: string;
    status: 'AVAILABLE' | 'QUOTA_LIMITED' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
    isConfigured: boolean;
    configuredModel: string;
    cooldownRemainingSeconds?: number;
    lastSuccessTimestamp?: string;
    consecutiveFailures?: number;
  }>>([]);
  const [isLoadingAiHealth, setIsLoadingAiHealth] = useState(false);

  const fetchAiHealth = React.useCallback(async () => {
    setIsLoadingAiHealth(true);
    try {
      const res = await fetch('/api/ai/health');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.providers)) {
          setAiProviders(data.providers);
        }
      }
    } catch (e) {
      console.warn('Could not fetch AI provider health:', e);
    } finally {
      setIsLoadingAiHealth(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAiHealth();
  }, [fetchAiHealth]);

  // OAuth connecting state
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccessToast, setOauthSuccessToast] = useState<string | null>(null);

  // Check URL query params for redirect fallback (?gmail=connected or ?gmail=error)
  React.useEffect(() => {
    const checkRedirectStatus = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const gmailParam = urlParams.get('gmail');
        const reasonParam = urlParams.get('reason');

        if (gmailParam === 'connected') {
          console.log('[Gmail OAuth UI] OAuth completion received');
          console.log('[Gmail OAuth UI] Verifying Gmail connection status');
          const status = await checkGmailStatus();
          if (status.connected) {
            console.log('[Gmail OAuth UI] Gmail status verified: connected=true');
            console.log('[Gmail OAuth UI] Gmail connection established');
            const resolvedEmail = status.senderEmail || status.email || urlParams.get('email') || 'big.nssien@gmail.com';
            setOauthSuccessToast(`Connected & Authorized: ${resolvedEmail}`);
            setOauthError(null);
          } else {
            setOauthError('Returned from authorization, but connection verification failed.');
          }
          await refreshData();
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => setOauthSuccessToast(null), 6000);
        } else if (gmailParam === 'error') {
          const readableReason = reasonParam 
            ? decodeURIComponent(reasonParam).replace(/_/g, ' ')
            : 'Google OAuth authorization was not completed.';
          setOauthError(`Google Authentication Error: ${readableReason}`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.warn('[Gmail OAuth UI] Status check on page load error:', err);
      }
    };

    checkRedirectStatus();
  }, [checkGmailStatus, refreshData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      display_name: displayName,
      business_name: businessName,
      email,
      website,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSaveDeliverySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    await updateDeliverySettings({
      dailySendLimit: Number(dailyLimit),
      delayBetweenSendsSec: Number(delaySec),
      testRecipientEmail: testRecipient,
    });
    setIsSavingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleConnectGmail = async () => {
    setIsConnectingOAuth(true);
    setOauthError(null);
    setOauthSuccessToast(null);
    try {
      const res = await connectGmail();
      const currentStatus = await checkGmailStatus();
      if (res.success || currentStatus.connected) {
        const activeEmail = currentStatus.senderEmail || currentStatus.email || res.email || 'big.nssien@gmail.com';
        setOauthSuccessToast(`Connected & Authorized: ${activeEmail}`);
        setOauthError(null);
        setTimeout(() => setOauthSuccessToast(null), 6000);
      } else if (res.error) {
        setOauthError(res.error);
      } else {
        setOauthError('OAuth completed, but the Gmail connection was not persisted.');
      }
    } catch (err: any) {
      setOauthError(err.message || 'Failed to complete Google authentication.');
    } finally {
      setIsConnectingOAuth(false);
      await checkGmailStatus();
    }
  };

  const handleDisconnectGmail = async () => {
    if (window.confirm('Disconnect your Gmail sending integration?')) {
      await disconnectGmail();
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendTestEmail(testRecipient);
      if (res.success) {
        setTestResult({
          success: true,
          message: res.simulated ? 'Test email dispatched (Sandbox Mode)!' : 'Test email dispatched successfully via Gmail API!',
          messageId: res.providerMessageId,
          simulated: res.simulated,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Failed to send test email.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error occurred during test send.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div id="settings-page" className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">Operating System Settings</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure UI Dani's profile, Gmail Delivery Engine, rate limits, and database connections
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BUILD 05: Gmail Delivery Engine Card */}
        <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-100">Gmail Production Delivery Engine</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold uppercase tracking-wide">
                    Live OAuth 2.0
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold uppercase">
                    Production Mode
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Google Workspace OAuth 2.0 dispatch pipeline • Real Gmail API delivery • Server-side token storage
                </p>
              </div>
            </div>
            <button
              onClick={() => checkGmailStatus()}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Refresh Gmail connection health"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Connection Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2">
              <span className="text-zinc-500 text-[10px] uppercase font-semibold block tracking-wider">
                Connection Status
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  gmailStatus.connected 
                    ? 'bg-emerald-400 animate-pulse' 
                    : gmailStatus.tokenStatus === 'refresh_required'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-zinc-500'
                }`} />
                <span className={`text-xs font-semibold ${
                  gmailStatus.connected 
                    ? 'text-emerald-400' 
                    : gmailStatus.tokenStatus === 'refresh_required'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                }`}>
                  {gmailStatus.connected 
                    ? 'Connected & Authorized' 
                    : gmailStatus.tokenStatus === 'refresh_required'
                      ? 'Reauthorization Required'
                      : 'Not Connected'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {gmailStatus.connected 
                  ? 'Authenticated with Google OAuth 2.0 with send & inbox permissions.'
                  : gmailStatus.tokenStatus === 'refresh_required'
                    ? 'Google authorization expired. Reconnect your Gmail account to resume outreach.'
                    : 'Not connected. Connect your Google account below to enable live email delivery.'}
              </p>
            </div>

            <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2">
              <span className="text-zinc-500 text-[10px] uppercase font-semibold block tracking-wider">
                Connected Account
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 truncate">
                <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${gmailStatus.connected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span className="truncate font-mono">
                  {gmailStatus.connected && (gmailStatus.senderEmail || gmailStatus.email)
                    ? (gmailStatus.senderEmail || gmailStatus.email)
                    : 'None connected'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Outreach dispatches under this authenticated Gmail account.
              </p>
            </div>

            <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2">
              <span className="text-zinc-500 text-[10px] uppercase font-semibold block tracking-wider">
                Today's Dispatch Ledger
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{todaySentCount} / {deliverySettings.dailySendLimit} Sent Today</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {deliverySettings.dailySendLimit - todaySentCount} dispatches remaining before daily cap.
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {oauthSuccessToast && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">{oauthSuccessToast}</span>
              </div>
              <button 
                onClick={() => setOauthSuccessToast(null)} 
                className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-0.5"
              >
                Dismiss
              </button>
            </div>
          )}

          {!gmailStatus.connected && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-semibold text-amber-200">Real Production Delivery Paused:</span> Gmail account is not connected. All outbound email dispatching requires an active Google OAuth connection. Click <strong>Connect Gmail</strong> below to authorize.
              </div>
            </div>
          )}

          {oauthError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start justify-between gap-3 text-xs text-red-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <div>
                  <div className="font-semibold text-red-200">Connection Error</div>
                  <div className="mt-0.5">{oauthError}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleConnectGmail}
                  className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white font-medium text-xs rounded-lg transition shadow-xs"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => setOauthError(null)} 
                  className="text-red-400 hover:text-red-200 text-xs px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons & Rate Limiting Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Left: OAuth Connection & Test Send */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Google OAuth Authentication
              </h3>

              <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-200">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="font-medium">Google Account Connection</span>
                  </div>
                  {isConnectingOAuth ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold rounded-lg">
                        <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </div>
                      <button
                        onClick={() => setIsConnectingOAuth(false)}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : gmailStatus.connected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleConnectGmail}
                        disabled={isConnectingOAuth}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reconnect</span>
                      </button>
                      <button
                        onClick={handleDisconnectGmail}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-zinc-700 text-xs font-medium rounded-lg transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGmail}
                      disabled={isConnectingOAuth}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold rounded-lg transition shadow-sm disabled:opacity-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Connect Gmail</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Tokens are refreshed automatically and securely persisted server-side. Secret tokens are never exposed to the client.</span>
                </div>
              </div>

              {/* Test Send Panel */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    Send Live Verification Email
                  </span>
                  <span className="text-[10px] text-zinc-500">Real Gmail API</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    placeholder="Recipient email address"
                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest || !gmailStatus.connected}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSendingTest ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-200 border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test Email</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                      : 'bg-red-500/10 border-red-500/20 text-red-300'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div>{testResult.message}</div>
                      {testResult.messageId && (
                        <div className="font-mono text-[10px] text-zinc-400 mt-1">
                          Gmail Message ID: {testResult.messageId}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Rate Limiting & Cooldown Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Safety Limits & Deliverability Controls
              </h3>

              <form onSubmit={handleSaveDeliverySettings} className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label className="font-medium text-zinc-300">
                      Daily Send Cap (Emails / Day)
                    </label>
                    <span className="font-mono font-bold text-amber-400">{dailyLimit} emails</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={dailyLimit}
                    onChange={e => setDailyLimit(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Protects Gmail domain reputation. Safe default: 50 emails/day for cold outreach.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label className="font-medium text-zinc-300">
                      Cooldown Delay Between Emails (Seconds)
                    </label>
                    <span className="font-mono font-bold text-amber-400">{delaySec}s</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    step="1"
                    value={delaySec}
                    onChange={e => setDelaySec(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Adds natural human-paced pause during batch queue dispatches.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  {settingsSaved ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Delivery settings saved!</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs rounded-lg transition"
                  >
                    Save Delivery Controls
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-5 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-zinc-800/80 pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Designer Profile</h2>
              <p className="text-xs text-zinc-400">Primary user and creative service business details</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Display Name
                </label>
                <input
                  id="settings-display-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Business / Studio Name
                </label>
                <input
                  id="settings-business-name-input"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Outreach Email
              </label>
              <input
                id="settings-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Portfolio / Studio Website
              </label>
              <input
                id="settings-website-input"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80 font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              {isSaved ? (
                <span className="text-xs text-emerald-400 flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Profile saved successfully!</span>
                </span>
              ) : (
                <span />
              )}
              <button
                id="btn-save-settings-profile"
                type="submit"
                className="px-4 py-2 rounded-md bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition-colors shadow-sm"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Database & Supabase Infrastructure */}
        <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Database & Persistence</h2>
                <p className="text-xs text-zinc-400">Supabase PostgreSQL engine & RLS security</p>
              </div>
            </div>
            <button
              onClick={refreshData}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh database connection"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Engine Mode:</span>
              <span className={`font-mono font-semibold ${supabaseStatus.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {supabaseStatus.connected ? 'Live Supabase Cloud' : 'Local Persistent Storage'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {supabaseStatus.message}
            </p>
          </div>

          {/* Schema Viewer & Copy Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">PostgreSQL Schema (10 Tables)</span>
              <button
                id="btn-copy-schema-sql"
                onClick={handleCopySql}
                className="text-amber-400 hover:underline flex items-center space-x-1"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied to Clipboard' : 'Copy SQL Schema'}</span>
              </button>
            </div>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 max-h-36 overflow-y-auto font-mono text-[10px] text-zinc-400 leading-relaxed select-all">
              {SUPABASE_SCHEMA_SQL.slice(0, 800)}...
            </div>
          </div>
        </div>
      </div>

      {/* External Integration Interfaces Matrix */}
      <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
          <Layers className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Modular Service Interfaces
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-zinc-950/60 rounded-lg border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Lead Sourcing</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">ILeadSource</span>
            </div>
            <p className="text-[11px] text-zinc-400">CSV & AI Discovery abstraction ready.</p>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-lg border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Email Dispatch</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">Gmail Provider</span>
            </div>
            <p className="text-[11px] text-zinc-400">Live Gmail API OAuth sending engine active.</p>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-lg border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">AI Router</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">5-Engine Multi-Provider</span>
            </div>
            <p className="text-[11px] text-zinc-400">Gemini &bull; Groq &bull; OpenAI &bull; Claude &bull; OpenRouter failover.</p>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-lg border border-zinc-800/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Asset Storage</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">IStorageService</span>
            </div>
            <p className="text-[11px] text-zinc-400">Supabase Storage buckets ready.</p>
          </div>
        </div>
      </div>

      {/* AI Multi-Provider Router Status Card */}
      <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              AI Provider Router & Quota Failover
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchAiHealth()}
              disabled={isLoadingAiHealth}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Refresh AI Provider Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAiHealth ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              5-Provider Dynamic Routing
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Provider 1: Gemini */}
          {(() => {
            const status = aiProviders.find((p) => p.name === 'gemini');
            const isAvailable = status ? status.status === 'AVAILABLE' : true;
            const isCooldown = status?.status === 'QUOTA_LIMITED';
            return (
              <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isCooldown ? 'bg-amber-400 animate-pulse' : isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                    <span className="font-semibold text-zinc-200">Google Gemini</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Priority 1</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Primary high-speed engine for discovery, ICP evaluation, and research with automatic 429 quota failover.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Model: {status?.configuredModel || 'gemini-2.5-flash'}</span>
                  <span className={isCooldown ? 'text-amber-400' : isAvailable ? 'text-emerald-400' : 'text-zinc-500'}>
                    {isCooldown ? `Cooldown (${status?.cooldownRemainingSeconds}s)` : isAvailable ? 'Available' : 'Unconfigured'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Provider 2: Groq */}
          {(() => {
            const status = aiProviders.find((p) => p.name === 'groq');
            const isConfigured = status?.isConfigured;
            const isCooldown = status?.status === 'QUOTA_LIMITED';
            const isAvailable = status?.status === 'AVAILABLE';
            return (
              <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isCooldown ? 'bg-amber-400 animate-pulse' : isAvailable ? 'bg-orange-400 animate-pulse' : isConfigured ? 'bg-orange-400/50' : 'bg-zinc-600'}`} />
                    <span className="font-semibold text-zinc-200">Groq (LPU Speed)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Priority 2</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Ultra-low latency inference engine for rapid ICP qualification and high-throughput discovery fallback.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span className="truncate max-w-[170px]" title={status?.configuredModel || 'openai/gpt-oss-120b'}>
                    Model: {status?.configuredModel || 'openai/gpt-oss-120b'}
                  </span>
                  <span className={isCooldown ? 'text-amber-400' : isAvailable ? 'text-emerald-400' : isConfigured ? 'text-zinc-400' : 'text-zinc-500'}>
                    {isCooldown ? `Cooldown (${status?.cooldownRemainingSeconds}s)` : isAvailable ? 'Active' : isConfigured ? 'Configured' : 'Ready / Optional'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Provider 3: OpenAI */}
          {(() => {
            const status = aiProviders.find((p) => p.name === 'openai');
            const isConfigured = status?.isConfigured;
            const isCooldown = status?.status === 'QUOTA_LIMITED';
            const isAvailable = status?.status === 'AVAILABLE';
            return (
              <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isCooldown ? 'bg-amber-400 animate-pulse' : isAvailable ? 'bg-blue-400 animate-pulse' : isConfigured ? 'bg-blue-400/50' : 'bg-zinc-600'}`} />
                    <span className="font-semibold text-zinc-200">OpenAI</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Priority 3</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  High-reliability cold email generation & reply intelligence fallback when configured.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Model: {status?.configuredModel || 'gpt-4o-mini'}</span>
                  <span className={isCooldown ? 'text-amber-400' : isAvailable ? 'text-emerald-400' : isConfigured ? 'text-zinc-400' : 'text-zinc-500'}>
                    {isCooldown ? `Cooldown (${status?.cooldownRemainingSeconds}s)` : isAvailable ? 'Active' : isConfigured ? 'Configured' : 'Ready / Optional'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Provider 4: Anthropic */}
          {(() => {
            const status = aiProviders.find((p) => p.name === 'anthropic');
            const isConfigured = status?.isConfigured;
            const isCooldown = status?.status === 'QUOTA_LIMITED';
            const isAvailable = status?.status === 'AVAILABLE';
            return (
              <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isCooldown ? 'bg-amber-400 animate-pulse' : isAvailable ? 'bg-purple-400 animate-pulse' : isConfigured ? 'bg-purple-400/50' : 'bg-zinc-600'}`} />
                    <span className="font-semibold text-zinc-200">Anthropic Claude</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Priority 4</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Deep research synthesis and high-craft nuance fallback when configured.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span className="truncate max-w-[170px]" title={status?.configuredModel || 'claude-3-5-haiku'}>
                    Model: {status?.configuredModel || 'claude-3-5-haiku'}
                  </span>
                  <span className={isCooldown ? 'text-amber-400' : isAvailable ? 'text-emerald-400' : isConfigured ? 'text-zinc-400' : 'text-zinc-500'}>
                    {isCooldown ? `Cooldown (${status?.cooldownRemainingSeconds}s)` : isAvailable ? 'Active' : isConfigured ? 'Configured' : 'Ready / Optional'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Provider 5: OpenRouter Free Models */}
          {(() => {
            const status = aiProviders.find((p) => p.name === 'openrouter');
            const isConfigured = status?.isConfigured;
            const isCooldown = status?.status === 'QUOTA_LIMITED';
            const isAvailable = status?.status === 'AVAILABLE';
            return (
              <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-2 md:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isCooldown ? 'bg-amber-400 animate-pulse' : isAvailable ? 'bg-teal-400 animate-pulse' : isConfigured ? 'bg-teal-400/50' : 'bg-zinc-600'}`} />
                    <span className="font-semibold text-zinc-200">OpenRouter (Free Models)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Priority 5</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Zero-cost emergency gateway routing across free open-weights models (openrouter/free) when primary upstream quotas are depleted.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Model: {status?.configuredModel || 'openrouter/free'}</span>
                  <span className={isCooldown ? 'text-amber-400' : isAvailable ? 'text-emerald-400' : isConfigured ? 'text-zinc-400' : 'text-zinc-500'}>
                    {isCooldown ? `Cooldown (${status?.cooldownRemainingSeconds}s)` : isAvailable ? 'Active' : isConfigured ? 'Configured' : 'Ready / Optional'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-lg text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Batch Concurrency: <strong className="text-zinc-200 font-mono">3 workers</strong> &bull; Resilient multi-provider failover + local synthesis fallback</span>
          <button
            onClick={async () => {
              try {
                await fetch('/api/ai/reset-cooldowns', { method: 'POST' });
                await fetchAiHealth();
                alert('AI Provider cooldowns and retry counters reset.');
              } catch (e) {
                // ignore
              }
            }}
            className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
          >
            Reset Quota Cooldowns
          </button>
        </div>
      </div>

      {/* System Reset & Data Management Section */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-6">
        <div className="flex items-center space-x-3 border-b border-zinc-800 pb-4">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Application Reset & Data Management</h2>
            <p className="text-xs text-zinc-400">
              Clear outreach records or restore the operating system to factory defaults
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Reset Outreach & Dashboard Data */}
          <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-lg flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-zinc-200 text-xs">Reset Outreach & Dashboard Data</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Clears all prospects, campaigns, draft emails, sequences, replies, and activities. Perfect for starting today's outreach from a clean state.
              </p>
              <div className="text-[10px] text-emerald-400/90 font-medium">
                ✓ Preserves your profile, portfolio case studies, sequences, and Gmail connection.
              </div>
            </div>

            <button
              id="btn-reset-outreach-data"
              onClick={async () => {
                if (window.confirm('Reset all outreach and dashboard data?\n\nThis will clear leads, campaigns, email queue, sequences, replies, and activities while keeping your profile, case studies, templates, and Gmail credentials intact.')) {
                  await clearDatabase();
                  alert('Outreach and dashboard data has been successfully reset.');
                }
              }}
              className="w-full py-2 px-3 rounded-md bg-zinc-900 hover:bg-amber-500/10 text-zinc-300 hover:text-amber-300 border border-zinc-700 hover:border-amber-500/40 text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Outreach Data Only</span>
            </button>
          </div>

          {/* Option 2: Reset Application to Default */}
          <div className="p-4 bg-zinc-950/70 border border-rose-950/40 rounded-lg flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span className="font-semibold text-zinc-200 text-xs">Reset Application to Factory Defaults</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Restores default UI Dani profile, standard 4-step sequence templates, default delivery limits (50/day), starter case studies, and clears all outreach data.
              </p>
              <div className="text-[10px] text-zinc-400 font-medium">
                • Restores factory configuration & clean database (Gmail OAuth preserved).
              </div>
            </div>

            <button
              id="btn-reset-app-to-default"
              onClick={async () => {
                const confirmed = window.confirm(
                  'Reset application to default configuration?\n\nThis will:\n• Reset Profile to default UI Dani details\n• Reset Delivery Settings to default 50/day limit & 4s delay\n• Reset Follow-up sequences to the default 4-Step sequence\n• Reset Portfolio case studies to starter templates\n• Clear all stored leads, campaigns, draft emails, and outreach logs\n\nGmail OAuth connection will remain intact.\n\nAre you sure you want to proceed?'
                );
                if (confirmed) {
                  const res = await resetToDefaults();
                  setDisplayName('UI Dani');
                  setBusinessName('UIDani');
                  setEmail('big.nssien@gmail.com');
                  setWebsite('https://bignssien.wixstudio.com/uidani');
                  setDailyLimit(50);
                  setDelaySec(4);
                  setTestRecipient('big.nssien@gmail.com');
                  alert(res.message || 'Application has been reset to defaults.');
                }
              }}
              className="w-full py-2 px-3 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Application to Default</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
