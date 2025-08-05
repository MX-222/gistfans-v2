# AI-3 任务规范：多语言完善

## 🎯 任务目标

完善GistFans的多语言支持系统，实现100%界面文本覆盖，优化语言切换体验，建立完整的国际化基础设施。

## 📋 核心要求

### 1. 语言包完善
扩展现有的语言文件结构，支持完整的中英文覆盖：

```
locales/
├── en/
│   ├── common.json         // 通用文本
│   ├── auth.json          // 认证相关
│   ├── feed.json          // 动态流
│   ├── proposals.json     // 提案系统
│   ├── notifications.json // 通知系统
│   ├── profile.json       // 用户资料
│   ├── chat.json          // 聊天系统
│   ├── admin.json         // 管理后台
│   ├── errors.json        // 错误信息
│   └── validation.json    // 表单验证
├── zh/
│   ├── common.json
│   ├── auth.json
│   ├── feed.json
│   ├── proposals.json
│   ├── notifications.json
│   ├── profile.json
│   ├── chat.json
│   ├── admin.json
│   ├── errors.json
│   └── validation.json
└── index.ts               // 语言包导出
```

### 2. 翻译服务重构
创建 `src/lib/i18nService.ts`：

```typescript
export interface I18nService {
  // 基础翻译
  t(key: string, params?: Record<string, any>): string
  
  // 复数处理
  plural(key: string, count: number, params?: Record<string, any>): string
  
  // 日期格式化
  formatDate(date: Date, format?: string): string
  
  // 数字格式化
  formatNumber(number: number, options?: Intl.NumberFormatOptions): string
  
  // 相对时间
  formatRelativeTime(date: Date): string
  
  // 语言检测
  detectLanguage(): string
  
  // 语言切换
  changeLanguage(locale: string): Promise<void>
  
  // 获取支持的语言
  getSupportedLanguages(): Array<{code: string, name: string, nativeName: string}>
}
```

### 3. 高级翻译功能

#### 动态翻译Hook
`src/hooks/useTranslation.ts`：
```typescript
export interface UseTranslationOptions {
  namespace?: string
  fallback?: string
  suspense?: boolean
}

export function useTranslation(options?: UseTranslationOptions) {
  return {
    t: (key: string, params?: Record<string, any>) => string
    i18n: I18nService
    ready: boolean
  }
}
```

#### 翻译组件
`src/components/i18n/Trans.tsx`：
```typescript
interface TransProps {
  i18nKey: string
  values?: Record<string, any>
  components?: Record<string, React.ReactNode>
  fallback?: string
}

export default function Trans(props: TransProps)
```

### 4. 语言切换优化

#### 语言选择器组件
重构 `src/components/LanguageToggle.tsx`：
```typescript
interface LanguageToggleProps {
  variant?: 'dropdown' | 'tabs' | 'radio'
  size?: 'sm' | 'md' | 'lg'
  showFlags?: boolean
  showNativeNames?: boolean
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export default function LanguageToggle(props: LanguageToggleProps)
```

#### 语言设置页面
`src/components/i18n/LanguageSettings.tsx`：
```typescript
interface LanguageSettingsProps {
  onLanguageChange?: (locale: string) => void
  showAdvancedOptions?: boolean
}

export default function LanguageSettings(props: LanguageSettingsProps)
```

### 5. Context增强
重构 `src/contexts/LanguageContext.tsx`：

```typescript
interface LanguageContextType {
  // 当前语言
  language: string
  
  // 支持的语言
  supportedLanguages: Language[]
  
  // 加载状态
  isLoading: boolean
  isReady: boolean
  
  // 翻译函数
  t: (key: string, params?: Record<string, any>) => string
  
  // 语言切换
  changeLanguage: (locale: string) => Promise<void>
  
  // 格式化函数
  formatDate: (date: Date, format?: string) => string
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string
  formatRelativeTime: (date: Date) => string
  
  // 文本方向 (为未来RTL支持做准备)
  direction: 'ltr' | 'rtl'
}
```

## 📁 文件清单

### 必须创建的文件
```
locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── feed.json
│   ├── proposals.json
│   ├── notifications.json
│   ├── profile.json
│   ├── chat.json
│   ├── admin.json
│   ├── errors.json
│   └── validation.json
├── zh/
│   └── (同上所有文件)
└── index.ts

src/lib/
├── i18nService.ts
├── i18nUtils.ts
└── dateFormats.ts

src/hooks/
├── useTranslation.ts
└── useLanguageDetection.ts

src/components/i18n/
├── Trans.tsx
├── LanguageSettings.tsx
├── LanguageFlag.tsx
└── LocalizedText.tsx

src/types/
└── i18n.ts

src/utils/
├── i18nHelpers.ts
└── localeUtils.ts
```

### 必须修改的文件
```
src/contexts/LanguageContext.tsx (完全重构)
src/components/LanguageToggle.tsx (增强)
src/app/layout.tsx (添加语言元数据)
```

### 需要国际化的文件 (添加翻译)
```
src/app/*/page.tsx (所有页面)
src/components/**/*.tsx (所有组件)
```

### 禁止修改的文件
```
src/contexts/StarContext.tsx (AI-1负责)
src/app/api/notifications/ (AI-2负责)
src/components/remote/ (AI-4负责)
src/app/proposals/ (AI-5负责)
```

