---
type: "manual"
---

# 认证系统文档

## OAuth流程
GistFans 使用 GitHub OAuth 进行用户认证

### 配置步骤
1. 在 GitHub 创建 OAuth App
2. 设置环境变量
3. 配置 NextAuth.js

### 邀请码系统
- 用户注册需要有效邀请码
- 管理员可生成邀请码
- 邀请码使用后失效

### API端点
- `/api/auth/[...nextauth]` - OAuth 处理
- `/api/invite/validate` - 邀请码验证
- `/api/invite/use` - 使用邀请码 