---
type: "manual"
---

# 汇总AI 协作标准

## 任务概述
负责提案系统完善和最终集成，等待AI-1完成Star系统后开发提案功能，并汇总所有AI的工作成果。

## 工作流程

### 阶段1：等待AI-1完成 (第1-3天)
在AI-1完成Star系统数据库连接之前：
1. **监控AI-1进度**：每日检查`AI-1_STAR_SYSTEM/PROGRESS.md`
2. **准备提案系统设计**：完善数据模型和API设计
3. **规划集成方案**：制定各AI成果的集成策略
4. **准备测试环境**：搭建集成测试环境

### 阶段2：开发提案系统 (第4-5天)
AI-1完成后立即开始：
1. **添加提案数据模型**：基于AI-1的Star系统
2. **实现提案API**：创建完整的提案管理功能
3. **重构提案页面**：从localStorage迁移到真实数据库
4. **集成投票机制**：连接Star系统实现真实投票

### 阶段3：最终集成 (第6天)
1. **合并所有分支**：整合4个AI的工作成果
2. **解决冲突**：处理代码冲突和依赖问题
3. **端到端测试**：验证完整系统功能
4. **部署准备**：准备生产环境部署

## 代码规范

### 1. 文件命名规范
- API路由：`/api/proposals/[功能]/route.ts`
- 数据库模型：在`prisma/schema-supabase.prisma`中添加
- 服务层：`src/lib/proposalService.ts`
- 类型定义：`src/types/proposal.ts`
- 集成工具：`src/utils/integration.ts`

### 2. 提案系统数据模型
```prisma
model Proposal {
  id          String   @id @default(cuid())
  title       String
  description String
  authorId    String
  category    String
  status      String   // 'pending', 'approved', 'rejected', 'implemented'
  starCost    Int      @default(18)
  votesFor    Int      @default(0)
  votesAgainst Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 关联用户表
  author User @relation(fields: [authorId], references: [id])
  
  // 关联投票记录
  votes Vote[]
}

model Vote {
  id         String   @id @default(cuid())
  proposalId String
  userId     String
  type       String   // 'for', 'against'
  starCount  Int      // 投票使用的Star数量
  createdAt  DateTime @default(now())
  
  // 关联提案和用户
  proposal Proposal @relation(fields: [proposalId], references: [id])
  user     User     @relation(fields: [userId], references: [id])
  
  // 确保一个用户只能对一个提案投票一次
  @@unique([proposalId, userId])
}
```

### 3. 集成API规范
```typescript
// 提案创建API
POST /api/proposals
{
  title: string;
  description: string;
  category: string;
  starCost?: number;
}

// 投票API
POST /api/proposals/[id]/vote
{
  type: 'for' | 'against';
  starCount: number;
}

// 提案状态更新API
PATCH /api/proposals/[id]/status
{
  status: 'approved' | 'rejected' | 'implemented';
  reason?: string;
}
```

## 提交标准

### 1. 分支管理
- 基于`main`分支创建`feature/integration-final`分支
- 等待其他AI完成后创建集成分支
- 使用`git merge`合并其他AI的分支

### 2. 提交信息格式
```
类型(范围): 简短描述

详细描述（可选）

- 变更点1
- 变更点2
```

示例：
```
feat(proposal): 完善提案系统数据库连接

- 添加Proposal和Vote数据模型
- 实现提案CRUD API
- 重构提案页面使用真实数据
- 集成Star投票机制

integration: 合并AI-2通知系统

- 合并feature/ai-2-notification分支
- 解决通知组件冲突
- 更新API路由
- 测试通知集成功能
```

### 3. 集成检查清单
- [ ] 所有AI分支成功合并
- [ ] 数据库模型兼容
- [ ] API接口统一
- [ ] 组件样式一致
- [ ] 测试全部通过
- [ ] 文档更新完成

## 集成策略

### 1. 分支合并顺序
```bash
# 1. 首先合并AI-1 (Star系统 - 基础依赖)
git merge feature/ai-1-star-system

# 2. 然后合并AI-3 (多语言 - 界面支持)
git merge feature/ai-3-i18n

# 3. 接着合并AI-2 (通知系统 - 功能增强)
git merge feature/ai-2-notification

# 4. 最后合并AI-4 (协作工具 - 高级功能)
git merge feature/ai-4-collaboration
```

