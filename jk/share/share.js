const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 数据存储路径
const SHARE_DATA_FILE = path.join(__dirname, '../../config/share-data.json');

// 文件存储根目录
const ROOT_DIR = path.join(__dirname, '../../file');

// 确保数据文件存在
function ensureDataFileExists() {
    if (!fs.existsSync(SHARE_DATA_FILE)) {
        fs.writeFileSync(SHARE_DATA_FILE, JSON.stringify({
            shares: {},
            downloadTokens: {}  // 添加下载token存储
        }, null, 2));
    }
}

// 加载分享数据
function loadShareData() {
    ensureDataFileExists();
    try {
        const data = fs.readFileSync(SHARE_DATA_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        // 确保downloadTokens字段存在
        if (!parsedData.downloadTokens) {
            parsedData.downloadTokens = {};
        }
        return parsedData;
    } catch (error) {
        console.error('加载分享数据失败:', error);
        return { shares: {}, downloadTokens: {} };
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

// 清理过期的下载token
function cleanExpiredTokens() {
    const shareData = loadShareData();
    
    if (!shareData.downloadTokens) {
        return;
    }
    
    const now = Date.now();
    let hasChanges = false;
    
    // 遍历所有token，删除过期的
    for (const token in shareData.downloadTokens) {
        if (shareData.downloadTokens[token].expiresAt < now) {
            delete shareData.downloadTokens[token];
            hasChanges = true;
        }
    }
    
    // 如果有变更，保存数据
    if (hasChanges) {
        saveShareData(shareData);
    }
}

// 设置定时任务，每10分钟清理一次过期token
setInterval(cleanExpiredTokens, 10 * 60 * 1000);

// 获取分享信息
function getShareInfo(fileId) {
    const shareData = loadShareData();
    const shareInfo = shareData.shares[fileId];
    
    if (!shareInfo) {
        return null;
    }
    
    // 检查是否过期
    if (shareInfo.expiresAt < Date.now()) {
        delete shareData.shares[fileId];
        saveShareData(shareData);
        return null;
    }
    
    return shareInfo;
}

/**
 * 生成随机文件ID (24位字符)
 */
function generateFileId() {
  return crypto.randomBytes(12).toString('hex'); // 12字节生成24位hex字符
}

/**
 * 创建文件分享记录
 * @param {string} originalFilePath - 原始文件路径
 * @param {string} extractCode - 提取码（可选）
 * @param {number} expiresIn - 过期时间（毫秒）
 * @returns {string} - 生成的文件ID
 */
function createFileShare(originalFilePath, extractCode = null, expiresIn = 7 * 24 * 60 * 60 * 1000) { // 默认7天过期
  const fileId = generateFileId();
  
  // 获取文件信息
  const fileStats = fs.statSync(originalFilePath);
  const fileName = path.basename(originalFilePath);
  
  const shareData = loadShareData();
  shareData.shares[fileId] = {
    filePath: originalFilePath,
    fileName: fileName,
    fileSize: fileStats.size,
    extractCode: extractCode,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresIn
  };
  
  saveShareData(shareData);
  
  return fileId;
}

// 处理分享链接 /share/share?fileId=fileId&extract=extractCode
router.get('/share', (req, res) => {
    // 只接受标准的fileId参数格式
    const fileId = req.query.fileId;
    const extractCode = req.query.extract;
    const action = req.query.action || 'view'; // 默认为查看
    const format = req.query.format; // API请求标识
    
    // 如果是API请求（带有format=json参数），返回JSON
    if (format === 'json') {
        return handleApiRequest(req, res);
    }
    
    // 默认情况下，返回前端页面
    res.sendFile(path.join(__dirname, '../../public/share/index.html'));
});

// 添加新的API接口用于获取分享内容
router.get('/share/content', (req, res) => {
    handleApiRequest(req, res);
});

// 处理API请求的函数
function handleApiRequest(req, res) {
    const fileId = req.query.fileId;
    const extractCode = req.query.extract;
    
    if (!fileId) {
        return res.status(400).json({ success: false, error: '缺少文件ID' });
    }
    
    const shareInfo = getShareInfo(fileId);
    
    if (!shareInfo) {
        return res.status(404).json({ success: false, error: '分享的文件不存在或已过期' });
    }
    
    // 如果设置了提取码，但未提供或不匹配
    if (shareInfo.extractCode && shareInfo.extractCode !== extractCode) {
        return res.status(403).json({ 
            success: false, 
            error: '提取码错误', 
            requiresExtractCode: true,
            fileId: fileId
        });
    }
    
    if (!fs.existsSync(shareInfo.filePath)) {
        return res.status(404).json({ success: false, error: '文件不存在或已被删除' });
    }
    
    // 获取文件信息
    const fileStats = fs.statSync(shareInfo.filePath);
    
    // 计算相对于根目录的路径
    const rootRelativePath = getRelativeToRootPath(shareInfo.filePath);
    
    // 检查是否为目录
    if (fileStats.isDirectory()) {
        // 目录处理 - 获取目录内容列表
        try {
            const dirContents = fs.readdirSync(shareInfo.filePath).map(item => {
                const itemPath = path.join(shareInfo.filePath, item);
                const itemStat = fs.statSync(itemPath);
                return {
                    name: item,
                    isDirectory: itemStat.isDirectory(),
                    size: itemStat.size,
                    modifiedTime: itemStat.mtime
                };
            });
            
            // 返回JSON格式的目录信息
            return res.json({
                success: true,
                type: 'directory',
                fileName: shareInfo.fileName,
                path: '/' + rootRelativePath,
                contents: dirContents,
                createdAt: shareInfo.createdAt,
                expiresAt: shareInfo.expiresAt
            });
        } catch (error) {
            console.error('处理目录分享出错:', error);
            return res.status(500).json({ success: false, error: '处理目录时出错' });
        }
    } else {
        // 文件处理 - 返回文件信息，让前端处理显示
        // 确定MIME类型
        const mimeType = getMimeType(shareInfo.fileName);
        
        // 返回JSON格式的文件信息
        return res.json({
            success: true,
            type: 'file',
            fileName: shareInfo.fileName,
            path: '/' + rootRelativePath,
            fileSize: fileStats.size,
            mimeType: mimeType,
            createdAt: shareInfo.createdAt,
            expiresAt: shareInfo.expiresAt
        });
    }
}

// 辅助函数: 格式化文件大小
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 辅助函数: 格式化日期
function formatDate(date) {
    return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 辅助函数: 根据文件名获取MIME类型
function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
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
    
    return mimeTypes[ext] || 'application/octet-stream';
}

// 辅助函数: HTML转义
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 创建分享API
router.post('/create', (req, res) => {
  const { filePath, extractCode, expiresIn } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: '缺少文件路径' });
  }
  
  // 检查文件是否存在 - 使用根目录解析文件路径
  let fullPath;
  if (filePath.startsWith('/')) {
    // 如果路径以/开头，从根目录解析
    fullPath = path.join(ROOT_DIR, filePath.substring(1));
  } else {
    // 否则直接解析
    fullPath = path.join(ROOT_DIR, filePath);
  }
  
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  const fileId = createFileShare(fullPath, extractCode, expiresIn);
  
  return res.json({
    fileId,
    shareUrl: `/share/share?fileId=${fileId}${extractCode ? `&extract=${extractCode}` : ''}`,
    extractCode: extractCode || null
  });
});

