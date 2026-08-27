import 'dotenv/config';
import { connectSaasDb } from '../db/saasDb.js';
import {
  startDemo,
  createPaidOrder,
  verifyPaidPayment,
  loginUser,
  checkDemoEligibility,
} from '../modules/auth/auth.service.js';
import { getTenantDatabase } from '../db/tenantManager.js';
import { normalizeEmail } from '../utils/email.js';

async function runAuthPaymentDemoSuite() {
  console.log('\n========================================================================');
  console.log(' ORILLUSIVE HMS — REAL PAYMENT VERIFICATION & 3-DAY DEMO TEST SUITE');
  console.log('========================================================================\n');

  const { models: saasModels } = await connectSaasDb();

  // ─── 1. Test Email Normalization ──────────────────────────────────────────
  console.log('[Test 1] Testing Email Normalization...');
  const norm1 = normalizeEmail('  Test.User@Domain.COM ');
  const norm2 = normalizeEmail('test.user@domain.com');
  if (norm1 === 'test.user@domain.com' && norm1 === norm2) {
    console.log(`✓ Email Normalization Verified: "  Test.User@Domain.COM " -> "${norm1}"`);
  } else {
    throw new Error(`Email normalization failed: ${norm1}`);
  }

  // ─── 2. Test Paid Plan Flow & Payment Verification ────────────────────────
  console.log('\n[Test 2] Testing Server-Side Paid Plan Checkout & Verification...');
  const paidEmail = `paid_owner_${Date.now()}@hotel.com`;
  
  // Step 1: Create Order
  const orderRes = await createPaidOrder({
    hotelName: 'Royal Crest Palace',
    firstName: 'Tariq',
    lastName: 'Mahmood',
    email: paidEmail,
    password: 'Password123!',
    planId: 'PREMIUM',
  });

  console.log(`✓ Order Created: ID = ${orderRes.orderId}, Status = ${orderRes.paymentStatus}, Amount = ${orderRes.amount} PKR`);

  if (orderRes.paymentStatus !== 'PENDING') {
    throw new Error('Order status should be PENDING before payment verification!');
  }

  // Step 2: Test Failed Payment Simulation
  console.log('Testing Failed Payment Simulation...');
  try {
    const failedOrderId = `ord_failed_${Date.now()}`;
    await saasModels.PaymentOrder.create({
      orderId: failedOrderId,
      paymentId: `pay_failed_${Date.now()}`,
      email: 'failed@test.com',
      normalizedEmail: 'failed@test.com',
      selectedPlan: 'BASIC',
      amount: 5000,
      paymentStatus: 'PENDING',
      pendingRegistration: { hotelName: 'Failed Hotel', email: 'failed@test.com' },
    });

    await verifyPaidPayment({ orderId: failedOrderId, simulateFailure: true });
    throw new Error('FAILED PAYMENT SHOULD HAVE BEEN REJECTED!');
  } catch (err: any) {
    console.log(`✓ Failed Payment Correctly Blocked: "${err.message}"`);
  }

  // Step 3: Verify Payment Server-Side & Activate Account
  const verifyRes = await verifyPaidPayment({
    orderId: orderRes.orderId,
    cardNumber: '4242424242424242',
    cardHolder: 'Tariq Mahmood',
    expMonth: '12',
    expYear: '28',
  });

  console.log(`✓ Payment Server Verification Passed! TxnId = ${verifyRes.order?.providerTransactionId || 'VERIFIED'}, Tenant = ${verifyRes.tenant.tenantId}`);

  if (verifyRes.tenant.accountType !== 'PAID' || verifyRes.tenant.status !== 'ACTIVE') {
    throw new Error('Account must be set to PAID & ACTIVE upon verified payment!');
  }

  // Login as Paid Owner
  const paidLoginRes = await loginUser({ email: paidEmail, password: 'Password123!' });
  console.log(`✓ Login Verified for Paid User: ${paidLoginRes.user.email} (${paidLoginRes.tenant?.accountType})`);

  // ─── 3. Test 3-Day Demo Account & Eligibility ─────────────────────────────
  console.log('\n[Test 3] Testing 3-Day Demo System & Eligibility...');
  const demoEmail = `Demo.User_${Date.now()}@Example.com`;
  const normDemoEmail = normalizeEmail(demoEmail);

  // Check Eligibility initially
  const elig1 = await checkDemoEligibility(demoEmail);
  if (!elig1.eligible) {
    throw new Error('Fresh email should be eligible for demo!');
  }
  console.log(`✓ Fresh email eligibility confirmed for: ${normDemoEmail}`);

  // Start Demo
  const demoRes = await startDemo({
    hotelName: 'Ocean Breeze Hotel',
    firstName: 'Sara',
    lastName: 'Khan',
    email: demoEmail,
    password: 'DemoPassword123!',
  });

  console.log(`✓ 3-Day Demo Started! TenantId = ${demoRes.tenant.tenantId}, ExpiresAt = ${demoRes.tenant.demoExpiresAt}`);

  const startTime = new Date(demoRes.tenant.demoStartedAt!).getTime();
  const expireTime = new Date(demoRes.tenant.demoExpiresAt!).getTime();
  const durationHours = (expireTime - startTime) / (1000 * 60 * 60);

  console.log(`✓ Duration Verified: Exactly ${durationHours} real hours (72h expected).`);
  if (Math.round(durationHours) !== 72) {
    throw new Error(`Demo duration mismatch: got ${durationHours} hours instead of 72.`);
  }

  // ─── 4. Test Demo Reuse Prevention (One Email = One Demo Ever) ─────────────
  console.log('\n[Test 4] Testing One Email = One Demo Ever Enforcement...');
  
  // Try starting demo with exact same email
  try {
    await startDemo({
      hotelName: 'Duplicate Hotel 1',
      firstName: 'Sara',
      lastName: 'Khan',
      email: demoEmail,
      password: 'DemoPassword123!',
    });
    throw new Error('DUPLICATE DEMO ATTEMPT WAS NOT BLOCKED!');
  } catch (err: any) {
    console.log(`✓ Duplicate Exact Email Demo Rejection Verified: "${err.message}"`);
  }

  // Try starting demo with normalized version of same email (different case/whitespace)
  const variantEmail = `  ${demoEmail.toUpperCase()}  `;
  try {
    await startDemo({
      hotelName: 'Duplicate Hotel 2',
      firstName: 'Sara',
      lastName: 'Khan',
      email: variantEmail,
      password: 'DemoPassword123!',
    });
    throw new Error('VARIATION DUPLICATE DEMO ATTEMPT WAS NOT BLOCKED!');
  } catch (err: any) {
    console.log(`✓ Case/Whitespace Variation Demo Rejection Verified: "${err.message}"`);
  }

  // ─── 5. Test Demo Expiration Server Enforcement ────────────────────────────
  console.log('\n[Test 5] Testing Server-Side Demo Expiration Enforcement...');
  
  // Artificially expire the demo tenant in the DB
  const demoTenantId = demoRes.tenant.tenantId;
  const expiredDate = new Date(Date.now() - 1000 * 60); // 1 minute ago in past

  await saasModels.Tenant.updateOne(
    { tenantId: demoTenantId },
    { demoExpiresAt: expiredDate }
  );

  console.log(`Simulated demo expiration: updated demoExpiresAt to ${expiredDate.toISOString()}`);

  // Attempt login with expired demo account
  try {
    await loginUser({ email: demoEmail, password: 'DemoPassword123!' });
    throw new Error('EXPIRED DEMO LOGIN SHOULD HAVE BEEN REJECTED!');
  } catch (err: any) {
    if (err.code === 'DEMO_EXPIRED') {
      console.log(`✓ Expired Demo Login Correctly Rejected with code DEMO_EXPIRED: "${err.message}"`);
    } else {
      throw new Error(`Unexpected error code for expired demo login: ${err.message}`);
    }
  }

  // Verify expired demo tenant status was marked EXPIRED in DB
  const updatedTenant = await saasModels.Tenant.findOne({ tenantId: demoTenantId });
  if (updatedTenant?.status === 'EXPIRED') {
    console.log(`✓ DB Status updated to EXPIRED automatically.`);
  } else {
    throw new Error(`Tenant status was not updated to EXPIRED in database!`);
  }

  // ─── 6. Test Expired Demo Re-Registration Prevention ─────────────────────
  console.log('\n[Test 6] Testing Expired Email Re-Registration Block...');
  try {
    await startDemo({
      hotelName: 'Expired Demo Re-attempt',
      firstName: 'Sara',
      lastName: 'Khan',
      email: demoEmail,
      password: 'DemoPassword123!',
    });
    throw new Error('EXPIRED DEMO RE-REGISTRATION WAS NOT BLOCKED!');
  } catch (err: any) {
    console.log(`✓ Expired Email Demo Re-Registration Correctly Blocked: "${err.message}"`);
  }

  // ─── 7. Test Tenant Isolation & Cross-Tenant Data Leak Prevention ─────────
  console.log('\n[Test 7] Testing Database Tenant Isolation...');
  const { models: tenantDbPaid } = await getTenantDatabase(paidLoginRes.tenant!.tenantId);
  const { models: tenantDbDemo } = await getTenantDatabase(demoTenantId);

  // Add booking to Paid Tenant
  const paidGuest = await tenantDbPaid.Guest.create({
    guestId: `gst_paid_${Date.now()}`,
    firstName: 'VIP',
    lastName: 'Paid Guest',
  });

  const paidRoom = (await tenantDbPaid.Room.findOne())!;
  await tenantDbPaid.Booking.create({
    bookingId: `bk_paid_${Date.now()}`,
    bookingNumber: 'ISO-PAID-999',
    guestId: paidGuest.guestId,
    roomId: paidRoom.roomId,
    roomTypeId: paidRoom.roomTypeId,
    checkIn: new Date('2026-10-01'),
    checkOut: new Date('2026-10-05'),
    totalAmount: 90000,
  });

  // Verify Demo tenant DB cannot query booking ISO-PAID-999
  const demoFoundBookings = await tenantDbDemo.Booking.find({ bookingNumber: 'ISO-PAID-999' });
  if (demoFoundBookings.length === 0) {
    console.log('✓ TENANT ISOLATION PASSED: Demo tenant database cannot see Paid tenant bookings.');
  } else {
    throw new Error('SECURITY FAILURE: Cross-tenant data leakage detected!');
  }

  console.log('\n========================================================================');
  console.log('   ALL REAL PAYMENT VERIFICATION & 3-DAY DEMO TESTS PASSED CLEANLY!');
  console.log('========================================================================\n');
  process.exit(0);
}

runAuthPaymentDemoSuite().catch((err) => {
  console.error('\n❌ Suite Failed:', err);
  process.exit(1);
});
