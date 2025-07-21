const express = require('express');
const cors = require('cors');
const { initializeConfig, getServerConfig, getCorsConfig } = require('./config/serverConfig');

// 🔧 Phase 1B: 使用統一配置系統初始化
const config = initializeConfig();
const serverConfig = getServerConfig();
const corsConfig = getCorsConfig();

const app = express();

// 🔧 Phase 1B: 使用統一配置系統替代硬編碼配置
app.use(cors(corsConfig));
app.use(express.json({ limit: serverConfig.request.bodyLimit }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: serverConfig.server.nodeEnv,
    service: 'gemini'
  });
});
// Routes
const aiRouter = require('./routes/ai_router');
app.use('/api', aiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: serverConfig.server.isDevelopment ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(serverConfig.server.port, serverConfig.server.host, () => {
  console.log(`✅ FocusFlow Backend running on http://${serverConfig.server.host}:${serverConfig.server.port}`);
  console.log(`📊 Environment: ${serverConfig.server.nodeEnv}`);
  console.log(`🔗 CORS enabled for:`, corsConfig.origin);
  
  // 🔧 Phase 1B: AI 配置檢查使用統一配置
  const aiConfig = config.ai;
  if (!aiConfig.gemini.apiKey || aiConfig.gemini.apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️  Warning: GEMINI_API_KEY not properly configured in .env file');
    console.warn('    Please add your Google Gemini API key to the .env file');
  } else {
    console.log('🤖 Gemini API key configured');
    console.log(`🎯 AI Model: ${aiConfig.gemini.model}`);
    console.log(`⚡ Max Tokens: ${aiConfig.gemini.maxTokens}`);
  }
}); 