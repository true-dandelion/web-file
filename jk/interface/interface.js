const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authMiddleware } = require('../middleware/middleware');

// 修改基础文件存储路径
const BASE_FILE_PATH = path.join(__dirname, '../../file');  

// 获取用户特定的文件路径
function getUserFilePath(userId) {
  return path.join(BASE_FILE_PATH, userId.toString());
}

// 处理文件获取请求
router.post('/file-acquisition', authMiddleware, (req, res) => {
    try {
        const requestPath = req.body.path || '/';
        const userId = req.user.id.toString();
        
        // 拼接实际文件系统路径，确保用户只能访问自己的文件
        const userBasePath = path.join(BASE_FILE_PATH, userId);
        
        // 创建用户目录（如果不存在）
        if (!fs.existsSync(userBasePath)) {
            fs.mkdirSync(userBasePath, { recursive: true });
        }
        
        // 构建完整路径，去除开头的斜杠以避免路径问题
        const relativePath = requestPath.replace(/^\//, '');
        const fullPath = path.join(userBasePath, relativePath);
        
        // 检查路径是否合法（不允许访问其他用户的文件）
        if (!fullPath.startsWith(userBasePath)) {
            return res.status(403).json({ error: '访问被拒绝' });
        }
        
        // 检查路径是否存在
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: '路径不存在' });
        }
        
        const result = {
            folders: [],
            files: []
        };
        
        // 读取目录内容
        const items = fs.readdirSync(fullPath);
        
        // 处理文件和文件夹
        for (const item of items) {
            const itemPath = path.join(fullPath, item);
            const stats = fs.statSync(itemPath);
            
            // 获取相对路径（不包含用户ID）
            let displayPath = path.relative(userBasePath, itemPath);
            
            // 确保使用正斜杠而不是反斜杠
            displayPath = '/' + displayPath.replace(/\\/g, '/');
            
            if (stats.isDirectory()) {
                result.folders.push({
                    name: item,
                    path: displayPath,
                    modified: stats.mtime  // 改用 modified 而不是 lastModified
                });
            } else {
                result.files.push({
                    name: item,
                    path: displayPath,
                    size: stats.size,
                    modified: stats.mtime  // 改用 modified 而不是 lastModified
                });
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('文件获取失败:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 简单导出路由器
module.exports = router;
