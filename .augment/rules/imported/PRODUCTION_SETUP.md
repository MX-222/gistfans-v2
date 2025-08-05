---
type: "manual"
---

# 🚀 GistFans 生产环境快速设置指南

## ⚡ 快速开始 (5分钟设置)

### 1. 立即创建 GitHub OAuth 应用

**重要：这是发布前的必要步骤！**

1. **访问 GitHub OAuth 设置**
   ```
   https://github.com/settings/applications/new
   ```

2. **填写应用信息**
   ```
   Application name: GistFans
   Homepage URL: http://localhost:3000
   Application description: Developer subscription platform
   Authorization callback URL: http://localhost:3000/api/auth/callback/github
   ```

3. **获取凭据**
   - 复制 `Client ID`
   - 生成并复制 `Client secret`

### 2. 更新环境变量

创建或更新 `.env.local` 文件：

```bash
# 必需的环境变量
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here
GITHUB_ID=your_actual_github_client_id
GITHUB_SECRET=your_actual_github_client_secret
DATABASE_URL=file:./dev.db
```

**生成安全密钥：**
```bash
# 方法1: 使用 OpenSSL
openssl rand -base64 32

# 方法2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法3: 在线生成
# 访问: https://generate-secret.vercel.app/32
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库架构
npx prisma db push

# 可选：查看数据库
npx prisma studio
```

### 4. 启动应用

```bash
# 清理缓存
Remove-Item -Recurse -Force .next

# 构建并测试
npm run build

# 启动开发服务器
npm run dev
```

## 🔧 验证设置

### 1. 测试 GitHub 登录

1. 访问 `http://localhost:3000`
2. 点击 "Sign In with GitHub"
3. 应该跳转到 GitHub 授权页面
4. 授权后返回应用并显示用户信息

### 2. 检查数据库

```bash
# 启动 Prisma Studio
npx prisma studio

# 检查用户表是否有新记录
```

### 3. 测试核心功能

- ✅ 用户注册/登录
- ✅ 用户资料显示
- ✅ 导航栏用户信息
- ✅ 退出登录
- ✅ 页面跳转 (feed, test-accounts 等)

## 🌐 生产环境部署

### 1. 部署平台选择

**推荐平台：**

1. **Vercel** (推荐)
   - 与 Next.js 完美集成
   - 自动 HTTPS
   - 全球 CDN
   - 免费层支持

2. **Railway**
   - 简单部署
   - 内置数据库
   - 自动扩容

3. **Netlify**
   - 静态站点优化
   - 表单处理
   - 边缘函数

### 2. 生产环境 OAuth 设置

**重要：为生产环境创建单独的 OAuth 应用**

1. **创建生产 OAuth 应用**
   ```
   Application name: GistFans Production
   Homepage URL: https://your-domain.com
   Authorization callback URL: https://your-domain.com/api/auth/callback/github
   ```

2. **更新生产环境变量**
   ```bash
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=production-secret-key
   GITHUB_ID=production_github_client_id
   GITHUB_SECRET=production_github_client_secret
   DATABASE_URL=your_production_database_url
   NODE_ENV=production
   ```

### 3. 数据库选择

**开发环境：**
- SQLite (当前配置)

**生产环境：**
- PostgreSQL (推荐)
- MySQL
- PlanetScale
- Supabase

## 🛡️ 安全最佳实践

### 1. 环境变量安全

```bash
# ❌ 错误：不要在代码中硬编码
const githubId = "ghp_xxxxxxxxxxxx"

# ✅ 正确：使用环境变量
const githubId = process.env.GITHUB_ID
```

### 2. 密钥管理

- 使用强随机密钥
- 定期轮换密钥
- 分离开发/生产环境密钥
- 使用密钥管理服务

### 3. OAuth 安全

- 限制回调 URL
- 监控异常登录
- 实施速率限制
- 记录安全事件

## 📊 监控和分析

### 1. 错误监控

```bash
# 安装 Sentry
npm install @sentry/nextjs

# 配置环境变量
SENTRY_DSN=your_sentry_dsn
```

### 2. 性能监控

```bash
# 安装 Web Vitals
npm install web-vitals

# 配置 Google Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### 3. 数据库监控

```bash
# Prisma 指标
npx prisma generate --data-proxy

# 数据库连接池监控
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

## 🚀 发布检查清单

### 发布前必须完成：

- [ ] ✅ GitHub OAuth 应用已创建并配置
- [ ] ✅ 生产环境变量已设置
- [ ] ✅ 数据库已初始化
- [ ] ✅ 构建成功 (`npm run build`)
- [ ] ✅ GitHub 登录测试通过
- [ ] ✅ 用户注册流程测试
- [ ] ✅ 核心功能测试
- [ ] ✅ 错误处理测试
- [ ] ✅ 响应式设计检查
- [ ] ✅ 性能测试
- [ ] ✅ 安全检查

### 发布后监控：

- [ ] 用户注册率
- [ ] 登录成功率
- [ ] 错误率
- [ ] 页面加载时间
- [ ] 数据库性能

## 🆘 故障排除

### 常见问题：

**1. `client_id is required`**
```bash
# 检查环境变量
echo $GITHUB_ID
# 确保 .env.local 文件存在且正确
```

**2. `redirect_uri_mismatch`**
```bash
# 检查 GitHub OAuth 应用的回调 URL
# 确保与 NEXTAUTH_URL 匹配
```

**3. 数据库连接失败**
```bash
# 测试数据库连接
npx prisma db push
# 检查 DATABASE_URL 格式
```

**4. 构建失败**
```bash
# 清理并重新构建
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

## 📞 技术支持

如果遇到问题：

1. 检查本文档的故障排除部分
2. 查看 GitHub Issues
3. 联系技术团队
4. 查看 Next.js 和 NextAuth.js 官方文档

---

**准备发布？按照这个检查清单，您的 GistFans 应用将在几分钟内准备就绪！** 🎉 