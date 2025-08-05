/**
 * GistFans 数据库连接池配置
 * 针对不同环境和使用场景的优化配置
 */

// import { PoolConfig } from './SmartConnectionPool' // 已删除

// 简化的连接池配置类型
interface PoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeoutMillis: number
  createTimeoutMillis: number
  destroyTimeoutMillis: number
  idleTimeoutMillis: number
  reapIntervalMillis: number
  createRetryIntervalMillis: number
  propagateCreateError: boolean
  connectionTimeoutMs?: number
  retryAttempts?: number
  retryDelayMs?: number
  healthCheckIntervalMs?: number
  metricsEnabled?: boolean
  debugMode?: boolean
}

// 环境类型
export type Environment = 'development' | 'production' | 'test'

// 使用场景配置
export interface ScenarioConfig {
  name: string
  description: string
  config: Partial<PoolConfig>
}

/**
 * 获取环境类型
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV
  if (env === 'production') return 'production'
  if (env === 'test') return 'test'
  return 'development'
}

/**
 * 基础环境配置
 */
export const environmentConfigs: Record<Environment, Partial<PoolConfig>> = {
  development: {
    minConnections: 8,          // 增加基础连接数
    maxConnections: 25,         // 增加最大连接数支持12+并发
    acquireTimeoutMillis: 5000,     // 5秒获取超时
    idleTimeoutMillis: 240000,      // 4分钟空闲超时
    connectionTimeoutMs: 8000,  // 8秒连接超时
    createTimeoutMillis: 20000,      // 20秒查询超时，减少长查询
    retryAttempts: 2,
    retryDelayMs: 500,          // 减少重试延迟
    healthCheckIntervalMs: 180000, // 3分钟健康检查
    metricsEnabled: true,
    debugMode: true
  },

  production: {
    minConnections: 8,
    maxConnections: 35,         // Supabase限制40，留5个给其他服务
    acquireTimeoutMillis: 3000,
    idleTimeoutMillis: 300000,      // 5分钟空闲超时
    connectionTimeoutMs: 8000,
    createTimeoutMillis: 25000,
    retryAttempts: 3,
    retryDelayMs: 500,
    healthCheckIntervalMs: 180000, // 3分钟健康检查
    metricsEnabled: true,
    debugMode: false
  },

  test: {
    minConnections: 1,
    maxConnections: 5,
    acquireTimeoutMillis: 2000,
    idleTimeoutMillis: 60000,       // 1分钟空闲超时
    connectionTimeoutMs: 5000,
    createTimeoutMillis: 10000,
    retryAttempts: 1,
    retryDelayMs: 100,
    healthCheckIntervalMs: 30000, // 30秒健康检查
    metricsEnabled: false,
    debugMode: false
  }
}

/**
 * 使用场景配置
 */
export const scenarioConfigs: Record<string, ScenarioConfig> = {
  // 高并发场景（12+用户同时在线）
  highConcurrency: {
    name: '高并发模式',
    description: '支持12+用户同时在线，优化响应时间',
    config: {
      minConnections: 8,          // 8个基础连接
      maxConnections: 30,         // 30个最大连接，为Supabase留余量
      acquireTimeoutMillis: 5000,     // 5秒获取超时
      idleTimeoutMillis: 240000,      // 4分钟空闲超时
      createTimeoutMillis: 20000,      // 20秒查询超时
      retryAttempts: 2,
      retryDelayMs: 500,          // 500ms重试延迟
      healthCheckIntervalMs: 180000 // 3分钟健康检查
    }
  },

  // 低延迟场景（实时交互）
  lowLatency: {
    name: '低延迟模式',
    description: '优化响应时间，适合实时交互',
    config: {
      minConnections: 12,
      maxConnections: 30,
      acquireTimeoutMillis: 1000,
      idleTimeoutMillis: 120000,    // 2分钟空闲超时
      createTimeoutMillis: 15000,
      retryAttempts: 1,
      healthCheckIntervalMs: 60000 // 1分钟健康检查
    }
  },

  // 资源节约场景（开发环境）
  resourceSaving: {
    name: '资源节约模式',
    description: '最小化资源使用，适合开发环境',
    config: {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMillis: 8000,
      idleTimeoutMillis: 120000,    // 2分钟空闲超时
      createTimeoutMillis: 45000,
      retryAttempts: 3,
      healthCheckIntervalMs: 180000 // 3分钟健康检查
    }
  },

  // 批处理场景（数据处理）
  batchProcessing: {
    name: '批处理模式',
    description: '优化批量数据处理性能',
    config: {
      minConnections: 5,
      maxConnections: 25,
      acquireTimeoutMillis: 10000,
      idleTimeoutMillis: 600000,    // 10分钟空闲超时
      createTimeoutMillis: 120000,   // 2分钟查询超时
      retryAttempts: 5,
      healthCheckIntervalMs: 600000 // 10分钟健康检查
    }
  }
}

