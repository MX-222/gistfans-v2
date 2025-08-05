-- 添加images列到Post表
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 更新现有记录，确保images字段不为null
UPDATE "Post" SET images = '{}' WHERE images IS NULL;
