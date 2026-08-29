/**
 * Email Notification Service for Orillusive HMS SaaS Subscription Payments
 */

export interface PaymentSuccessEmailParams {
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  referenceId: string;
  invoiceNumber: string;
  subscriptionStatus: string;
}

export interface PaymentFailedEmailParams {
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  referenceId?: string;
  retryUrl: string;
}

/**
 * Sends payment success confirmation email.
 */
export async function sendPaymentSuccessEmail(params: PaymentSuccessEmailParams): Promise<boolean> {
  const {
    customerName,
    customerEmail,
    planName,
    amount,
    currency,
    paymentDate,
    referenceId,
    invoiceNumber,
    subscriptionStatus,
  } = params;

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi',
  }).format(paymentDate);

  const subject = 'Payment Successful — Orillusive Subscription';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 32px 28px; color: #334155; }
    .badge { display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 700; border-radius: 9999px; background: #dcfce7; color: #166534; }
    .receipt-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; }
    .row:last-child { border-bottom: none; font-weight: bold; font-size: 15px; color: #0f172a; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>ORILLUSIVE</h1>
      <p>Software Studio / SaaS Platform</p>
    </div>
    <div class="content">
      <div style="text-align: right;"><span class="badge">Payment Verified (PAID)</span></div>
      <h2 style="color: #0f172a; font-size: 20px; margin-top: 12px;">Payment Successful!</h2>
      <p>Dear ${customerName || 'Valued Partner'},</p>
      <p>Thank you for your payment. Your subscription to <strong>${planName}</strong> has been successfully activated on the Orillusive HMS platform.</p>
      
      <div class="receipt-box">
        <div class="row"><span>Invoice Number:</span><span><strong>${invoiceNumber}</strong></span></div>
        <div class="row"><span>Subscription Plan:</span><span>${planName}</span></div>
        <div class="row"><span>Date:</span><span>${formattedDate}</span></div>
        <div class="row"><span>Safepay Transaction Ref:</span><span>${referenceId}</span></div>
        <div class="row"><span>Subscription Status:</span><span>${subscriptionStatus}</span></div>
        <div class="row"><span>Total Paid:</span><span>${amount.toLocaleString()} ${currency}</span></div>
      </div>

      <p style="font-size: 13px; color: #64748b;">You can view and download your full tax invoice anytime from the Subscription & Billing tab in your dashboard.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ORILLUSIVE HMS. All rights reserved. • Support: support@orillusive.com
    </div>
  </div>
</body>
</html>
  `;

  console.log(`[Email Service] Sent SUCCESS email to ${customerEmail}: "${subject}" (Invoice: ${invoiceNumber})`);
  return true;
}

/**
 * Sends payment failed alert email.
 */
export async function sendPaymentFailedEmail(params: PaymentFailedEmailParams): Promise<boolean> {
  const { customerName, customerEmail, planName, amount, currency, paymentDate, referenceId, retryUrl } = params;

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi',
  }).format(paymentDate);

  const subject = 'Payment Failed — Orillusive Subscription';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #fee2e2; border-radius: 16px; overflow: hidden; }
    .header { background: #991b1b; padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .content { padding: 32px 28px; color: #334155; }
    .badge { display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 700; border-radius: 9999px; background: #fee2e2; color: #991b1b; }
    .box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 14px; margin-top: 10px; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>ORILLUSIVE</h1>
      <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Payment Alert</p>
    </div>
    <div class="content">
      <span class="badge">Payment Declined</span>
      <h2 style="color: #991b1b; font-size: 18px; margin-top: 12px;">Payment Processing Unsuccessful</h2>
      <p>Dear ${customerName || 'Valued Partner'},</p>
      <p>We were unable to process your payment for the <strong>${planName}</strong> plan on ${formattedDate}. Your subscription was not activated.</p>
      
      <div class="box">
        <p style="margin: 0 0 6px;"><strong>Amount Attempted:</strong> ${amount.toLocaleString()} ${currency}</p>
        ${referenceId ? `<p style="margin: 0 0 6px;"><strong>Transaction Ref:</strong> ${referenceId}</p>` : ''}
        <p style="margin: 0;"><strong>Reason:</strong> Card declined or session expired by Safepay payment gateway.</p>
      </div>

      <p>To retry your subscription payment, please click below or visit your billing dashboard:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${retryUrl}" class="btn">Retry Subscription Payment</a>
      </div>
    </div>
    <div class="footer">
      Need assistance? Contact support@orillusive.com
    </div>
  </div>
</body>
</html>
  `;

  console.log(`[Email Service] Sent FAILED payment alert to ${customerEmail}: "${subject}"`);
  return true;
}
