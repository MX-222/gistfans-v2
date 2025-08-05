# AI-1 任务规范：Star系统数据库连接

## 🎯 任务目标

将当前基于localStorage的Star系统迁移到Supabase数据库，实现真正的多用户、跨设备Star数据同步。

## 📋 核心要求

### 1. 数据库模型设计
在 `prisma/schema-supabase.prisma` 中添加以下模型：

```sql
model StarBalance {
  id              String   @id @default(cuid())
  userId          String   @unique
  totalStars      Int      @default(0)
  availableStars  Int      @default(0)
  usedStars       Int      @default(0)
  dailyEarned     Int      @default(0)
  maxDailyEarn    Int      @default(20)
  lastRefreshDate DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation("UserStarBalance", fields: [userId], references: [id])
  
  @@index([userId])
}

model StarTransaction {
  id          String   @id @default(cuid())
  userId      String
  amount      Int      // 正数=获得，负数=消费
  type        String   // 'EARN', 'SPEND'
  action      String   // 'daily_login', 'vote_proposal', 'create_proposal'
  description String
  relatedId   String?  // 关联ID
  createdAt   DateTime @default(now())
  
  user        User     @relation("UserStarTransactions", fields: [userId], references: [id])
  
  @@index([userId])
  @@index([type])
  @@index([action])
}
```

### 2. API端点开发
创建以下API路由：

- `src/app/api/stars/balance/route.ts` - 获取用户Star余额
- `src/app/api/stars/history/route.ts` - 获取Star交易历史
- `src/app/api/stars/earn/route.ts` - 获得Star
- `src/app/api/stars/spend/route.ts` - 消费Star
- `src/app/api/stars/refresh/route.ts` - 每日刷新

### 3. 服务层重构
创建 `src/lib/starService.ts`：

```typescript
export interface StarService {
  // 余额管理
  getBalance(userId: string): Promise<StarBalance>
  
  // Star操作
  earnStars(userId: string, amount: number, action: StarAction, description?: string, relatedId?: string): Promise<void>
  spendStars(userId: string, amount: number, description: string, relatedId?: string): Promise<boolean>
  
  // 历史记录
  getHistory(userId: string, limit?: number): Promise<StarTransaction[]>
  
  // 每日刷新
  refreshDailyStars(userId: string): Promise<void>
  
  // 验证
  canSpend(userId: string, amount: number): Promise<boolean>
}
```

### 4. Context重构
重构 `src/contexts/StarContext.tsx`：
- 移除所有localStorage操作
- 使用API调用替代本地存储
- 添加loading状态管理
- 添加错误处理
- 保持现有接口不变

## 📁 文件清单

### 必须创建的文件
```
src/app/api/stars/
├── balance/route.ts
├── history/route.ts  
├── earn/route.ts
├── spend/route.ts
└── refresh/route.ts

src/lib/
└── starService.ts

src/types/
└── star.ts (类型定义)
```

### 必须修改的文件
```
prisma/schema-supabase.prisma (添加模型)
src/contexts/StarContext.tsx (完全重构)
```

### 禁止修改的文件
```
src/app/proposals/ (AI-5负责)
src/components/NotificationCenter.tsx (AI-2负责)
locales/ (AI-3负责)
src/components/remote/ (AI-4负责)
```

## 🔧 技术要求

### 数据迁移
创建 `src/lib/migrations/starDataMigration.ts`：
- 从localStorage读取现有Star数据
- 批量导入到Supabase
- 数据完整性验证

### 错误处理
- API调用失败时的降级策略
- 网络离线时的本地缓存
- 数据同步冲突解决

### 性能优化
- Star余额缓存策略
- 批量操作支持
- 数据库查询优化

## 🧪 测试要求

### 单元测试
```
src/lib/__tests__/
├── starService.test.ts
└── starDataMigration.test.ts
```

### 集成测试
- API端点测试
- 数据库操作测试
- Context功能测试

### 测试用例
- Star获得和消费流程
- 每日刷新逻辑
- 数据迁移完整性
- 并发操作安全性

## 📊 验收标准

### 功能完整性
- ✅ 所有现有Star功能保持不变
- ✅ 数据从localStorage成功迁移到数据库
- ✅ 多用户Star数据正确隔离
- ✅ 跨设备数据同步正常

### 性能标准
- ✅ API响应时间 < 300ms
- ✅ 数据库查询优化
- ✅ 前端加载状态友好

### 代码质量
- ✅ TypeScript类型完整
- ✅ ESLint检查通过
- ✅ 测试覆盖率 > 80%
- ✅ 代码注释清晰

## 🔄 交付物

### 代码交付
1. **Git分支**: `feature/star-database`
2. **Pull Request**: 包含完整的代码变更
3. **数据库迁移脚本**: 可执行的迁移工具

### 文档交付
1. **API文档**: 详细的接口说明
2. **迁移指南**: 数据迁移步骤
3. **测试报告**: 测试结果和覆盖率

### 集成说明
1. **依赖关系**: 其他模块如何使用Star API
2. **配置要求**: 环境变量和数据库设置
3. **已知问题**: 潜在问题和解决方案

## ⚠️ 注意事项

1. **向后兼容**: 确保现有组件无需修改即可使用
2. **数据安全**: Star交易记录不可篡改
3. **并发安全**: 防止Star余额并发修改问题
4. **性能考虑**: 大量用户时的数据库性能

## 📅 时间安排

- **Day 1**: 数据库模型设计 + API框架搭建
- **Day 2**: 核心API实现 + Context重构
- **Day 3**: 数据迁移 + 测试 + 文档

## 🤝 与其他AI的接口

### 提供给AI-5 (提案系统)
```typescript
// Star消费验证
canSpend(userId: string, amount: number): Promise<boolean>

// 消费Star (用于创建提案和投票)
spendStars(userId: string, amount: number, description: string, relatedId?: string): Promise<boolean>
```

### 提供给AI-2 (通知系统)
```typescript
// Star变化通知
onStarChange(userId: string, amount: number, action: string): void
```

预计完成时间: 3个工作日
优先级: 🔴 最高 (其他模块依赖此功能) 