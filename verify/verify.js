const { authMiddleware } = require('../middleware/middleware');
const middleware = require('../middleware/middleware'); // 直接引入完整模块
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { log } = require('console');

// 获取客户端信息
function getClientInfo(req) {
  // 获取IP地址
  const ip = req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             req.connection.socket.remoteAddress || 
             '0.0.0.0';
  
  // 获取设备信息
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  
  // 简单解析浏览器和系统
  let equipment = 'Unknown / Unknown';
  if (userAgent) {
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|MSIE|Trident)\/?\s*(\d+)/i);
    const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)[^;)]*?(?=;|\))/i);
    
    const browserName = browser ? browser[1] : 'Unknown';
    const osName = os ? os[0] : 'Unknown';
    
    equipment = `${browserName} / ${osName}`;
  }
  
  return { ip, equipment };
}

// 记录登录信息到manage.json
function recordLoginInfo(user, req, loginType) {
  try {
    // 获取客户端信息
    const { ip, equipment } = getClientInfo(req);
    
    // 获取当前时间戳
    const loginTime = Date.now().toString();
    
    // 加载现有的管理数据
    let manageData = [];
    const manageFilePath = path.join(__dirname, '../user/manage.json');
    
    if (fs.existsSync(manageFilePath)) {
      try {
        manageData = JSON.parse(fs.readFileSync(manageFilePath, 'utf8'));
      } catch (error) {
        console.error('解析manage.json失败:', error);
      }
    }
    
    // 查找当前用户是否已存在记录
    const userIndex = manageData.findIndex(item => item.id === user.id);
    
    if (userIndex >= 0) {
      // 用户已存在，获取当前的登录列表
      let loginLists = manageData[userIndex]["Login-lists"];
      
      // 如果Login-lists不是数组，将其转换为数组并保留原有数据作为第一个元素
      if (!Array.isArray(loginLists)) {
        const oldLoginInfo = loginLists;
        loginLists = [oldLoginInfo];
        manageData[userIndex]["Login-lists"] = loginLists;
      }
      
      // 获取最大的table值
      let maxTable = 0;
      loginLists.forEach(item => {
        const tableValue = parseInt(item.table, 10);
        if (!isNaN(tableValue) && tableValue > maxTable) {
          maxTable = tableValue;
        }
      });
      
      // 创建新的登录记录，table值+1
      const loginRecord = {
        "table": (maxTable + 1).toString(),
        "manage": ip,
        "user": loginType,
        "equipment": equipment,
        "login-time": loginTime
      };
      
      // 添加到登录列表的开头（最新的记录在前）
      loginLists.unshift(loginRecord);
      
      // 限制登录历史记录数量，最多保留10条
      if (loginLists.length > 10) {
        loginLists = loginLists.slice(0, 10);
        manageData[userIndex]["Login-lists"] = loginLists;
      }
    } else {
      // 添加新用户记录
      manageData.push({
        "id": user.id,
        "username": user.username,
        "Login-lists": [{
          "table": "1",
          "manage": ip,
          "user": loginType,
          "equipment": equipment,
          "login-time": loginTime
        }]
      });
    }
    
    // 写入文件
    fs.writeFileSync(manageFilePath, JSON.stringify(manageData, null, 2), 'utf8');
    
  } catch (error) {
    console.error('记录登录信息失败:', error);
  }
}

// 加载用户数据
function loadUserData() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '../user/user.json'), 'utf8'));
    } catch (error) {
        console.error('加载用户数据失败:', error);
        return []; // 返回空数组作为默认值
    }
}

// 动态加载用户数据，确保每次都获取最新数据
function getUserData() {
    return loadUserData();
}

