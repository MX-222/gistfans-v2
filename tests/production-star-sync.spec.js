/**
 * 生产环境Star数据同步测试
 * 直接访问 https://gistfans.vercel.app/ 检查真实的数据同步问题
 */

const { test, expect } = require('@playwright/test');

test.describe('生产环境Star数据同步测试', () => {
  test.beforeEach(async ({ page }) => {
    // 启用详细的控制台日志捕获
    page.on('console', msg => {
      const text = msg.text();
      // 只记录Star相关的日志
      if (text.includes('Star') || text.includes('star') || text.includes('认证') || text.includes('API')) {
        console.log(`🖥️  [${msg.type()}]: ${text}`);
      }
    });

    // 捕获网络请求 - 重点关注Star API
    page.on('request', request => {
      if (request.url().includes('/api/stars') || request.url().includes('star')) {
        console.log(`📡 请求: ${request.method()} ${request.url()}`);
      }
    });

    // 捕获网络响应 - 重点关注Star API
    page.on('response', async response => {
      if (response.url().includes('/api/stars') || response.url().includes('star')) {
        try {
          const responseText = await response.text();
          console.log(`📡 响应: ${response.status()} ${response.url()}`);
          console.log(`📡 响应内容: ${responseText.substring(0, 200)}...`);
        } catch (error) {
          console.log(`📡 响应: ${response.status()} ${response.url()} (无法读取内容)`);
        }
      }
    });
  });

  test('检查生产环境的Star数据显示', async ({ page }) => {
    console.log('🔍 测试: 检查生产环境的Star数据显示');
    
    // 访问生产环境主页
    await page.goto('https://gistfans.vercel.app');
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 等待React应用初始化
    await page.waitForTimeout(5000);
    
    // 检查页面标题确认访问正确
    const title = await page.title();
    console.log(`📄 页面标题: ${title}`);
    
    // 查找Star相关的元素
    const starElements = await page.locator('*').evaluateAll(elements => {
      const starRelated = [];
      elements.forEach(el => {
        const text = el.textContent || '';
        const className = el.className || '';
        const id = el.id || '';
        
        // 查找包含Star、数字、或相关关键词的元素
        if (text.includes('Star') || text.includes('star') || 
            text.includes('1250') || text.includes('余额') ||
            className.includes('star') || id.includes('star') ||
            /\d+/.test(text) && text.length < 20) {
          starRelated.push({
            tag: el.tagName,
            text: text.trim(),
            className: className,
            id: id
          });
        }
      });
      return starRelated;
    });
    
    console.log(`📊 找到 ${starElements.length} 个可能的Star相关元素:`);
    starElements.forEach((el, index) => {
      console.log(`  ${index + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`);
    });
    
    // 检查localStorage中的数据
    const localStorageData = await page.evaluate(() => {
      const starKeys = Object.keys(localStorage).filter(key => 
        key.includes('star') || key.includes('Star') || key.includes('user')
      );
      const data = {};
      starKeys.forEach(key => {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          data[key] = localStorage.getItem(key);
        }
      });
      return data;
    });
    
    console.log('📱 localStorage中的相关数据:');
    Object.entries(localStorageData).forEach(([key, value]) => {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    });
    
    // 截图保存当前状态
    await page.screenshot({ 
      path: 'tests/screenshots/production-star-data.png', 
      fullPage: true 
    });
    
    // 检查是否有用户登录
    const loginElements = await page.locator('button, a').evaluateAll(elements => {
      return elements.filter(el => {
        const text = el.textContent || '';
        return text.includes('登录') || text.includes('Login') || text.includes('GitHub');
      }).map(el => ({
        text: el.textContent.trim(),
        tag: el.tagName
      }));
    });
    
    if (loginElements.length > 0) {
      console.log('🔐 发现登录相关元素:', loginElements);
    } else {
      console.log('✅ 可能已经登录或没有显示登录按钮');
    }
  });

  test('检查用户资料页面的Star数据', async ({ page }) => {
    console.log('🔍 测试: 检查用户资料页面的Star数据');
    
    // 先访问主页
    await page.goto('https://gistfans.vercel.app');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 查找用户资料链接或用户名
    const userLinks = await page.locator('a, button').evaluateAll(elements => {
      return elements.filter(el => {
        const text = el.textContent || '';
        const href = el.getAttribute('href') || '';
        return href.includes('/user/') || href.includes('/profile') || 
               text.includes('MX-AI') || text.includes('用户');
      }).map(el => ({
        text: el.textContent.trim(),
        href: el.getAttribute('href'),
        tag: el.tagName
      }));
    });
    
    console.log('👤 找到的用户相关链接:', userLinks);
    
    if (userLinks.length > 0) {
      // 尝试访问用户资料页面
      const userLink = userLinks[0];
      if (userLink.href) {
        console.log(`🔗 访问用户资料页面: ${userLink.href}`);
        await page.goto(`https://gistfans.vercel.app${userLink.href}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // 在用户资料页面查找Star数据
        const profileStarData = await page.locator('*').evaluateAll(elements => {
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
        
        console.log('📊 用户资料页面的Star数据:', profileStarData);
        
        // 截图保存用户资料页面
        await page.screenshot({ 
          path: 'tests/screenshots/production-user-profile.png', 
          fullPage: true 
        });
      }
    } else {
      console.log('❌ 未找到用户资料链接');
    }
  });

  test('检查控制台中的StarContext日志', async ({ page }) => {
    console.log('🔍 测试: 检查控制台中的StarContext日志');
    
    const consoleLogs = [];
    
    // 捕获所有控制台日志
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // 访问主页
    await page.goto('https://gistfans.vercel.app');
    await page.waitForLoadState('networkidle');
    
    // 等待足够长的时间让StarContext初始化
    await page.waitForTimeout(10000);
    
    // 分析控制台日志
    const starContextLogs = consoleLogs.filter(log => 
      log.text.includes('StarContext') || 
      log.text.includes('Star') ||
      log.text.includes('认证') ||
      log.text.includes('API')
    );
    
    console.log(`📝 总共捕获 ${consoleLogs.length} 条控制台日志`);
    console.log(`📝 其中 ${starContextLogs.length} 条与Star相关:`);
    
    starContextLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
    });
    
    // 检查是否有错误日志
    const errorLogs = consoleLogs.filter(log => log.type === 'error');
    if (errorLogs.length > 0) {
      console.log(`❌ 发现 ${errorLogs.length} 个错误:`);
      errorLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.text}`);
      });
    }
    
    // 检查是否有StarContext初始化的日志
    const initLogs = starContextLogs.filter(log => 
      log.text.includes('初始化') || 
      log.text.includes('同步') ||
      log.text.includes('缓存')
    );
    
    if (initLogs.length > 0) {
      console.log('✅ StarContext初始化日志:', initLogs);
    } else {
      console.log('❌ 未发现StarContext初始化日志');
    }
  });
});
