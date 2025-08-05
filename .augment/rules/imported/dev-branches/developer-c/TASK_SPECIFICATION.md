---
type: "manual"
---

# Developer C - Star投票系统修复任务规格

## 🎯 任务概览

**负责人**: Developer C  
**模块**: Star投票系统修复 (Star Voting System Fix)  
**优先级**: 🟡 高优先级 (依赖发帖系统修复)  
**预估工期**: 3-4天  
**Git分支**: `feature/star-system-fix`  

## 📋 当前问题分析

### 🔴 已知问题
1. **投票功能失败**
   - 症状: 给帖子投Star时报错"帖子不存在"
   - 影响: Star治理机制完全无法使用
   - 根本原因: 与发帖系统问题相关，依赖Developer A修复

2. **Star系统功能不完整**
   - 缺少投票状态持久化
   - 缺少防重复投票机制
   - 缺少Star余额实时更新
   - 缺少投票历史追踪

3. **治理机制问题**
   - Star奖励机制不完善
   - 投票权重计算错误
   - 缺少投票统计分析
   - 缺少Star交易记录

## 🎯 功能目标

### 核心功能要求
- [ ] **Star投票功能** - 用户可以给帖子投Star，支持多Star投票
- [ ] **防重复投票** - 同一用户对同一帖子只能投票一次
- [ ] **Star余额管理** - 实时更新用户Star余额，支持余额查询
- [ ] **投票历史追踪** - 记录所有投票行为，支持历史查询
- [ ] **Star奖励机制** - 帖子获得Star时，作者获得相应奖励

### 治理机制要求
- [ ] **投票权重计算** - 基于用户信誉和Star数量的权重计算
- [ ] **Star统计分析** - 帖子Star统计、用户Star统计、趋势分析
- [ ] **Star交易系统** - 支持Star转账、奖励发放、消费记录
- [ ] **治理提案投票** - 支持社区提案的Star投票机制

## 🏗️ 技术架构设计

### 数据模型设计
```typescript
// Star投票数据结构
interface StarVote {
  id: string
  postId: string
  userId: string
  starAmount: number    // 投票的Star数量
  voteType: VoteType   // 投票类型
  
  // 关联数据
  user: User
  post: Post
  
  // 时间戳
  createdAt: Date
  updatedAt: Date
}

enum VoteType {
  SUPPORT = 'SUPPORT',      // 支持投票
  AGAINST = 'AGAINST',      // 反对投票
  NEUTRAL = 'NEUTRAL'       // 中性投票
}

// Star余额数据结构
interface StarBalance {
  id: string
  userId: string
  availableStars: number   // 可用Star数量
  totalEarned: number      // 总获得Star数量
  totalSpent: number       // 总消费Star数量
  dailyEarned: number      // 今日获得Star数量
  lastDailyReset: Date     // 上次每日重置时间
  
  // 关联数据
  user: User
  transactions: StarTransaction[]
  
  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// Star交易记录
interface StarTransaction {
  id: string
  userId: string
  amount: number           // 交易金额 (正数为收入，负数为支出)
  type: TransactionType    // 交易类型
  description: string      // 交易描述
  relatedId?: string       // 关联ID (帖子ID、评论ID等)
  
  // 关联数据
  user: User
  starBalance: StarBalance
  
  // 时间戳
  createdAt: Date
}

enum TransactionType {
  DAILY_REWARD = 'DAILY_REWARD',     // 每日奖励
  POST_REWARD = 'POST_REWARD',       // 发帖奖励
  VOTE_REWARD = 'VOTE_REWARD',       // 投票奖励
  RECEIVED_VOTE = 'RECEIVED_VOTE',   // 收到投票
  VOTE_COST = 'VOTE_COST',           // 投票消费
  PROPOSAL_COST = 'PROPOSAL_COST',   // 提案消费
  ADMIN_GRANT = 'ADMIN_GRANT',       // 管理员赠送
  TRANSFER = 'TRANSFER'              // 转账
}
```

