# 🚀 GistFans 生产环境部署指南

## 📋 部署前准备

### ✅ 已完成项目检查
- [x] 构建成功（npm run build ✓）
- [x] 数据库配置正确
- [x] 环境变量设置
- [x] Git 仓库初始化

## 🔗 Step 1: 创建 GitHub 仓库

### 手动创建方式：
1. 访问：https://github.com/new
2. 仓库名称：`gistfans`
3. 描述：`GistFans - Developer Community Platform`
4. 设置为 Public（或 Private）
5. 点击 "Create repository"

### 推送代码：
```bash
# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/gistfans.git

# 推送代码
git branch -M main
git push -u origin main
```

## 🌟 Step 2: Vercel 部署

### 网页部署方式：
1. 访问：https://vercel.com
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 导入 `gistfans` 仓库
5. 配置环境变量

## 🔧 Step 3: 环境变量配置

在 Vercel Dashboard 中设置以下环境变量：

### 数据库配置：
```env
DATABASE_URL=postgresql://postgres.gpyypnzpwmexnszmfket:yKRNduhLQ+9dRDZ@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### NextAuth 配置：
```env
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=KRyyjf2CP0HrxKc+4jaGI69gR+XRRcP6MX9fddKtncw=
```

### GitHub OAuth（需要创建生产环境应用）：
```env
GITHUB_CLIENT_ID=Ov23115XeyXEKnKDYsmR
GITHUB_CLIENT_SECRET=86357aafceafc62567db0c0b7b58a190eaa11664
```

⚠️ **重要**：生产环境需要创建新的 GitHub OAuth 应用！

## 🔐 Step 4: 创建生产环境 GitHub OAuth 应用

1. 访问：https://github.com/settings/applications/new
2. 填写信息：
   - **Application name**: GistFans Production
   - **Homepage URL**: https://your-app-name.vercel.app
   - **Authorization callback URL**: https://your-app-name.vercel.app/api/auth/callback/github
3. 创建后获取新的 Client ID 和 Secret
4. 更新 Vercel 环境变量

## 🗄️ Step 5: 数据库初始化

部署成功后，需要初始化生产数据库：

### 自动方式（推荐）：
Vercel 部署时会自动运行：
```bash
npx prisma generate
npx prisma db push
```

### 手动方式：
如果需要手动操作：
1. 在 Vercel Dashboard 找到项目
2. 进入 "Functions" 页面
3. 运行数据库迁移命令

## ✅ Step 6: 部署验证

### 检查项目：
- [ ] 网站可以访问
- [ ] GitHub 登录正常
- [ ] 数据库连接成功
- [ ] 页面加载正常

### 测试流程：
1. 访问 https://your-app-name.vercel.app
2. 点击 "Sign in with GitHub"
3. 完成 OAuth 授权
4. 检查是否成功登录

## 🛠️ 故障排除

### 常见问题：

#### 1. GitHub OAuth 错误
```
Error: invalid_client
```
**解决**：检查 GitHub OAuth 应用的回调 URL 是否正确

#### 2. 数据库连接失败
```
Can't reach database server
```
**解决**：检查 DATABASE_URL 环境变量

#### 3. 构建失败
```
Module not found
```
**解决**：检查依赖项和导入路径

## 📊 监控和维护

### Vercel Analytics：
- 启用 Web Analytics
- 监控性能指标
- 检查错误日志

### 数据库监控：
- Supabase Dashboard
- 连接数监控
- 查询性能

## 🚀 域名配置（可选）

1. 在 Vercel Dashboard 中添加自定义域名
2. 配置 DNS 记录
3. 更新 NEXTAUTH_URL 环境变量
4. 更新 GitHub OAuth 回调 URL 