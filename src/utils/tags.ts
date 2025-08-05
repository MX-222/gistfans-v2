// 预定义的无争议标签（支持多语言）
export const getAvailableTags = (language: 'en' | 'zh') => {
  const tags = {
    en: [
      "React", "TypeScript", "JavaScript", "Next.js", "Node.js",
      "Python", "Java", "Go", "Rust", "Vue.js",
      "Frontend", "Backend", "Full Stack", "Mobile Dev", "Web Dev",
      "Database", "Algorithm", "Data Structure", "System Design", "Architecture",
      "Open Source", "Learning Notes", "Tech Sharing", "Project Experience", "Code Optimization",
      "Performance", "Security", "Testing", "DevOps", "Cloud Computing",
      "AI/ML", "Machine Learning", "Blockchain", "Game Dev", "UI/UX"
    ],
    zh: [
      "React", "TypeScript", "JavaScript", "Next.js", "Node.js",
      "Python", "Java", "Go", "Rust", "Vue.js",
      "前端开发", "后端开发", "全栈开发", "移动开发", "Web开发",
      "数据库", "算法", "数据结构", "系统设计", "架构",
      "开源项目", "学习笔记", "技术分享", "项目经验", "代码优化",
      "性能优化", "安全", "测试", "DevOps", "云计算",
      "人工智能", "机器学习", "区块链", "游戏开发", "UI/UX"
    ]
  }
  return tags[language] || tags.en
}

// 创建标签映射，用于在不同语言间转换
export const tagMapping: Record<string, { en: string; zh: string }> = {
  // 编程语言和框架
  "React": { en: "React", zh: "React" },
  "TypeScript": { en: "TypeScript", zh: "TypeScript" },
  "JavaScript": { en: "JavaScript", zh: "JavaScript" },
  "Next.js": { en: "Next.js", zh: "Next.js" },
  "Node.js": { en: "Node.js", zh: "Node.js" },
  "Python": { en: "Python", zh: "Python" },
  "Java": { en: "Java", zh: "Java" },
  "Go": { en: "Go", zh: "Go" },
  "Rust": { en: "Rust", zh: "Rust" },
  "Vue.js": { en: "Vue.js", zh: "Vue.js" },
  
  // 开发领域
  "Frontend": { en: "Frontend", zh: "前端开发" },
  "Backend": { en: "Backend", zh: "后端开发" },
  "Full Stack": { en: "Full Stack", zh: "全栈开发" },
  "Mobile Dev": { en: "Mobile Dev", zh: "移动开发" },
  "Web Dev": { en: "Web Dev", zh: "Web开发" },
  
  // 技术概念
  "Database": { en: "Database", zh: "数据库" },
  "Algorithm": { en: "Algorithm", zh: "算法" },
  "Data Structure": { en: "Data Structure", zh: "数据结构" },
  "System Design": { en: "System Design", zh: "系统设计" },
  "Architecture": { en: "Architecture", zh: "架构" },
  
  // 项目类型
  "Open Source": { en: "Open Source", zh: "开源项目" },
  "Learning Notes": { en: "Learning Notes", zh: "学习笔记" },
  "Tech Sharing": { en: "Tech Sharing", zh: "技术分享" },
  "Project Experience": { en: "Project Experience", zh: "项目经验" },
  "Code Optimization": { en: "Code Optimization", zh: "代码优化" },
  
  // 技术特性
  "Performance": { en: "Performance", zh: "性能优化" },
  "Security": { en: "Security", zh: "安全" },
  "Testing": { en: "Testing", zh: "测试" },
  "DevOps": { en: "DevOps", zh: "DevOps" },
  "Cloud Computing": { en: "Cloud Computing", zh: "云计算" },
  
  // 新兴技术
  "AI/ML": { en: "AI/ML", zh: "人工智能" },
  "Machine Learning": { en: "Machine Learning", zh: "机器学习" },
  "Blockchain": { en: "Blockchain", zh: "区块链" },
  "Game Dev": { en: "Game Dev", zh: "游戏开发" },
  "UI/UX": { en: "UI/UX", zh: "UI/UX" }
}

// 根据当前语言获取标签的显示文本
export const getTagDisplayText = (tag: string, language: 'en' | 'zh'): string => {
  // 首先检查是否有精确匹配的映射
  const mapping = Object.values(tagMapping).find(
    m => m.en === tag || m.zh === tag
  )
  
  if (mapping) {
    return mapping[language]
  }
  
  // 如果没有映射，直接返回原标签
  return tag
}

// 获取标签的规范化形式（用于存储和比较）
export const getNormalizedTag = (tag: string): string => {
  const mapping = Object.values(tagMapping).find(
    m => m.en === tag || m.zh === tag
  )
  
  // 统一使用英文作为规范化形式
  return mapping ? mapping.en : tag
} 
 