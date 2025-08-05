// 测试图片功能的脚本
require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testImages() {
  try {
    console.log('🔍 检查Post表结构...')
    
    // 检查是否有现有帖子
    const posts = await prisma.post.findMany({
      take: 5,
      include: {
        author: true
      }
    })
    
    console.log(`📊 找到 ${posts.length} 个帖子`)
    
    if (posts.length > 0) {
      console.log('📝 第一个帖子的结构:')
      console.log(JSON.stringify(posts[0], null, 2))
    }
    
    // 尝试创建一个带图片的测试帖子
    console.log('\n🧪 创建测试帖子...')
    
    const testPost = await prisma.post.create({
      data: {
        authorId: 'test-user-id',
        title: '测试图片帖子',
        content: '这是一个测试图片功能的帖子',
        images: ['https://picsum.photos/400/300', 'https://picsum.photos/500/400'],
        tags: 'test,images',
        isPublic: true,
        status: 'PUBLISHED'
      },
      include: {
        author: true
      }
    })
    
    console.log('✅ 测试帖子创建成功:')
    console.log(JSON.stringify(testPost, null, 2))
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testImages()
