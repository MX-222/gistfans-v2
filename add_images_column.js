// 添加images列到数据库
require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

console.log('🔍 数据库连接信息:')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置')
console.log('DIRECT_URL:', process.env.DIRECT_URL ? '已设置' : '未设置')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
})

async function addImagesColumn() {
  try {
    console.log('🔧 添加images列到Post表...')
    
    // 使用原生SQL添加列
    await prisma.$executeRaw`
      ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
    `
    
    console.log('✅ images列添加成功')
    
    // 更新现有记录
    await prisma.$executeRaw`
      UPDATE "Post" SET images = '{}' WHERE images IS NULL;
    `
    
    console.log('✅ 现有记录已更新')
    
    // 验证列是否存在
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Post' AND column_name = 'images';
    `
    
    console.log('📊 验证结果:', result)
    
  } catch (error) {
    console.error('❌ 添加列失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addImagesColumn()
