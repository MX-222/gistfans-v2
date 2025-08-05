-- 数据库增强迁移脚本
-- 目标：使数据库符合开发者A和B的技术规格要求

-- ============================================
-- 1. 帖子系统增强 (开发者A规格)
-- ============================================

-- 添加帖子版本控制字段
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;

-- 添加帖子浏览计数（如果不存在）
-- viewCount 字段已存在，跳过

-- 添加帖子数据完整性约束
ALTER TABLE "Post" ADD CONSTRAINT IF NOT EXISTS "check_content_length" 
  CHECK (char_length("content") >= 1 AND char_length("content") <= 10000);

ALTER TABLE "Post" ADD CONSTRAINT IF NOT EXISTS "check_title_length" 
  CHECK (char_length("title") >= 1 AND char_length("title") <= 200);

-- ============================================
-- 2. 评论系统增强 (开发者B规格)
-- ============================================

-- 添加评论深度字段
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "depth" INTEGER DEFAULT 0;

-- 添加评论状态字段
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PUBLISHED';

-- 添加评论回复计数字段
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "replyCount" INTEGER DEFAULT 0;

-- 添加评论点赞计数字段（如果不存在）
-- likes 字段已存在，跳过

-- 添加评论软删除字段
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- 添加评论数据完整性约束
ALTER TABLE "Comment" ADD CONSTRAINT IF NOT EXISTS "check_comment_content_length" 
  CHECK (char_length("content") >= 1 AND char_length("content") <= 2000);

ALTER TABLE "Comment" ADD CONSTRAINT IF NOT EXISTS "check_comment_depth" 
  CHECK ("depth" >= 0 AND "depth" <= 3);

-- ============================================
-- 3. 性能优化索引
-- ============================================

-- 帖子相关索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_post_author_created" 
  ON "Post"("authorId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_post_status_created" 
  ON "Post"("status", "createdAt" DESC) 
  WHERE "status" = 'PUBLISHED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_post_tags" 
  ON "Post" USING gin("tags");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_post_type_status" 
  ON "Post"("type", "status");

-- 评论相关索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comment_post_created" 
  ON "Comment"("postId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comment_parent_created" 
  ON "Comment"("parentId", "createdAt" ASC) 
  WHERE "parentId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comment_user_created" 
  ON "Comment"("userId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comment_status" 
  ON "Comment"("status") 
  WHERE "status" != 'DELETED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comment_depth" 
  ON "Comment"("depth");

-- ============================================
-- 4. 数据迁移和清理
-- ============================================

-- 更新现有评论的深度
WITH RECURSIVE comment_depth AS (
  -- 根评论（depth = 0）
  SELECT "id", "parentId", 0 as "depth"
  FROM "Comment" 
  WHERE "parentId" IS NULL
  
  UNION ALL
  
  -- 子评论（递归计算深度）
  SELECT c."id", c."parentId", cd."depth" + 1
  FROM "Comment" c
  INNER JOIN comment_depth cd ON c."parentId" = cd."id"
  WHERE cd."depth" < 3
)
UPDATE "Comment" 
SET "depth" = cd."depth"
FROM comment_depth cd
WHERE "Comment"."id" = cd."id";

-- 更新现有评论的回复计数
UPDATE "Comment" 
SET "replyCount" = (
  SELECT COUNT(*)
  FROM "Comment" AS replies
  WHERE replies."parentId" = "Comment"."id"
    AND replies."deletedAt" IS NULL
);

-- 更新现有帖子的版本号（如果需要）
UPDATE "Post" 
SET "version" = 1 
WHERE "version" IS NULL;

-- ============================================
-- 5. 创建枚举类型（如果数据库支持）
-- ============================================

-- 注意：SQLite不支持枚举，这些约束通过CHECK约束实现
-- 如果使用PostgreSQL，可以创建真正的枚举类型

-- 帖子状态枚举约束
ALTER TABLE "Post" ADD CONSTRAINT IF NOT EXISTS "check_post_status" 
  CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED'));

-- 评论状态枚举约束
ALTER TABLE "Comment" ADD CONSTRAINT IF NOT EXISTS "check_comment_status" 
  CHECK ("status" IN ('PUBLISHED', 'PENDING', 'HIDDEN', 'DELETED'));

-- ============================================
-- 6. 外键约束验证
-- ============================================

-- 验证评论的父子关系约束
ALTER TABLE "Comment" ADD CONSTRAINT IF NOT EXISTS "fk_comment_parent" 
  FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE;

-- 验证评论与帖子的关联约束
-- 这个约束应该已经存在，但确保它存在
-- ALTER TABLE "Comment" ADD CONSTRAINT IF NOT EXISTS "fk_comment_post" 
--   FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE;

-- ============================================
-- 7. 性能统计更新
-- ============================================

-- 更新帖子的评论计数
UPDATE "Post" 
SET "commentCount" = (
  SELECT COUNT(*)
  FROM "Comment"
  WHERE "Comment"."postId" = "Post"."id"
    AND "Comment"."deletedAt" IS NULL
);

-- 分析表以更新统计信息（PostgreSQL）
-- ANALYZE "Post";
-- ANALYZE "Comment";

-- ============================================
-- 迁移完成
-- ============================================
