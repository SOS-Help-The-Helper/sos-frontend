'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type PairingStatus =
  | 'not_enabled'
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'connected'
  | string;

interface StatusResponse {
  success?: boolean;
  textbubbles_phone_number?: string;
  status?: PairingStatus;
  jid?: string | null;
  last_connected_at?: string | null;
  error?: string;
  details?: unknown;
}

interface PairingCodeResponse {
  success?: boolean;
  textbubbles_phone_number?: string;
  pairing_code?: string | null;
  error?: string;
  details?: unknown;
}

interface SendResponse {
  success?: boolean;
  messageId?: string;
  recipient?: string;
  senderNumber?: string;
  error?: string;
  details?: unknown;
}

const STATUS_LABEL: Record<string, string> = {
  not_enabled: 'Not enabled',
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  qr_pending: 'Waiting for pairing code',
  connected: 'Connected',
};

const STATUS_COLOR: Record<string, string> = {
  not_enabled: 'bg-white/10 text-white/70',
  disconnected: 'bg-white/10 text-white/70',
  connecting: 'bg-amber-500/20 text-amber-300',
  qr_pending: 'bg-amber-500/20 text-amber-300',
  connected: 'bg-emerald-500/20 text-emerald-300',
};

export default function TestWhatsAppPage() {
  const [status, setStatus] = useState<PairingStatus | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [jid, setJid] = useState<string | null>(null);
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<'enable' | 'pairing_code' | 'disconnect' | null>(
    null,
  );

  const [recipient, setRecipient] = useState('');
  const [messageText, setMessageText] = useState('Test message from SOS WhatsApp test page.');
  const [sendBusy, setSendBusy] = useState(false);
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async (): Promise<PairingStatus | null> => {
    try {
      const res = await fetch('/api/whatsapp/pairing', { cache: 'no-store' });
      const data = (await res.json()) as StatusResponse;
      if (!res.ok || data.error) {
        setStatusError(data.error || `Status request failed with ${res.status}`);
        return null;
      }
      setStatusError(null);
      setPhoneNumber(data.textbubbles_phone_number ?? null);
      setStatus(data.status ?? 'not_enabled');
      setJid(data.jid ?? null);
      setLastConnectedAt(data.last_connected_at ?? null);
      return data.status ?? 'not_enabled';
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Status request failed');
      return null;
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Poll while a pairing is in flight. Stop once connected or back to a
  // terminal state so we don't burn through requests on an idle tab.
  useEffect(() => {
    if (status === 'connecting' || status === 'qr_pending') {
      pollRef.current = setTimeout(() => {
        void fetchStatus();
      }, 3000);
      return () => {
        if (pollRef.current) clearTimeout(pollRef.current);
      };
    }
    if (status === 'connected' && pairingCode) {
      setPairingCode(null);
    }
  }, [status, pairingCode, fetchStatus]);

  const callAction = useCallback(
    async (action: 'enable' | 'pairing_code' | 'disconnect') => {
      setActionBusy(action);
      setActionError(null);
      try {
        const res = await fetch('/api/whatsapp/pairing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = (await res.json()) as PairingCodeResponse;
        if (!res.ok || data.error) {
          setActionError(data.error || `${action} failed with ${res.status}`);
          return;
        }
        if (action === 'pairing_code') {
          setPairingCode(data.pairing_code ?? null);
        }
        if (action === 'disconnect') {
          setPairingCode(null);
        }
        await fetchStatus();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : `${action} failed`);
      } finally {
        setActionBusy(null);
      }
    },
    [fetchStatus],
  );

  const handlePair = useCallback(async () => {
    setPairingCode(null);
    setActionError(null);
    setActionBusy('enable');
    try {
      const enableRes = await fetch('/api/whatsapp/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable' }),
      });
      const enableData = (await enableRes.json()) as PairingCodeResponse;
      if (!enableRes.ok || enableData.error) {
        setActionError(enableData.error || `enable failed with ${enableRes.status}`);
        setActionBusy(null);
        return;
      }
      setActionBusy('pairing_code');
      const codeRes = await fetch('/api/whatsapp/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pairing_code' }),
      });
      const codeData = (await codeRes.json()) as PairingCodeResponse;
      if (!codeRes.ok || codeData.error) {
        setActionError(codeData.error || `pairing_code failed with ${codeRes.status}`);
      } else {
        setPairingCode(codeData.pairing_code ?? null);
      }
      await fetchStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'pair failed');
    } finally {
      setActionBusy(null);
    }
  }, [fetchStatus]);

  const handleSend = useCallback(async () => {
    setSendBusy(true);
    setSendResult(null);
    setSendError(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, text: messageText }),
      });
      const data = (await res.json()) as SendResponse;
      if (!res.ok || data.success === false) {
        setSendError(data.error || `Send failed with ${res.status}`);
        setSendResult(data);
        return;
      }
      setSendResult(data);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSendBusy(false);
    }
  }, [recipient, messageText]);

  const copyCode = useCallback(() => {
    if (!pairingCode) return;
    void navigator.clipboard.writeText(pairingCode);
  }, [pairingCode]);

  const statusKey = status ?? 'not_enabled';
  const isConnected = status === 'connected';
  const isPairing = status === 'connecting' || status === 'qr_pending' || actionBusy !== null;

  return (
    <main className="min-h-screen bg-[#0F1E2B] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-wide text-white/40">SOS internal</p>
          <h1 className="mt-1 text-2xl font-semibold">WhatsApp test page</h1>
          <p className="mt-2 text-sm text-white/60">
            Pair a WhatsApp session against the deploy&apos;s TextBubbles number and send a test
            message. Backed by <code className="text-white/80">TEXTBUBBLES_PHONE_NUMBER</code> +{' '}
            <code className="text-white/80">TEXTBUBBLES_API_KEY</code>.
          </p>
        </header>

        <section className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">Status</p>
              <p className="mt-1 text-lg font-medium">
                {STATUS_LABEL[statusKey] ?? statusKey}
              </p>
              {phoneNumber && (
                <p className="mt-1 text-xs text-white/50">{phoneNumber}</p>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                STATUS_COLOR[statusKey] ?? 'bg-white/10 text-white/70'
              }`}
            >
              {statusKey}
            </span>
          </div>

          {jid && <p className="mt-3 text-xs text-white/50">JID: {jid}</p>}
          {lastConnectedAt && (
            <p className="text-xs text-white/50">
              Last connected: {new Date(lastConnectedAt).toLocaleString()}
            </p>
          )}
          {statusError && (
            <p className="mt-3 text-xs text-red-300">{statusError}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchStatus()}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Refresh
            </button>
            {!isConnected && (
              <button
                type="button"
                onClick={() => void handlePair()}
                disabled={actionBusy !== null}
                className="rounded-md bg-[#EF4E4B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#EF4E4B]/90 disabled:opacity-50"
              >
                {actionBusy === 'enable'
                  ? 'Enabling…'
                  : actionBusy === 'pairing_code'
                    ? 'Requesting code…'
                    : 'Pair WhatsApp'}
              </button>
            )}
            {isConnected && (
              <button
                type="button"
                onClick={() => void callAction('disconnect')}
                disabled={actionBusy !== null}
                className="rounded-md border border-red-400/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
              >
                {actionBusy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            )}
            {!isConnected && pairingCode === null && status !== 'not_enabled' && (
              <button
                type="button"
                onClick={() => void callAction('pairing_code')}
                disabled={actionBusy !== null}
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                {actionBusy === 'pairing_code' ? 'Requesting…' : 'New pairing code'}
              </button>
            )}
          </div>

          {actionError && (
            <p className="mt-3 text-xs text-red-300">{actionError}</p>
          )}
        </section>

        {pairingCode && !isConnected && (
          <section className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-200/80">Pairing code</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="font-mono text-3xl tracking-[0.3em] text-amber-100">{pairingCode}</p>
              <button
                type="button"
                onClick={copyCode}
                className="rounded-md border border-amber-500/40 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-500/10"
              >
                Copy
              </button>
            </div>
            <ol className="mt-3 space-y-1 text-xs text-white/70">
              <li>1. Open WhatsApp on the phone for {phoneNumber}.</li>
              <li>
                2. Go to Settings → Linked Devices → Link a Device → Link with phone number
                instead.
              </li>
              <li>3. Type the 8-character code above.</li>
            </ol>
            {isPairing && (
              <p className="mt-3 text-xs text-amber-200/80">Waiting for WhatsApp to connect…</p>
            )}
          </section>
        )}

        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">Send a WhatsApp message</p>
          <p className="mt-1 text-xs text-white/50">
            Requires a connected session. Recipient must be in E.164 format.
          </p>

          <label className="mt-4 block text-xs text-white/60">Recipient</label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="+14155551234"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />

          <label className="mt-3 block text-xs text-white/60">Message</label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sendBusy || !isConnected || !recipient || !messageText}
            className="mt-4 rounded-md bg-[#EF4E4B] px-4 py-2 text-sm font-medium text-white hover:bg-[#EF4E4B]/90 disabled:opacity-50"
          >
            {sendBusy ? 'Sending…' : 'Send WhatsApp'}
          </button>
          {!isConnected && (
            <p className="mt-2 text-xs text-white/50">
              Session is {STATUS_LABEL[statusKey] ?? statusKey}. Pair the number first.
            </p>
          )}

          {sendError && (
            <p className="mt-3 text-xs text-red-300">{sendError}</p>
          )}
          {sendResult?.success && (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200">
              Sent. messageId: <span className="font-mono">{sendResult.messageId}</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
