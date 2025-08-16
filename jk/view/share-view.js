const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 数据存储路径
const SHARE_DATA_FILE = path.join(__dirname, '../../config/share-data.json');

// 加载分享数据
function loadShareData() {
    try {
        if (!fs.existsSync(SHARE_DATA_FILE)) {
            return { shares: {}, downloadTokens: {} };
        }
        const data = fs.readFileSync(SHARE_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('加载分享数据失败:', error);
        return { shares: {}, downloadTokens: {} };
    }
}

// 获取分享信息
function getShareInfo(fileId) {
    const shareData = loadShareData();
    const shareInfo = shareData.shares[fileId];

    if (!shareInfo) {
        return null;
    }

    // 检查是否过期
    if (shareInfo.expiresAt < Date.now()) {
        return null;
    }

    return shareInfo;
}



// 普通网页预览接口
router.get('/preview', (req, res) => {
    try {
        // 从查询参数获取预览ID
        const previewId = req.query.b;

        // 检查预览ID是否存在
        if (!previewId) {
            return res.redirect('/file');
        }

        // 检查映射中是否存在对应的文件路径
        const filePath = p.get(previewId);
        if (!filePath) {
            return res.redirect('/file');
        }

        // 读取预览页面HTML
        const htmlPath = path.join(__dirname, '../../public/share-view/index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // 直接返回HTML页面
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
    }
});

//生成随机id
const p = new Map();
const userFilep = new Map();

// 生成随机预览ID并映射文件路径 - 通过fileId查询分享信息
router.post('/random-preview', (req, res) => {
    try {
        const { fileId, extractCode, filePath } = req.body;

        if (!fileId) {
            return res.status(400).json({ success: false, message: '文件ID不能为空' });
        }

        // 从share-data.json中获取分享信息
        const shareInfo = getShareInfo(fileId);

        if (!shareInfo) {
            return res.status(404).json({ success: false, message: '分享不存在或已过期' });
        }

        // 如果设置了提取码，验证提取码
        if (shareInfo.extractCode && shareInfo.extractCode !== extractCode) {
            return res.status(403).json({
                success: false,
                message: '提取码错误',
                requiresExtractCode: true
            });
        }

        // 构建完整文件路径
        let fullFilePath = shareInfo.filePath;
        
        // 如果提供了子文件路径，则拼接到基础路径后面
        if (filePath) {
            // 先解码URL编码的文件路径
            const decodedFilePath = decodeURIComponent(filePath);
            // 清理文件路径，移除开头的斜杠
            const cleanFilePath = decodedFilePath.replace(/^\/+/, '');
            fullFilePath = path.join(shareInfo.filePath, cleanFilePath);
        }

        // 允许预览的文件类型
        const allowedExtensions = ['.txt', '.html', '.htm', '.xml', '.css', '.json', '.js', '.md', '.java', '.py', '.cpp', '.c', '.php', '.rb', '.go', '.swift', '.kotlin', '.sql', '.sh', '.bat', '.cmd', '.yaml', '.yml', '.ini', '.log', '.csv', '.ts', '.less', '.sass', '.scss', '.pl', '.lua'];
        const fileExtension = path.extname(fullFilePath).toLowerCase();

        // 检查文件类型是否允许
        if (!allowedExtensions.includes(fileExtension)) {
            return res.status(400).json({
                success: false,
                message: '不支持预览的文件类型'
            });
        }

        // 检查文件是否存在
        if (!fs.existsSync(fullFilePath)) {
            return res.status(404).json({ success: false, message: '文件不存在或已被删除' });
        }

        // 检查是否为文件（不是目录）
        const stats = fs.statSync(fullFilePath);
        if (stats.isDirectory()) {
            return res.status(400).json({ success: false, message: '不能预览目录' });
        }

        // 生成文件唯一标识
        const fileKey = `${fileId}_${shareInfo.fileName}`;

        // 如果该文件已有预览ID，先移除旧的映射
        const oldPreviewId = userFilep.get(fileKey);
        if (oldPreviewId) {
            p.delete(oldPreviewId);
        }

        // 生成128位随机值（32个十六进制字符）
        const previewId = crypto.randomBytes(16).toString('hex');

        // 存储映射关系
        p.set(previewId, fullFilePath);
        userFilep.set(fileKey, previewId);

        // 获取实际文件名和大小
        const actualFileName = path.basename(fullFilePath);
        const actualFileSize = fs.statSync(fullFilePath).size;

        // 返回预览URL
        res.json({
            success: true,
            previewUrl: `/share-view/preview?b=${previewId}`
        });
    } catch (error) {
        console.error('生成随机预览ID错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 文件名接口
router.post('/preview/filename', (req, res) => {
    try {
        const { b } = req.body;

        if (!b) {
            return res.status(400).json({ success: false, message: '预览ID不能为空' });
        }

        // 通过预览ID获取文件路径
        const filePath = p.get(b);

        if (!filePath) {
            return res.status(404).json({ success: false, message: '无效的预览ID' });
        }

        // 获取文件名
        const fileName = path.basename(filePath);

        res.json({
            success: true,
            filename: fileName
        });
    } catch (error) {
        console.error('获取文件名错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 预览接口
router.post('/preview/file-preview', (req, res) => {
    try {
        const { b, page = 1, pageSize = 3000 } = req.body;

        if (!b) {
            return res.status(400).json({ success: false, message: '预览ID不能为空' });
        }

        // 通过预览ID获取文件路径
        const filePath = p.get(b);

        if (!filePath) {
            return res.status(404).json({ success: false, message: '无效的预览ID' });
        }

        // 检查文件大小，限制为500MB
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

        if (fileSizeInMB > 500) {
            return res.status(413).json({
                success: false,
                message: '文件大小超过500MB，不支持预览'
            });
        }

        // 读取文件内容
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let lines = fileContent.split('\n');

        // 处理空文件的情况
        if (lines.length === 1 && lines[0] === '') {
            lines = [' ']; // 返回一个空格行
        }

        // 计算分页
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedContent = lines.slice(startIndex, endIndex).join('\n');

        res.json({
            success: true,
            content: paginatedContent,
            totalLines: lines.length,
            currentPage: page,
            pageSize: pageSize,
            totalPages: Math.ceil(lines.length / pageSize),
            hasMore: endIndex < lines.length,
            fileSize: fileSizeInMB.toFixed(2) + 'MB'
        });
    } catch (error) {
        console.error('获取文件内容错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});



module.exports = router;