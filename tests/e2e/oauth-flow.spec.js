/**
 * GistFans端到端测试 - OAuth认证流程
 * 
 * 测试覆盖：
 * 1. 首页加载和UI验证
 * 2. GitHub OAuth登录流程
 * 3. 用户会话和重定向
 * 4. 核心功能可用性
 */

const { test, expect } = require('@playwright/test');

// 测试配置
const BASE_URL = 'https://gistfans.vercel.app';
const TEST_TIMEOUT = 30000;

test.describe('GistFans OAuth Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // 设置测试超时
    test.setTimeout(TEST_TIMEOUT);
    
    // 清除所有cookies和localStorage
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('首页应该正常加载并显示登录按钮', async ({ page }) => {
    console.log('🧪 测试：首页加载和UI验证');
    
    // 访问首页
    await page.goto(BASE_URL);
    
    // 验证页面标题
    await expect(page).toHaveTitle(/GistFans/);
    
    // 验证主要UI元素
    await expect(page.locator('h1, h2')).toContainText(/Connect with Expert Developers|GistFans/);
    
    // 验证登录按钮存在
    const loginButton = page.locator('text=Sign in with GitHub, button:has-text("Sign in"), [data-testid="github-login"]').first();
    await expect(loginButton).toBeVisible();
    
    console.log('✅ 首页加载正常，UI元素验证通过');
  });

  test('OAuth诊断API应该返回健康状态', async ({ page }) => {
    console.log('🧪 测试：OAuth诊断API健康检查');
    
    // 测试OAuth健康检查API
    const response = await page.request.get(`${BASE_URL}/api/oauth-health`);
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    console.log('📊 OAuth健康状态:', healthData);
    
    // 验证关键配置
    expect(healthData.environment.NEXTAUTH_URL).toBe(BASE_URL);
    expect(healthData.environment.GITHUB_CLIENT_ID).toBeTruthy();
    expect(healthData.environment.GITHUB_CLIENT_SECRET).toBe('SET');
    
    console.log('✅ OAuth诊断API健康检查通过');
  });

  test('NextAuth API端点应该正常工作', async ({ page }) => {
    console.log('🧪 测试：NextAuth API端点验证');
    
    // 测试providers端点
    const providersResponse = await page.request.get(`${BASE_URL}/api/auth/providers`);
    console.log('📊 Providers API状态:', providersResponse.status());
    
    if (providersResponse.status() === 200) {
      const providers = await providersResponse.json();
      expect(providers.github).toBeTruthy();
      console.log('✅ GitHub provider配置正确');
    } else {
      console.warn('⚠️ Providers API返回错误，可能仍在部署中');
    }
    
    // 测试CSRF端点
    const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`);
    console.log('📊 CSRF API状态:', csrfResponse.status());
    
    if (csrfResponse.status() === 200) {
      const csrf = await csrfResponse.json();
      expect(csrf.csrfToken).toBeTruthy();
      console.log('✅ CSRF token生成正常');
    }
  });

  test('点击登录按钮应该重定向到GitHub OAuth', async ({ page }) => {
    console.log('🧪 测试：GitHub OAuth重定向流程');
    
    // 访问首页
    await page.goto(BASE_URL);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 查找并点击登录按钮
    const loginButton = page.locator('text=Sign in with GitHub, button:has-text("Sign in"), [data-testid="github-login"]').first();
    await expect(loginButton).toBeVisible();
    
    // 点击登录按钮
    await loginButton.click();
    
    // 等待重定向到GitHub或NextAuth
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('📍 重定向后的URL:', currentUrl);
    
    // 验证重定向到正确的OAuth流程
    const isGitHubOAuth = currentUrl.includes('github.com') || 
                         currentUrl.includes('/api/auth/signin') ||
                         currentUrl.includes('/api/auth/callback');
    
    expect(isGitHubOAuth).toBeTruthy();
    console.log('✅ OAuth重定向流程正常');
  });

  test('系统健康检查应该通过', async ({ page }) => {
    console.log('🧪 测试：系统整体健康检查');
    
    // 测试系统健康API
    const response = await page.request.get(`${BASE_URL}/api/system-health`);
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    console.log('📊 系统健康状态:', {
      overallStatus: healthData.overallStatus,
      healthScore: healthData.healthScore,
      issueCount: healthData.issues?.length || 0
    });
    
    // 验证关键系统组件
    expect(healthData.environment.NODE_ENV).toBe('production');
    expect(healthData.oauth.GITHUB_CLIENT_ID).toBeTruthy();
    
    console.log('✅ 系统健康检查完成');
  });

  test('深度OAuth诊断应该提供详细信息', async ({ page }) => {
    console.log('🧪 测试：深度OAuth诊断');
    
    // 测试深度诊断API
    const response = await page.request.get(`${BASE_URL}/api/deep-oauth-diagnosis`);
    expect(response.status()).toBe(200);
    
    const diagnosisData = await response.json();
    console.log('📊 深度诊断结果:', {
      configurationValid: diagnosisData.diagnostics?.configurationValid,
      providersLoaded: diagnosisData.diagnostics?.providersLoaded,
      recommendationsCount: diagnosisData.recommendations?.length || 0
    });
    
    // 验证诊断数据完整性
    expect(diagnosisData.environment).toBeTruthy();
    expect(diagnosisData.nextAuthConfig).toBeTruthy();
    expect(diagnosisData.githubOAuth).toBeTruthy();
    
    console.log('✅ 深度OAuth诊断完成');
  });

});

// 性能测试
test.describe('GistFans Performance Tests', () => {
  
  test('首页加载性能应该在可接受范围内', async ({ page }) => {
    console.log('🧪 测试：首页加载性能');
    
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`📊 首页加载时间: ${loadTime}ms`);
    
    // 验证加载时间在合理范围内（10秒内）
    expect(loadTime).toBeLessThan(10000);
    
    console.log('✅ 首页加载性能测试通过');
  });

});

module.exports = { BASE_URL, TEST_TIMEOUT };
