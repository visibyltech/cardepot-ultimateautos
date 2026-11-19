# Security Specification — Car Depot by Ultimate Autos

## 1. Data Invariants
1. **Admin Authority**: Only verified admins (`usitakatelvin@gmail.com` with `email_verified == true` or documents in `/admins/{uid}`) may create/edit/delete `vehicles`, `settings`, `testimonials`, `whatsappLogs`, or approve/reject financing, savings payments, vehicle valuations, and quotations.
2. **PII Isolation**: Customer PII (`users/{uid}`) is strictly readable and writable only by the owner (`request.auth.uid == userId`) or verified admins.
3. **Financing Approval Lock**: Customer-submitted `financingApplications` MUST enter with `status == 'submitted'`, `approvedDepositNgn == 0`, `approvedMonthlyPaymentNgn == 0`, and `depositRecordedNgn == 0`. Customers can never self-approve or alter repayment schedules.
4. **Savings & Payment Verification Lock**: Customer-created `savingsPlans` MUST enter with `confirmedPaidNgn == 0` and `status == 'active'`. Customer-created `payments` MUST enter with `status == 'pending_verification'`. Only admins can verify payments or update `confirmedPaidNgn`.
5. **Vehicle Moderation Lock**: Customer `vehicleSubmissions` (Sell Your Car) NEVER auto-publish to `/vehicles`; only admins may review, add valuations/offers, and publish approved vehicles.
6. **Immutable Ownership & Timestamps**: `userId` and `createdAt` cannot be modified after creation; `createdAt` and `updatedAt` are validated against `request.time`.
7. **Strict Key & Size Checks**: Every document enforces `keys().hasAll(...)` and `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and `.size()` limits on all strings and bounded arrays.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Admin Privilege Escalation**: Non-admin user attempts `create` on `/admins/{uid}` to grant themselves admin privileges. -> MUST return `PERMISSION_DENIED`.
2. **Self-Approve Financing**: Authenticated customer attempts `create` on `/financingApplications/{id}` with `status: 'approved'` and `approvedMonthlyPaymentNgn: 1000`. -> MUST return `PERMISSION_DENIED`.
3. **Self-Verify Payment**: Authenticated customer attempts `update` on `/payments/{id}` changing `status` from `'pending_verification'` to `'verified'`. -> MUST return `PERMISSION_DENIED`.
4. **Fake Confirmed Savings Balance**: Customer creates `/savingsPlans/{id}` with `confirmedPaidNgn: 15000000` without verified payments. -> MUST return `PERMISSION_DENIED`.
5. **Shadow Ghost Field Injection**: Customer includes `isAdminApproved: true` or `bypassReview: true` in `/enquiries/{id}` or `/quotations/{id}`. -> MUST return `PERMISSION_DENIED`.
6. **Cross-Tenant PII Read**: Customer A attempts `get` on `/users/{customerB}` or `/financingApplications/{appBelongingToB}`. -> MUST return `PERMISSION_DENIED`.
7. **Unbounded List Scraping**: Customer A attempts `list` on `/enquiries` without filtering `where('userId', '==', auth.uid)`. -> MUST return `PERMISSION_DENIED`.
8. **Identity Spoofing on Create**: Customer A attempts `create` on `/quotations/{id}` with `userId: customerB`. -> MUST return `PERMISSION_DENIED`.
9. **Path Variable ID Poisoning**: Attacker attempts `create` on `/enquiries/{2000-char-id}` or ID with `/` / `$` characters. -> MUST return `PERMISSION_DENIED`.
10. **Denial-of-Wallet String Bloat**: Attacker attempts `create` on `/enquiries/{id}` with a 50KB `message` string exceeding `size() <= 2000`. -> MUST return `PERMISSION_DENIED`.
11. **Timestamp Forgery**: Attacker attempts `create` on `/savingsPlans/{id}` with backdated `createdAt` not matching `request.time`. -> MUST return `PERMISSION_DENIED`.
12. **Terminal State Tampering**: Customer attempts `update` on a `'rejected'` or `'approved'` `/financingApplications/{id}` to reset its status. -> MUST return `PERMISSION_DENIED`.
