/**
 * 使用模拟用户测试Star数据同步问题
 * 创建模拟登录状态，测试已登录用户的Star数据显示一致性
 */

const { test, expect } = require('@playwright/test');

test.describe('模拟用户Star数据同步测试', () => {
  test('创建模拟用户并测试Star数据同步', async ({ page }) => {
    console.log('🔍 测试: 创建模拟用户并测试Star数据同步');
    
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
      
      // 实时输出重要日志
      if (text.includes('StarContext') || text.includes('Session') || 
          text.includes('认证') || text.includes('API') || text.includes('Star') ||
          text.includes('模拟') || text.includes('Mock')) {
        console.log(`🖥️  [${msg.type()}]: ${text}`);
      }
    });

    // 捕获网络请求和响应
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 请求: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
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
            console.log(`📡 错误响应: ${responseText.substring(0, 200)}`);
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
      await page.waitForTimeout(3000);
      
      // 第二步：创建模拟登录状态
      console.log('🎭 第二步：创建模拟登录状态...');
      
      // 模拟NextAuth session
      const mockUser = {
        id: 'mock-user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://avatars.githubusercontent.com/u/123456?v=4',
        isVerified: true,
        role: 'USER',
        githubLogin: 'testuser',
        userType: 'CODER'
      };
      
      const mockSession = {
        user: mockUser,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30天后过期
      };
      
      // 注入模拟session到页面
      await page.evaluate((session) => {
        // 模拟NextAuth session
        window.__NEXT_DATA__ = window.__NEXT_DATA__ || {};
        window.__NEXT_DATA__.props = window.__NEXT_DATA__.props || {};
        window.__NEXT_DATA__.props.pageProps = window.__NEXT_DATA__.props.pageProps || {};
        window.__NEXT_DATA__.props.pageProps.session = session;
        
        // 设置localStorage中的session信息
        localStorage.setItem('mock-session', JSON.stringify(session));
        
        // 模拟一些Star数据
        const mockStarData = {
          userId: session.user.id,
          totalStars: 1250,
          availableStars: 850,
          usedStars: 400,
          lastRefreshDate: new Date().toDateString(),
          dailyEarned: 5,
          maxDailyEarn: 10
        };
        
        localStorage.setItem(`star_status_${session.user.id}`, JSON.stringify(mockStarData));
        
        console.log('🎭 模拟登录状态已设置:', session.user);
        console.log('⭐ 模拟Star数据已设置:', mockStarData);
        
      }, mockSession);
      
      console.log('✅ 模拟登录状态创建完成');
      
      // 第三步：刷新页面以应用模拟状态
      console.log('🔄 第三步：刷新页面以应用模拟状态...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      
      // 第四步：检查StarContext是否正确识别模拟用户
      console.log('🔍 第四步：检查StarContext状态...');
      
      // 等待StarContext初始化
      await page.waitForTimeout(8000);
      
      // 第五步：检查页面上的Star数据显示
      console.log('📊 第五步：检查页面上的Star数据显示...');
      
      const starElements = await page.locator('*').evaluateAll(elements => {
        const starRelated = [];
        elements.forEach(el => {
          const text = el.textContent || '';
          const className = el.className || '';
          
          if (text.includes('1250') || text.includes('850') || text.includes('Star') || 
              text.includes('star') || /\d+.*Star/.test(text) || /Star.*\d+/.test(text) ||
              (className && className.includes('star'))) {
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
      
      // 第六步：访问用户资料页面测试数据一致性
      console.log('👤 第六步：访问用户资料页面测试数据一致性...');
      
      try {
        await page.goto('https://gistfans.vercel.app/profile', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        console.log('✅ 成功访问用户资料页面');
        await page.waitForTimeout(10000);
        
        // 检查资料页面的Star显示
        const profileStarElements = await page.locator('*').evaluateAll(elements => {
          const starData = [];
          elements.forEach(el => {
            const text = el.textContent || '';
            const className = el.className || '';
            
            if (text.includes('1250') || text.includes('850') || text.includes('Star') || 
                text.includes('余额') || text.includes('收到') ||
                /\d+.*Star/.test(text) || /Star.*\d+/.test(text)) {
              starData.push({
                tag: el.tagName,
                text: text.trim(),
                className: className
              });
            }
          });
          return starData;
        });
        
        console.log(`📊 用户资料页面找到 ${profileStarElements.length} 个Star相关元素:`);
        profileStarElements.forEach((el, index) => {
          console.log(`  ${index + 1}. ${el.tag}: "${el.text}"`);
        });
        
        // 检查数据一致性
        const mainPageStarCount = starElements.length;
        const profilePageStarCount = profileStarElements.length;
        
        console.log('🔍 数据一致性检查:');
        console.log(`  主页Star元素数量: ${mainPageStarCount}`);
        console.log(`  资料页Star元素数量: ${profilePageStarCount}`);
        
        // 检查是否显示了1250这个数字
        const has1250InMain = starElements.some(el => el.text.includes('1250'));
        const has1250InProfile = profileStarElements.some(el => el.text.includes('1250'));
        
        console.log(`  主页显示1250: ${has1250InMain ? '✅' : '❌'}`);
        console.log(`  资料页显示1250: ${has1250InProfile ? '✅' : '❌'}`);
        
      } catch (error) {
        console.log('❌ 访问用户资料页面失败:', error.message);
      }
      
      // 第七步：分析控制台日志
      console.log('📊 第七步：分析控制台日志...');
      
      const starContextLogs = consoleLogs.filter(log => 
        log.text.includes('StarContext') || log.text.includes('模拟') || log.text.includes('Mock')
      );
      
      console.log(`📝 捕获到 ${consoleLogs.length} 条控制台日志`);
      console.log(`📝 其中 ${starContextLogs.length} 条与StarContext/模拟相关:`);
      
      starContextLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
      });
      
      // 检查API错误
      const errorResponses = networkResponses.filter(resp => resp.status !== 200);
      if (errorResponses.length > 0) {
        console.log(`❌ 发现 ${errorResponses.length} 个API错误:`);
        errorResponses.forEach((resp, index) => {
          console.log(`  ${index + 1}. ${resp.status} ${resp.url}`);
        });
      } else {
        console.log('✅ 所有API调用正常');
      }
      
      // 最终截图
      await page.screenshot({ 
        path: 'tests/screenshots/mock-user-star-data-test.png', 
        fullPage: true 
      });
      
      console.log('🎉 模拟用户Star数据同步测试完成');
      
    } catch (error) {
      console.error('❌ 模拟用户测试失败:', error.message);
      
      await page.screenshot({ 
        path: 'tests/screenshots/mock-user-test-error.png', 
        fullPage: true 
      });
      
      throw error;
    }
  });
});
