-- =====================================================
-- GistFans 数据库 Schema 
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- =====================================================

-- 1. Account 表 (NextAuth)
CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

-- 2. Session 表 (NextAuth)
CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL,
  expires TIMESTAMP NOT NULL
);

-- 3. User 表
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE,
  name TEXT,
  avatar TEXT,
  bio TEXT,
  github_username TEXT,
  website TEXT,
  location TEXT,
  company TEXT,
  available_for_hire BOOLEAN DEFAULT false,
  skills TEXT[],
  star_balance INTEGER DEFAULT 0,
  "emailVerified" TIMESTAMP,
  image TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 4. VerificationToken 表 (NextAuth)
CREATE TABLE IF NOT EXISTS "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- 5. Post 表
CREATE TABLE IF NOT EXISTS "Post" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',  -- 图片URL数组
  "authorId" TEXT NOT NULL,
  "viewCount" INTEGER DEFAULT 0,
  "likeCount" INTEGER DEFAULT 0,
  "commentCount" INTEGER DEFAULT 0,
  "shareCount" INTEGER DEFAULT 0,
  "starCount" INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 6. Comment 表
CREATE TABLE IF NOT EXISTS "Comment" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "postId" TEXT,
  "parentId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 7. Like 表
CREATE TABLE IF NOT EXISTS "Like" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "postId" TEXT,
  "commentId" TEXT,
  type TEXT DEFAULT 'LIKE' CHECK (type IN ('LIKE', 'LOVE', 'FIRE')),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId", "postId"),
  UNIQUE("userId", "commentId")
);

-- 8. StarVote 表
CREATE TABLE IF NOT EXISTS "StarVote" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT,
  "postId" TEXT,
  "commentId" TEXT,
  amount INTEGER NOT NULL,
  reason TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 9. Support 表
CREATE TABLE IF NOT EXISTS "Support" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "supporterId" TEXT NOT NULL,
  "supporteeId" TEXT,
  "postId" TEXT,
  "commentId" TEXT,
  amount INTEGER DEFAULT 1,
  "withStars" BOOLEAN DEFAULT false,
  message TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 10. Share 表
CREATE TABLE IF NOT EXISTS "Share" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  platform TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 11. Notification 表
CREATE TABLE IF NOT EXISTS "Notification" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 12. Invite 表
CREATE TABLE IF NOT EXISTS "Invite" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  "inviterId" TEXT,
  "inviteeEmail" TEXT,
  "inviteeId" TEXT,
  used BOOLEAN DEFAULT false,
  "usedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 外键约束
-- =====================================================

-- Account 外键
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Session 外键  
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Post 外键
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment 外键
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Comment"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Like 外键
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Like" ADD CONSTRAINT "Like_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- StarVote 外键
ALTER TABLE "StarVote" ADD CONSTRAINT "StarVote_fromUserId_fkey"
FOREIGN KEY ("fromUserId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StarVote" ADD CONSTRAINT "StarVote_toUserId_fkey"
FOREIGN KEY ("toUserId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StarVote" ADD CONSTRAINT "StarVote_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StarVote" ADD CONSTRAINT "StarVote_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Support 外键
ALTER TABLE "Support" ADD CONSTRAINT "Support_supporterId_fkey"
FOREIGN KEY ("supporterId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Support" ADD CONSTRAINT "Support_supporteeId_fkey"
FOREIGN KEY ("supporteeId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Support" ADD CONSTRAINT "Support_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Support" ADD CONSTRAINT "Support_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Share 外键
ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Share" ADD CONSTRAINT "Share_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification 外键
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Invite 外键
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviterId_fkey"
FOREIGN KEY ("inviterId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviteeId_fkey"
FOREIGN KEY ("inviteeId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- 索引优化
-- =====================================================

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX IF NOT EXISTS "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX IF NOT EXISTS "Comment_authorId_idx" ON "Comment"("authorId");
CREATE INDEX IF NOT EXISTS "Like_userId_idx" ON "Like"("userId");
CREATE INDEX IF NOT EXISTS "Like_postId_idx" ON "Like"("postId");
CREATE INDEX IF NOT EXISTS "StarVote_fromUserId_idx" ON "StarVote"("fromUserId");
CREATE INDEX IF NOT EXISTS "StarVote_toUserId_idx" ON "StarVote"("toUserId");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Invite_code_idx" ON "Invite"("code");

-- =====================================================
-- 完成提示
-- =====================================================

SELECT 'GistFans数据库Schema创建完成！' as message; 