### 2. 冲突解决原则
- **数据库模型冲突**：以最新的schema为准，确保兼容性
- **API路由冲突**：重新规划路由结构，避免重复
- **组件样式冲突**：统一使用项目UI组件库
- **依赖版本冲突**：选择最新稳定版本

### 3. 集成测试策略
```typescript
// 集成测试用例
describe('完整系统集成测试', () => {
  test('用户获得Star -> 创建提案 -> 投票 -> 收到通知', async () => {
    // 1. 用户登录并获得Star
    const user = await createTestUser();
    await grantStars(user.id, 50);
    
    // 2. 创建提案
    const proposal = await createProposal(user.id, {
      title: '测试提案',
      description: '这是一个测试提案',
      category: 'feature'
    });
    
    // 3. 其他用户投票
    const voter = await createTestUser();
    await grantStars(voter.id, 20);
    await voteOnProposal(proposal.id, voter.id, 'for', 10);
    
    // 4. 验证通知发送
    const notifications = await getNotifications(user.id);
    expect(notifications).toContainEqual(
      expect.objectContaining({
        type: 'proposal_vote',
        proposalId: proposal.id
      })
    );
    
    // 5. 验证Star扣除
    const starBalance = await getStarBalance(voter.id);
    expect(starBalance).toBe(10);
  });
});
```

## 协作要求

### 1. 进度同步
- **每日检查**：监控所有AI的进度状态
- **依赖跟踪**：确保AI-1完成后立即开始提案开发
- **问题协调**：解决AI之间的集成问题

### 2. 文档维护
- **API变更记录**：汇总所有API变更到`API_CHANGES.md`
- **问题跟踪**：收集所有AI的问题到`ISSUES.md`
- **集成日志**：记录集成过程和解决方案

### 3. 质量保证
- **代码审查**：审查所有AI的代码质量
- **测试覆盖**：确保集成后测试覆盖率不降低
- **性能监控**：验证集成后系统性能
- **安全检查**：确保所有安全要求得到满足

## 测试要求

### 1. 提案系统测试
- 提案创建、编辑、删除功能
- 投票机制和Star扣除
- 提案状态流转
- 权限控制验证

### 2. 集成测试
- 跨模块功能测试
- 数据一致性验证
- 性能压力测试
- 安全渗透测试

### 3. 用户验收测试
- 完整用户流程测试
- 界面交互测试
- 多语言功能测试
- 移动端适配测试

## 部署准备

### 1. 环境配置
```bash
# 生产环境变量
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://gistfans.com"
SUPABASE_URL="..."
SUPABASE_ANON_KEY="..."
```

### 2. 数据库迁移
```bash
# 应用所有数据库迁移
npx prisma migrate deploy

# 生成Prisma客户端
npx prisma generate

# 初始化数据
npm run seed
```

### 3. 构建和部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 或使用Docker
docker build -t gistfans .
docker run -p 3000:3000 gistfans
```

## 完成标准

### 1. 功能完成度
- [ ] 提案系统完全数据库化
- [ ] 所有AI模块成功集成
- [ ] Star系统与提案系统完全连接
- [ ] 通知系统正常工作
- [ ] 多语言支持完整
- [ ] 协作工具功能正常

### 2. 质量标准
- [ ] 代码通过TypeScript编译
- [ ] 通过ESLint检查
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试全部通过
- [ ] 性能测试达标
- [ ] 安全测试通过

### 3. 生产就绪
- [ ] 数据库迁移脚本完成
- [ ] 环境配置文档完整
- [ ] 部署脚本测试通过
- [ ] 监控和日志配置完成
- [ ] 备份和恢复方案就绪

## 紧急处理

### 1. AI延期处理
如果某个AI无法按时完成：
1. 评估影响范围
2. 调整集成计划
3. 必要时跳过非关键功能
4. 确保核心功能正常

### 2. 冲突解决
遇到无法自动解决的冲突：
1. 分析冲突根本原因
2. 与相关AI协商解决方案
3. 记录解决过程
4. 更新协作规范

### 3. 质量问题
发现质量问题：
1. 立即停止集成
2. 回滚到稳定版本
3. 要求相关AI修复
4. 重新测试后继续

## 最终交付

完成后需要提交：
1. 完整的GistFans v1.0代码
2. 生产环境部署包
3. 完整的测试报告
4. 用户使用文档
5. 运维部署文档
6. 项目总结报告 