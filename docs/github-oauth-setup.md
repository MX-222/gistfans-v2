# GitHub OAuth应用设置指南

## 🎯 问题诊断

当前OAuth配置问题：
- Client ID `Ov23li5XeyXEKnKDYsmR` 可能无效或应用不存在
- NextAuth API返回"server configuration error"
- 需要重新创建或验证GitHub OAuth应用

## 📋 手动创建GitHub OAuth应用

### 步骤1：访问GitHub设置
1. 打开 https://github.com/settings/applications
2. 点击 "New OAuth App" 按钮

### 步骤2：填写应用信息
```
Application name: GistFans
Homepage URL: https://gistfans.vercel.app
Application description: GistFans - Connect with Expert Developers Platform
Authorization callback URL: https://gistfans.vercel.app/api/auth/callback/github
```

### 步骤3：获取凭据
创建后会得到：
- Client ID (类似: Ov23li...)
- Client Secret (点击Generate a new client secret)

### 步骤4：更新Vercel环境变量
使用获得的凭据运行：
```bash
node scripts/configure-vercel-env.js
```

或手动在Vercel Dashboard设置：
- `GITHUB_CLIENT_ID`: [新的Client ID]
- `GITHUB_CLIENT_SECRET`: [新的Client Secret]

## 🔍 验证步骤

### 1. 检查OAuth应用状态
访问: https://gistfans.vercel.app/api/deep-oauth-diagnosis

### 2. 测试NextAuth API
- https://gistfans.vercel.app/api/auth/providers (应该返回GitHub provider)
- https://gistfans.vercel.app/api/auth/csrf (应该返回CSRF token)

### 3. 测试完整登录流程
1. 访问 https://gistfans.vercel.app
2. 点击 "Sign in with GitHub" 按钮
3. 完成GitHub授权
4. 验证重定向到 /feed 页面

## 🚨 常见问题

### 问题1：回调URL不匹配
**错误**: redirect_uri_mismatch
**解决**: 确保GitHub OAuth应用的回调URL完全匹配：
`https://gistfans.vercel.app/api/auth/callback/github`

### 问题2：Client Secret无效
**错误**: invalid_client
**解决**: 重新生成Client Secret并更新Vercel环境变量

### 问题3：应用权限不足
**错误**: insufficient_scope
**解决**: 确保OAuth应用有读取用户信息的权限

## 📊 当前配置状态

### 环境变量 ✅
- NEXTAUTH_URL: https://gistfans.vercel.app
- NEXTAUTH_SECRET: [已设置]
- GITHUB_CLIENT_ID: Ov23li5XeyXEKnKDYsmR (可能无效)
- GITHUB_CLIENT_SECRET: [已设置] (可能无效)

### NextAuth配置 ✅
- 已移除EmailProvider和GoogleProvider
- 只保留GitHub OAuth provider
- JWT策略配置正确

### 待验证项目 ⚠️
- [ ] GitHub OAuth应用是否存在且有效
- [ ] Client ID和Secret是否正确
- [ ] 回调URL是否匹配
- [ ] 应用权限是否充足

## 🎯 下一步行动

1. **立即**: 手动创建新的GitHub OAuth应用
2. **然后**: 更新Vercel环境变量
3. **最后**: 测试完整的OAuth流程

创建完成后，请运行诊断API验证配置是否正确。
