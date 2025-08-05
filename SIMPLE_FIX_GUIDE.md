# 🚀 简化修复指南 - 立即解决GitHub OAuth 404错误

## 📍 第一步：确定您的Vercel域名

### 方法1：查看Vercel Dashboard (推荐)
1. 访问 https://vercel.com/dashboard
2. 找到您的 `gistfans` 项目
3. 点击项目名称
4. 复制显示的域名 (通常是 `https://gistfans.vercel.app` 或 `https://gistfans-xxx.vercel.app`)

### 方法2：直接尝试常见域名
根据您的项目名称，最可能的域名是：
- `https://gistfans.vercel.app`

您可以直接访问这个URL看是否能打开您的网站。

## 🔧 第二步：修复GitHub OAuth应用

### 在您的GitHub OAuth应用中添加回调URL
1. 访问您的GitHub OAuth应用设置页面
2. 找到 "Authorization callback URL" 部分
3. **添加** (不要删除现有的) 以下URL：
   ```
   https://gistfans.vercel.app/api/auth/callback/github
   ```
   (如果您的实际域名不同，请替换 `gistfans.vercel.app` 部分)

4. 点击 "Update application"

## ⚙️ 第三步：配置Vercel环境变量

### 在Vercel Dashboard中设置环境变量
1. 进入您的Vercel项目设置
2. 点击 "Settings" > "Environment Variables"
3. 添加以下变量：

```
NEXTAUTH_URL=https://gistfans.vercel.app
NEXTAUTH_SECRET=KRyyjf2CP0HrxKc+4jaGI69gR+XRRcP6MX9fddKtncw=
GITHUB_CLIENT_ID=Ov23115XeyXEKnKDYsmR
GITHUB_CLIENT_SECRET=86357aafceafc62567db0c0b7b58a190eaa116c4
DATABASE_URL=postgresql://postgres.gpyypnzpwmexnszmfket:yKRNduhLQ+9dRDZ@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.gpyypnzpwmexnszmfket:yKRNduhLQ+9dRDZ@aws-0-us-east-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://gpyypnzpwmexnszmfket.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweXlwbnpwd21leG5zem1ma2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTA5MjYsImV4cCI6MjA2Nzg2NjkyNn0.bDkD7t5CTGtmtlUYcddJkSPAgtlZ8mNC4u1NMgB9PeE
```

**重要**: 如果您的实际域名不是 `gistfans.vercel.app`，请将 `NEXTAUTH_URL` 的值替换为您的实际域名。

## 🚀 第四步：重新部署

1. 在Vercel Dashboard中找到 "Deployments" 页面
2. 点击最新部署旁的 "..." 菜单
3. 选择 "Redeploy"
4. 等待部署完成

## ✅ 验证修复

1. 访问您的生产环境网站
2. 点击 "Sign in with GitHub"
3. 应该不再出现404错误
4. 能够正常完成GitHub授权并登录

## 🤔 如果仍有问题

### 检查域名是否正确
- 确保步骤1中确定的域名能够正常访问您的网站
- 确保步骤2和步骤3中使用的域名完全一致

### 检查环境变量
- 确保所有环境变量都正确设置
- 特别注意 `NEXTAUTH_URL` 必须与实际域名完全匹配

### 检查GitHub OAuth应用
- 确保回调URL包含了生产环境域名
- 确保Client ID和Secret正确

## 📋 关键要点

1. **域名一致性**: GitHub OAuth应用的回调URL、Vercel的 `NEXTAUTH_URL` 环境变量、实际访问的域名必须完全一致
2. **不要删除现有配置**: 在GitHub OAuth应用中添加生产环境回调URL时，保留现有的localhost URL
3. **重新部署**: 更新环境变量后必须重新部署才能生效

---

**预计修复时间**: 5-10分钟
**关键步骤**: 确定域名 → 更新GitHub OAuth → 设置环境变量 → 重新部署

现在就开始执行这4个步骤！
