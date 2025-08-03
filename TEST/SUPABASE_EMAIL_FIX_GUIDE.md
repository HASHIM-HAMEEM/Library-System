# Supabase Email Registration Fix Guide

## Problem
You're getting this error when trying to register users:
```
AuthApiException(message: Email address "scnz313@gmail.com" is invalid, statusCode: 400, code: email_address_invalid)
```

## Root Cause
Supabase made a platform change in **September 2024** that now requires a **custom SMTP server** setup for email signups, even if email confirmations are disabled. This affects all new user registrations.

## Solution: Setup Custom SMTP with Resend (Free)

### Step 1: Create a Free Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Add Your Domain (Optional but Recommended)
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add your domain (e.g., `yourdomain.com`)
4. Follow the DNS verification steps

**Note:** For development/testing, you can skip this step and use Resend's default domain.

### Step 3: Get SMTP Credentials
1. In Resend dashboard, go to **Settings** → **SMTP**
2. Copy the following values:
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend`
   - **Password:** Your API key (starts with `re_`)

### Step 4: Configure Supabase SMTP
1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Authentication**
3. Scroll down to **SMTP Settings**
4. Toggle **Enable Custom SMTP** to ON
5. Fill in the configuration:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [Your Resend API Key]
   Sender Email: noreply@yourdomain.com (or use resend's domain)
   Sender Name: Your App Name
   ```
6. Click **Save**

### Step 5: Test the Fix
1. Try registering a new user in your Flutter app
2. The registration should now work without the email validation error

## Alternative Quick Fix (Temporary)
If you want a quick temporary solution for development:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Click on **Email**
3. Turn OFF **Confirm Email**
4. Save changes

**Warning:** This may not work for all cases and is not recommended for production.

## Verification
After setting up SMTP, you should be able to:
- Register new users without email validation errors
- Receive authentication emails from your custom domain
- Have better email deliverability

## Benefits of Custom SMTP
- ✅ Removes the 4 emails/hour limit
- ✅ Better email deliverability
- ✅ Custom branding (emails from your domain)
- ✅ Email analytics and monitoring
- ✅ Production-ready email system

## Troubleshooting

### Still getting email validation errors?
1. Make sure SMTP is enabled in Supabase
2. Verify your Resend API key is correct
3. Check that the sender email is valid
4. Wait a few minutes for changes to propagate

### Resend API Key Issues?
1. Make sure you're using the API key, not the SMTP password
2. The API key should start with `re_`
3. Generate a new API key if needed

### Domain Verification Issues?
1. You can use Resend without domain verification for testing
2. For production, complete the DNS verification process
3. Use a subdomain like `mail.yourdomain.com` if needed

## Cost
- **Resend Free Tier:** 3,000 emails/month
- **Resend Pro:** $20/month for 50,000 emails
- This is much better than Supabase's default 4 emails/hour limit

## References
- [Supabase SMTP Documentation](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend Supabase Integration](https://resend.com/blog/how-to-configure-supabase-to-send-emails-from-your-domain)
- [GitHub Discussion](https://github.com/orgs/supabase/discussions/29370)