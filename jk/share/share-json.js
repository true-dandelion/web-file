const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/middleware');

// 数据存储路径
const SHARE_DATA_FILE = path.join(__dirname, '../../config/share-data.json');

// 文件存储根目录
const ROOT_DIR = path.join(__dirname, '../../file');

// 确保数据文件存在
function ensureDataFileExists() {
    if (!fs.existsSync(SHARE_DATA_FILE)) {
        fs.writeFileSync(SHARE_DATA_FILE, JSON.stringify({
            shares: {}
        }, null, 2));
    }
}

// 加载分享数据
function loadShareData() {
    ensureDataFileExists();
    try {
        const data = fs.readFileSync(SHARE_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('加载分享数据失败:', error);
        return { shares: {} };
    }
}

// 保存分享数据
function saveShareData(data) {
    try {
        fs.writeFileSync(SHARE_DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('保存分享数据失败:', error);
        return false;
    }
}

// 生成唯一文件ID
function generateFileId() {
    return crypto.randomBytes(12).toString('hex'); // 24个字符
}

// 添加获取相对路径的辅助函数
function getRelativeToRootPath(absolutePath) {
    // 计算相对于ROOT_DIR的路径
    const relativePath = path.relative(ROOT_DIR, absolutePath);
    // 确保使用正斜杠
    return relativePath.split(path.sep).join('/');
}

// 创建文件分享
router.post('/create', authMiddleware, (req, res) => {
    const { filePath, extractCode = null, expiresIn = 7 * 24 * 60 * 60 * 1000 } = req.body; // 默认7天
    const userId = req.user.id.toString();
    
    if (!filePath) {
        return res.status(400).json({ success: false, error: '缺少文件路径' });
    }
    
    // 清理路径，确保使用正斜杠
    const cleanPath = filePath.replace(/^\//, '').replace(/\\/g, '/');
    
    // 检查文件是否存在 - 使用用户的根目录解析文件路径
    const fullPath = path.join(ROOT_DIR, userId, cleanPath);
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, error: '文件不存在' });
    }
    
    try {
        // 获取文件信息
        const fileStats = fs.statSync(fullPath);
        const fileName = path.basename(fullPath);
        
        // 生成文件ID
        const fileId = generateFileId();
        
        // 加载分享数据
        const shareData = loadShareData();
        
        // 添加新分享
        shareData.shares[fileId] = {
            filePath: fullPath,
            fileName: fileName,
            fileSize: fileStats.size,
            extractCode: extractCode,
            createdAt: Date.now(),
            expiresAt: Date.now() + parseInt(expiresIn),
            createdBy: req.user.id || 'anonymous'
        };
        
        // 保存分享数据
        if (saveShareData(shareData)) {
            return res.json({
                success: true,
                fileId: fileId,
                fileName: fileName,
                shareUrl: `/share/share?fileId=${fileId}${extractCode ? `&extract=${extractCode}` : ''}`,
                extractCode: extractCode
            });
        } else {
            return res.status(500).json({ success: false, error: '保存分享信息失败' });
        }
    } catch (error) {
        console.error('创建分享失败:', error);
        return res.status(500).json({ success: false, error: '创建分享失败: ' + error.message });
    }
});

// 获取分享列表
router.get('/list', (req, res) => {
    try {
        // 检查用户是否登录
        if (!req.session?.username) {
            return res.status(401).json({ success: false, error: '未授权访问' });
        }
        
        const shareData = loadShareData();
        const shares = [];
        
        // 过滤属于当前用户的分享
        for (const [fileId, share] of Object.entries(shareData.shares)) {
            if (share.createdBy === req.session.username) {
                // 删除已过期分享
                if (share.expiresAt < Date.now()) {
                    delete shareData.shares[fileId];
                    continue;
                }
                
                shares.push({
                    fileId,
                    fileName: share.fileName,
                    fileSize: share.fileSize,
                    hasExtractCode: !!share.extractCode,
                    createdAt: share.createdAt,
                    expiresAt: share.expiresAt,
                    shareUrl: `/share/share?fileId=${fileId}${share.extractCode ? `&extract=${share.extractCode}` : ''}`
                });
            }
        }
        
        // 保存清理过的数据
        saveShareData(shareData);
        
        return res.json({
            success: true,
            shares: shares
        });
    } catch (error) {
        console.error('获取分享列表失败:', error);
        return res.status(500).json({ success: false, error: '获取分享列表失败: ' + error.message });
    }
});

