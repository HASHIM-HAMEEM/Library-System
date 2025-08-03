# Vercel Deployment Guide for GStore

## 🚀 Deployment Steps

### 1. Environment Variables Setup

In your Vercel Dashboard, go to **Settings > Environment Variables** and add:

```
VITE_SUPABASE_URL=https://hkpetmoloqeqkexxlfcz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcGV0bW9sb3FlcWtleHhsZmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTc3NTQsImV4cCI6MjA2OTQzMzc1NH0.s6D9UQR5cpl8ohuM6A40y1CP5aYAe7aGY4Om1Kn9a9U
```

**Optional (for admin features):**
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard
```

### 2. Build Configuration

The `vercel.json` has been updated with:
- Proper build command: `npm run build`
- Output directory: `dist`
- SPA routing support
- Security headers

### 3. Deployment Commands

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 4. Manual Deployment via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set environment variables in Settings
4. Deploy

## 🔧 Troubleshooting ERR_ABORTED

### Common Causes & Solutions:

1. **Missing Environment Variables**
   - Ensure all `VITE_*` variables are set in Vercel Dashboard
   - Check that variable names match exactly

2. **Build Failures**
   - Check build logs in Vercel Dashboard
   - Ensure `npm run build` works locally

3. **Routing Issues**
   - Verify `vercel.json` rewrites configuration
   - Check that all routes are properly configured

4. **CORS Issues**
   - Verify Supabase URL is accessible
   - Check Supabase project settings

5. **Large Bundle Size**
   - The app has a large chunk (2.2MB)
   - Consider code splitting if needed

### Debug Steps:

1. **Check Vercel Function Logs**
   ```bash
   vercel logs [deployment-url]
   ```

2. **Test Local Production Build**
   ```bash
   npm run build
   npm run preview
   ```

3. **Verify Environment Variables**
   - Check Vercel Dashboard > Settings > Environment Variables
   - Ensure they're set for Production environment

4. **Check Network Tab**
   - Open browser DevTools
   - Look for failed requests
   - Check CORS errors

## 📋 Pre-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] `npm run build` works locally
- [ ] `npm run preview` works locally
- [ ] Supabase project is accessible
- [ ] All routes work in local preview
- [ ] No console errors in browser

## 🔄 Redeployment

After making these changes:

1. Commit and push changes to your repository
2. Vercel will automatically redeploy
3. Or manually trigger deployment in Vercel Dashboard

## 🆘 If Still Having Issues

1. Check Vercel deployment logs
2. Verify Supabase project status
3. Test with a minimal deployment
4. Contact Vercel support if needed

The configuration has been optimized for Vercel deployment with proper SPA routing and security headers.