## 🔧 技术要求

### 翻译文本提取
创建自动化工具 `scripts/extractTranslations.js`：
- 扫描所有组件文件
- 提取硬编码的中文文本
- 生成翻译键值对
- 自动更新语言文件

### 翻译验证
创建 `scripts/validateTranslations.js`：
- 检查缺失的翻译
- 验证翻译参数一致性
- 检查未使用的翻译键
- 生成翻译覆盖率报告

### 动态加载优化
- 按页面分割语言包
- 懒加载非关键翻译
- 翻译缓存策略
- 预加载下一页面翻译

### 翻译插值增强
支持复杂的插值语法：
```typescript
// 基础插值
t('welcome', { name: 'Alice' }) // "欢迎 Alice"

// 复数处理
t('items_count', { count: 5 }) // "5 个项目"

// 组件插值
t('terms_agreement', { 
  link: <Link to="/terms">服务条款</Link> 
})

// 日期插值
t('last_updated', { 
  date: formatDate(new Date(), 'relative') 
})
```

### 本地化增强
- 数字格式本地化
- 日期时间格式本地化
- 货币格式本地化
- 地址格式本地化

## 🧪 测试要求

### 单元测试
```
src/lib/__tests__/
├── i18nService.test.ts
├── i18nUtils.test.ts
└── dateFormats.test.ts

src/hooks/__tests__/
├── useTranslation.test.ts
└── useLanguageDetection.test.ts

src/components/i18n/__tests__/
├── Trans.test.tsx
├── LanguageSettings.test.tsx
└── LanguageToggle.test.tsx
```

### 集成测试
- 语言切换流程测试
- 翻译文件加载测试
- 本地化格式测试
- 浏览器语言检测测试

### 翻译质量测试
- 翻译完整性检查
- 翻译准确性验证
- UI布局适配测试
- 文本长度适配测试

## 📊 验收标准

### 功能完整性
- ✅ 所有页面和组件支持中英文切换
- ✅ 语言切换实时生效，无需刷新
- ✅ 翻译文本覆盖率 100%
- ✅ 本地化格式正确应用

### 性能标准
- ✅ 语言切换响应时间 < 200ms
- ✅ 初始语言包加载时间 < 500ms
- ✅ 翻译函数执行时间 < 1ms
- ✅ 内存使用优化

### 用户体验
- ✅ 语言选择界面友好
- ✅ 支持浏览器语言自动检测
- ✅ 语言偏好持久化保存
- ✅ 翻译文本自然流畅

### 代码质量
- ✅ TypeScript类型完整
- ✅ 翻译键命名规范
- ✅ 组件可复用性好
- ✅ 性能优化到位

## 🔄 交付物

### 代码交付
1. **Git分支**: `feature/i18n-enhancement`
2. **Pull Request**: 包含完整的代码变更
3. **翻译文件**: 完整的中英文语言包

### 文档交付
1. **翻译指南**: 如何添加新的翻译
2. **组件文档**: 国际化组件使用说明
3. **维护文档**: 翻译文件维护流程

### 工具交付
1. **提取工具**: 自动提取翻译文本
2. **验证工具**: 翻译完整性检查
3. **覆盖率报告**: 翻译覆盖情况

## ⚠️ 注意事项

1. **文本长度**: 考虑不同语言的文本长度差异
2. **文化适应**: 翻译要符合目标文化习惯
3. **技术术语**: 保持技术术语的一致性
4. **更新维护**: 建立翻译更新流程

## 📅 时间安排

- **Day 1**: 语言包结构设计 + 翻译提取工具
- **Day 2**: 核心翻译服务实现 + Context重构
- **Day 3**: 组件国际化改造 + 测试
- **Day 4**: 翻译质量优化 + 文档完善

## 🤝 与其他AI的接口

### 为其他AI提供
```typescript
// 翻译服务接口
interface I18nIntegration {
  // 为通知系统提供多语言支持
  translateNotification(notification: NotificationPayload, locale: string): NotificationPayload
  
  // 为Star系统提供多语言描述
  translateStarAction(action: string, locale: string): string
  
  // 为提案系统提供多语言支持
  translateProposal(proposal: Proposal, locale: string): Proposal
}
```

### 接收其他AI的需求
```typescript
// 接收新的翻译需求
interface TranslationRequest {
  key: string
  defaultText: string
  context: string
  namespace: string
}
```

## 🌍 支持的语言

### 第一期支持
- **中文 (zh)**: 简体中文，中国大陆
- **英文 (en)**: 美式英语，国际通用

### 未来扩展准备
- **日文 (ja)**: 日本
- **韩文 (ko)**: 韩国
- **法文 (fr)**: 法国
- **德文 (de)**: 德国

## 🎨 UI适配要求

### 布局适配
- 文本长度变化的布局自适应
- 按钮和输入框宽度自动调整
- 导航菜单项长度适配
- 表格列宽动态调整

### 字体优化
- 中文字体: Noto Sans CJK SC
- 英文字体: Inter, system-ui
- 字重和字号适配
- 行高和字间距优化

预计完成时间: 3个工作日
优先级: 🟡 中等 (独立前端功能) 