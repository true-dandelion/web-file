const jwt = require('jsonwebtoken');
const config = require('../../config/process.json');
const authConfig = require('../../config/auth');

// 会话中间件
function sessionMiddleware(req, res, next) {
  // 从cookie中获取token
  const token = req.cookies.authToken;
  
  if (token) {
    try {
      // 验证JWT令牌，使用统一配置的密钥
      const decoded = jwt.verify(token, authConfig.JWT_SECRET);
      req.user = decoded;
      
      // 兼容原有代码的session结构
      req.session = { user: decoded };
    } catch (error) {

      res.clearCookie('authToken');
    }
  }
  
  // 会话清理函数
  req.sessionDestroy = () => {
    res.clearCookie('authToken');
  };
  
  next();
}

// 身份验证中间件
function authMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '未登录'
    });
  }
  next();
}

// 验证JWT令牌
function verifyToken(token) {
  // 验证并返回解码后的令牌数据
  return jwt.verify(token, authConfig.JWT_SECRET);
}

module.exports = {
  sessionMiddleware,
  authMiddleware,
  verifyToken,
  // 提供创建token的辅助函数
  createToken: (user, options = {}) => {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        permissions: user.permissions
      },
      authConfig.JWT_SECRET,
      { expiresIn: authConfig.JWT_EXPIRES_IN, ...options }
    );
  }
};