// 删除分享
router.delete('/delete/:fileId', (req, res) => {
    try {
        const { fileId } = req.params;
        
        // 检查用户是否登录
        if (!req.session?.username) {
            return res.status(401).json({ success: false, error: '未授权访问' });
        }
        
        const shareData = loadShareData();
        
        // 检查分享是否存在
        if (!shareData.shares[fileId]) {
            return res.status(404).json({ success: false, error: '分享不存在' });
        }
        
        // 检查是否为分享创建者
        if (shareData.shares[fileId].createdBy !== req.session.username) {
            return res.status(403).json({ success: false, error: '无权删除此分享' });
        }
        
        // 删除分享
        delete shareData.shares[fileId];
        
        // 保存更新后的数据
        if (saveShareData(shareData)) {
            return res.json({ success: true });
        } else {
            return res.status(500).json({ success: false, error: '删除分享失败' });
        }
    } catch (error) {
        console.error('删除分享失败:', error);
        return res.status(500).json({ success: false, error: '删除分享失败: ' + error.message });
    }
});

// 更新分享信息
router.put('/update/:fileId', (req, res) => {
    try {
        const { fileId } = req.params;
        const { extractCode, expiresIn } = req.body;
        
        // 检查用户是否登录
        if (!req.session?.username) {
            return res.status(401).json({ success: false, error: '未授权访问' });
        }
        
        const shareData = loadShareData();
        
        // 检查分享是否存在
        if (!shareData.shares[fileId]) {
            return res.status(404).json({ success: false, error: '分享不存在' });
        }
        
        // 检查是否为分享创建者
        if (shareData.shares[fileId].createdBy !== req.session.username) {
            return res.status(403).json({ success: false, error: '无权更新此分享' });
        }
        
        // 更新分享信息
        if (extractCode !== undefined) {
            shareData.shares[fileId].extractCode = extractCode;
        }
        
        if (expiresIn !== undefined) {
            shareData.shares[fileId].expiresAt = Date.now() + parseInt(expiresIn);
        }
        
        // 保存更新后的数据
        if (saveShareData(shareData)) {
            return res.json({
                success: true,
                fileId: fileId,
                shareUrl: `/share/share?fileId=${fileId}${shareData.shares[fileId].extractCode ? `&extract=${shareData.shares[fileId].extractCode}` : ''}`,
                extractCode: shareData.shares[fileId].extractCode
            });
        } else {
            return res.status(500).json({ success: false, error: '更新分享信息失败' });
        }
    } catch (error) {
        console.error('更新分享信息失败:', error);
        return res.status(500).json({ success: false, error: '更新分享信息失败: ' + error.message });
    }
});