// 验证提取码
router.post('/verify-code', (req, res) => {
    const { fileId, extractCode } = req.body;
    
    if (!fileId || !extractCode) {
        return res.status(400).json({ success: false, error: '参数不完整' });
    }
    
    const shareInfo = getShareInfo(fileId);
    
    if (!shareInfo) {
        return res.status(404).json({ success: false, error: '分享的文件不存在或已过期' });
    }
    
    if (shareInfo.extractCode !== extractCode) {
        return res.status(403).json({ success: false, error: '提取码错误' });
    }
    
    return res.json({ success: true, valid: true });
});

// 获取分享信息API（不包含敏感信息）
router.get('/info/:fileId', (req, res) => {
    const { fileId } = req.params;
    
    const shareInfo = getShareInfo(fileId);
    
    if (!shareInfo) {
        return res.status(404).json({ success: false, error: '分享的文件不存在或已过期' });
    }
    
    return res.json({
        success: true,
        fileName: shareInfo.fileName,
        fileSize: shareInfo.fileSize,
        requiresExtractCode: !!shareInfo.extractCode,
        createdAt: shareInfo.createdAt,
        expiresAt: shareInfo.expiresAt
    });
});

// 添加文件夹导航POST接口
router.post('/share-folder', (req, res) => {
    const { fileId, extractCode, path: folderPath = '' } = req.body;
    
    if (!fileId) {
        return res.status(400).json({ success: false, error: '缺少文件ID' });
    }
    
    const shareInfo = getShareInfo(fileId);
    
    if (!shareInfo) {
        return res.status(404).json({ success: false, error: '分享的文件不存在或已过期' });
    }
    
    // 如果设置了提取码，但未提供或不匹配
    if (shareInfo.extractCode && shareInfo.extractCode !== extractCode) {
        return res.status(403).json({ 
            success: false, 
            error: '提取码错误', 
            requiresExtractCode: true,
            fileId: fileId
        });
    }
    
    // 如果分享的不是目录，返回错误
    let shareStats;
    try {
        shareStats = fs.statSync(shareInfo.filePath);
    } catch (error) {
        return res.status(404).json({ success: false, error: '文件不存在或已被删除' });
    }
    
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
    
    try {
        // 获取目录内容
        const contents = fs.readdirSync(targetPath).map(item => {
            const itemFullPath = path.join(targetPath, item);
            const itemStat = fs.statSync(itemFullPath);
            return {
                name: item,
                isDirectory: itemStat.isDirectory(),
                size: itemStat.size,
                modifiedTime: itemStat.mtime,
                // 增加文件类型信息
                mimeType: itemStat.isDirectory() ? 'directory' : getMimeType(item)
            };
        });
        
        // 对文件进行排序：目录在前，文件在后，各自按字母排序
        contents.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        // 计算相对路径
        const relativePath = path.relative(shareInfo.filePath, targetPath);
        
        // 构建导航路径信息
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
        
        return res.json({
            success: true,
            fileId: fileId,
            fileName: shareInfo.fileName,
            currentPath: relativePath || '',
            path: path.posix.join('/', rootRelativePath, relativePath),
            breadcrumbs: breadcrumbs,
            contents: contents,
            shareInfo: {
                createdAt: shareInfo.createdAt,
                expiresAt: shareInfo.expiresAt,
                fileSize: shareInfo.fileSize
            }
        });
    } catch (error) {
        console.error('处理目录导航出错:', error);
        return res.status(500).json({ success: false, error: '处理目录导航时出错: ' + error.message });
    }
});

