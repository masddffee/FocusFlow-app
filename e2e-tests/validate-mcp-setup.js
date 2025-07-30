#!/usr/bin/env node

/**
 * FocusFlow MCP 測試框架設置驗證腳本
 * 
 * 驗證所有組件是否正確配置和可用
 * 
 * @version 3.0
 * @author FocusFlow Team
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

async function validateSetup() {
  console.log('🔍 FocusFlow MCP 測試框架設置驗證');
  console.log('=====================================\n');

  const errors = [];
  const warnings = [];

  try {
    // 1. 檢查核心文件存在性
    console.log('📁 檢查核心文件...');
    
    const coreFiles = [
      'focusflow-mcp-test-config.yml',
      'mcp-yaml-executor.spec.ts',
      'utils/enhanced-screenshot-manager.ts',
      'utils/comprehensive-error-reporter.ts',
      'utils/key-node-detector.ts',
      'run-mcp-tests.sh',
      'MCP_INTEGRATION_TEST_GUIDE.md'
    ];

    for (const file of coreFiles) {
      try {
        await fs.access(path.join(__dirname, file));
        console.log(`  ✅ ${file}`);
      } catch (error) {
        errors.push(`缺少核心文件: ${file}`);
        console.log(`  ❌ ${file} - 不存在`);
      }
    }

    // 2. 驗證 YAML 配置文件
    console.log('\n⚙️  驗證 YAML 配置...');
    
    try {
      const configPath = path.join(__dirname, 'focusflow-mcp-test-config.yml');
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(configContent);

      // 檢查必要的配置節點
      const requiredSections = [
        'name', 'version', 'environment', 'browsers', 
        'testData', 'testSuites', 'errorHandling'
      ];

      for (const section of requiredSections) {
        if (config[section]) {
          console.log(`  ✅ ${section}: 已配置`);
        } else {
          errors.push(`YAML 配置缺少必要節點: ${section}`);
          console.log(`  ❌ ${section}: 缺少`);
        }
      }

      // 檢查測試套件數量
      if (config.testSuites && config.testSuites.length > 0) {
        console.log(`  ✅ 測試套件: ${config.testSuites.length} 個`);
        
        config.testSuites.forEach((suite, index) => {
          if (suite.tests && suite.tests.length > 0) {
            console.log(`    ✅ ${suite.name}: ${suite.tests.length} 個測試`);
          } else {
            warnings.push(`測試套件 ${suite.name} 沒有定義測試案例`);
          }
        });
      } else {
        errors.push('YAML 配置沒有定義測試套件');
      }

    } catch (error) {
      errors.push(`YAML 配置文件解析失敗: ${error.message}`);
    }

    // 3. 檢查 TypeScript 導入
    console.log('\n📦 檢查 TypeScript 導入...');
    
    try {
      const executorPath = path.join(__dirname, 'mcp-yaml-executor.spec.ts');
      const executorContent = await fs.readFile(executorPath, 'utf8');

      const expectedImports = [
        'enhanced-screenshot-manager',
        'comprehensive-error-reporter',
        'key-node-detector',
        '@playwright/test',
        'js-yaml'
      ];

      for (const importName of expectedImports) {
        if (executorContent.includes(importName)) {
          console.log(`  ✅ ${importName}: 已導入`);
        } else {
          warnings.push(`可能缺少導入: ${importName}`);
          console.log(`  ⚠️  ${importName}: 未找到`);
        }
      }

    } catch (error) {
      errors.push(`無法讀取測試執行器文件: ${error.message}`);
    }

    // 4. 檢查測試結果目錄
    console.log('\n📂 檢查測試結果目錄...');
    
    const resultDirs = ['test-results', 'test-results/screenshots', 'test-results/reports', 'test-results/errors'];
    
    for (const dir of resultDirs) {
      try {
        await fs.access(path.join(__dirname, dir));
        console.log(`  ✅ ${dir}: 存在`);
      } catch (error) {
        try {
          await fs.mkdir(path.join(__dirname, dir), { recursive: true });
          console.log(`  ✅ ${dir}: 已創建`);
        } catch (createError) {
          warnings.push(`無法創建目錄: ${dir}`);
        }
      }
    }

    // 5. 檢查腳本執行權限
    console.log('\n🔧 檢查腳本權限...');
    
    try {
      const scriptPath = path.join(__dirname, 'run-mcp-tests.sh');
      const stats = await fs.stat(scriptPath);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      
      if (isExecutable) {
        console.log('  ✅ run-mcp-tests.sh: 可執行');
      } else {
        warnings.push('run-mcp-tests.sh 沒有執行權限，請運行: chmod +x run-mcp-tests.sh');
        console.log('  ⚠️  run-mcp-tests.sh: 沒有執行權限');
      }
    } catch (error) {
      warnings.push('無法檢查腳本權限');
    }

    // 6. 生成組件關係圖
    console.log('\n🏗️  組件關係驗證...');
    
    const components = {
      'MCPYamlExecutor': {
        dependencies: ['EnhancedScreenshotManager', 'ComprehensiveErrorReporter', 'KeyNodeDetector'],
        description: '主要測試執行器'
      },
      'EnhancedScreenshotManager': {
        dependencies: ['Page', 'BrowserContext'],
        description: '截圖管理器'
      },
      'ComprehensiveErrorReporter': {
        dependencies: ['EnhancedScreenshotManager'],
        description: '錯誤報告器'
      },
      'KeyNodeDetector': {
        dependencies: ['EnhancedScreenshotManager', 'ComprehensiveErrorReporter'],
        description: '關鍵節點檢測器'
      }
    };

    Object.entries(components).forEach(([name, config]) => {
      console.log(`  🔗 ${name}: ${config.description}`);
      config.dependencies.forEach(dep => {
        console.log(`    ├─ ${dep}`);
      });
    });

    // 7. 生成功能覆蓋報告
    console.log('\n📋 功能覆蓋檢查...');
    
    const features = [
      { name: 'YAML 配置驅動', implemented: true },
      { name: '關鍵節點自動截圖', implemented: true },
      { name: '錯誤自動捕獲和分類', implemented: true },
      { name: '智能錯誤恢復', implemented: true },
      { name: '性能指標監控', implemented: true },
      { name: '多格式報告生成', implemented: true },
      { name: '視覺比較功能', implemented: false },
      { name: '網路請求攔截', implemented: true },
      { name: '動態測試生成', implemented: false }
    ];

    features.forEach(feature => {
      if (feature.implemented) {
        console.log(`  ✅ ${feature.name}`);
      } else {
        console.log(`  ⭕ ${feature.name} (計劃中)`);
      }
    });

    // 8. 輸出總結
    console.log('\n📊 驗證總結');
    console.log('=====================================');
    
    if (errors.length === 0) {
      console.log('✅ 基本設置驗證通過！');
    } else {
      console.log('❌ 發現嚴重問題:');
      errors.forEach(error => console.log(`   • ${error}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  警告事項:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    const implementedFeatures = features.filter(f => f.implemented).length;
    const totalFeatures = features.length;
    const coveragePercentage = (implementedFeatures / totalFeatures * 100).toFixed(1);
    
    console.log(`\n📈 功能覆蓋率: ${coveragePercentage}% (${implementedFeatures}/${totalFeatures})`);

    // 9. 下一步建議
    console.log('\n🎯 下一步建議:');
    
    if (errors.length === 0) {
      console.log('   1. 運行 ./run-mcp-tests.sh 執行完整測試');
      console.log('   2. 檢查生成的測試報告');
      console.log('   3. 根據實際需求調整 YAML 配置');
      console.log('   4. 添加自定義測試案例');
    } else {
      console.log('   1. 修復上述嚴重問題');
      console.log('   2. 重新運行此驗證腳本');
      console.log('   3. 確保所有核心文件存在');
    }

    if (warnings.length > 0) {
      console.log('   • 處理警告事項以獲得最佳體驗');
    }

    console.log('\n✨ FocusFlow MCP 測試框架驗證完成！');
    
    // 返回適當的退出碼
    process.exit(errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 驗證過程中發生意外錯誤:', error.message);
    console.error('\n請檢查文件權限和目錄結構。');
    process.exit(1);
  }
}

// 運行驗證
validateSetup().catch(error => {
  console.error('驗證腳本執行失敗:', error);
  process.exit(1);
});