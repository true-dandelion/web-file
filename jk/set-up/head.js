const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { authMiddleware } = require('../middleware/middleware')

router.get('/user', authMiddleware, (req, res) => {
  res.json({
    success: true,
    username: req.user.username
  });
});


router.post('/information', authMiddleware, (req, res) => {
  try {
    // 读取用户数据文件
    const userDataPath = path.join(__dirname, '../../user/user.json');
    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    
    // 查找当前登录用户
    const currentUser = userData.find(user => user.username === req.user.username);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: '用户信息不存在'
      });
    }
    
    // 构建返回数据
    const responseData = {
      success: true,
      username: currentUser.username
    };
    
    // 如果有email则添加到返回数据中
    if (currentUser.email) {
      responseData.email = currentUser.email;
    }
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
})



// 导出路由
module.exports = router