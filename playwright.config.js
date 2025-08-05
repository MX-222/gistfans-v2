/**
 * Playwright配置文件 - GistFans端到端测试
 * 
 * 支持功能：
 * 1. 多浏览器测试（Chrome, Firefox, Safari）
 * 2. 移动端测试
 * 3. 并行执行
 * 4. 截图和视频录制
 * 5. 测试报告生成
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // 测试目录
  testDir: './tests',
  
  // 全局测试超时（10分钟，支持手动登录）
  timeout: 600 * 1000,
  
  // 期望超时（5秒）
  expect: {
    timeout: 5000,
  },
  
  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,
  
  // 并行执行的worker数量
  workers: process.env.CI ? 1 : undefined,
  
  // 测试报告配置
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  // 全局测试配置
  use: {
    // 基础URL
    baseURL: 'https://gistfans.vercel.app',

    // 🔧 代理配置 - 使用Hysteria 2 HTTP代理
    proxy: {
      server: 'http://127.0.0.1:8080',
    },

    // 浏览器上下文配置
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 网络配置
    ignoreHTTPSErrors: true,

    // 用户代理
    userAgent: 'GistFans-E2E-Test-Bot/1.0',

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 额外的HTTP头
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // 项目配置 - 简化为单一浏览器测试（使用代理）
  projects: [
    {
      name: 'chromium-proxy',
      use: {
        ...devices['Desktop Chrome'],
        // 🔧 为Chrome配置代理和额外启动参数
        launchOptions: {
          args: [
            '--proxy-server=http://127.0.0.1:8080',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list'
          ]
        }
      },
    },
  ],

  // 不需要本地服务器，直接测试生产环境
  // webServer: undefined,
  
  // 输出目录
  outputDir: 'test-results/artifacts',
  
  // 全局设置和清理
  globalSetup: require.resolve('./tests/global-setup.js'),
  globalTeardown: require.resolve('./tests/global-teardown.js'),
});
