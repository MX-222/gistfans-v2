# AI-1 协作标准

## 任务概述
负责Star系统数据库连接，将localStorage迁移到Supabase数据库。

## 代码规范

### 1. 文件命名规范
- API路由：`/api/stars/[功能]/route.ts`
- 数据库模型：在`prisma/schema-supabase.prisma`中添加
- 服务层：`src/lib/starService.ts`
- 类型定义：`src/types/star.ts`

### 2. 代码风格
- 使用TypeScript严格模式
- 遵循项目现有的ESLint配置
- 使用Prettier格式化代码
- 函数命名采用camelCase
- 常量使用UPPER_SNAKE_CASE

### 3. 数据库规范
```prisma
// 必须包含的字段
model StarBalance {
  id        String   @id @default(cuid())
  userId    String   @unique
  balance   Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联用户表
  user User @relation(fields: [userId], references: [id])
}

model StarTransaction {
  id          String   @id @default(cuid())
  userId      String
  amount      Int      // 正数为获得，负数为消费
  type        String   // 'daily_check', 'post_like', 'proposal_create', etc.
  description String?
  createdAt   DateTime @default(now())
  
  // 关联用户表
  user User @relation(fields: [userId], references: [id])
}
```

### 4. API设计规范
- 使用RESTful API设计
- 统一错误处理格式
- 所有API必须进行身份验证
- 返回格式统一使用JSON

```typescript
// 成功响应格式
{
  success: true,
  data: any,
  message?: string
}

// 错误响应格式
{
  success: false,
  error: string,
  code?: string
}
```

## 提交标准

### 1. 分支管理
- 基于`main`分支创建`feature/ai-1-star-system`分支
- 所有开发在功能分支进行
- 提交前必须通过测试

### 2. 提交信息格式
```
类型(范围): 简短描述

详细描述（可选）

- 变更点1
- 变更点2
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `refactor`: 重构
- `docs`: 文档
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(star): 添加Star数据库模型和API

- 在schema-supabase.prisma中添加StarBalance和StarTransaction模型
- 创建/api/stars/balance和/api/stars/transactions端点
- 实现StarService服务层
```

### 3. 代码审查检查清单
- [ ] 代码符合TypeScript类型检查
- [ ] 通过ESLint检查
- [ ] 包含适当的错误处理
- [ ] API端点有身份验证
- [ ] 数据库操作有事务处理
- [ ] 包含基本测试用例

## 测试要求

### 1. 单元测试
- 为所有服务层函数编写测试
- 测试文件命名：`*.test.ts`
- 使用Jest测试框架

### 2. API测试
- 测试所有API端点
- 包含成功和失败场景
- 验证身份验证和授权

### 3. 数据库测试
- 测试数据库模型关系
- 验证数据完整性约束
- 测试事务处理

## 协作要求

### 1. 进度报告
- 每日更新`PROGRESS.md`文件
- 记录完成的任务和遇到的问题
- 标记需要其他AI协助的部分

### 2. 文档更新
- 更新`API_CHANGES.md`记录新增的API
- 在`ISSUES.md`中记录遇到的问题
- 更新相关的README文档

### 3. 与其他AI的协作
- **不要修改**其他AI负责的文件
- 如需要其他AI的功能，在`ISSUES.md`中记录依赖关系
- 通过标准化的接口与其他模块交互

### 4. 代码冲突处理
- 优先保持现有功能不受影响
- 采用渐进式迁移策略
- 保留原有localStorage作为fallback

## 完成标准

### 1. 功能完成度
- [ ] StarBalance和StarTransaction数据模型已添加
- [ ] 所有Star相关API端点已实现
- [ ] StarContext已重构为使用API
- [ ] 数据迁移工具已创建
- [ ] 现有功能完全兼容

### 2. 质量标准
- [ ] 代码通过TypeScript编译
- [ ] 通过ESLint检查
- [ ] 单元测试覆盖率 > 80%
- [ ] API测试全部通过
- [ ] 数据库迁移脚本测试通过

### 3. 文档完成度
- [ ] API文档已更新
- [ ] 数据库模型文档已更新
- [ ] 迁移指南已创建
- [ ] 故障排除指南已创建

## 紧急联系

如遇到阻塞问题：
1. 在`ISSUES.md`中记录问题
2. 标记紧急程度
3. 说明需要的协助类型
4. 继续处理其他不受影响的任务

## 最终交付

完成后需要提交：
1. 完整的功能代码
2. 测试用例和测试报告
3. 更新的文档
4. 数据迁移脚本
5. 部署说明 