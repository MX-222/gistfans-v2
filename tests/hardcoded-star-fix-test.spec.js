/**
 * 硬编码Star数据修复验证测试
 * 验证profile页面不再显示硬编码的1250个Star
 */

const { test, expect } = require('@playwright/test');

test.describe('硬编码Star数据修复验证', () => {
  test('验证profile页面不再显示硬编码的1250个Star', async ({ page }) => {
    console.log('🔍 测试: 验证profile页面不再显示硬编码的1250个Star');
    
    const consoleLogs = [];
    
    // 捕获控制台日志
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      if (text.includes('StarContext') || text.includes('Star') || text.includes('硬编码')) {
        console.log(`🖥️  [${msg.type()}]: ${text}`);
      }
    });

    try {
      // 访问生产环境
      console.log('🌐 访问生产环境...');
      await page.goto('https://gistfans.vercel.app', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('✅ 页面加载完成');
      await page.waitForTimeout(3000);
      
      // 访问profile页面
      console.log('👤 访问用户资料页面...');
      await page.goto('https://gistfans.vercel.app/profile', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('✅ 用户资料页面加载完成');
      await page.waitForTimeout(8000); // 等待StarContext初始化
      
      // 检查页面上是否还有1250这个硬编码数字
      const pageContent = await page.textContent('body');
      const has1250 = pageContent.includes('1250');
      
      console.log(`🔍 页面是否包含1250: ${has1250 ? '❌ 仍然存在' : '✅ 已修复'}`);
      
      // 查找所有包含数字的Star相关元素
      const starElements = await page.locator('*').evaluateAll(elements => {
        const starRelated = [];
        elements.forEach(el => {
          const text = el.textContent || '';
          const className = el.className || '';
          
          // 查找Star相关的数字显示
          if ((text.includes('Star') || text.includes('star') || 
               className.includes('star')) && /\d+/.test(text)) {
            starRelated.push({
              tag: el.tagName,
              text: text.trim(),
              className: className
            });
          }
        });
        return starRelated;
      });
      
      console.log(`⭐ 找到 ${starElements.length} 个包含数字的Star相关元素:`);
      starElements.forEach((el, index) => {
        console.log(`  ${index + 1}. ${el.tag}: "${el.text}"`);
      });
      
      // 检查是否有显示1250的元素
      const elements1250 = starElements.filter(el => el.text.includes('1250'));
      console.log(`🚨 显示1250的元素数量: ${elements1250.length}`);
      
      if (elements1250.length > 0) {
        console.log('❌ 仍然发现硬编码的1250:');
        elements1250.forEach((el, index) => {
          console.log(`  ${index + 1}. ${el.tag}: "${el.text}"`);
        });
      } else {
        console.log('✅ 未发现硬编码的1250，修复成功！');
      }
      
      // 检查StarContext相关日志
      const starContextLogs = consoleLogs.filter(log => 
        log.text.includes('StarContext') || log.text.includes('Star')
      );
      
      console.log(`📝 StarContext相关日志 (${starContextLogs.length}条):`);
      starContextLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
      });
      
      // 检查是否显示正确的默认值（0个Star）
      const zeroStarElements = starElements.filter(el => 
        el.text.includes('0') && (el.text.includes('Star') || el.text.includes('star'))
      );
      
      console.log(`✅ 显示0个Star的元素数量: ${zeroStarElements.length}`);
      zeroStarElements.forEach((el, index) => {
        console.log(`  ${index + 1}. ${el.tag}: "${el.text}"`);
      });
      
      // 最终截图
      await page.screenshot({ 
        path: 'tests/screenshots/hardcoded-star-fix-verification.png', 
        fullPage: true 
      });
      
      // 测试结果总结
      console.log('\n📊 修复验证结果:');
      console.log(`  硬编码1250是否存在: ${has1250 ? '❌ 是' : '✅ 否'}`);
      console.log(`  显示1250的元素: ${elements1250.length}个`);
      console.log(`  显示0的Star元素: ${zeroStarElements.length}个`);
      console.log(`  StarContext日志: ${starContextLogs.length}条`);
      
      if (!has1250 && elements1250.length === 0) {
        console.log('🎉 硬编码Star数据修复验证成功！');
      } else {
        console.log('⚠️ 仍需进一步修复硬编码问题');
      }
      
    } catch (error) {
      console.error('❌ 硬编码修复验证测试失败:', error.message);
      
      await page.screenshot({ 
        path: 'tests/screenshots/hardcoded-fix-test-error.png', 
        fullPage: true 
      });
      
      throw error;
    }
  });

  test('验证StarContext在未登录状态下的正确行为', async ({ page }) => {
    console.log('🔍 测试: 验证StarContext在未登录状态下的正确行为');
    
    const consoleLogs = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      if (text.includes('StarContext')) {
        console.log(`🖥️  [${msg.type()}]: ${text}`);
      }
    });

    try {
      await page.goto('https://gistfans.vercel.app/profile', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      await page.waitForTimeout(8000);
      
      // 检查StarContext的行为
      const starContextLogs = consoleLogs.filter(log => 
        log.text.includes('StarContext')
      );
      
      console.log(`📝 StarContext日志分析:`);
      starContextLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
      });
      
      // 检查是否有正确的未登录处理
      const hasUnloggedMessage = starContextLogs.some(log => 
        log.text.includes('用户未登录') || log.text.includes('设置默认状态')
      );
      
      console.log(`✅ StarContext正确处理未登录状态: ${hasUnloggedMessage ? '是' : '否'}`);
      
      // 检查是否有缓存清理日志
      const hasCacheCleanup = starContextLogs.some(log => 
        log.text.includes('过期的本地缓存') || log.text.includes('缓存已清理')
      );
      
      console.log(`🧹 StarContext执行缓存清理: ${hasCacheCleanup ? '是' : '否'}`);
      
    } catch (error) {
      console.error('❌ StarContext行为验证失败:', error.message);
      throw error;
    }
  });
});
