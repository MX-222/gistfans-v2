/**
 * 已登录用户Star数据同步问题测试
 * 测试真实的GitHub OAuth登录流程和数据同步问题
 */

const { test, expect } = require('@playwright/test');

test.describe('已登录用户Star数据同步测试', () => {
  test('完整的GitHub OAuth登录流程和Star数据同步测试', async ({ page }) => {
    console.log('🔍 测试: 完整的GitHub OAuth登录流程和Star数据同步测试');

    const consoleLogs = [];
    const networkRequests = [];
    const networkResponses = [];

    // 捕获所有控制台日志
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });

      // 实时输出所有重要日志
      if (text.includes('StarContext') || text.includes('Session') ||
          text.includes('认证') || text.includes('API') || text.includes('Star') ||
          text.includes('调试') || text.includes('登录') || text.includes('OAuth')) {
        console.log(`🖥️  [${msg.type()}]: ${text}`);
      }
    });

    // 捕获网络请求
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('github.com') ||
          request.url().includes('auth') || request.url().includes('star')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 请求: ${request.method()} ${request.url()}`);
      }
    });

    // 捕获网络响应
    page.on('response', async response => {
      if (response.url().includes('/api/') || response.url().includes('auth') ||
          response.url().includes('star')) {
        try {
          const responseText = await response.text();
          networkResponses.push({
            url: response.url(),
            status: response.status(),
            data: responseText.substring(0, 500),
            timestamp: new Date().toISOString()
          });
          console.log(`📡 响应: ${response.status()} ${response.url()}`);
          if (response.status() !== 200) {
            console.log(`📡 错误响应内容: ${responseText.substring(0, 200)}`);
          }
        } catch (error) {
          console.log(`📡 响应: ${response.status()} ${response.url()} (无法读取内容)`);
        }
      }
    });
    
    try {
      // 第一步：访问生产环境
      console.log('🌐 第一步：访问生产环境...');
      await page.goto('https://gistfans.vercel.app', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      console.log('✅ 页面加载完成');

      // 等待页面完全加载
      await page.waitForTimeout(3000);

      // 第二步：检查当前登录状态
      console.log('🔍 第二步：检查当前登录状态...');

      // 查找登录按钮
      const loginButton = page.locator('button:has-text("Sign In with GitHub"), button:has-text("登录")').first();
      const isLoginButtonVisible = await loginButton.isVisible();

      if (isLoginButtonVisible) {
        console.log('🔐 发现登录按钮，用户未登录，开始GitHub OAuth流程...');

        // 第三步：执行GitHub OAuth登录
        console.log('🚀 第三步：点击GitHub登录按钮...');

        // 点击登录按钮
        await loginButton.click();
        console.log('✅ 已点击登录按钮');

        // 等待跳转到GitHub或处理OAuth流程
        await page.waitForTimeout(5000);

        console.log('🔄 当前URL:', page.url());

        if (page.url().includes('github.com')) {
          console.log('🎯 已跳转到GitHub OAuth页面');
          console.log('⏸️  测试暂停 - 请手动完成GitHub OAuth授权');
          console.log('📋 操作步骤:');
          console.log('   1. 在打开的GitHub页面中点击"Authorize"');
          console.log('   2. 完成授权后会自动跳转回应用');
          console.log('   3. 测试将继续检查登录后的Star数据同步');

          // 等待用户手动完成OAuth授权并跳转回应用
          console.log('⏳ 等待OAuth授权完成...');
          await page.waitForURL('https://gistfans.vercel.app/**', {
            timeout: 120000 // 2分钟超时
          });

          console.log('🎉 OAuth授权完成，已跳转回应用');
          console.log('🔄 当前URL:', page.url());

        } else if (page.url().includes('gistfans.vercel.app')) {
          console.log('🔄 仍在应用页面，可能OAuth流程有问题或已经登录');
        }

        // 等待登录状态更新
        await page.waitForTimeout(5000);

      } else {
        console.log('✅ 未发现登录按钮，用户可能已经登录');
      }
      
      // 第四步：检查登录后的状态和Star数据
      console.log('🔍 第四步：检查登录后的状态和Star数据...');

      // 等待StarContext初始化
      await page.waitForTimeout(8000);

      // 查找用户资料相关元素
      const userElements = await page.locator('*').evaluateAll(elements => {
        const userRelated = [];
        elements.forEach(el => {
          const text = el.textContent || '';
          const className = el.className || '';

          // 查找用户名、头像、资料链接等
          if (text.includes('MX-AI') || text.includes('profile') || text.includes('资料') ||
              (className && className.includes('avatar')) || (className && className.includes('user')) ||
              el.tagName === 'IMG' && el.src && el.src.includes('avatar')) {
            userRelated.push({
              tag: el.tagName,
              text: text.trim(),
              className: className,
              src: el.src || ''
            });
          }
        });
        return userRelated;
      });

      console.log(`👤 找到 ${userElements.length} 个用户相关元素:`);
      userElements.forEach((el, index) => {
        console.log(`  ${index + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`);
      });

      // 查找Star相关显示
      const starElements = await page.locator('*').evaluateAll(elements => {
        const starRelated = [];
        elements.forEach(el => {
          const text = el.textContent || '';
          const className = el.className || '';

          // 查找Star数量、Star历史等
          if (text.includes('1250') || text.includes('Star') || text.includes('star') ||
              /\d+.*Star/.test(text) || /Star.*\d+/.test(text) ||
              className.includes('star') || text.includes('收到') || text.includes('发布')) {
            starRelated.push({
              tag: el.tagName,
              text: text.trim(),
              className: className
            });
          }
        });
        return starRelated;
      });

      console.log(`⭐ 找到 ${starElements.length} 个Star相关元素:`);
      starElements.forEach((el, index) => {
        console.log(`  ${index + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`);
      });

      // 第五步：尝试访问用户资料页面
      console.log('🔍 第五步：尝试访问用户资料页面...');

      try {
        await page.goto('https://gistfans.vercel.app/profile', {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        console.log('✅ 成功访问用户资料页面');

        // 等待页面和StarContext完全加载
        await page.waitForTimeout(10000);

        // 检查资料页面的Star显示
        const profileStarElements = await page.locator('*').evaluateAll(elements => {
          const starData = [];
          elements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('1250') || text.includes('Star') ||
                text.includes('余额') || text.includes('收到') ||
                /\d+.*Star/.test(text) || /Star.*\d+/.test(text)) {
              starData.push({
                tag: el.tagName,
                text: text.trim(),
                className: el.className || ''
              });
            }
          });
          return starData;
        });

        console.log(`📊 用户资料页面找到 ${profileStarElements.length} 个Star相关元素:`);
        profileStarElements.forEach((el, index) => {
          console.log(`  ${index + 1}. ${el.tag}: "${el.text}"`);
        });

      } catch (error) {
        console.log('❌ 访问用户资料页面失败:', error.message);
      }
      
      // 第六步：分析控制台日志和网络请求
      console.log('📊 第六步：分析控制台日志和网络请求...');

      // 分析StarContext相关日志
      const starContextLogs = consoleLogs.filter(log =>
        log.text.includes('StarContext') ||
        log.text.includes('Star') ||
        log.text.includes('认证') ||
        log.text.includes('API') ||
        log.text.includes('登录')
      );

      console.log(`📝 捕获到 ${consoleLogs.length} 条控制台日志`);
      console.log(`📝 其中 ${starContextLogs.length} 条与Star/认证相关:`);

      starContextLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
      });

      // 分析网络请求
      const starApiRequests = networkRequests.filter(req =>
        req.url.includes('/api/stars') || req.url.includes('star')
      );

      const authRequests = networkRequests.filter(req =>
        req.url.includes('auth') || req.url.includes('github')
      );

      console.log(`📡 捕获到 ${networkRequests.length} 个网络请求`);
      console.log(`📡 其中 ${starApiRequests.length} 个Star API请求:`);
      starApiRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      });

      console.log(`📡 其中 ${authRequests.length} 个认证相关请求:`);
      authRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      });

      // 分析API响应
      const errorResponses = networkResponses.filter(resp => resp.status !== 200);
      if (errorResponses.length > 0) {
        console.log(`❌ 发现 ${errorResponses.length} 个错误响应:`);
        errorResponses.forEach((resp, index) => {
          console.log(`  ${index + 1}. ${resp.status} ${resp.url}`);
          console.log(`      数据: ${resp.data.substring(0, 100)}...`);
        });
      }

      // 检查关键状态
      const hasLoginSuccess = consoleLogs.some(log =>
        log.text.includes('登录成功') || log.text.includes('OAuth成功') ||
        log.text.includes('用户已登录')
      );

      const hasStarDataSync = consoleLogs.some(log =>
        log.text.includes('从数据库同步Star数据') ||
        log.text.includes('Star数据获取成功')
      );

      const hasApiErrors = errorResponses.length > 0;

      console.log('🎯 关键状态检查:');
      console.log(`  登录成功: ${hasLoginSuccess ? '✅' : '❌'}`);
      console.log(`  Star数据同步: ${hasStarDataSync ? '✅' : '❌'}`);
      console.log(`  API错误: ${hasApiErrors ? '❌ 有错误' : '✅ 无错误'}`);

      // 最终截图
      await page.screenshot({
        path: 'tests/screenshots/logged-in-star-data-test.png',
        fullPage: true
      });
      
    } catch (error) {
      console.error('❌ Session调试测试失败:', error.message);
      
      // 截图保存错误状态
      await page.screenshot({ 
        path: 'tests/screenshots/session-debug-error.png', 
        fullPage: true 
      });
      
      throw error;
    }
  });

  // 专注于主要的登录流程测试，移除重复的测试用例
});
