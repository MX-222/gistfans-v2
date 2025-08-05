---
type: "manual"
---

# 🚨 紧急域名问题修复

## 🔍 问题诊断

从您的截图URL中，我发现了问题：

**当前重定向URI**: `https://gistfans-de81-mngr-embdloba...`

这是一个Vercel预览部署域名，不是生产域名！这解释了为什么GitHub找不到对应的OAuth应用配置。

## 🎯 立即修复步骤

### 步骤1: 确定正确的生产域名

**方法A: 查看Vercel Dashboard**
1. 访问 https://vercel.com/dashboard
2. 找到您的 `gistfans` 项目
3. 查看 "Production" 部署的域名
4. 应该是类似 `https://gistfans.vercel.app` 的格式

**方法B: 检查项目设置**
1. 在Vercel项目中点击 "Settings"
2. 查看 "Domains" 部分
3. 找到标记为 "Production" 的域名

### 步骤2: 更新Vercel环境变量

在Vercel Dashboard中，确保 `NEXTAUTH_URL` 设置为正确的生产域名：

```
NEXTAUTH_URL=https://gistfans.vercel.app
```

**重要**: 不要使用预览部署的域名（包含随机字符的域名）

### 步骤3: 更新GitHub OAuth应用回调URL

在您的GitHub OAuth应用中，确保回调URL包含：

```
http://localhost:3000/api/auth/callback/github
https://gistfans.vercel.app/api/auth/callback/github
```

**不要添加预览域名**，只添加稳定的生产域名。

### 步骤4: 强制使用生产部署

**方法A: 直接访问生产域名**
- 直接访问 `https://gistfans.vercel.app`（不要通过预览链接）

**方法B: 设置默认域名**
1. 在Vercel项目设置中
2. 确保生产域名设置为默认域名

## 🔧 快速验证脚本

创建一个简单的检查：

1. 访问您的生产环境：`https://gistfans.vercel.app`
2. 打开浏览器开发者工具
3. 点击GitHub登录按钮
4. 查看重定向URL是否包含正确的域名

## 🚨 常见问题

### 问题1: 访问了预览部署
- **现象**: URL包含随机字符
- **解决**: 直接访问生产域名

### 问题2: NEXTAUTH_URL设置错误
- **现象**: 环境变量指向预览域名
- **解决**: 更新为生产域名

### 问题3: GitHub OAuth应用配置了错误的回调URL
- **现象**: 回调URL包含预览域名
- **解决**: 只配置稳定的生产域名

## 📋 检查清单

### 立即检查
- [ ] 确认您访问的是生产域名（不包含随机字符）
- [ ] 确认 `NEXTAUTH_URL` 环境变量设置正确
- [ ] 确认GitHub OAuth应用回调URL正确
- [ ] 重新部署项目

### 验证修复
- [ ] 直接访问生产域名
- [ ] 点击GitHub登录
- [ ] 检查重定向URL格式
- [ ] 确认不再出现404错误

## 🎯 预期结果

修复后，OAuth授权URL应该是：
```
github.com/login/oauth/authorize?client_id=Ov23115XeyXEKnKDYsmR&redirect_uri=https%3A%2F%2Fgistfans.vercel.app%2Fapi%2Fauth%2Fcallback%2Fgithub
```

而不是包含随机字符的预览域名。

---

**立即行动**: 确定正确的生产域名，更新环境变量，直接访问生产环境测试！