// 私钥文件 (PEM 格式)
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCyUOg1N5MXYVjiphx2j6TO0oxl3N3sYnChNYuJY4NJCJXsXPWj
P/M8G4TIoltfqZQ3xmMTG7slEPAaZbaCLsT2E46zBByjJbFPbG5ErlgOZU3iiCq8
D9JKFEh+7nFw3TLkTtGxvfUaiSUcA0e0GGS2G70HsdRbMk5pzkGfq3sIKQIDAQAB
AoGAU3bzehVtUEBMrqo6IHTUG8sJ1JQxfHgHaC38Bm8CAKl4I47Pm35PiA8JdDAq
vPhPXFwL++G7E3p+KJz7dKwXnJ8Gvs7wnKd14GvUOFt+/AXmY0nlG9l1dnEKuO5L
ARa2aC5ntUd9ZXxHXxiViG/sAwZUTk9uDTtg+KKGJUiw60ECQQDf5j182uXvYoLR
U/Y0baCoCQeHfdNrrJSSvM8OXvIt3gJUVCMXMcMSNboPPQ1AfYgXHC6Z9NtS2x3n
GDQ23cK9AkEAy+GgLOYcezgAO3XelcLXt5L1GrWbTx1Ux6tzC95s6WtB4C/hxvQa
dpgYnYMuudKovbLvbW0HsFTJOFJQMV3H3QJAMFd/0yNYHfWBFT0xnWRGGcHJVGHA
cjES6xPFCO9LDsgubJK1+N4PpjDfeUbPQ6tW5NZ64VbSu/L/Y9QAAhCjaQJADO6h
11c9RT+XHC5s0PkL79P9ghU05b7JiuTAJmeUZvXrtsmyu4juSMl6/jq88wJ+u5Gn
CDzbOP8XyF/IQGlfbQJBAIFlcoF71DHubqBsdN6aHH9Nho2RCFBFGi5hv66ZNBas
SbS5+WSRqlTLtPyRC2Td0RDa8cuFeJI3lWQXnWFh0UQ=
-----END RSA PRIVATE KEY-----`;

// 解密函数
function decryptData(encryptedData) {
  try {
    // Base64 解码
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // 使用私钥解密，采用 OAEP 填充
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    
    // 返回解密后的字符串
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}

function setupVerifyRoutes(router, wsService) {
  // 登录接口
  router.post('/login/pas', async (req, res) => {
    try {
      // 获取加密的用户名和密码
      const { y, k } = req.body;

      
      if (!y || !k) {
        return res.json({
          success: false,
          message: '缺少必要的登录参数'
        });
      }
      
      // 解密用户名/邮箱和密码
      const usernameOrEmail = decryptData(y);
      const password = decryptData(k);

      console.log(usernameOrEmail, password);
      
      if (!usernameOrEmail || !password) {
        return res.json({
          success: false,
          message: '用户名/邮箱或密码错误'
        });
      }
      
      // 实时加载最新的用户数据
      const usersData = getUserData();
      
      // 从用户数据中查找用户（支持用户名或邮箱登录）
      const user = usersData.find(u => 
        (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
        u.password === password
      );
      
      if (user) {
        // 创建JWT令牌
        const token = require('../middleware/middleware').createToken(user);
        
        // 设置认证cookie
        const authConfig = require('../config/auth');
        res.cookie('authToken', token, authConfig.COOKIE_OPTIONS);
        
        // 确保用户的文件目录存在
        const userFilePath = path.join(__dirname, '../file', user.id.toString());
        if (!fs.existsSync(userFilePath)) {
          fs.mkdirSync(userFilePath, { recursive: true });
        }
        
        // 记录登录信息
        recordLoginInfo(user, req, "normal");
        
        res.json({
          success: true,
          data: {
            redirectUrl: '/file'
          }
        });
      } else {
        res.json({
          success: false,
          message: '用户名/邮箱或密码错误'
        });
      }
    } catch (error) {
      console.error('登录处理错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后重试'
      });
    }
  });
  
  // 退出登录接口
  router.post('/logout', (req, res) => {
    req.sessionDestroy();
    res.json({
      success: true,
      message: '已成功退出登录'
    });
  });
  
  
  // 二维码生成接口
  router.get('/code/qrcode', (req, res) => {
    // 生成完全随机的二维码ID
    const qrCodeId = crypto.randomBytes(16).toString('hex');
    // 生成随机的web二维码ID
    const webqrCodeId = crypto.randomBytes(16).toString('hex');
    // 生成随机的32位URL参数值
    const urlParam = crypto.randomBytes(16).toString('hex');
    
    // 使用统一函数存储三个ID的映射关系
    wsService.storeQRCodeData(qrCodeId, webqrCodeId, urlParam);
    
    res.json({
      qrCodeUrl: `/qr-image/${qrCodeId}`,
      qrCodeId: qrCodeId,
      webqrCodeId: webqrCodeId,
      urlParam: urlParam,
      expireIn: 120 // 2分钟过期
    });
  });
  
  // 二维码图片生成接口
  router.get('/qr-image/:qrCodeId', async (req, res) => {
    try {
      const { qrCodeId } = req.params;
      
      // 获取当前主机和协议
      const protocol = req.protocol;
      const host = req.get('host');
      
      // 获取与qrCodeId关联的urlParam
      const urlParam = wsService.getURLParamByQRCodeId(qrCodeId);
      
      if (!urlParam) {
        return res.status(400).send('无效的二维码ID');
      }
      
      // 创建完整的 URL（http 或 https）- 使用a参数而不是qrCodeId
      const webUrl = `${protocol}://${host}/mobile/scan?a=${urlParam}`;
      
      // 生成二维码图片 - 使用完整 URL
      const qrBuffer = await QRCode.toBuffer(webUrl);
      
      // 设置响应头部
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // 发送图片
      res.send(qrBuffer);
    } catch (error) {
      console.error('生成二维码图片错误:', error);
      res.status(500).send('生成二维码图片失败');
    }
  });


