# 📏 GistFans 开发标准规范

## 🎯 代码质量标准

### **TypeScript严格模式要求**
```typescript
// tsconfig.json实际配置
{
  "compilerOptions": {
    "strict": true,                    # 启用所有严格检查
    "noEmit": true,                   # 不生成输出文件
    "noUncheckedIndexedAccess": true, # 数组访问安全检查
  }
}

// 所有新代码必须满足
✅ 无TypeScript错误
✅ 无ESLint警告
✅ 完整的类型定义
✅ 适当的错误处理
```

### **API开发标准**
```typescript
// 统一的API响应格式
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    duration?: number
  }
}

// API错误处理标准
export async function handleAPIError(error: unknown): Promise<NextResponse> {
  console.error('API Error:', error)
  
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '输入数据验证失败',
        details: error.errors
      }
    }, { status: 400 })
  }
  
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  }, { status: 500 })
}
```

### **组件开发标准**
```typescript
// React组件标准结构
interface ComponentProps {
  // Props类型定义必须完整
  required: string
  optional?: number
  children?: React.ReactNode
}

export function Component({ required, optional = 0, children }: ComponentProps) {
  // 1. Hooks声明
  const [state, setState] = useState<StateType>(initialState)
  
  // 2. 事件处理函数
  const handleEvent = useCallback((param: ParamType) => {
    // 事件处理逻辑
  }, [dependencies])
  
  // 3. 副作用
  useEffect(() => {
    // 副作用逻辑
  }, [dependencies])
  
  // 4. 渲染逻辑
  return (
    <div className="组件样式类">
      {children}
    </div>
  )
}
```

## 🔐 安全开发标准

### **认证和授权**
```typescript
// 所有受保护的API必须包含认证检查
export async function protectedAPIHandler(request: NextRequest) {
  // 1. 获取会话
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未登录' }
    }, { status: 401 })
  }
  
  // 2. 权限检查 (如果需要)
  if (requiresAdminRole) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })
    
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: '权限不足' }
      }, { status: 403 })
    }
  }
  
  // 3. 业务逻辑处理
  // ...
}
```

### **输入验证标准**
```typescript
// 使用Zod进行输入验证
import { z } from 'zod'

const inputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(10).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = inputSchema.parse(body)
    
    // 使用验证后的数据
    // ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error)
    }
    throw error
  }
}
```

### **SQL注入防护**
```typescript
// ✅ 正确使用Prisma ORM
const posts = await prisma.post.findMany({
  where: {
    authorId: userId,
    title: { contains: searchTerm }
  }
})

// ❌ 禁止原始SQL查询 (除非必要)
// const posts = await prisma.$queryRaw`SELECT * FROM posts WHERE title LIKE ${searchTerm}`
```

## 🎨 UI/UX开发标准

### **Tailwind CSS使用规范**
```typescript
// 类名组织顺序: 布局 → 尺寸 → 外观 → 交互
<div className="
  flex items-center justify-between    // 布局
  w-full h-12 px-4 py-2               // 尺寸和间距
  bg-white border border-gray-200     // 外观
  hover:bg-gray-50 focus:outline-none // 交互状态
">

// 使用CSS变量实现主题一致性
<Button className="bg-primary text-primary-foreground">
```

### **响应式设计标准**
```typescript
// 移动优先的响应式设计
<div className="
  text-sm md:text-base lg:text-lg     // 字体大小
  p-2 md:p-4 lg:p-6                  // 内边距
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  // 网格布局
">

// 关键断点
sm: 640px   // 小屏手机
md: 768px   // 平板
lg: 1024px  // 桌面
xl: 1280px  // 大屏桌面
```

### **可访问性标准**
```typescript
// 必须包含的可访问性属性
<button
  aria-label="删除帖子"
  aria-describedby="delete-help-text"
  disabled={isLoading}
>
  {isLoading ? '删除中...' : '删除'}
</button>

<div id="delete-help-text" className="sr-only">
  此操作不可撤销，请谨慎操作
</div>
```

## 🧪 测试标准

