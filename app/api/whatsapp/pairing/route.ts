import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const TB_API_BASE = 'https://api.textbubbles.com/v1';

/**
 * Proxy for the TextBubbles WhatsApp pairing flow against the deploy's
 * configured TEXTBUBBLES_PHONE_NUMBER. Lets the /test-whatsapp page link a
 * WhatsApp session without exposing the API key client-side.
 *
 *   1. POST   /v1/whatsapp/numbers/{NUM}/enable          — start a session
 *   2. POST   /v1/whatsapp/numbers/{NUM}/pairing-code    — 8-char code
 *   3. GET    /v1/whatsapp/numbers/{NUM}/status          — poll until connected
 *   4. POST   /v1/whatsapp/numbers/{NUM}/disconnect      — tear down
 *
 *   GET  /api/whatsapp/pairing          — status
 *   POST /api/whatsapp/pairing          — body: { action: 'enable' | 'pairing_code' | 'disconnect' }
 */

type TbStatusBody = {
  phoneNumber?: string;
  whatsapp?: {
    status?: 'not_enabled' | 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | string;
    jid?: string;
    lastConnectedAt?: string;
  };
};

type TbPairingCodeBody = {
  pairingCode?: string;
  code?: string;
};

type PairingAction = 'enable' | 'pairing_code' | 'disconnect';
const ALLOWED_ACTIONS: PairingAction[] = ['enable', 'pairing_code', 'disconnect'];

function resolveConfig():
  | { ok: true; number: string; tbApiKey: string }
  | { ok: false; response: NextResponse } {
  const number = process.env.TEXTBUBBLES_PHONE_NUMBER;
  if (!number) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'TEXTBUBBLES_PHONE_NUMBER is not configured on this deploy.' },
        { status: 500 },
      ),
    };
  }
  const tbApiKey = process.env.TEXTBUBBLES_API_KEY;
  if (!tbApiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'TEXTBUBBLES_API_KEY is not configured on this deploy.' },
        { status: 500 },
      ),
    };
  }
  return { ok: true, number, tbApiKey };
}

// TextBubbles accepts E.164 with or without leading `+`; URL-encode the `+`
// so it lands in the path as `%2B` rather than a literal space.
function tbPathFor(number: string): string {
  return `${TB_API_BASE}/whatsapp/numbers/${encodeURIComponent(number)}`;
}

async function callTextBubbles(
  url: string,
  init: RequestInit,
  tbApiKey: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${tbApiKey}`,
    },
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

export async function GET() {
  try {
    const cfg = resolveConfig();
    if (!cfg.ok) return cfg.response;

    const { ok, status, body } = await callTextBubbles(
      `${tbPathFor(cfg.number)}/status`,
      { method: 'GET' },
      cfg.tbApiKey,
    );
    if (!ok) {
      return NextResponse.json(
        {
          error: 'TextBubbles rejected the status request',
          status,
          details:
            (body as { error?: unknown; message?: unknown })?.error ??
            (body as { message?: unknown })?.message ??
            body,
        },
        { status: 502 },
      );
    }

    const data = body as TbStatusBody;
    return NextResponse.json({
      success: true,
      textbubbles_phone_number: cfg.number,
      status: data.whatsapp?.status ?? 'not_enabled',
      jid: data.whatsapp?.jid ?? null,
      last_connected_at: data.whatsapp?.lastConnectedAt ?? null,
    });
  } catch (error) {
    console.error('GET /api/whatsapp/pairing failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch WhatsApp pairing status', details: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = (body ?? {}) as { action?: string };

    if (!action || !(ALLOWED_ACTIONS as readonly string[]).includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    const cfg = resolveConfig();
    if (!cfg.ok) return cfg.response;

    const base = tbPathFor(cfg.number);
    const tbUrl =
      action === 'enable'
        ? `${base}/enable`
        : action === 'pairing_code'
          ? `${base}/pairing-code`
          : `${base}/disconnect`;

    const { ok, status, body: tbBody } = await callTextBubbles(
      tbUrl,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      cfg.tbApiKey,
    );

    if (!ok) {
      return NextResponse.json(
        {
          error: `TextBubbles rejected the ${action} request`,
          status,
          details:
            (tbBody as { error?: unknown; message?: unknown })?.error ??
            (tbBody as { message?: unknown })?.message ??
            tbBody,
        },
        { status: 502 },
      );
    }

    if (action === 'pairing_code') {
      const tbData = tbBody as TbPairingCodeBody;
      const code = tbData.pairingCode ?? tbData.code ?? null;
      return NextResponse.json({
        success: true,
        textbubbles_phone_number: cfg.number,
        pairing_code: code,
      });
    }

    return NextResponse.json({
      success: true,
      textbubbles_phone_number: cfg.number,
      action,
    });
  } catch (error) {
    console.error('POST /api/whatsapp/pairing failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to call WhatsApp pairing endpoint', details: message },
      { status: 500 },
    );
  }
}
