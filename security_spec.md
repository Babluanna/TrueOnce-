# Security Specification for TrueOnce

## 1. Data Invariants
- A `UserProfile` can only be created by the user it represents.
- The `role` field in `UserProfile` is immutable for the user. Only existing admins can change roles.
- `AppConfig` is read-only for standard users and fully manageable by admins.
- `UsageLog` and `UserFeedback` are write-only for users (collect mode) and read-only for admins.
- First user ever to sign in becomes admin (frontend logic + rule validation for initialization).

## 2. The "Dirty Dozen" Payloads (Attacks)
1. **Role Escalation**: User tries to `create` or `update` their profile with `role: 'admin'`.
2. **Identity Spoofing**: User tries to create/update `users/some-other-id`.
3. **Config Tampering**: Non-admin tries to change `appName` or toggle `isJailbreakMode`.
4. **Log Deletion**: User tries to delete their activity logs to hide prompts.
5. **Feedback Scraping**: User tries to read other users' feedback.
6. **Admin Impersonation**: User tries to create a document in `/admins` collection (if it existed) or bypass `exists()` checks.
7. **Resource Poisoning**: Sending a 1MB string as `displayName`.
8. **Negative Usage**: Trying to set `totalUsageMinutes` to a negative value.
9. **Lock Bypass**: User tries to set `isLocked: false` on their own profile after being banned.
10. **Shadow Updates**: Including `isAdmin: true` in a payload for a collection that doesn't use it but might be misconfigured.
11. **Query Scraping**: Listing all users without a filter.
12. **Timestamp Spoofing**: Sending an old `lastLogin` timestamp.

## 3. Test Runner (Mock)
(The tests will be implemented in `firestore.rules.test.ts` or similar if requested, but for now I will focus on the rules logic).