// APP登录接口
  router.post('/login/app/pas',async (req, res) => {
    try {
      // 获取加密的用户名和密码
      const { y, k } = req.body;
      
      if (!y || !k) {
        return res.json({
          success: false,
          message: '缺少必要的登录参数'
        });
      }
      
      // 解密用户名/邮箱和密码
      const usernameOrEmail = decryptData(y);
      const password = decryptData(k);
      
      if (!usernameOrEmail || !password) {
        return res.json({
          success: false,
          message: '用户名/邮箱或密码错误'
        });
      }
      
      // 实时加载最新的用户数据
      const usersData = getUserData();
      
      // 从用户数据中查找用户（支持用户名或邮箱登录）
      const user = usersData.find(u => 
        (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
        u.password === password
      );
      
      if (user) {
        // 创建JWT令牌 - 设置120天有效期
        const authConfig = require('../config/auth');
        const token = require('../middleware/middleware').createToken(user, { expiresIn: '120d' });
        
        // 设置认证cookie - 有效期120天
        const cookieOptions = {
          ...authConfig.COOKIE_OPTIONS,
          maxAge: 120 * 24 * 60 * 60 * 1000 // 120天（毫秒）
        };
        res.cookie('authToken', token, cookieOptions);
        
        // 确保用户的文件目录存在
        const userFilePath = path.join(__dirname, '../file', user.id.toString());
        if (!fs.existsSync(userFilePath)) {
          fs.mkdirSync(userFilePath, { recursive: true });
        }
        
        // 记录登录信息
        recordLoginInfo(user, req, "normal");
        
        // 返回认证信息
        res.json({
          success: true,
          data: {
            authToken: token,
            expiresIn: 120 * 24 * 60 * 60, // 秒
          }
        });
      } else {
        res.json({
          success: false,
          message: '用户名/邮箱或密码错误'
        });
      }
    } catch (error) {
      console.error('登录处理错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后重试'
      });
    }
  });
    
  


  // 移动端扫码接口
  router.get('/mobile/scan', (req, res) => {
    const { a } = req.query;
    
    if (!a) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的参数'
      });
    }
    
    // 从URL参数获取qrCodeId
    const qrCodeId = wsService.getQRCodeIdByURLParam(a);
    
    if (!qrCodeId || !wsService.isQRCodeValid(qrCodeId)) {
      return res.status(400).json({
        success: false,
        message: '二维码已过期或无效'
      });
    }
    
    // 确保session对象存在
    if (!req.session) {
      req.session = {};
    }
    
    // 将urlParam存储在会话中，同时也在cookie中存储一份(不使用httpOnly，便于客户端读取)
    req.session.scanUrlParam = a;
    res.cookie('scanUrlParam', a, { 
      httpOnly: false,
      maxAge: 120 * 1000, // 2分钟过期
      sameSite: 'lax'
    });
    
    // 发送扫描通知
    wsService.sendScanNotification(qrCodeId);
    
    // 重定向到静态HTML页面
    res.sendFile(path.join(__dirname, '../public/app/scan.html'));
  });
  
  // 移动端确认登录接口
  router.post('/mobile/confirm', (req, res) => {
    // 从多个可能的来源获取urlParam
    let urlParam;
    // 1. 优先从请求体中获取
    if (req.body && req.body.urlParam) {
      urlParam = req.body.urlParam;
    }
    // 2. 其次从查询参数中获取
    else if (req.query && req.query.a) {
      urlParam = req.query.a;
    } 
    // 3. 再次从cookie中获取
    else if (req.cookies && req.cookies.scanUrlParam) {
      urlParam = req.cookies.scanUrlParam;
    }
    // 4. 最后从会话中获取
    else if (req.session && req.session.scanUrlParam) {
      urlParam = req.session.scanUrlParam;
    }
    
    if (!urlParam) {
      return res.status(400).json({
        success: false,
        message: '登录会话已过期，请重新扫码'
      });
    }
    
    // 从URL参数获取qrCodeId
    const qrCodeId = wsService.getQRCodeIdByURLParam(urlParam);
    
    if (!qrCodeId || !wsService.isQRCodeValid(qrCodeId)) {
      return res.status(400).json({
        success: false,
        message: '二维码已过期或无效'
      });
    }

    // 处理action
    const { action } = req.body;

    // 处理拒绝登录
    if (action === "reject") {
      // 发送拒绝通知
      wsService.sendRejectionNotification(qrCodeId);
      
      return res.status(200).json({
        success: true,
        message: '已经拒绝登录'
      });
    }
    
    // 处理确认登录
    if (action === "confirm") {
      // 检查请求头中是否有用户token
      const authHeader = req.headers.authorization;
      let user = null;
      let tokenValid = false;
      let tokenError = null;


      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          // 验证token，使用在文件顶部导入的模块
          const decoded = middleware.verifyToken(token);
          
          if (decoded && decoded.id) {
            // 从token中获取用户信息
            const usersData = getUserData();
            user = usersData.find(u => u.id === decoded.id);
            
            if (user) {
              tokenValid = true;
            } else {
            }
          } else {
          }
        } catch (error) {
          tokenError = error.message;
          console.error('令牌验证失败:', error);
        }
      } else {
      }

      // 如果没有有效的用户信息，返回登录失败
      if (!tokenValid || !user) {
        return res.status(400).json({
          success: false,
          message: '登录失败',
          reason: tokenError || '无效的令牌或用户不存在'
        });
      }
      
      // 创建新的JWT令牌用于Web端登录
      const token = middleware.createToken(user);
      
      // 设置认证cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1天过期
        sameSite: 'strict'
      });
      
      // 创建用户会话信息
      const userInfo = {
        id: user.id,
        username: user.username,
        redirectUrl: '/file',
        // 添加authToken给前端存储和使用
        authToken: token
      };
      
      // 发送确认通知
      const notified = wsService.sendConfirmationNotification(qrCodeId, userInfo);
      
      // 记录登录信息
      recordLoginInfo(user, req, "code");
      
      return res.status(200).json({
        success: true,
        message: '登录成功'
      });
    }

    // 未知action
    return res.status(400).json({
      success: false,
      message: '无效的请求'
    });
  });
}

module.exports = setupVerifyRoutes;
