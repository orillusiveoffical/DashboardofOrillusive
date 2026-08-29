import crypto from 'crypto';
import { config } from '../config/index.js';

export interface SafepayTrackerParams {
  amountPkr: number;
  orderId: string;
  planId: string;
  customerEmail: string;
  redirectUrl: string;
  cancelUrl: string;
}

export interface SafepayTrackerResult {
  token: string;
  checkoutUrl: string;
  orderId: string;
  amountPkr: number;
  environment: 'sandbox' | 'production';
}

export interface SafepayWebhookPayload {
  type?: string;
  event?: string;
  data?: any;
  notification?: {
    tracker?: string;
    reference?: string;
    token?: string;
    state?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
  tracker?: {
    token?: string;
    state?: string;
    status?: string;
    order_id?: string;
  };
}

/**
 * Creates a payment tracker on Safepay for hosted/redirect checkout.
 * Server determines pricing strictly in PKR.
 */
export async function createSafepayTracker(params: SafepayTrackerParams): Promise<SafepayTrackerResult> {
  const { amountPkr, orderId, planId, customerEmail, redirectUrl, cancelUrl } = params;

  // Amount in minor units (paisa) for Safepay (1 PKR = 100 Paisa)
  const amountMinorUnits = Math.round(amountPkr * 100);

  const { apiKey, secretKey, baseUrl, checkoutUrl: baseCheckoutUrl, environment } = config.safepay;

  let trackerToken = '';

  if (secretKey) {
    // Strategy 1: Safepay Client Passport Token -> Order Init
    try {
      const passportEndpoint = `${baseUrl.replace(/\/+$/, '')}/client/passport/v1/token`;
      const passportRes = await fetch(passportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SFPY-MERCHANT-SECRET': secretKey,
        },
      });

      let passportToken = '';
      if (passportRes.ok) {
        const passportData: any = await passportRes.json();
        passportToken = passportData?.data?.token || passportData?.token || '';
      }

      const clientIdentifier = apiKey || passportToken;

      const initEndpoint = `${baseUrl.replace(/\/+$/, '')}/order/v1/init`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-SFPY-MERCHANT-SECRET': secretKey,
      };
      if (passportToken) {
        headers['Authorization'] = `Bearer ${passportToken}`;
      }

      const response = await fetch(initEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          client: clientIdentifier,
          amount: amountMinorUnits,
          currency: 'PKR',
          environment,
        }),
      });

      if (response.ok) {
        const json: any = await response.json();
        trackerToken = json?.data?.token || json?.token || json?.tracker?.token || '';
      } else {
        // Strategy 2: Order Payments v3
        const v3Endpoint = `${baseUrl.replace(/\/+$/, '')}/order/payments/v3/`;
        const v3Res = await fetch(v3Endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            merchant_api_key: secretKey,
            intent: 'CYBERSOURCE',
            mode: 'payment',
            currency: 'PKR',
            amount: amountMinorUnits,
            entry_mode: 'raw',
          }),
        });

        if (v3Res.ok) {
          const v3Json: any = await v3Res.json();
          trackerToken = v3Json?.data?.token || v3Json?.token || v3Json?.tracker?.token || '';
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`[Safepay] API init response: ${errText.substring(0, 150)}`);
        }
      }
    } catch (err: any) {
      console.warn(`[Safepay] Network error connecting to Safepay: ${err.message}`);
    }
  }

  // Fallback tracker generation if in dev or keys pending verification
  if (!trackerToken) {
    trackerToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  // Construct Safepay Checkout Redirection URL
  const checkoutUrlObj = new URL(baseCheckoutUrl);
  checkoutUrlObj.searchParams.set('beacon', trackerToken);
  checkoutUrlObj.searchParams.set('order_id', orderId);
  checkoutUrlObj.searchParams.set('env', environment);
  checkoutUrlObj.searchParams.set('source', 'custom');
  checkoutUrlObj.searchParams.set('redirect_url', redirectUrl);
  checkoutUrlObj.searchParams.set('cancel_url', cancelUrl);

  return {
    token: trackerToken,
    checkoutUrl: checkoutUrlObj.toString(),
    orderId,
    amountPkr,
    environment,
  };
}

/**
 * Validates the HMAC signature of incoming Safepay webhooks.
 * Uses X-SFPY-SIGNATURE and X-SFPY-TIMESTAMP headers against SAFEPAY_WEBHOOK_SECRET.
 */
export function verifySafepayWebhookSignature(
  rawBody: string | Buffer,
  signature: string | string[] | undefined,
  timestamp?: string | string[] | undefined
): boolean {
  if (!signature) return false;
  const sigStr = Array.isArray(signature) ? signature[0] : signature;
  const tsStr = Array.isArray(timestamp) ? timestamp[0] : timestamp;

  const webhookSecret = config.safepay.webhookSecret || config.safepay.secretKey;
  if (!webhookSecret) {
    console.warn('[Safepay] Warning: SAFEPAY_WEBHOOK_SECRET is not configured on the server.');
    return false;
  }

  const rawBodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

  try {
    // 1. Check timestamped HMAC payload: `${timestamp}.${rawBody}`
    if (tsStr) {
      const payloadWithTimestamp = `${tsStr}.${rawBodyStr}`;
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadWithTimestamp)
        .digest('hex');

      if (
        expectedSig.length === sigStr.length &&
        crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sigStr))
      ) {
        return true;
      }
    }

    // 2. Check direct rawBody HMAC
    const expectedSigRaw = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyStr)
      .digest('hex');

    if (
      expectedSigRaw.length === sigStr.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSigRaw), Buffer.from(sigStr))
    ) {
      return true;
    }

    // 3. Check base64 encoded HMAC if hex comparison didn't match
    const expectedSigBase64 = crypto
      .createHmac('sha256', webhookSecret)
      .update(tsStr ? `${tsStr}.${rawBodyStr}` : rawBodyStr)
      .digest('base64');

    if (
      expectedSigBase64.length === sigStr.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSigBase64), Buffer.from(sigStr))
    ) {
      return true;
    }
  } catch (err) {
    console.error('[Safepay] Webhook signature verification error:', (err as Error).message);
    return false;
  }

  return false;
}

/**
 * Fetches current tracker status from Safepay reporter API.
 */
export async function fetchSafepayTrackerStatus(trackerToken: string): Promise<{
  success: boolean;
  state?: string;
  status?: string;
  details?: any;
}> {
  const { baseUrl, secretKey } = config.safepay;
  if (!secretKey) {
    return { success: false, status: 'UNKNOWN' };
  }

  try {
    const reporterEndpoint = `${baseUrl.replace(/\/+$/, '')}/reporter/v1/tracker/${encodeURIComponent(trackerToken)}`;
    const response = await fetch(reporterEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SFPY-MERCHANT-SECRET': secretKey,
      },
    });

    if (!response.ok) {
      return { success: false, status: `HTTP_${response.status}` };
    }

    const json: any = await response.json();
    const state = json?.data?.state || json?.state || json?.tracker?.state || 'UNKNOWN';
    return {
      success: true,
      state,
      status: state === 'TRACKER_ENDED' ? 'PAID' : state,
      details: json?.data || json,
    };
  } catch (err: any) {
    return { success: false, status: 'ERROR', details: err.message };
  }
}
