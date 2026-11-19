/**
 * Firestore Security Rules Test Specification (Dirty Dozen Adversarial Suite)
 * Validates that every privilege escalation, spoofing, bloat, and bypass payload
 * defined in security_spec.md is rejected by firestore.rules.
 */
import assert from 'node:assert/strict';

export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Admin Privilege Escalation',
    path: 'admins/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker_uid', email: 'attacker@example.com', name: 'Attacker', role: 'super_admin' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Self-Approve Financing',
    path: 'financingApplications/app_1',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { status: 'approved', approvedMonthlyPaymentNgn: 1000, userId: 'cust_1' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Self-Verify Payment',
    path: 'payments/pay_1',
    operation: 'update',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { status: 'verified' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Fake Confirmed Savings Balance',
    path: 'savingsPlans/plan_1',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { userId: 'cust_1', confirmedPaidNgn: 15000000, status: 'active' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Shadow Ghost Field Injection',
    path: 'enquiries/enq_1',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { userId: 'cust_1', isAdminApproved: true },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Cross-Tenant PII Read',
    path: 'users/cust_2',
    operation: 'get',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: null,
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Unbounded List Scraping',
    path: 'enquiries',
    operation: 'list',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: null,
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Identity Spoofing on Create',
    path: 'quotations/quote_1',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { userId: 'cust_2' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Path Variable ID Poisoning',
    path: `enquiries/${'a'.repeat(300)}`,
    operation: 'create',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { userId: 'cust_1' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Denial-of-Wallet String Bloat',
    path: 'enquiries/enq_bloat',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { userId: 'cust_1', message: 'x'.repeat(50000) },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Timestamp Forgery',
    path: 'savingsPlans/plan_time',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { userId: 'cust_1', createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Terminal State Tampering',
    path: 'financingApplications/app_rejected',
    operation: 'update',
    auth: { uid: 'cust_1', email: 'cust1@example.com', email_verified: true },
    payload: { status: 'submitted' },
    expected: 'PERMISSION_DENIED'
  }
];

assert.equal(DIRTY_DOZEN_CASES.length, 12);