/**
 * 获取推荐配置
 */
export function getRecommendedConfig(
  environment?: Environment,
  scenario?: string,
  customConfig?: Partial<PoolConfig>
): PoolConfig {
  const env = environment || getEnvironment()
  const baseConfig = environmentConfigs[env]
  
  let scenarioConfig: Partial<PoolConfig> = {}
  if (scenario && scenarioConfigs[scenario]) {
    scenarioConfig = scenarioConfigs[scenario].config
  }

  // 合并配置（优先级：自定义 > 场景 > 环境 > 默认）
  const defaultConfig: PoolConfig = {
    minConnections: 5,
    maxConnections: 20,
    acquireTimeoutMillis: 5000,
    idleTimeoutMillis: 300000,
    connectionTimeoutMs: 10000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    propagateCreateError: false,
    retryAttempts: 3,
    retryDelayMs: 1000,
    healthCheckIntervalMs: 120000,
    metricsEnabled: true,
    debugMode: false
  }

  return {
    ...defaultConfig,
    ...baseConfig,
    ...scenarioConfig,
    ...customConfig
  }
}

/**
 * 根据并发用户数推荐配置
 */
export function getConfigForConcurrentUsers(userCount: number): Partial<PoolConfig> {
  if (userCount <= 3) {
    return scenarioConfigs.resourceSaving.config
  } else if (userCount <= 8) {
    return environmentConfigs[getEnvironment()]
  } else if (userCount <= 15) {
    return scenarioConfigs.highConcurrency.config
  } else {
    // 超高并发场景
    return {
      minConnections: Math.min(15, userCount),
      maxConnections: Math.min(40, userCount * 3),
      acquireTimeoutMillis: 1500,
      idleTimeoutMillis: 180000,
      createTimeoutMillis: 15000,
      retryAttempts: 2,
      healthCheckIntervalMs: 240000
    }
  }
}

/**
 * 验证配置合理性
 */
export function validateConfig(config: Partial<PoolConfig>): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []

  if (config.minConnections && config.maxConnections) {
    if (config.minConnections > config.maxConnections) {
      errors.push('最小连接数不能大于最大连接数')
    }
    
    if (config.maxConnections > 40) {
      warnings.push('最大连接数超过Supabase建议限制(40)')
    }
    
    if (config.minConnections < 1) {
      errors.push('最小连接数不能小于1')
    }
  }

  if (config.acquireTimeoutMillis && config.acquireTimeoutMillis < 1000) {
    warnings.push('获取连接超时时间过短，可能导致频繁超时')
  }

  if (config.createTimeoutMillis && config.createTimeoutMillis < 5000) {
    warnings.push('查询超时时间过短，可能导致复杂查询失败')
  }

  if (config.idleTimeoutMillis && config.idleTimeoutMillis < 60000) {
    warnings.push('空闲超时时间过短，可能导致频繁重连')
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * 获取当前配置摘要
 */
export function getConfigSummary(config: PoolConfig): {
  environment: Environment
  scenario: string
  capacity: {
    maxConcurrentUsers: number
    recommendedUsers: number
  }
  performance: {
    expectedResponseTime: string
    throughputEstimate: string
  }
  resources: {
    memoryUsage: string
    cpuImpact: string
  }
} {
  const env = getEnvironment()
  const maxUsers = Math.floor(config.maxConnections / 3)
  const recommendedUsers = Math.floor(config.maxConnections / 4)

  return {
    environment: env,
    scenario: detectScenario(config),
    capacity: {
      maxConcurrentUsers: maxUsers,
      recommendedUsers: recommendedUsers
    },
    performance: {
      expectedResponseTime: config.acquireTimeoutMillis < 2000 ? '<500ms' : '<1000ms',
      throughputEstimate: `${Math.floor(config.maxConnections * 10)} queries/min`
    },
    resources: {
      memoryUsage: `${Math.floor(config.maxConnections * 2)}MB`,
      cpuImpact: config.maxConnections > 30 ? 'Medium' : 'Low'
    }
  }
}

/**
 * 检测配置对应的场景
 */
function detectScenario(config: PoolConfig): string {
  for (const [key, scenario] of Object.entries(scenarioConfigs)) {
    const scenarioConfig = scenario.config
    if (
      scenarioConfig.maxConnections === config.maxConnections &&
      scenarioConfig.minConnections === config.minConnections
    ) {
      return scenario.name
    }
  }
  return '自定义配置'
}