### API设计规范
```typescript
// Star投票相关API端点
POST   /api/stars/vote                    // 投票
GET    /api/stars/vote-status?postId=xxx  // 获取投票状态
DELETE /api/stars/vote?postId=xxx         // 撤销投票

// Star余额相关API
GET    /api/stars/balance                 // 获取用户余额
GET    /api/stars/balance/[userId]        // 获取指定用户余额
POST   /api/stars/transfer                // Star转账

// Star统计相关API
GET    /api/stars/stats/post/[postId]     // 获取帖子Star统计
GET    /api/stars/stats/user/[userId]     // 获取用户Star统计
GET    /api/stars/leaderboard             // Star排行榜

// Star交易相关API
GET    /api/stars/transactions            // 获取交易记录
POST   /api/stars/transactions/grant      // 管理员赠送Star
```

### 组件架构设计
```typescript
// Star系统组件层级
StarVotingSection                 // Star投票区容器
├── StarVoteButton               // Star投票按钮
├── StarVoteModal               // Star投票弹窗
├── StarStatistics              // Star统计显示
└── StarVoteHistory             // 投票历史

StarBalanceSection              // Star余额区容器
├── StarBalanceCard            // 余额卡片
├── StarTransactionList        // 交易记录列表
├── StarTransferModal          // 转账弹窗
└── StarLeaderboard            // Star排行榜
```

## 🔧 开发阶段规划

### 阶段一：基础架构 (Day 1)
**依赖**: 等待Developer A完成发帖系统修复

- [ ] **数据模型设计**
  - 扩展StarVote表结构
  - 优化StarBalance表设计
  - 设计StarTransaction表
  - 添加必要的数据库索引

- [ ] **API架构设计**
  - 设计Star投票API
  - 设计Star余额API
  - 设计Star统计API
  - 制定错误处理规范

### 阶段二：核心功能开发 (Day 2)
- [ ] **Star投票功能**
  - 修复投票API错误
  - 实现防重复投票机制
  - 添加投票权限检查
  - 实现投票状态查询

- [ ] **Star余额管理**
  - 实现余额查询API
  - 实现余额更新机制
  - 添加余额变动通知
  - 实现每日Star重置

### 阶段三：高级功能 (Day 3)
- [ ] **Star交易系统**
  - 实现交易记录API
  - 开发Star转账功能
  - 实现管理员赠送功能
  - 添加交易历史查询

- [ ] **Star统计分析**
  - 实现帖子Star统计
  - 实现用户Star统计
  - 开发Star排行榜
  - 添加趋势分析功能

### 阶段四：优化和测试 (Day 4)
- [ ] **性能优化**
  - 优化投票查询性能
  - 实现Star统计缓存
  - 优化余额计算性能
  - 添加数据库查询优化

- [ ] **用户体验优化**
  - 实现乐观更新
  - 添加投票动画效果
  - 优化加载状态
  - 改进错误提示

## 🗄️ 数据库设计

### StarVote表优化
```sql
-- Star投票表 (优化现有表)
ALTER TABLE StarVote ADD COLUMN voteType VoteType DEFAULT 'SUPPORT';
ALTER TABLE StarVote ADD COLUMN starAmount Int DEFAULT 1;
ALTER TABLE StarVote ADD COLUMN isActive Boolean DEFAULT true;

-- 添加唯一约束防止重复投票
ALTER TABLE StarVote ADD CONSTRAINT unique_user_post_vote 
  UNIQUE(userId, postId);

-- 添加索引优化查询性能
CREATE INDEX idx_starvote_post_active ON StarVote(postId, isActive);
CREATE INDEX idx_starvote_user_created ON StarVote(userId, createdAt DESC);
CREATE INDEX idx_starvote_type_amount ON StarVote(voteType, starAmount);
```

