# 🚀 Supabase Email Fix - Quick Reference

## ⚡ Quick Commands

```bash
# Test current status
node implement_email_fix.cjs

# Interactive setup
./setup_email_fix.sh setup

# Quick test only
./setup_email_fix.sh test

# Open Resend website
./setup_email_fix.sh resend

# Open Supabase dashboard
./setup_email_fix.sh dashboard
```

## 🔧 SMTP Configuration (Copy-Paste Ready)

### Resend SMTP Settings for Supabase:
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: [Your Resend API Key]
Sender Email: noreply@yourdomain.com
Sender Name: Your App Name
```

## 📍 Quick Links

- **Resend Signup**: https://resend.com
- **Your Supabase Auth Settings**: https://hkpetmoloqeqkexxlfcz.supabase.co/dashboard/project/settings/auth
- **Resend Dashboard**: https://resend.com/dashboard

## 🚨 Issue Symptoms

```
AuthApiException(message: Email address "user@gmail.com" is invalid, 
statusCode: 400, code: email_address_invalid)
```

## ✅ Success Indicators

- No "email_address_invalid" errors
- All email domains work (gmail.com, yahoo.com, etc.)
- Users can register successfully

## 🆘 Emergency Quick Fix (Dev Only)

1. Supabase Dashboard → Authentication → Providers
2. Click "Email" → Turn OFF "Confirm Email"
3. Save changes

⚠️ **Not for production use!**

---

**Need help?** Run `./setup_email_fix.sh` for interactive guidance.