// 添加文件夹导航接口
router.get('/folder-contents', (req, res) => {
    try {
        const { fileId, extractCode, path: folderPath = '' } = req.query;
        
        if (!fileId) {
            return res.status(400).json({ success: false, error: '缺少文件ID' });
        }
        
        // 加载分享数据
        const shareData = loadShareData();
        
        // 检查分享是否存在
        if (!shareData.shares[fileId]) {
            return res.status(404).json({ success: false, error: '分享不存在或已过期' });
        }
        
        // 如果设置了提取码，但未提供或不匹配
        if (shareData.shares[fileId].extractCode && shareData.shares[fileId].extractCode !== extractCode) {
            return res.status(403).json({ 
                success: false, 
                error: '提取码错误', 
                requiresExtractCode: true,
                fileId: fileId
            });
        }
        
        const shareInfo = shareData.shares[fileId];
        
        // 检查是否是目录
        if (!fs.existsSync(shareInfo.filePath)) {
            return res.status(404).json({ success: false, error: '文件不存在或已被删除' });
        }
        
        const shareStats = fs.statSync(shareInfo.filePath);
        if (!shareStats.isDirectory()) {
            return res.status(400).json({ success: false, error: '请求的资源不是目录' });
        }
        
        // 构建完整的目录路径
        const targetPath = path.join(shareInfo.filePath, folderPath);
        
        // 安全检查：确保导航路径在分享的目录内部
        if (!targetPath.startsWith(shareInfo.filePath)) {
            return res.status(403).json({ success: false, error: '无权访问此路径' });
        }
        
        // 检查目录是否存在
        if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
            return res.status(404).json({ success: false, error: '目录不存在' });
        }
        
        // 获取目录内容列表
        const dirContents = fs.readdirSync(targetPath).map(item => {
            const itemPath = path.join(targetPath, item);
            const itemStat = fs.statSync(itemPath);
            return {
                name: item,
                isDirectory: itemStat.isDirectory(),
                size: itemStat.size,
                modifiedTime: itemStat.mtime
            };
        });
        
        // 计算相对路径和导航信息
        const relativePath = path.relative(shareInfo.filePath, targetPath);
        const pathParts = relativePath.split(path.sep).filter(part => part);
        const breadcrumbs = [{ name: shareInfo.fileName, path: '' }];
        
        let currentPath = '';
        for (const part of pathParts) {
            currentPath = currentPath ? path.join(currentPath, part) : part;
            breadcrumbs.push({
                name: part,
                path: currentPath
            });
        }
        
        // 计算相对于根目录的路径
        const rootRelativePath = getRelativeToRootPath(shareInfo.filePath);
        const fullRelativePath = path.posix.join('/', rootRelativePath, relativePath);
        
        return res.json({
            success: true,
            fileId: fileId,
            fileName: shareInfo.fileName,
            fileSize: shareInfo.fileSize,
            currentPath: relativePath || '',
            path: fullRelativePath,
            breadcrumbs: breadcrumbs,
            contents: dirContents
        });
    } catch (error) {
        console.error('获取目录内容失败:', error);
        return res.status(500).json({ success: false, error: '获取目录内容失败: ' + error.message });
    }
});