### StarTransaction表 (新增)
```sql
-- Star交易记录表
CREATE TABLE StarTransaction (
  id String @id @default(cuid())
  userId String
  amount Int
  type TransactionType
  description String
  relatedId String?
  balanceBefore Int
  balanceAfter Int
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@index([relatedId])
);
```

### StarStatistics表 (新增)
```sql
-- Star统计缓存表
CREATE TABLE StarStatistics (
  id String @id @default(cuid())
  entityType StatEntityType  -- POST, USER, GLOBAL
  entityId String
  totalStars Int DEFAULT 0
  voterCount Int DEFAULT 0
  averageStars Float DEFAULT 0
  lastUpdated DateTime @default(now())
  
  @@unique([entityType, entityId])
  @@index([entityType, totalStars])
);

enum StatEntityType {
  POST
  USER
  GLOBAL
}
```

## 🔌 API实现规格

### Star投票API
```typescript
// POST /api/stars/vote
export async function POST(request: NextRequest) {
  // 必须实现的功能:
  // 1. 用户身份验证
  // 2. 帖子存在性验证 (依赖Developer A)
  // 3. 用户Star余额检查
  // 4. 防重复投票检查
  // 5. 数据库事务处理 (投票记录 + 余额更新 + 统计更新)
  // 6. 投票通知发送
  // 7. 缓存更新
}
```

### Star余额API
```typescript
// GET /api/stars/balance
export async function GET(request: NextRequest) {
  // 返回数据:
  // - 当前可用Star数量
  // - 今日已获得Star数量
  // - 总获得Star数量
  // - 总消费Star数量
  // - 最近交易记录 (最多10条)
}
```

## 🧩 组件实现规格

### StarVoteButton组件
```typescript
interface StarVoteButtonProps {
  postId: string
  currentUser?: User
  initialVoteStatus?: VoteStatus
  onVoteChange?: (voteStatus: VoteStatus) => void
  disabled?: boolean
}

// 必须实现的功能:
// 1. 显示当前投票状态
// 2. 处理投票点击事件
// 3. 显示投票数量选择
// 4. 实现乐观更新
// 5. 错误状态处理和回滚
```

### StarBalanceCard组件
```typescript
interface StarBalanceCardProps {
  userId?: string
  showTransactions?: boolean
  showTransferButton?: boolean
  onTransfer?: () => void
}

// 必须显示的信息:
// 1. 当前Star余额
// 2. 今日获得Star数量
// 3. Star获得/消费趋势
// 4. 快速操作按钮
```

## 📊 性能要求

### API性能指标
- Star投票: < 200ms
- 余额查询: < 100ms
- 统计查询: < 150ms
- 交易记录: < 200ms

### 前端性能指标
- 投票按钮响应: < 100ms
- 余额更新显示: < 200ms
- 统计图表渲染: < 300ms
- 交易列表加载: < 250ms

### 数据库性能优化
- 投票查询使用复合索引
- 统计数据使用缓存表
- 余额计算使用触发器
- 交易记录分页查询

## 🔒 安全要求

### 投票安全
- 防重复投票机制
- 投票权限验证
- Star余额验证
- 投票频率限制

### 数据安全
- 余额计算准确性
- 交易记录完整性
- 统计数据一致性
- 防止Star刷取

## 🧪 测试验收标准

### 功能测试
- [ ] Star投票成功率 > 99%
- [ ] 防重复投票机制有效
- [ ] 余额计算准确性 100%
- [ ] 统计数据一致性验证
- [ ] 交易记录完整性验证

### 性能测试
- [ ] 1000次并发投票测试
- [ ] 大量用户余额查询测试
- [ ] 统计数据计算性能测试
- [ ] 交易记录查询性能测试

### 安全测试
- [ ] 重复投票攻击防护
- [ ] 余额篡改攻击防护
- [ ] 统计数据篡改防护
- [ ] API访问权限验证

---

**任务创建时间**: 2025-07-19  
**负责开发者**: Developer C  
**依赖关系**: Developer A (发帖系统修复)  
**被依赖**: Developer D (Star通知集成)