// 添加文件夹导航接口
router.get('/folder-navigate', (req, res) => {
    const fileId = req.query.fileId;
    const extractCode = req.query.extract;
    const folderPath = req.query.path || '';
    
    if (!fileId) {
        return res.status(400).json({ success: false, error: '缺少文件ID' });
    }
    
    const shareInfo = getShareInfo(fileId);
    
    if (!shareInfo) {
        return res.status(404).json({ success: false, error: '分享的文件不存在或已过期' });
    }
    
    // 如果设置了提取码，但未提供或不匹配
    if (shareInfo.extractCode && shareInfo.extractCode !== extractCode) {
        return res.status(403).json({ 
            success: false, 
            error: '提取码错误', 
            requiresExtractCode: true,
            fileId: fileId
        });
    }
    
    // 如果分享的不是目录，返回错误
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
    
    try {
        // 获取目录内容
        const contents = fs.readdirSync(targetPath).map(item => {
            const itemFullPath = path.join(targetPath, item);
            const itemStat = fs.statSync(itemFullPath);
            return {
                name: item,
                isDirectory: itemStat.isDirectory(),
                size: itemStat.size,
                modifiedTime: itemStat.mtime
            };
        });
        
        // 计算相对路径
        const relativePath = path.relative(shareInfo.filePath, targetPath);
        
        // 计算相对于根目录的路径
        const rootRelativePath = getRelativeToRootPath(shareInfo.filePath);
        
        // 构建导航路径信息
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
        
        return res.json({
            success: true,
            currentPath: relativePath || '',
            path: path.posix.join('/', rootRelativePath, relativePath),
            breadcrumbs: breadcrumbs,
            contents: contents
        });
    } catch (error) {
        console.error('处理目录导航出错:', error);
        return res.status(500).json({ success: false, error: '处理目录导航时出错' });
    }
});

// 获取路径相对于根目录的路径
function getRelativeToRootPath(absolutePath) {
    // 假设ROOT_DIR是根目录的路径
    const relativePath = path.relative(ROOT_DIR, absolutePath);
    // 确保使用正斜杠
    return relativePath.split(path.sep).join('/');
}

// 提供静态资源
router.use('/', express.static(path.join(__dirname, '../public/share')));

/**
 * 生成随机下载token (32位字符)
 */
function generateDownloadToken() {
  return crypto.randomBytes(16).toString('hex'); // 16字节生成32位hex字符
}

/**
 * 创建一次性下载token
 * @param {string} fileId - 文件ID
 * @param {string} filePath - 要下载的文件路径
 * @returns {string} - 生成的下载token
 */
