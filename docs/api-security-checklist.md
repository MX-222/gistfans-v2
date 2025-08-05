# 🔒 API安全审查清单

## 📋 强制性安全检查项目

### **1. 认证检查 (Authentication)**
- [ ] **强制认证**：API是否需要用户登录？
- [ ] **会话验证**：是否正确验证NextAuth会话？
- [ ] **认证优先级**：认证检查是否优先于其他验证？
- [ ] **错误处理**：认证失败时是否返回401状态码？

### **2. 授权检查 (Authorization)**
- [ ] **权限控制**：用户是否只能访问自己的资源？
- [ ] **角色验证**：是否正确检查用户角色权限？
- [ ] **跨用户访问**：是否阻止用户访问其他用户的数据？
- [ ] **管理员权限**：管理员权限是否正确实现？

### **3. 输入验证 (Input Validation)**
- [ ] **参数验证**：所有输入参数是否经过验证？
- [ ] **格式检查**：用户ID、邮箱等格式是否正确？
- [ ] **长度限制**：输入长度是否在合理范围内？
- [ ] **特殊字符**：是否过滤危险的特殊字符？

### **4. 输出过滤 (Output Filtering)**
- [ ] **敏感信息**：是否过滤密码、token等敏感信息？
- [ ] **数据脱敏**：是否对敏感数据进行脱敏处理？
- [ ] **错误信息**：错误信息是否避免泄露系统信息？
- [ ] **日志安全**：日志是否避免记录敏感信息？

## 🛡️ 安全实现标准

### **统一认证中间件使用**
```typescript
// ✅ 正确：使用统一认证中间件
export const GET = requireUserResourceAccess(handler)

// ❌ 错误：手动实现认证检查
export async function GET(request) {
  const session = await getServerSession(authOptions)
  // 容易遗漏或实现不一致
}
```

### **权限控制模式**
```typescript
// ✅ 用户资源访问
export const GET = requireUserResourceAccess(handler)

// ✅ 管理员权限
export const GET = requireAdmin(handler)

// ✅ 自定义权限
export const GET = withAuth(handler, {
  customPermissionCheck: (user, request) => {
    // 自定义权限逻辑
    return true
  }
})
```

### **错误处理标准**
```typescript
// ✅ 标准错误响应
return NextResponse.json({
  success: false,
  error: 'Authentication required',
  code: 'UNAUTHORIZED_ACCESS',
  message: '此API需要登录认证'
}, { status: 401 })
```

## 🔍 安全测试要求

### **必须通过的测试**
1. **未授权访问测试**：返回401状态码
2. **跨用户访问测试**：返回403状态码
3. **权限边界测试**：验证权限控制边界
4. **错误处理测试**：验证错误信息的安全性

### **自动化安全测试**
```javascript
// 每个API都必须通过这些测试
const securityTests = [
  'unauthorized-access-blocked',
  'cross-user-access-denied', 
  'input-validation-working',
  'sensitive-data-filtered'
]
```

## 📝 开发流程集成

### **设计阶段**
- [ ] API设计文档包含认证和授权要求
- [ ] 明确定义权限边界和访问控制
- [ ] 识别敏感数据和保护要求

### **开发阶段**
- [ ] 使用统一的认证中间件
- [ ] 遵循安全编码规范
- [ ] 实现完整的错误处理

### **测试阶段**
- [ ] 执行安全测试用例
- [ ] 验证权限控制边界
- [ ] 测试错误处理的安全性

### **部署前验证**
- [ ] 自动化安全扫描通过
- [ ] 权限控制验证通过
- [ ] 安全审查清单完成

## ⚠️ 常见安全漏洞

### **认证绕过**
- 忘记添加认证检查
- 认证逻辑实现不一致
- 中间件配置错误

### **权限提升**
- 跨用户访问未阻止
- 角色权限检查缺失
- 管理员权限滥用

### **信息泄露**
- 错误信息包含敏感数据
- 日志记录敏感信息
- 响应数据未过滤

### **输入攻击**
- 参数验证不完整
- SQL注入风险
- XSS攻击风险

## 🎯 安全目标

- **零未授权访问**：所有需要认证的API都有保护
- **严格权限控制**：用户只能访问授权的资源
- **完整错误处理**：所有错误都有安全的处理方式
- **持续安全监控**：建立安全检查和监控机制

---

**使用说明**：每个新API开发时都必须完成此清单的所有检查项，只有全部通过才能部署到生产环境。
