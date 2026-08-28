# Password login (recommended for Na3Na3)

Email OTP / magic link needs custom SMTP to show a 6-digit code.
Password login works in Safari, Brave, and the iPhone home-screen app
without editing email templates.

## Supabase setting (important)

Dashboard → Authentication → Providers → Email:

1. Enable Email
2. **Confirm email → OFF** (so signup signs you in immediately)
3. Secure password change can stay on

If Confirm email stays ON, the user gets a confirmation link once after
Create account, then signs in with password on each device.

## Sync flow

1. Create account once (Mac or iPhone)
2. Sign in with the same email + password on the other device
3. Entries sync under the same `user_id`