// 添加文件夹导航POST接口
router.post('/share-folder', (req, res) => {
    try {
        const { fileId, extractCode, path: folderPath = '' } = req.body;
        
        if (!fileId) {
            return res.status(400).json({ success: false, error: '缺少文件ID' });
        }
        
        // 加载分享数据
        const shareData = loadShareData();
        
        // 检查分享是否存在
        if (!shareData.shares[fileId]) {
            return res.status(404).json({ success: false, error: '分享不存在或已过期' });
        }
        
        // 如果设置了提取码，但未提供或不匹配
        if (shareData.shares[fileId].extractCode && shareData.shares[fileId].extractCode !== extractCode) {
            return res.status(403).json({ 
                success: false, 
                error: '提取码错误', 
                requiresExtractCode: true,
                fileId: fileId
            });
        }
        
        const shareInfo = shareData.shares[fileId];
        
        // 检查文件是否存在
        if (!fs.existsSync(shareInfo.filePath)) {
            return res.status(404).json({ success: false, error: '文件不存在或已被删除' });
        }
        
        // 检查是否是目录
        const shareStats = fs.statSync(shareInfo.filePath);
        if (!shareStats.isDirectory()) {
            return res.status(400).json({ success: false, error: '请求的资源不是目录' });
        }
        
        // 构建完整的目录路径
        const targetPath = path.join(shareInfo.filePath, folderPath);
        
        // 安全检查：确保导航路径在分享的目录内部
        if (!targetPath.startsWith(shareInfo.filePath)) {
            return res.status(403).json({ success: false, error: '无权访问此路径' });
        }
        
        // 检查目录是否存在
        if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
            return res.status(404).json({ success: false, error: '目录不存在' });
        }
        
        // 获取目录内容列表
        const dirContents = fs.readdirSync(targetPath).map(item => {
            const itemPath = path.join(targetPath, item);
            const itemStat = fs.statSync(itemPath);
            
            let itemType = 'unknown';
            let mimeType = 'application/octet-stream';
            
            if (itemStat.isDirectory()) {
                itemType = 'directory';
                mimeType = 'directory';
            } else {
                itemType = 'file';
                // 获取文件的MIME类型
                const ext = path.extname(item).toLowerCase();
                const mimeTypes = {
                    '.html': 'text/html',
                    '.htm': 'text/html',
                    '.txt': 'text/plain',
                    '.css': 'text/css',
                    '.js': 'text/javascript',
                    '.json': 'application/json',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.pdf': 'application/pdf',
                    '.doc': 'application/msword',
                    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    '.xls': 'application/vnd.ms-excel',
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    '.ppt': 'application/vnd.ms-powerpoint',
                    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    '.mp3': 'audio/mpeg',
                    '.mp4': 'video/mp4',
                    '.zip': 'application/zip',
                    '.rar': 'application/x-rar-compressed',
                    '.7z': 'application/x-7z-compressed',
                    '.tar': 'application/x-tar',
                    '.gz': 'application/gzip'
                };
                mimeType = mimeTypes[ext] || 'application/octet-stream';
            }
            
            return {
                name: item,
                type: itemType,
                isDirectory: itemStat.isDirectory(),
                size: itemStat.size,
                sizeFormatted: formatFileSize(itemStat.size),
                mimeType: mimeType,
                modifiedTime: itemStat.mtime,
                modifiedTimeFormatted: formatDate(itemStat.mtime)
            };
        });
        
        // 对文件进行排序：目录在前，文件在后，各自按字母排序
        dirContents.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        // 计算相对路径和导航信息
        const relativePath = path.relative(shareInfo.filePath, targetPath);
        const pathParts = relativePath.split(path.sep).filter(part => part);
        const breadcrumbs = [{ name: shareInfo.fileName, path: '' }];
        
        let currentPath = '';
        for (const part of pathParts) {
            currentPath = currentPath ? path.join(currentPath, part) : part;
            breadcrumbs.push({
                name: part,
                path: currentPath
            });
        }
        
        // 计算相对于根目录的路径
        const rootRelativePath = getRelativeToRootPath(shareInfo.filePath);
        const fullRelativePath = path.posix.join('/', rootRelativePath, relativePath);
        
        return res.json({
            success: true,
            fileId: fileId,
            fileName: shareInfo.fileName,
            fileSize: shareInfo.fileSize,
            currentPath: relativePath || '',
            path: fullRelativePath,
            breadcrumbs: breadcrumbs,
            contents: dirContents,
            shareInfo: {
                createdAt: shareInfo.createdAt,
                createdAtFormatted: formatDate(shareInfo.createdAt),
                expiresAt: shareInfo.expiresAt,
                expiresAtFormatted: formatDate(shareInfo.expiresAt),
                fileSize: shareInfo.fileSize
            }
        });
    } catch (error) {
        console.error('获取目录内容失败:', error);
        return res.status(500).json({ success: false, error: '获取目录内容失败: ' + error.message });
    }
});

// 添加格式化文件大小函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 清理过期分享
function cleanupExpiredShares() {
    try {
        const shareData = loadShareData();
        let changed = false;
        
        // 检查并删除过期分享
        for (const [fileId, share] of Object.entries(shareData.shares)) {
            if (share.expiresAt < Date.now()) {
                delete shareData.shares[fileId];
                changed = true;
            }
        }
        
        // 如果有变更，保存数据
        if (changed) {
            saveShareData(shareData);
        }
    } catch (error) {
        console.error('清理过期分享失败:', error);
    }
}

// 定期清理过期分享（每小时一次）
setInterval(cleanupExpiredShares, 60 * 60 * 1000);

// 启动时立即清理一次
cleanupExpiredShares();

module.exports = router;
