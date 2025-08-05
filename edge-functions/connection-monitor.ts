/**
 * GistFans Pro 连接池监控 Edge Function 配置
 *
 * 这个文件包含 Edge Function 的配置信息和部署说明
 * 实际的 Edge Function 代码需要手动部署到 Supabase
 */

export const edgeFunctionConfig = {
  name: 'connection-monitor',
  description: 'GistFans Pro 连接池监控和管理',
  version: '1.0.0',

  // 部署说明
  deploymentInstructions: [
    '1. 在 Supabase 项目中创建 Edge Function',
    '2. 使用 docs/edge-function-code.md 中的代码',
    '3. 运行 supabase functions deploy connection-monitor',
    '4. 设置环境变量：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  ],

  // API 端点
  endpoints: [
    'GET ?action=monitor - 监控连接池状态',
    'GET ?action=health - 健康检查',
    'GET ?action=cleanup - 执行连接清理',
    'GET ?action=emergency - 紧急连接重置',
    'GET ?action=auto - 自动连接池管理'
  ],

  // 环境变量
  requiredEnvVars: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
}
