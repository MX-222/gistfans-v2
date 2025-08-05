# 🔧 GistFans 实际开发工作流程

## 📋 基于实际项目的开发指南

本文档基于项目实际代码、配置和工具，提供100%准确的开发工作流程指导。

## 🚀 环境搭建 (实际步骤)

### **1. 系统要求**
```json
// 基于package.json的实际要求
{
  "engines": {
    "node": ">=18.18.0"
  }
}
```

### **2. 项目克隆和依赖安装**
```bash
# 克隆项目
git clone https://github.com/MX-Al/gistfans.git
cd gistfans

# 安装依赖
npm install

# 验证安装
npm run type-check                    # TypeScript检查
npm run lint                          # ESLint检查
```

### **3. 环境变量配置**
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
# 必需变量:
DATABASE_URL="postgresql://..."       # Supabase数据库URL
NEXTAUTH_URL="http://localhost:3000"  # NextAuth基础URL
NEXTAUTH_SECRET="your-secret"         # NextAuth密钥
GITHUB_CLIENT_ID="your-client-id"     # GitHub OAuth ID
GITHUB_CLIENT_SECRET="your-secret"    # GitHub OAuth密钥
```

### **4. 数据库初始化**
```bash
# 生成Prisma客户端
npx prisma generate

# 推送Schema到数据库
npx prisma db push

# 查看数据库 (可选)
npx prisma studio
```

### **5. 启动开发服务器**
```bash
# 启动开发服务器
npm run dev

# 验证启动成功
# 访问 http://localhost:3000
```

## 🧪 实际测试流程

### **手动测试脚本 (项目特有)**
```bash
# 综合功能测试
node scripts/test-all-four-fixes.js

# 核心功能测试
node scripts/test-comment-functionality.js    # 评论系统
node scripts/test-star-voting.js             # Star投票
node scripts/test-post-persistence.js        # 帖子持久化

# 数据库和连接测试
node scripts/diagnose-connection-pool.js     # 连接池诊断
node scripts/test-db-connection.js           # 数据库连接

# 用户系统测试
node scripts/test-user-invite-status.js      # 邀请状态
node scripts/create-admin.js                 # 管理员创建

# 性能测试
node scripts/performance-test.js             # 性能测试
node scripts/connection-monitor.js           # 连接监控
```

### **测试页面验证**
```bash
# 在浏览器中访问测试页面
http://localhost:3000/test-comments          # 评论功能测试
http://localhost:3000/test-performance       # 性能测试
http://localhost:3000/test-oauth            # OAuth认证测试
http://localhost:3000/test-admin-auth       # 管理员认证测试
```

### **API测试验证**
```bash
# 在浏览器中访问测试API
http://localhost:3000/api/test-github-config      # GitHub配置测试
http://localhost:3000/api/test-db-connection      # 数据库连接测试
```

## 📝 代码开发流程

### **1. 分支管理**
```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 或者修复分支
git checkout -b fix/bug-description

# 基于实际提交历史的命名模式
git checkout -b feat/admin-user-management
git checkout -b fix/database-connection-pool
```

### **2. 开发过程中的验证**
```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 预提交检查 (项目自定义)
npm run pre-commit
# 或直接运行
node scripts/pre-commit-check.js

# 构建验证
npm run build
```

### **3. 数据库操作**
```bash
# 修改Schema后重新生成客户端
npx prisma generate

# 推送Schema变更
npx prisma db push

# 查看数据库内容
npx prisma studio
```

## 🔄 实际部署流程

### **1. 部署前检查**
```bash
# 运行完整测试套件
node scripts/test-all-four-fixes.js

# 检查构建
npm run build

# 验证环境变量
node scripts/test-github-config.js

# 数据库健康检查
node scripts/lightweight-health-check.js
```

### **2. Vercel部署 (实际使用的方式)**
```bash
# 推送到main分支触发自动部署
git add .
git commit -m "feat: 添加新功能"
git push origin main

# Vercel会自动:
# 1. 检测到推送
# 2. 运行npm run build
# 3. 部署到生产环境
```

### **3. 部署后验证**
```bash
# 检查部署状态
# 访问生产环境URL

# 验证核心功能
# 1. 用户登录
# 2. 帖子发布
# 3. 评论功能
# 4. Star投票
```

## 🛠️ 开发工具配置

### **VS Code推荐配置**
```json
// .vscode/settings.json (建议创建)
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### **推荐的VS Code扩展**
```json
// .vscode/extensions.json (建议创建)
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint"
  ]
}
```

## 🐛 调试和问题排查

### **常用调试命令**
```bash
# 数据库连接问题
node scripts/diagnose-connection-pool.js
node scripts/simple-connection-test.js

# OAuth认证问题
node scripts/test-oauth-complete.js

# 性能问题
node scripts/performance-test.js

# 用户系统问题
node scripts/test-user-invite-status.js
```

### **常见问题解决**
```bash
# 1. 数据库连接失败
# 检查环境变量
echo $DATABASE_URL
# 测试连接
node scripts/test-db-connection.js

# 2. OAuth认证失败
# 检查GitHub配置
node scripts/test-github-config.js

# 3. 构建失败
# 检查TypeScript错误
npm run type-check
# 检查ESLint错误
npm run lint

# 4. 依赖问题
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

## 📊 性能监控

### **实际可用的监控工具**
```bash
# 连接池监控
node scripts/connection-monitor.js

# 性能测试
node scripts/performance-test.js

# 健康检查
node scripts/lightweight-health-check.js

# 数据库健康检查
# 访问 /api/admin/database-health
```

## 🔐 安全最佳实践

### **环境变量安全**
```bash
# 永远不要提交.env.local到Git
echo ".env.local" >> .gitignore

# 使用强密钥
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### **API安全**
```typescript
// 基于实际middleware.ts的保护机制
const protectedRoutes = [
  '/feed', '/proposals', '/profile', '/admin',
  '/chat', '/developer', '/payment', '/remote'
]
```

## 📚 学习资源

### **项目特定文档**
```
experiences/history.txt               # 项目历史和经验
experiences/work-mechanism.md        # 工作机制
TESTING_CHECKLIST.md                # 测试清单
DEPLOYMENT_CHECKLIST.md             # 部署清单
```

---

**文档版本**: v1.0  
**基于项目状态**: 当前main分支  
**最后更新**: 2025-07-28  
**准确性保证**: 所有命令和路径都基于实际项目验证
