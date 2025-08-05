// 测试账户数据
export const TEST_ACCOUNTS = [
  {
    id: "test_user_1",
    name: "张小明",
    email: "zhangxiaoming@test.com",
    image: "https://github.com/zhangxiaoming.png",
    username: "@zhangxiaoming",
    bio: "全栈开发工程师，专注React和Node.js开发",
    githubUrl: "https://github.com/zhangxiaoming",
    initialStars: 30
  },
  {
    id: "test_user_2", 
    name: "李小红",
    email: "lixiaohong@test.com",
    image: "https://github.com/lixiaohong.png",
    username: "@lixiaohong",
    bio: "前端开发专家，Vue.js和TypeScript爱好者",
    githubUrl: "https://github.com/lixiaohong",
    initialStars: 30
  },
  {
    id: "test_user_3",
    name: "王小刚",
    email: "wangxiaogang@test.com", 
    image: "https://github.com/wangxiaogang.png",
    username: "@wangxiaogang",
    bio: "后端开发工程师，Python和Go语言专家",
    githubUrl: "https://github.com/wangxiaogang",
    initialStars: 30
  }
]

// 初始化测试账户的Star数据
export function initializeTestAccounts() {
  TEST_ACCOUNTS.forEach(account => {
    const starStatus = {
      userId: account.id,
      totalStars: account.initialStars,
      availableStars: account.initialStars,
      usedStars: 0,
      lastRefreshDate: new Date().toDateString(),
      dailyEarned: 0,
      maxDailyEarn: 20
    }
    
    // 保存Star状态
    localStorage.setItem(`star_status_${account.id}`, JSON.stringify(starStatus))
    
    // 创建初始Star记录
    const initialRecord = {
      id: `init_${account.id}_${Date.now()}`,
      userId: account.id,
      action: 'register' as const,
      amount: account.initialStars,
      description: `测试账户初始化，获得 ${account.initialStars} 个Star`,
      timestamp: new Date().toISOString(),
      relatedId: undefined
    }
    
    localStorage.setItem(`star_history_${account.id}`, JSON.stringify([initialRecord]))
    
    console.log(`✅ 测试账户 ${account.name} (${account.id}) 初始化完成，获得 ${account.initialStars} Stars`)
  })
}

// 清除测试数据
export function clearTestData() {
  TEST_ACCOUNTS.forEach(account => {
    localStorage.removeItem(`star_status_${account.id}`)
    localStorage.removeItem(`star_history_${account.id}`)
  })
  console.log('🗑️ 测试数据已清除')
}

// 获取测试账户信息
export function getTestAccount(userId: string) {
  return TEST_ACCOUNTS.find(account => account.id === userId)
}

// 检查是否为测试账户
export function isTestAccount(userId: string) {
  return TEST_ACCOUNTS.some(account => account.id === userId)
} 
 