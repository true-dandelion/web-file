const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const router = express.Router();

// 修改根目录为 file 目录
const ROOT_DIR = path.join(__dirname, '../../file');

// 下载接口 - 处理文件和文件夹下载
router.get('/', async (req, res) => {
    try {
        // 获取用户ID
        const userId = req.user.id.toString();
        const userBasePath = path.join(ROOT_DIR, userId);
        
        // 确保用户目录存在
        if (!fs.existsSync(userBasePath)) {
            return res.status(404).send('找不到请求的文件或文件夹');
        }
        
        // 获取并清理请求路径，确保使用正斜杠
        const relativePath = req.query.path || '/';
        const cleanPath = relativePath.replace(/^\//, '').replace(/\\/g, '/');
        const type = req.query.type || 'file'; // 默认为文件下载
        
        // 处理路径，确保在用户目录下
        const fullPath = path.join(userBasePath, cleanPath);
        
        // 安全检查：确保路径在用户目录内
        if (!fullPath.startsWith(userBasePath)) {
            return res.status(403).send('访问被拒绝');
        }
        
        // 检查路径是否存在
        if (!fs.existsSync(fullPath)) {
            return res.status(404).send('找不到请求的文件或文件夹');
        }
        
        // 获取文件/文件夹名称
        const name = path.basename(fullPath);
        
        // 根据类型处理下载
        if (type === 'folder' || fs.statSync(fullPath).isDirectory()) {
            // 文件夹下载 - 创建zip文件
            const archive = archiver('zip', {
                zlib: { level: 9 } // 设置压缩级别
            });
            
            // 设置响应头
            res.attachment(`${name}.zip`);
            res.setHeader('Content-Type', 'application/zip');
            
            // 管道连接到响应
            archive.pipe(res);
            
            // 添加目录到压缩文件
            archive.directory(fullPath, name);
            
            // 完成归档
            await archive.finalize();
        } else {
            // 文件下载
            const stats = fs.statSync(fullPath);
            
            // 设置响应头
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`);
            res.setHeader('Content-Type', getMimeType(name));
            res.setHeader('Content-Length', stats.size);
            
            // 创建文件流并发送
            const fileStream = fs.createReadStream(fullPath);
            fileStream.pipe(res);
        }
    } catch (error) {
        console.error('下载失败:', error);
    }
});

// 获取文件的MIME类型
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.tar': 'application/x-tar',
        '.7z': 'application/x-7z-compressed',
        '.txt': 'text/plain',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.wav': 'audio/wav',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.csv': 'text/csv',
        '.xml': 'application/xml',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = router;
