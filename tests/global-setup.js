/**
 * Playwright全局设置
 * 在所有测试开始前执行
 */

const { chromium } = require('@playwright/test');

async function globalSetup() {
  console.log('🚀 开始全局测试设置...');
  
  // 创建浏览器实例进行预检查
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🔍 检查GistFans网站可用性...');
    
    // 检查网站是否可访问
    const response = await page.goto('https://gistfans.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (response.status() !== 200) {
      throw new Error(`网站返回状态码: ${response.status()}`);
    }
    
    console.log('✅ 网站可访问性检查通过');
    
    // 检查关键API端点
    console.log('🔍 检查关键API端点...');
    
    const healthResponse = await page.request.get('https://gistfans.vercel.app/api/system-health');
    if (healthResponse.status() === 200) {
      const healthData = await healthResponse.json();
      console.log(`📊 系统健康状态: ${healthData.overallStatus}`);
    }
    
    console.log('✅ API端点检查完成');
    
  } catch (error) {
    console.error('❌ 全局设置检查失败:', error.message);
    console.warn('⚠️ 测试可能会失败，请检查网站状态');
  } finally {
    await browser.close();
  }
  
  console.log('🎯 全局测试设置完成\n');
}

module.exports = globalSetup;