### **手动测试要求**
```bash
# 每个新功能必须通过的测试
1. 功能测试: 核心功能正常工作
2. 边界测试: 异常输入和边界情况
3. 权限测试: 权限控制正确
4. 性能测试: 响应时间合理
5. 兼容性测试: 不同浏览器和设备

# 使用项目测试脚本
node scripts/test-comment-functionality.js    # 评论功能
node scripts/test-star-voting.js             # Star投票
node scripts/test-post-persistence.js        # 帖子持久化
```

### **测试页面使用**
```bash
# 专用测试页面验证
/test-comments          # 评论功能测试
/test-performance       # 性能测试
/test-oauth            # OAuth认证测试
/test-admin-auth       # 管理员认证测试
```

## 📊 性能标准

### **数据库查询优化**
```typescript
// ✅ 优化的查询 - 只选择需要的字段
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    content: true,
    author: {
      select: {
        id: true,
        name: true,
        image: true
      }
    },
    _count: {
      select: {
        comments: true,
        starVotes: true
      }
    }
  },
  take: 20,
  orderBy: { createdAt: 'desc' }
})

// ❌ 避免的查询 - 获取所有字段
// const posts = await prisma.post.findMany({ include: { author: true } })
```

### **连接池管理**
```typescript
// 当前连接池配置 (基于实际.env.local)
DATABASE_URL="postgresql://...?connection_limit=35&pool_timeout=30"

// 连接池监控
node scripts/diagnose-connection-pool.js     # 定期运行
node scripts/connection-monitor.js           # 持续监控
```

### **前端性能优化**
```typescript
// 代码分割和懒加载
const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => <LoadingSpinner />,
  ssr: false  // 管理员面板不需要SSR
})

// 图片优化
import Image from 'next/image'
<Image
  src={src}
  alt={alt}
  width={800}
  height={600}
  placeholder="blur"
  priority={false}  // 非关键图片延迟加载
/>
```

## 🔄 开发流程标准

### **Git工作流程**
```bash
# 分支命名规范
feature/admin-user-management     # 新功能
fix/database-connection-issue     # Bug修复
refactor/api-error-handling      # 重构
docs/api-documentation           # 文档更新

# 提交信息规范
feat: 添加管理员用户批量操作功能
fix: 修复Star投票重复提交问题
docs: 更新API文档和使用示例
refactor: 重构错误处理中间件
```

### **代码审查清单**
```markdown
## 代码审查检查项
- [ ] TypeScript类型检查通过
- [ ] ESLint检查无警告
- [ ] 功能测试通过
- [ ] 安全性检查 (认证、授权、输入验证)
- [ ] 性能考虑 (查询优化、缓存策略)
- [ ] 错误处理完善
- [ ] 可访问性考虑
- [ ] 移动端适配
- [ ] 代码注释充分
- [ ] 相关文档更新
```

### **部署前检查**
```bash
# 部署前必须通过的检查
npm run type-check                    # TypeScript检查
npm run lint                          # ESLint检查
npm run build                         # 构建检查
node scripts/test-all-four-fixes.js   # 功能测试
node scripts/performance-test.js      # 性能测试
```

## 📚 文档标准

### **代码注释标准**
```typescript
/**
 * 管理员用户管理API
 * @description 提供用户列表查询、角色修改、状态管理等功能
 * @route GET /api/admin/users
 * @access Admin only
 * @param {NextRequest} request - 请求对象
 * @returns {Promise<NextResponse>} 用户列表响应
 */
export async function GET(request: NextRequest) {
  // 实现逻辑...
}
```

### **API文档标准**
```typescript
// API端点必须包含的文档信息
/**
 * POST /api/admin/users
 * 
 * 管理员用户操作API
 * 
 * Request Body:
 * {
 *   "action": "update_role" | "toggle_status",
 *   "userId": string,
 *   "data": {
 *     "role"?: "USER" | "ADMIN",
 *     "isVerified"?: boolean
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "data"?: User,
 *   "error"?: { code: string, message: string }
 * }
 * 
 * Errors:
 * - 401: 未登录
 * - 403: 权限不足
 * - 400: 输入验证失败
 * - 500: 服务器错误
 */
```

---

**开发标准版本**: v1.0  
**最后更新**: 2025-07-28  
**适用范围**: 所有GistFans项目开发  
**强制执行**: 所有新代码必须遵循此标准
