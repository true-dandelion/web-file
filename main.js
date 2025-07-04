const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const https = require('https');
const http = require('http');
const app = express();

// 导入配置
let config = require('./config/process.json');
let PORT = config.port || 1111;
let HTTPS_PORT = config.https?.port || 1112;
let HTTPS_ENABLED = config.https?.enabled || false;

// 设置中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 导入自定义中间件
const { sessionMiddleware } = require('./middleware/middleware');
app.use(sessionMiddleware);

// 导入模块
const frontModule = require('./front/front');
const interfaceModule = require('./interface/interface');
const websocketModule = require('./interface/interface-ws');
const download = require('./interface/interface-download');
const createDeleteModule = require('./interface/interface-create-delete');
const setupVerifyRoutes = require('./verify/verify');
const setupWebSocketVerify = require('./verify/verify-ws');
const share = require('./share/share');
const shareModule = require('./share/share-json');
const setup = require('./set-up/ser-up');
const account =require('./set-up/account-manage')
const head = require('./set-up/head')

// 应用模块路由
app.use('/', frontModule);
app.use('/', interfaceModule);
app.use('/', websocketModule.router);
app.use('/download', download);
app.use('/', createDeleteModule);
app.use('/share', share);
app.use('/share-json', shareModule);
app.use('/set', setup);
app.use('/account', account)
app.use('/head', head)
let server;

// 设置HTTPS服务器
if (HTTPS_ENABLED) {
  // 读取证书配置
  const certFile = config.https.cert || 'mc.wmcbbs.com.pem';
  const keyFile = config.https.key || 'mc.wmcbbs.com.key';
  
  // 创建证书选项
  try {
    const httpsOptions = {
      cert: fs.readFileSync(path.join(__dirname, 'certificate', certFile)),
      key: fs.readFileSync(path.join(__dirname, 'certificate', keyFile))
    };
    
    // 创建HTTPS服务器
    const httpsServer = https.createServer(httpsOptions, app);
    
    // 启动HTTPS服务器
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`HTTPS服务运行中，端口为：${HTTPS_PORT}`);
    });
    
    // 配置HTTP服务器以重定向到HTTPS
    const httpApp = express();
    httpApp.use((req, res) => {
      // 获取主机名，排除端口
      const host = req.headers.host.split(':')[0];
      // 重定向到HTTPS版本
      res.redirect(301, `https://${host}:${HTTPS_PORT}${req.url}`);
    });
    
    // 启动HTTP服务器（只用于重定向）
    server = http.createServer(httpApp).listen(PORT, () => {
      console.log(`HTTP服务运行中，端口为：${PORT}（重定向到HTTPS）`);
    });
    
    // 设置HTTPS服务器处理WebSocket升级
    httpsServer.on('upgrade', handleUpgrade);
    
  } catch (error) {
    console.error('启动HTTPS服务器失败:', error);
    console.log('回退到HTTP模式...');
    
    // 启动普通HTTP服务器
    server = app.listen(PORT, () => {
      console.log(`服务运行中 端口为：${PORT}`);
    });
    
    // 设置HTTP服务器处理WebSocket升级
    server.on('upgrade', handleUpgrade);
  }
} else {
  // 只启动HTTP服务器
  server = app.listen(PORT, () => {
    console.log(`服务运行中 端口为：${PORT}`);
  });
  
  // 设置HTTP服务器处理WebSocket升级
  server.on('upgrade', handleUpgrade);
}

// 创建(但不绑定)文件上传WebSocket服务
const fileWss = new websocketModule.createWebSocketServer();

// 创建(但不绑定)二维码验证WebSocket服务
const verifyWss = new setupWebSocketVerify.createWebSocketServer();

// 设置二维码验证服务对象
const wsVerify = setupWebSocketVerify.createVerifyService(verifyWss);

const verifyRouter = express.Router();
setupVerifyRoutes(verifyRouter, wsVerify);
app.use('/', verifyRouter);

// 集中处理所有WebSocket升级请求
function handleUpgrade(request, socket, head) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;
  
  // 处理二维码验证WebSocket请求 (/ws/)
  if (pathname.startsWith('/ws/')) {
    const webqrCodeId = pathname.slice('/ws/'.length);
    
    // 检查二维码ID是否有效
    if (wsVerify.isWebQRCodeValid(webqrCodeId)) {
      verifyWss.handleUpgrade(request, socket, head, (ws) => {
        verifyWss.emit('connection', ws, request, webqrCodeId);
      });
    } else {
      socket.destroy();
    }
  }
  // 处理文件上传WebSocket请求 (/file/file-upload)
  else if (pathname === '/file/file-upload') {
    // 获取authToken
    const cookies = parseCookies(request.headers.cookie || '');
    const authToken = cookies['authToken'];
    
    if (!authToken) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    
    try {
      // 验证JWT令牌，使用统一配置的密钥
      const jwt = require('jsonwebtoken');
      const authConfig = require('./config/auth');
      const decoded = jwt.verify(authToken, authConfig.JWT_SECRET);
      
      // 将用户信息附加到请求对象
      request.user = decoded;
      
      // 保留原始URL，其中包含设备ID
      request.url = url.toString();
      
      // 允许WebSocket升级
      fileWss.handleUpgrade(request, socket, head, (ws) => {
        fileWss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('WebSocket认证失败:', error);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }
  // 未处理的请求
  else {
    socket.destroy();
  }
}

// 解析请求中的cookie
function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    
    return cookieHeader.split(';')
        .map(cookie => cookie.trim())
        .reduce((cookies, cookie) => {
            const [name, value] = cookie.split('=');
            cookies[name] = decodeURIComponent(value);
            return cookies;
        }, {});
}

// 导出服务器实例
module.exports = { server };
