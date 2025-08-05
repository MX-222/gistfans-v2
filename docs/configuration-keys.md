# GistFans Configuration Keys Reference

## 📋 **Complete Configuration Documentation**

This document provides a comprehensive reference for all configuration keys, environment variables, and settings used in the GistFans platform.

---

## 🔐 **Authentication Configuration**

### **NextAuth.js Settings**

| Key | Type | Required | Description | Example |
|-----|------|----------|-------------|---------|
| `NEXTAUTH_URL` | String | ✅ | Base URL for NextAuth callbacks | `https://gistfans.vercel.app` |
| `NEXTAUTH_SECRET` | String | ✅ | Secret for JWT signing and encryption | `base64-encoded-32-byte-key` |

### **GitHub OAuth Configuration**

| Key | Type | Required | Description | Example |
|-----|------|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | String | ✅ | GitHub OAuth App Client ID | `Ov23li5XeyXEKnKDYsmR` |
| `GITHUB_CLIENT_SECRET` | String | ✅ | GitHub OAuth App Client Secret | `84dce9f72ec147ca38edbf5695978f88196cda92` |

**GitHub OAuth App Settings:**
- **Application name**: `GistFans`
- **Homepage URL**: `https://gistfans.vercel.app`
- **Authorization callback URL**: `https://gistfans.vercel.app/api/auth/callback/github`
- **Application description**: `GistFans - Connect with Expert Developers Platform`

---

## 🗄️ **Database Configuration**

### **Supabase PostgreSQL Settings**

| Key | Type | Required | Description | Example |
|-----|------|----------|-------------|---------|
| `DATABASE_URL` | String | ✅ | Pooled database connection (via Supabase Pooler) | `postgresql://postgres.gpyypnzpwmexnszmfket:password@aws-0-us-east-2.pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | String | ✅ | Direct database connection (for migrations) | `postgresql://postgres.gpyypnzpwmexnszmfket:password@aws-0-us-east-2.pooler.supabase.com:5432/postgres` |

### **Supabase API Configuration**

| Key | Type | Required | Description | Example |
|-----|------|----------|-------------|---------|
| `SUPABASE_ANON_KEY` | String | ✅ | Public anonymous key for client-side access | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | String | ✅ | Service role key for server-side admin access | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_ACCESS_TOKEN` | String | ✅ | Management API access token | `sbp_9334b44304f2aeaed48d2c198094b7ff3512bb12` |

---

## 🚀 **Deployment Configuration**

### **Vercel Environment Variables**

| Key | Type | Required | Description | Example |
|-----|------|----------|-------------|---------|
| `NODE_ENV` | String | ✅ | Runtime environment | `production` |
| `VERCEL` | String | Auto | Vercel platform indicator | `1` |
| `VERCEL_ENV` | String | Auto | Vercel environment type | `production` |

### **Vercel Project Settings**

| Setting | Value | Description |
|---------|-------|-------------|
| **Project Name** | `gistfans` | Vercel project identifier |
| **Framework** | `Next.js` | Detected framework |
| **Node.js Version** | `18.x` | Runtime version |
| **Build Command** | `npm run build` | Build script |
| **Output Directory** | `.next` | Build output location |

---

## 🔧 **Development Configuration**

### **Package.json Scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### **Next.js Configuration**

```javascript
// next.config.js
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com']
  }
}
```

---

## 🧪 **Testing Configuration**

### **Playwright E2E Testing**

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| `BASE_URL` | String | Target URL for testing | `https://gistfans.vercel.app` |
| `TEST_TIMEOUT` | Number | Test timeout in milliseconds | `30000` |

### **Test Environment Variables**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `TEST_GITHUB_USERNAME` | String | Optional | GitHub username for OAuth testing |
| `TEST_GITHUB_PASSWORD` | String | Optional | GitHub password for OAuth testing |

---

## 📊 **Monitoring and Diagnostics**

### **Health Check Endpoints**

| Endpoint | Purpose | Response Format |
|----------|---------|-----------------|
| `/api/system-health` | Overall system status | JSON with health metrics |
| `/api/oauth-health` | OAuth configuration status | JSON with auth status |
| `/api/deep-oauth-diagnosis` | Detailed OAuth diagnostics | JSON with comprehensive analysis |
| `/api/simple-env-check` | Environment variable verification | JSON with env status |

### **Diagnostic API Response Structure**

```typescript
interface SystemHealth {
  timestamp: string;
  environment: Record<string, string>;
  database: {
    status: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN';
  };
  oauth: {
    status: 'WORKING' | 'NEEDS_CONFIG' | 'ERROR';
  };
  overallStatus: 'HEALTHY' | 'CRITICAL_ISSUES';
  healthScore: string; // "X/100"
  issues: Array<{
    severity: 'CRITICAL' | 'MEDIUM' | 'LOW';
    category: string;
    description: string;
    impact: string;
    solution: string;
  }>;
}
```

---

## 🔒 **Security Configuration**

### **Cookie Settings**

```javascript
cookies: {
  sessionToken: {
    name: '__Secure-next-auth.session-token', // Production
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true, // Production only
      maxAge: 30 * 24 * 60 * 60 // 30 days
    }
  }
}
```

### **CORS and Security Headers**

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information |

---

## 🛠️ **Automation Scripts**

### **Configuration Management**

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/configure-vercel-env.js` | Set all environment variables | `node scripts/configure-vercel-env.js` |
| `scripts/update-github-oauth.js` | Update GitHub OAuth credentials | `node scripts/update-github-oauth.js` |
| `scripts/create-github-oauth-app.js` | Create new GitHub OAuth app | `node scripts/create-github-oauth-app.js` |

### **Testing Scripts**

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/run-e2e-tests.js` | Run end-to-end tests | `node scripts/run-e2e-tests.js` |
| `playwright.config.js` | Playwright configuration | Auto-loaded by Playwright |

---

## 📝 **Configuration Validation**

### **Required Environment Variables Checklist**

- [ ] `NEXTAUTH_URL` - Set to production domain
- [ ] `NEXTAUTH_SECRET` - 32-byte base64 encoded secret
- [ ] `GITHUB_CLIENT_ID` - Valid GitHub OAuth App ID
- [ ] `GITHUB_CLIENT_SECRET` - Valid GitHub OAuth App Secret
- [ ] `DATABASE_URL` - Supabase pooled connection string
- [ ] `DIRECT_URL` - Supabase direct connection string
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `SUPABASE_ACCESS_TOKEN` - Supabase management token

### **Configuration Verification Commands**

```bash
# Verify all environment variables
node scripts/configure-vercel-env.js

# Test OAuth configuration
curl https://gistfans.vercel.app/api/oauth-health

# Run system health check
curl https://gistfans.vercel.app/api/system-health

# Test end-to-end functionality
npm run test:e2e
```

---

**Last Updated**: 2025-08-02  
**Version**: 1.0  
**Maintainer**: GistFans Development Team
