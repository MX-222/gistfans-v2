"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

// 语言类型
export type Language = 'en' | 'zh'

// 翻译字典类型
type TranslationKey = keyof typeof translations.en

// 翻译字典
const translations = {
  en: {
    // 导航
    "gistfans": "GistFans",
    "home": "Home",
    "explore": "Explore",
    "admin": "Admin",
    "profile": "Profile",
    "logout": "Logout",
    "search_placeholder": "Search posts, users or tags...",
    
    // 通用
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "confirm": "Confirm",
    "back": "Back",
    "add": "Add",
    "remove": "Remove",
    "close": "Close",
    "submit": "Submit",
    
    // 认证
    "please_login": "Please login first",
    "login_now": "Login Now",
    
    // 发帖
    "share_thoughts": "Share your thoughts...",
    "post_content": "Post content",
    "add_images": "Add images",
    "image_url": "Image URL",
    "add_image": "Add Image",
    "select_tags": "Select tags (max 3)",
    "selected_tags": "Selected tags",
    "max_tags_reached": "Maximum tag limit reached (3)",
    "post_visibility": "Post visibility",
    "public": "Public",
    "subscribers_only": "Subscribers Only",
    "publish_post": "Publish Post",
    "character_count": "characters",
    
    // 帖子
    "just_now": "Just now",
    "hours_ago": "hours ago",
    "days_ago": "days ago",
    "weeks_ago": "weeks ago",
    "likes": "likes",
    "comments": "comments",
    "shares": "shares",
    "delete_post_confirm": "Are you sure you want to delete this post?",

    // Error Messages & Status
    "error_occurred": "An error occurred",
    "try_again": "Please try again",
    "network_error": "Network error",
    "server_error": "Server error",
    "not_found": "Not found",
    "unauthorized": "Unauthorized access",
    "forbidden": "Access forbidden",
    "failed_to_submit_comment": "Failed to submit comment, please try again",
    "connection_error": "Connection error, please check your network",
    "server_busy": "Server is busy, please try again later",
    "database_connection_failed": "Database connection failed",
    "database_timeout": "Database operation timed out, please retry",
    "unique_constraint_violation": "Data already exists, please check input",
    "max_client_connections_reached": "Server is busy, please try again in a few seconds",

    // Authentication Errors
    "configuration_error": "Configuration Error",
    "oauth_config_error": "OAuth application configuration error, please contact administrator",
    "access_denied": "Access Denied",
    "access_denied_description": "You denied the authorization request. To use GistFans, you need to authorize GitHub login",
    "verification_failed": "Verification Failed",
    "verification_failed_description": "Unable to verify your GitHub account. Please ensure your GitHub account is valid",
    "github_login_failed": "GitHub Login Failed",
    "github_login_failed_description": "Unable to connect to GitHub. Please check your network connection and try again",
    "network_connection_problem": "Network Connection Problem",
    "oauth_callback_description": "GitHub authorization may have succeeded, but user information could not be retrieved due to network issues. You can retry or go directly to the application",
    "account_creation_failed": "Account Creation Failed",
    "account_creation_failed_description": "Unable to create your account. Please try again later",
    "email_verification_failed": "Email Verification Failed",
    "email_verification_failed_description": "Unable to verify your email address. Please ensure your GitHub account has a valid email",
    "callback_error": "Callback Error",
    "callback_error_description": "An error occurred during the login process. Please try again",
    "account_not_linked": "Account Not Linked",
    "account_not_linked_description": "This GitHub account is already linked to another account. Please use the correct login method",
    "email_signin_failed": "Email Sign-in Failed",
    "email_signin_failed_description": "Unable to send login email. Please check your email address",
    "credentials_error": "Credentials Error",
    "credentials_error_description": "The provided login credentials are invalid. Please try again",
    "session_required": "Login Required",
    "session_required_description": "You need to log in to access this page",
    "unknown_error": "Login Failed",
    "unknown_error_description": "An unknown error occurred. Please try again later, and contact support if the problem persists",
    "contact_support": "Contact Support",
    "retry": "Retry",
    "go_to_login": "Go to Login",

    // Form & Validation
    "field_required": "This field is required",
    "invalid_email": "Please enter a valid email address",
    "password_too_short": "Password must be at least 8 characters",
    "comment_placeholder": "Write your comment...",
    "image_url_placeholder": "Enter image URL",

    // Loading States
    "loading_posts": "Loading posts...",
    "loading_comments": "Loading comments...",
    "saving_changes": "Saving changes...",
    "loading_admin_panel": "Loading admin panel...",

    // Comment System
    "post_comment": "Post Comment",
    "reply_to_comment": "Reply to comment",
    "edit_comment": "Edit comment",
    "delete_comment": "Delete comment",
    "expand": "Expand",
    "collapse": "Collapse",
    "no_comments": "No comments yet",

    // Feed Interactions
    "load_more_posts": "Load more posts",
    "refresh_feed": "Refresh feed",
    "share_your_thoughts": "Share your thoughts...",

    // 搜索和过滤
    "search": "Search",
    "clear_filters": "Clear Filters",
    "results_found": "results found",
    "hot_tags": "Hot Tags",
    
    // 个人资料
    "personal_profile": "Personal Profile",
    "edit_profile": "Edit Profile",
    "username": "Username",
    "bio": "Bio",
    "github_link": "GitHub Link",
    "followers": "Followers",
    "posts": "Posts",
    "rating": "Rating",
    "account_overview": "Account Overview",
    
    // 导航和页面
    "developer_mode": "Developer Mode",
    "feed": "Feed",
    "invite_code": "Invite Code",
    "onboarding": "Onboarding",
    "recent_activities": "Recent Activities",
    
    // Star投票相关
    "vote_star": "Vote Star",
    "login_to_vote": "Login to vote",
    "voted_count": "voters",
    "confirm_vote": "Confirm Vote", 
    "vote_amount": "Vote Amount",
    "vote_success": "Vote successful!",
    "vote": "Vote",
    
    // 提案页面
    "create_proposal": "Create Proposal",
    "need_stars_to_create": "Need 18 Stars to create proposal",
    "current": "Current",
    "create_new_proposal": "Create New Proposal",
    "proposal_title": "Proposal Title",
    "proposal_title_placeholder": "Clear and concise proposal title...",
    "detailed_description": "Detailed Description",
    "description_placeholder": "Describe your proposal content, rationale and expected effects...",
    "proposal_category": "Proposal Category",
    "feature": "Feature",
    "policy": "Policy", 
    "community_category": "Community",
    "other": "Other",
    "deadline": "Deadline",
    "create_proposal_cost": "Creating proposal costs 18 ⭐ Stars",
    "create_proposal_button": "Create Proposal (-18 ⭐)",
    "filter": "Filter",
    "filter_all": "All",
    "filter_active": "Active",
    "filter_approved": "Approved",
    "filter_rejected": "Rejected",
    
    "subscriber_management": "Subscriber Management",
    "manage_subscribers": "Manage your subscribers and interactions",
    "revenue_stats": "Revenue Stats",
    "view_subscription_revenue": "View your subscription revenue",
    
    // 订阅方案
    "subscription_plans": "Subscription Plans",
    "add_plan": "Add Plan",
    "plan_management": "Plan Management",
    "add_new_plan": "Add New Subscription Plan",
    "plan_name": "Plan Name",
    "price": "Price",
    "features": "Features",
    "feature_description": "Feature description",
    "add_feature": "Add Feature",
    "save_plan": "Save Plan",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "per_month": "/month",
    "basic_plan": "Basic Plan",
    "premium_plan": "Premium Plan",
    "consultation": "1-on-1 Consultation",
    "per_hour": "/hour",
    
    // 我的帖子
    "my_posts": "My Posts",
    "publish_new_post": "Publish New Post",
    
    // 开发者页面
    "developer_profile": "Developer Profile",
    "subscribe": "Subscribe",
    "follow": "Follow",
    "message": "Message",
    "share": "Share",
    "subscribers": "Subscribers",
    "most_popular": "Most Popular",
    "latest_posts": "Latest Posts",
    "locked_content": "Locked Content",
    "subscribe_to_view": "Subscribe to view this content",
    
    // 聊天
    "online": "Online",
    "typing": "typing...",
    "voice_call": "Voice Call",
    "video_call": "Video Call",
    "send_message": "Send message...",
    
    // 支付
    "payment": "Payment",
    "under_development": "Under Development",
    "coming_soon": "Coming Soon",
    "payment_feature_desc": "Payment feature is currently under development. We'll notify you when it's ready!",
    "back_to_profile": "Back to Profile",
    "notify_when_ready": "Notify When Ready",
    
    // 管理页面
    "admin_panel": "Admin Panel",
    "admin_mode": "Admin Mode",
    "back_to_home": "Back to Home",
    "test_data_cleanup": "Test Data Cleanup",
    "system_status": "System Status",
    "environment": "Environment",
    "database": "Database",
    "authentication": "Authentication",
    "connected": "Connected",
    "active": "Active",
    "test_posts": "Test Posts",
    "test_users": "Test Users",
    "test_comments": "Test Comments",
    "test_images": "Test Images",
    "cleanup_test_data": "Cleanup Test Data",
    "reset_to_production": "Reset to Production",
    "production_checklist": "Production Deployment Checklist",
    "overview": "Overview",
    "user_management": "User Management",
    "invite_codes": "Invite Codes",
    "settings": "Settings",
    "welcome_back": "Welcome back",
    "gistfans_admin_panel": "GistFans Admin Panel",
    "logout_or_return": "Logout",
    "return_to_login": "Return to Login",
    "total_users": "Total Users",
    "total_invite_codes": "Total Invite Codes",
    "used_invite_codes": "Used Invite Codes",
    "admin_users": "Admin Users",
    "quick_actions": "Quick Actions",
    "generating_invite_code": "Generating...",
    "generate_new_invite_code": "🎫 Generate New Invite Code",
    "manage_all_users": "Manage all users in the system",
    "invite_code_management": "Invite Code Management",
    "manage_and_generate_invite_codes": "Manage and generate invite codes",
    "usage_status": "Usage",
    
    // 社区功能
    "community_proposals": "Community Proposals",
    "test_accounts": "Test Accounts",
    "proposals": "Proposals",
    
    // 错误和状态
    "error": "Error",
    "success": "Success",
    "warning": "Warning",
    "info": "Info"
  },
  zh: {
    // 导航
    "gistfans": "GistFans",
    "home": "首页",
    "explore": "探索",
    "admin": "管理",
    "profile": "个人资料",
    "logout": "退出登录",
    "search_placeholder": "搜索帖子、用户或标签...",
    
    // 通用
    "loading": "加载中...",
    "save": "保存",
    "cancel": "取消",
    "edit": "编辑",
    "delete": "删除",
    "confirm": "确认",
    "back": "返回",
    "add": "添加",
    "remove": "移除",
    "close": "关闭",
    "submit": "提交",
    
    // 认证
    "please_login": "请先登录",
    "login_now": "立即登录",
    
    // 发帖
    "share_thoughts": "分享你的想法...",
    "post_content": "帖子内容",
    "add_images": "添加图片",
    "image_url": "图片链接",
    "add_image": "添加图片",
    "select_tags": "选择标签（最多3个）",
    "selected_tags": "已选择的标签",
    "max_tags_reached": "已达到最大标签数量限制（3个）",
    "post_visibility": "帖子可见性",
    "public": "公开",
    "subscribers_only": "订阅可见",
    "publish_post": "发布帖子",
    "character_count": "字符",
    
    // 帖子
    "just_now": "刚刚",
    "hours_ago": "小时前",
    "days_ago": "天前",
    "weeks_ago": "周前",
    "likes": "点赞",
    "comments": "评论",
    "shares": "分享",
    "delete_post_confirm": "确定要删除这个帖子吗？",

    // 错误信息和状态
    "error_occurred": "发生错误",
    "try_again": "请重试",
    "network_error": "网络错误",
    "server_error": "服务器错误",
    "not_found": "未找到",
    "unauthorized": "未授权访问",
    "forbidden": "访问被禁止",
    "failed_to_submit_comment": "提交评论失败，请重试",
    "connection_error": "连接错误，请检查网络",
    "server_busy": "服务器繁忙，请稍后重试",
    "database_connection_failed": "数据库连接失败",
    "database_timeout": "数据库操作超时，请重试",
    "unique_constraint_violation": "数据已存在，请检查输入",
    "max_client_connections_reached": "服务器繁忙，请几秒后重试",

    // 认证错误
    "configuration_error": "配置错误",
    "oauth_config_error": "OAuth应用配置有误，请联系管理员",
    "access_denied": "访问被拒绝",
    "access_denied_description": "您拒绝了授权请求。要使用GistFans，您需要授权GitHub登录",
    "verification_failed": "验证失败",
    "verification_failed_description": "无法验证您的GitHub账户。请确保您的GitHub账户是有效的",
    "github_login_failed": "GitHub登录失败",
    "github_login_failed_description": "无法连接到GitHub。请检查您的网络连接，然后重试",
    "network_connection_problem": "网络连接问题",
    "oauth_callback_description": "GitHub授权可能已成功，但由于网络问题无法获取用户信息。您可以重试或直接进入应用",
    "account_creation_failed": "账户创建失败",
    "account_creation_failed_description": "无法创建您的账户。请稍后重试",
    "email_verification_failed": "邮箱验证失败",
    "email_verification_failed_description": "无法验证您的邮箱地址。请确保您的GitHub账户有有效的邮箱",
    "callback_error": "回调错误",
    "callback_error_description": "登录过程中发生错误。请重试",
    "account_not_linked": "账户未关联",
    "account_not_linked_description": "该GitHub账户已与其他账户关联。请使用正确的登录方式",
    "email_signin_failed": "邮箱登录失败",
    "email_signin_failed_description": "无法发送登录邮件。请检查您的邮箱地址",
    "credentials_error": "凭据错误",
    "credentials_error_description": "提供的登录凭据无效。请重试",
    "session_required": "需要登录",
    "session_required_description": "您需要登录才能访问此页面",
    "unknown_error": "登录失败",
    "unknown_error_description": "发生了未知错误。请稍后重试，如果问题持续存在，请联系支持",
    "contact_support": "联系支持",
    "retry": "重新尝试",
    "go_to_login": "去登录",

    // 表单和验证
    "field_required": "此字段为必填项",
    "invalid_email": "请输入有效的邮箱地址",
    "password_too_short": "密码至少需要8个字符",
    "comment_placeholder": "写下您的评论...",
    "image_url_placeholder": "输入图片链接",

    // 加载状态
    "loading_posts": "加载帖子中...",
    "loading_comments": "加载评论中...",
    "saving_changes": "保存更改中...",
    "loading_admin_panel": "加载管理员面板...",

    // 评论系统
    "post_comment": "发表评论",
    "reply_to_comment": "回复评论",
    "edit_comment": "编辑评论",
    "delete_comment": "删除评论",
    "expand": "展开",
    "collapse": "收起",
    "no_comments": "暂无评论",

    // Feed交互
    "load_more_posts": "加载更多帖子",
    "refresh_feed": "刷新动态",
    "share_your_thoughts": "分享你的想法...",

    // 搜索和过滤
    "search": "搜索",
    "clear_filters": "清除筛选",
    "results_found": "个结果",
    "hot_tags": "热门标签",
    
    // 个人资料
    "personal_profile": "个人资料",
    "edit_profile": "编辑资料",
    "username": "用户名",
    "bio": "个人简介",
    "github_link": "GitHub 链接",
    "followers": "订阅者",
    "posts": "帖子",
    "rating": "评分",
    "account_overview": "账户概览",
    
    // 导航和页面  
    "developer_mode": "开发者模式",
    "feed": "动态",
    "invite_code": "邀请码",
    "onboarding": "引导设置", 
    "recent_activities": "最近活动",
    
    // Star投票相关
    "vote_star": "投Star",
    "login_to_vote": "登录后可投Star",
    "voted_count": "人投票",
    "confirm_vote": "确认投票",
    "vote_amount": "投票数量",
    "vote_success": "投票成功！",
    "vote": "投票",
    
    // 提案页面
    "create_proposal": "创建提案",
    "need_stars_to_create": "需要 18 个 Stars 才能创建提案",
    "current": "当前",
    "create_new_proposal": "创建新提案",
    "proposal_title": "提案标题",
    "proposal_title_placeholder": "简洁明了的提案标题...",
    "detailed_description": "详细描述",
    "description_placeholder": "详细描述您的提案内容、理由和预期效果...",
    "proposal_category": "提案类别",
    "feature": "功能特性",
    "policy": "政策规则",
    "community_category": "社区建设",
    "other": "其他",
    "deadline": "截止日期",
    "create_proposal_cost": "创建提案将消耗 18 个 Stars",
    "create_proposal_button": "创建提案 (-18 ⭐)",
    "filter": "筛选",
    "filter_all": "全部",
    "filter_active": "进行中",
    "filter_approved": "已通过",
    "filter_rejected": "已拒绝",
    
    "subscriber_management": "订阅者管理",
    "manage_subscribers": "管理您的订阅者和互动",
    "revenue_stats": "收入统计",
    "view_subscription_revenue": "查看您的订阅收入",
    
    // 订阅方案
    "subscription_plans": "订阅方案",
    "add_plan": "添加方案",
    "plan_management": "订阅方案管理",
    "add_new_plan": "添加新订阅方案",
    "plan_name": "方案名称",
    "price": "价格",
    "features": "功能特性",
    "feature_description": "功能描述",
    "add_feature": "添加功能",
    "save_plan": "保存方案",
    "enabled": "启用",
    "disabled": "禁用",
    "per_month": "/月",
    "basic_plan": "基础订阅",
    "premium_plan": "高级订阅",
    "consultation": "1对1咨询",
    "per_hour": "/小时",
    
    // 我的帖子
    "my_posts": "我的帖子",
    "publish_new_post": "发布新帖",
    
    // 开发者页面
    "developer_profile": "开发者资料",
    "subscribe": "订阅",
    "follow": "关注",
    "message": "私信",
    "share": "分享",
    "subscribers": "订阅者",
    "most_popular": "最受欢迎",
    "latest_posts": "最新帖子",
    "locked_content": "锁定内容",
    "subscribe_to_view": "订阅后查看此内容",
    
    // 聊天
    "online": "在线",
    "typing": "正在输入...",
    "voice_call": "语音通话",
    "video_call": "视频通话",
    "send_message": "发送消息...",
    
    // 支付
    "payment": "支付",
    "under_development": "开发中",
    "coming_soon": "即将推出",
    "payment_feature_desc": "支付功能目前正在开发中，我们会在准备就绪时通知您！",
    "back_to_profile": "返回个人资料",
    "notify_when_ready": "准备就绪时通知我",
    
    // 管理页面
    "admin_panel": "管理面板",
    "admin_mode": "管理员模式",
    "back_to_home": "返回首页",
    "test_data_cleanup": "测试数据清理",
    "system_status": "系统状态",
    "environment": "环境",
    "database": "数据库",
    "authentication": "认证",
    "connected": "已连接",
    "active": "活跃",
    "test_posts": "测试帖子",
    "test_users": "测试用户",
    "test_comments": "测试评论",
    "test_images": "测试图片",
    "cleanup_test_data": "清理测试数据",
    "reset_to_production": "重置到生产环境",
    "production_checklist": "生产环境部署检查清单",
    "overview": "概览",
    "user_management": "用户管理",
    "invite_codes": "邀请码",
    "settings": "设置",
    "welcome_back": "欢迎回来",
    "gistfans_admin_panel": "GistFans 管理员面板",
    "logout_or_return": "退出登录",
    "return_to_login": "返回登录页",
    "total_users": "总用户数",
    "total_invite_codes": "邀请码总数",
    "used_invite_codes": "已使用邀请码",
    "admin_users": "管理员用户",
    "quick_actions": "快速操作",
    "generating_invite_code": "生成中...",
    "generate_new_invite_code": "🎫 生成新邀请码",
    "manage_all_users": "管理系统中的所有用户",
    "invite_code_management": "邀请码管理",
    "manage_and_generate_invite_codes": "管理和生成邀请码",
    "usage_status": "使用情况",
    
    // 社区功能
    "community_proposals": "社区提案",
    "test_accounts": "测试账户",
    "proposals": "提案",
    
    // 错误和状态
    "error": "错误",
    "success": "成功",
    "warning": "警告",
    "info": "信息"
  }
}

// 语言上下文类型
interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

// 创建上下文
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// 语言提供者组件
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  // 从本地存储加载语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // 保存语言设置到本地存储
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  // 翻译函数
  const t = (key: TranslationKey): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// 使用语言上下文的Hook
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
} 
 