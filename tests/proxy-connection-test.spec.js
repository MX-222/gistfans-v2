/**
 * 代理连接测试
 * 验证Playwright是否能通过Hysteria 2代理访问生产环境
 */

const { test, expect } = require('@playwright/test');

test.describe('代理连接测试', () => {
  test('验证代理连接和生产环境访问', async ({ page }) => {
    console.log('🔍 测试: 验证代理连接和生产环境访问');
    
    // 设置更长的超时时间
    test.setTimeout(60000);
    
    try {
      console.log('🌐 尝试访问生产环境...');
      
      // 访问生产环境
      await page.goto('https://gistfans.vercel.app', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('✅ 成功访问生产环境');
      
      // 验证页面标题
      const title = await page.title();
      console.log(`📄 页面标题: ${title}`);
      expect(title).toContain('GistFans');
      
      // 验证页面内容
      const content = await page.textContent('body');
      expect(content).toContain('Connect with Expert Developers');
      console.log('✅ 页面内容验证通过');
      
      // 截图保存
      await page.screenshot({ 
        path: 'tests/screenshots/proxy-connection-success.png', 
        fullPage: true 
      });
      
      console.log('🎉 代理连接测试成功！');
      
    } catch (error) {
      console.error('❌ 代理连接测试失败:', error.message);
      
      // 截图保存错误状态
      await page.screenshot({ 
        path: 'tests/screenshots/proxy-connection-failed.png', 
        fullPage: true 
      });
      
      throw error;
    }
  });

  test('检查StarContext在生产环境的工作状态', async ({ page }) => {
    console.log('🔍 测试: 检查StarContext在生产环境的工作状态');
    
    const consoleLogs = [];
    
    // 捕获控制台日志
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      // 实时输出StarContext相关日志
      if (text.includes('StarContext') || text.includes('Star') || 
          text.includes('认证') || text.includes('用户')) {
        console.log(`🖥️  [${msg.type()}]: ${text}`);
      }
    });
    
    try {
      // 访问生产环境
      await page.goto('https://gistfans.vercel.app', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('✅ 页面加载完成，等待StarContext初始化...');
      
      // 等待足够长的时间让StarContext初始化
      await page.waitForTimeout(10000);
      
      // 检查StarContext状态
      const starContextState = await page.evaluate(() => {
        // 检查localStorage中的Star数据
        const starKeys = Object.keys(localStorage).filter(key => 
          key.includes('star') || key.includes('Star')
        );
        const localStorageData = {};
        starKeys.forEach(key => {
          try {
            localStorageData[key] = JSON.parse(localStorage.getItem(key));
          } catch {
            localStorageData[key] = localStorage.getItem(key);
          }
        });
        
        return {
          localStorage: localStorageData,
          url: window.location.href,
          userAgent: navigator.userAgent
        };
      });
      
      console.log('📊 StarContext状态检查结果:');
      console.log('  - URL:', starContextState.url);
      console.log('  - localStorage keys:', Object.keys(starContextState.localStorage));
      
      if (Object.keys(starContextState.localStorage).length > 0) {
        console.log('  - localStorage data:', JSON.stringify(starContextState.localStorage, null, 2));
      }
      
      // 分析控制台日志
      const starContextLogs = consoleLogs.filter(log => 
        log.text.includes('StarContext') || 
        log.text.includes('用户未登录') ||
        log.text.includes('设置默认状态') ||
        log.text.includes('availableStars')
      );
      
      console.log(`📝 捕获到 ${consoleLogs.length} 条控制台日志`);
      console.log(`📝 其中 ${starContextLogs.length} 条与StarContext相关:`);
      
      starContextLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
      });
      
      // 检查是否有我们修复的日志
      const hasDefaultStateLog = starContextLogs.some(log => 
        log.text.includes('用户未登录，设置默认状态') ||
        log.text.includes('创建默认Star状态')
      );
      
      if (hasDefaultStateLog) {
        console.log('✅ 发现StarContext默认状态设置日志 - 修复生效！');
      } else {
        console.log('⚠️ 未发现StarContext默认状态设置日志');
      }
      
      // 截图保存
      await page.screenshot({ 
        path: 'tests/screenshots/starcontext-production-test.png', 
        fullPage: true 
      });
      
    } catch (error) {
      console.error('❌ StarContext测试失败:', error.message);
      throw error;
    }
  });
});
