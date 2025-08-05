#!/usr/bin/env node

/**
 * 🚨 生产域名检查脚本
 * 帮助确定正确的Vercel生产域名
 */

console.log('🔍 正在检查Vercel生产域名...\n')

// 从您的截图URL分析
const screenshotUrl = 'https://gistfans-de81-mngr-embdloba...'
console.log('❌ 检测到的问题URL:', screenshotUrl)
console.log('📝 这是一个Vercel预览部署域名，不是生产域名！\n')

// 预期的正确域名格式
const expectedDomains = [
  'https://gistfans.vercel.app',
  'https://gistfans-git-main-[username].vercel.app',
  'https://gistfans-[username].vercel.app'
]

console.log('✅ 预期的正确生产域名格式:')
expectedDomains.forEach((domain, index) => {
  console.log(`   ${index + 1}. ${domain}`)
})

console.log('\n🎯 立即修复步骤:')
console.log('1. 访问 https://vercel.com/dashboard')
console.log('2. 找到您的 gistfans 项目')
console.log('3. 查看 "Production" 部署的实际域名')
console.log('4. 直接访问生产域名（不要通过预览链接）')

console.log('\n🔧 环境变量检查:')
console.log('确保 NEXTAUTH_URL 设置为生产域名，例如:')
console.log('NEXTAUTH_URL=https://gistfans.vercel.app')

console.log('\n🐱 GitHub OAuth应用回调URL应该是:')
console.log('https://gistfans.vercel.app/api/auth/callback/github')

console.log('\n⚠️  重要提醒:')
console.log('- 不要使用包含随机字符的预览域名')
console.log('- 只配置稳定的生产域名')
console.log('- 确保直接访问生产环境进行测试')

// 检查当前环境变量（如果在Node.js环境中运行）
if (typeof process !== 'undefined' && process.env) {
  console.log('\n📊 当前环境变量状态:')
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '未设置')
  console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID || '未设置')
  console.log('NODE_ENV:', process.env.NODE_ENV || '未设置')
}