function createDownloadToken(fileId, filePath) {
  const token = generateDownloadToken();
  const now = Date.now();
  
  // 设置过期时间为30分钟后
  const expiresAt = now + (30 * 60 * 1000);
  
  const shareData = loadShareData();
  if (!shareData.downloadTokens) {
    shareData.downloadTokens = {};
  }
  
  shareData.downloadTokens[token] = {
    fileId: fileId,
    filePath: filePath,
    createdAt: now,
    expiresAt: expiresAt
  };
  
  saveShareData(shareData);
  
  return token;
}

/**
 * 验证并使用下载token
 * @param {string} token - 下载token
 * @returns {object|null} - 如果token有效返回下载信息，否则返回null
 */
function useDownloadToken(token) {
  const shareData = loadShareData();
  
  if (!shareData.downloadTokens || !shareData.downloadTokens[token]) {
    return null;
  }
  
  const downloadInfo = shareData.downloadTokens[token];
  
  // 检查token是否过期
  if (downloadInfo.expiresAt < Date.now()) {
    delete shareData.downloadTokens[token];
    saveShareData(shareData);
    return null;
  }
  
  // 使用后立即删除token（一次性使用）
  delete shareData.downloadTokens[token];
  saveShareData(shareData);
  
  return downloadInfo;
}

// 获取下载链接API
router.get('/download-link', (req, res) => {
  const fileId = req.query.fileId;
  let downloadPath = '';
  
  // 安全解码路径
  try {
    downloadPath = req.query.path ? decodeURIComponent(req.query.path) : ''; 
  } catch (error) {
    return res.status(400).json({ 
      success: false, 
      error: '无效的文件路径',
      details: error.message 
    });
  }
  
  const extractCode = req.query.extract; // 提取码
  
  if (!fileId) {
    return res.status(400).json({ success: false, error: '缺少文件ID' });
  }
  
  const shareInfo = getShareInfo(fileId);
  
  if (!shareInfo) {
    return res.status(404).json({ success: false, error: '分享的文件不存在或已过期' });
  }
  
  // 如果设置了提取码，但未提供或不匹配
  if (shareInfo.extractCode && shareInfo.extractCode !== extractCode) {
    return res.status(403).json({ 
      success: false, 
      error: '提取码错误', 
      requiresExtractCode: true,
      fileId: fileId
    });
  }
  
  // 确定完整的文件路径
  let fullFilePath;
  try {
    if (downloadPath) {
      // 如果是子文件或子文件夹
      fullFilePath = path.join(shareInfo.filePath, downloadPath);
      
      // 安全检查：确保下载路径在分享的目录内部
      if (!fullFilePath.startsWith(shareInfo.filePath)) {
        return res.status(403).json({ success: false, error: '无权访问此路径' });
      }
    } else {
      // 如果是直接下载共享的文件
      fullFilePath = shareInfo.filePath;
    }
  } catch (error) {
    return res.status(400).json({ 
      success: false, 
      error: '路径处理出错',
      details: error.message 
    });
  }
  
  // 检查文件是否存在
  if (!fs.existsSync(fullFilePath)) {
    return res.status(404).json({ success: false, error: '文件不存在或已被删除' });
  }
  
  // 创建一次性下载token
  const downloadToken = createDownloadToken(fileId, fullFilePath);
  
  // 返回下载链接
  return res.json({
    success: true,
    downloadLink: `/share/share-Download?file=${downloadToken}`,
    expiresAt: loadShareData().downloadTokens[downloadToken].expiresAt
  });
});

// 文件下载接口
router.get('/share-Download', (req, res) => {
  const downloadToken = req.query.file;
  
  if (!downloadToken) {
    return res.status(400).json({ success: false, error: '缺少下载标识' });
  }
  
  // 验证并使用下载token（一次性使用）
  const downloadInfo = useDownloadToken(downloadToken);
  
  if (!downloadInfo) {
    return res.status(403).json({ success: false, error: '下载链接无效或已被使用' });
  }
  
  const filePath = downloadInfo.filePath;
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: '文件不存在或已被删除' });
  }
  
  // 获取文件信息
  const stats = fs.statSync(filePath);
  
  // 如果是目录，返回错误
  if (stats.isDirectory()) {
    return res.status(400).json({ success: false, error: '不能直接下载文件夹' });
  }
  
  // 设置文件名 - 使用 path.basename 确保安全
  const fileName = path.basename(filePath);
  
  // 设置响应头 - 使用 encodeURIComponent 处理特殊字符
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Content-Type', getMimeType(fileName));
  res.setHeader('Content-Length', stats.size);
  
  // 创建文件流并发送
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  // 处理错误
  fileStream.on('error', error => {
    console.error('文件下载出错:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: '文件下载出错' });
    }
  });
});

module.exports = router;


