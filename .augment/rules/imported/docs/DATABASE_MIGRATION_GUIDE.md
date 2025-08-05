---
type: "manual"
---

# 🗄️ 数据库迁移指南

## 📋 生产环境数据库变更最佳实践

### 🔧 当前状态
- **开发环境**: SQLite + `prisma db push`
- **生产环境**: PostgreSQL (Supabase)
- **迁移系统**: 未启用

### 🚀 迁移到 Prisma Migrations

#### Step 1: 初始化迁移系统
```bash
# 1. 创建初始迁移
npx prisma migrate dev --name init

# 2. 这会创建 prisma/migrations 文件夹
```

#### Step 2: 生产环境基准
```bash
# 连接到生产数据库
export DATABASE_URL="postgresql://..."

# 创建基准迁移（不执行）
npx prisma migrate resolve --applied init
```

### 📝 日常变更流程

#### 开发环境变更
1. **修改 schema.prisma**
2. **创建迁移**
   ```bash
   npx prisma migrate dev --name add_new_feature
   ```
3. **测试变更**

#### 生产环境部署
1. **代码部署后自动执行**
   ```bash
   npx prisma migrate deploy
   ```

### ⚠️ 安全注意事项

#### 危险操作
- ❌ 直接删除字段
- ❌ 更改字段类型
- ❌ 删除表

#### 安全操作
- ✅ 添加可选字段
- ✅ 添加新表
- ✅ 添加索引
- ✅ 修改默认值

### 🔄 复杂变更策略

#### 字段重命名
```sql
-- 步骤1: 添加新字段
ALTER TABLE users ADD COLUMN new_name VARCHAR;

-- 步骤2: 复制数据
UPDATE users SET new_name = old_name;

-- 步骤3: 删除旧字段（下个版本）
ALTER TABLE users DROP COLUMN old_name;
```

#### 数据类型变更
```sql
-- 步骤1: 添加临时字段
ALTER TABLE users ADD COLUMN temp_field INTEGER;

-- 步骤2: 迁移数据
UPDATE users SET temp_field = CAST(old_field AS INTEGER);

-- 步骤3: 切换字段
ALTER TABLE users DROP COLUMN old_field;
ALTER TABLE users RENAME COLUMN temp_field TO old_field;
```

### 🛡️ 回滚策略

#### 自动回滚
```bash
# 查看迁移历史
npx prisma migrate status

# 回滚到指定迁移
npx prisma migrate resolve --rolled-back migration_name
```

#### 手动回滚
1. **数据备份**
2. **回滚代码**
3. **执行反向迁移**

### 📊 监控和验证

#### 迁移前检查
- [ ] 数据备份完成
- [ ] 迁移脚本验证
- [ ] 测试环境验证
- [ ] 业务影响评估

#### 迁移后验证
- [ ] 数据完整性检查
- [ ] 应用功能测试
- [ ] 性能监控
- [ ] 错误日志检查 