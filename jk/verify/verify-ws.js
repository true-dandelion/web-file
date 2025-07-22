const WebSocket = require('ws');

// 存储 webqrCodeId 和 WebSocket 连接的映射
const activeConnections = new Map();
// 存储 qrCode相关的所有映射数据
const qrCodeDataMap = new Map();

// 创建WebSocket服务器(但不绑定upgrade事件)
function createWebSocketServer() {
  const wss = new WebSocket.Server({ noServer: true });

  // 处理连接
  wss.on('connection', (ws, request, webqrCodeId) => {
    activeConnections.set(webqrCodeId, ws);
    
    ws.on('close', () => {
      activeConnections.delete(webqrCodeId);
    });
  });

  return wss;
}

// 创建验证服务对象
function createVerifyService(wss) {
  return {
    // 存储 qrCodeId、webqrCodeId和urlParam的映射数据
    storeQRCodeData(qrCodeId, webqrCodeId, urlParam) {
      // 将三个数据作为一个对象存储
      const qrCodeData = {
        qrCodeId,
        webqrCodeId,
        urlParam
      };
      
      // 以三个ID为键，存储相同的数据对象，方便从任意ID查找
      qrCodeDataMap.set(qrCodeId, qrCodeData);
      qrCodeDataMap.set(webqrCodeId, qrCodeData);
      qrCodeDataMap.set(urlParam, qrCodeData);
      
      // 设置过期自动清理
      setTimeout(() => {
        qrCodeDataMap.delete(qrCodeId);
        qrCodeDataMap.delete(webqrCodeId);
        qrCodeDataMap.delete(urlParam);
      }, 120 * 1000); // 2分钟过期
    },
    
    // 通过 qrCodeId 获取 urlParam
    getURLParamByQRCodeId(qrCodeId) {
      const data = qrCodeDataMap.get(qrCodeId);
      return data ? data.urlParam : undefined;
    },
    
    // 通过 urlParam 获取 qrCodeId
    getQRCodeIdByURLParam(urlParam) {
      const data = qrCodeDataMap.get(urlParam);
      return data ? data.qrCodeId : undefined;
    },
    
    // 通过 qrCodeId 获取 webqrCodeId
    getWebQRCodeIdByQRCodeId(qrCodeId) {
      const data = qrCodeDataMap.get(qrCodeId);
      return data ? data.webqrCodeId : undefined;
    },
    
    // 检查webqrCodeId是否有效
    isWebQRCodeValid(webqrCodeId) {
      return qrCodeDataMap.has(webqrCodeId);
    },
    
    // 检查qrCodeId是否有效
    isQRCodeValid(qrCodeId) {
      return qrCodeDataMap.has(qrCodeId);
    },
    
    // 发送二维码被扫描的消息
    sendScanNotification(qrCodeId) {
      const data = qrCodeDataMap.get(qrCodeId);
      
      if (!data) {
        return false;
      }
      
      const ws = activeConnections.get(data.webqrCodeId);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'QR_STATUS_UPDATE',
          status: 'SCANNED'
        }));
        return true;
      }
      
      return false;
    },
    
    // 发送拒绝登录通知
    sendRejectionNotification(qrCodeId) {
      const data = qrCodeDataMap.get(qrCodeId);
      
      if (!data) {
        return false;
      }
      
      const ws = activeConnections.get(data.webqrCodeId);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'QR_STATUS_UPDATE',
          status: 'REJECTED'
        }));
        return true;
      }
      
      return false;
    },
    
    // 发送登录确认消息
    sendConfirmationNotification(qrCodeId, userInfo) {
      const data = qrCodeDataMap.get(qrCodeId);
      
      if (!data) {
        return false;
      }
      
      const ws = activeConnections.get(data.webqrCodeId);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        // 发送状态更新和用户信息（包括authToken）
        ws.send(JSON.stringify({
          type: 'QR_STATUS_UPDATE',
          status: 'CONFIRMED',
          userInfo: {
            id: userInfo.id,
            username: userInfo.username,
            redirectUrl: userInfo.redirectUrl,
            authToken: userInfo.authToken // 确保传递authToken给web前端
          }
        }));
        return true;
      }
      
      return false;
    },
    
    // 检查二维码登录状态 - 用于前端轮询
    checkQRLoginStatus(webqrCodeId) {
      // 检查webqrCodeId是否存在
      const data = qrCodeDataMap.get(webqrCodeId);
      if (!data) {
        return { 
          valid: false,
          message: '二维码已过期或无效'
        };
      }
      
      // 二维码有效，继续等待扫描
      return {
        valid: true,
        message: '二维码有效，等待扫描'
      };
    }
  };
}

// 兼容旧版接口
function setupWebSocketVerify(server) {
  const wss = createWebSocketServer();
  const service = createVerifyService(wss);
  
  // 手动处理upgrade事件
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;
    
    if (pathname.startsWith('/ws/')) { 
      const webqrCodeId = pathname.slice('/ws/'.length);
      
      if (service.isWebQRCodeValid(webqrCodeId)) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, webqrCodeId);
        });
      } else {
        socket.destroy();
      }
    }
  });
  
  return service;
}

module.exports = {
  createWebSocketServer,
  createVerifyService,
  setupWebSocketVerify // 兼容旧版
};
