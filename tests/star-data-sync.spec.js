/**
 * Star数据同步端到端测试
 * 使用Playwright检查实际的数据同步问题
 */

const { test, expect } = require('@playwright/test');

test.describe('Star数据同步测试', () => {
  test.beforeEach(async ({ page }) => {
    // 启用控制台日志捕获
    page.on('console', msg => {
      console.log(`🖥️  浏览器控制台 [${msg.type()}]:`, msg.text());
    });

    // 捕获网络请求
    page.on('request', request => {
      if (request.url().includes('/api/stars')) {
        console.log(`📡 API请求: ${request.method()} ${request.url()}`);
      }
    });

    // 捕获网络响应
    page.on('response', response => {
      if (response.url().includes('/api/stars')) {
        console.log(`📡 API响应: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('检查未登录用户的Star数据显示', async ({ page }) => {
    console.log('🔍 测试1: 检查未登录用户的Star数据显示');
    
    // 访问主页
    await page.goto('http://localhost:3002');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查是否有Star相关的错误信息
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 等待一段时间让StarContext初始化
    await page.waitForTimeout(3000);
    
    // 检查页面上的Star显示
    const starElements = await page.locator('[data-testid*="star"], .star, [class*="star"]').all();
    console.log(`📊 找到 ${starElements.length} 个Star相关元素`);
    
    // 检查控制台错误
    if (consoleErrors.length > 0) {
      console.log('❌ 控制台错误:', consoleErrors);
    }
    
    // 截图保存当前状态
    await page.screenshot({ path: 'tests/screenshots/star-data-未登录.png', fullPage: true });
  });

  test('检查登录用户的Star数据同步', async ({ page }) => {
    console.log('🔍 测试2: 检查登录用户的Star数据同步');
    
    // 访问登录页面
    await page.goto('http://localhost:3002/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // 检查是否有GitHub登录按钮
    const githubButton = page.locator('button:has-text("GitHub"), a:has-text("GitHub")').first();
    
    if (await githubButton.isVisible()) {
      console.log('✅ 找到GitHub登录按钮');
      
      // 点击GitHub登录（这会跳转到GitHub，我们需要模拟登录成功的状态）
      // 由于无法真实登录GitHub，我们检查登录流程是否正常启动
      await githubButton.click();
      
      // 等待跳转
      await page.waitForTimeout(2000);
      
      console.log('🔄 当前URL:', page.url());
      
      // 如果跳转到GitHub，说明登录流程正常
      if (page.url().includes('github.com')) {
        console.log('✅ 成功跳转到GitHub登录页面');
        
        // 返回到应用，模拟登录成功的情况
        await page.goto('http://localhost:3002');
        await page.waitForLoadState('networkidle');
      }
    } else {
      console.log('❌ 未找到GitHub登录按钮');
    }
    
    // 截图保存登录状态
    await page.screenshot({ path: 'tests/screenshots/star-data-登录流程.png', fullPage: true });
  });

  test('检查Star API的网络请求', async ({ page }) => {
    console.log('🔍 测试3: 检查Star API的网络请求');
    
    const apiRequests = [];
    const apiResponses = [];
    
    // 监听所有Star API请求
    page.on('request', request => {
      if (request.url().includes('/api/stars')) {
        apiRequests.push({
          method: request.method(),
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    // 监听所有Star API响应
    page.on('response', async response => {
      if (response.url().includes('/api/stars')) {
        try {
          const responseBody = await response.text();
          apiResponses.push({
            status: response.status(),
            url: response.url(),
            body: responseBody
          });
        } catch (error) {
          console.log('❌ 无法读取响应体:', error.message);
        }
      }
    });
    
    // 访问主页触发Star数据加载
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    // 等待StarContext初始化
    await page.waitForTimeout(5000);
    
    // 输出所有API请求和响应
    console.log('📡 Star API请求:', JSON.stringify(apiRequests, null, 2));
    console.log('📡 Star API响应:', JSON.stringify(apiResponses, null, 2));
    
    // 检查是否有401认证错误
    const authErrors = apiResponses.filter(resp => resp.status === 401);
    if (authErrors.length > 0) {
      console.log('🚨 发现认证错误:', authErrors);
    }
    
    // 检查是否有成功的API调用
    const successfulCalls = apiResponses.filter(resp => resp.status === 200);
    if (successfulCalls.length > 0) {
      console.log('✅ 成功的API调用:', successfulCalls);
    }
    
    // 截图保存网络状态
    await page.screenshot({ path: 'tests/screenshots/star-data-网络请求.png', fullPage: true });
  });

  test('检查StarContext的实际状态', async ({ page }) => {
    console.log('🔍 测试4: 检查StarContext的实际状态');
    
    // 访问主页
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    // 等待StarContext初始化
    await page.waitForTimeout(3000);
    
    // 在浏览器中执行JavaScript来检查StarContext状态
    const starContextState = await page.evaluate(() => {
      // 尝试从window对象或React DevTools获取StarContext状态
      const starElements = document.querySelectorAll('[data-testid*="star"], .star, [class*="star"]');
      const starTexts = Array.from(starElements).map(el => el.textContent);
      
      // 检查localStorage中的Star数据
      const localStorageKeys = Object.keys(localStorage).filter(key => key.includes('star'));
      const localStorageData = {};
      localStorageKeys.forEach(key => {
        try {
          localStorageData[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          localStorageData[key] = localStorage.getItem(key);
        }
      });
      
      return {
        starElements: starTexts,
        localStorage: localStorageData,
        url: window.location.href,
        userAgent: navigator.userAgent
      };
    });
    
    console.log('📊 StarContext状态:', JSON.stringify(starContextState, null, 2));
    
    // 检查是否有Star数据显示
    if (starContextState.starElements.length > 0) {
      console.log('✅ 找到Star数据显示:', starContextState.starElements);
    } else {
      console.log('❌ 未找到Star数据显示');
    }
    
    // 检查localStorage中的数据
    if (Object.keys(starContextState.localStorage).length > 0) {
      console.log('📱 localStorage中的Star数据:', starContextState.localStorage);
    } else {
      console.log('❌ localStorage中无Star数据');
    }
    
    // 截图保存状态
    await page.screenshot({ path: 'tests/screenshots/star-data-状态检查.png', fullPage: true });
  });
});
