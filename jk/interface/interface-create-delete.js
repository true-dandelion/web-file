const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authMiddleware } = require('../middleware/middleware');

// 定义根目录
const ROOT_DIR = path.join(__dirname, '../../file');

// 确保目录存在
function ensureDirectoryExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

// 创建文件夹接口
router.post('/create-folder', authMiddleware, async (req, res) => {
    try {
        const { path: folderPath, folderName } = req.body;
        const userId = req.user.id.toString();
        
        // 验证输入
        if (!folderPath || !folderName) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的参数'
            });
        }
        
        // 清理和验证文件夹名称
        const sanitizedFolderName = folderName.replace(/[\/\\:*?"<>|]/g, '_').trim();
        if (!sanitizedFolderName) {
            return res.status(400).json({
                success: false,
                message: '文件夹名称无效'
            });
        }
        
        // 构建完整路径，确保在用户目录下
        const userDir = path.join(ROOT_DIR, userId);
        
        // 确保用户目录存在
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        
        // 处理用户路径，如果以/开头，去掉/
        const userRelativePath = folderPath.replace(/^\//, '');
        const parentPath = path.join(userDir, userRelativePath);
        const newFolderPath = path.join(parentPath, sanitizedFolderName);
        
        // 检查父目录是否存在
        if (!fs.existsSync(parentPath)) {
            return res.status(404).json({
                success: false,
                message: '父目录不存在'
            });
        }
        
        // 检查文件夹是否已存在
        if (fs.existsSync(newFolderPath)) {
            return res.status(409).json({
                success: false,
                message: '文件夹已存在'
            });
        }
        
        // 创建文件夹
        fs.mkdirSync(newFolderPath);
        
        // 返回路径时不包含用户ID
        return res.status(201).json({
            success: true,
            message: '文件夹创建成功',
            path: path.join(folderPath, sanitizedFolderName)
        });
    } catch (error) {
        console.error('创建文件夹出错:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误，创建文件夹失败'
        });
    }
});

// 删除文件或文件夹接口
router.post('/delete-item', authMiddleware, async (req, res) => {
    try {
        const { path: itemPath, type } = req.body;
        const userId = req.user.id.toString();
        
        // 验证输入
        if (!itemPath) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的参数'
            });
        }
        
        // 清理路径，去掉开头的斜杠
        const cleanPath = itemPath.replace(/^\//, '');
        
        // 构建完整路径，包含用户ID
        const userDir = path.join(ROOT_DIR, userId);
        const fullPath = path.join(userDir, cleanPath);
        
        // 检查项目是否存在
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: '文件或文件夹不存在'
            });
        }
        
        // 检查类型
        const stats = fs.statSync(fullPath);
        const isDirectory = stats.isDirectory();
        
        // 类型检查（如果提供了类型）
        if (type && ((type === 'folder' && !isDirectory) || (type === 'file' && isDirectory))) {
            return res.status(400).json({
                success: false,
                message: `指定的路径不是${type === 'folder' ? '文件夹' : '文件'}`
            });
        }
        
        // 删除操作
        if (isDirectory) {
            // 递归删除文件夹
            fs.rmdirSync(fullPath, { recursive: true });
        } else {
            // 删除文件
            fs.unlinkSync(fullPath);
        }
        
        return res.status(200).json({
            success: true,
            message: `${isDirectory ? '文件夹' : '文件'}删除成功`
        });
    } catch (error) {
        console.error('删除项目出错:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误，删除失败'
        });
    }
});

// 确保根目录存在
ensureDirectoryExists(ROOT_DIR);

module.exports = router;
