const express = require('express');
const router = express.Router();
const path = require('path');
const middleware = require('../middleware/middleware');
const fs = require('fs');
const crypto = require('crypto');



// 普通网页预览接口
router.get('/preview', middleware.authMiddleware, (req, res) => {
    try {
        // 从查询参数获取预览ID
        const previewId = req.query.b;

        // 检查预览ID是否存在
        if (!previewId) {
            return res.redirect('/file');
        }

        // 检查映射中是否存在对应的文件路径
        const filePath = previewMappings.get(previewId);
        if (!filePath) {
            return res.redirect('/file');
        }

        // 读取预览页面HTML
        const htmlPath = path.join(__dirname, '../../public/view/index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // 直接返回HTML页面
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
    }
});

//生成随机id
const previewMappings = new Map();
const userFilePreviewMappings = new Map();

// 生成随机预览ID并映射文件路径
router.post('/random-preview', middleware.authMiddleware, (req, res) => {
    try {
        const { filePath } = req.body;
        const user = req.session.user;

        if (!user || !user.id) {
            return res.status(401).json({ success: false, message: '未登录' });
        }

        if (!filePath) {
            return res.status(400).json({ success: false, message: '文件路径不能为空' });
        }

        // 构建完整的文件路径
        const fullFilePath = path.join(__dirname, '../../file', user.id.toString(), filePath);

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
            return res.status(404).json({ success: false, message: '文件不存在' });
        }

        // 生成用户文件唯一标识
        const userFileKey = `${user.id}_${filePath}`;

        // 如果该用户该文件已有预览ID，先移除旧的映射
        const oldPreviewId = userFilePreviewMappings.get(userFileKey);
        if (oldPreviewId) {
            previewMappings.delete(oldPreviewId);
        }

        // 生成128位随机值（32个十六进制字符）
        const previewId = crypto.randomBytes(16).toString('hex');

        // 存储映射关系
        previewMappings.set(previewId, fullFilePath);
        userFilePreviewMappings.set(userFileKey, previewId);

        // 返回预览URL
        res.json({
            success: true,
            previewUrl: `/view/preview?b=${previewId}`
        });
    } catch (error) {
        console.error('生成随机预览ID错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 文件名接口
router.post('/preview/filename', middleware.authMiddleware, (req, res) => {
    try {
        const { b } = req.body;

        if (!b) {
            return res.status(400).json({ success: false, message: '预览ID不能为空' });
        }

        // 通过预览ID获取文件路径
        const filePath = previewMappings.get(b);

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
router.post('/preview/file-preview', middleware.authMiddleware, (req, res) => {
    try {
        const { b, page = 1, pageSize = 3000 } = req.body;

        if (!b) {
            return res.status(400).json({ success: false, message: '预览ID不能为空' });
        }

        // 通过预览ID获取文件路径
        const filePath = previewMappings.get(b);

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


//用户预览样式     0=白      1=黑       2=粉色少女     3=蓝色海洋      4=绿色森林     5=橙色阳光
// 用户主题设置接口
router.post('/theme', middleware.authMiddleware, (req, res) => {
    try {
        const { action, theme } = req.body;
        const user = req.session.user;

        // 读取用户JSON文件
        const userFilePath = path.join(__dirname, '../../user/user.json');
        let users = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));

        // 找到当前用户
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: '用户未找到' });
        }

        // 处理不同的操作
        switch (action) {
            case 'getTheme':
                // 获取当前主题
                return res.json({
                    success: true,
                    theme: parseInt(users[userIndex].theme || '0')
                });

            case 'setTheme':
                // 检查主题值
                if (typeof theme !== 'number' || theme < 0 || theme > 6) {
                    return res.status(400).json({ success: false, message: '无效的主题设置' });
                }

                // 更新主题
                users[userIndex].theme = theme.toString();

                // 写回文件
                fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));

                return res.json({
                    success: true,
                    message: '主题设置成功',
                    theme: theme
                });

            default:
                return res.status(400).json({ success: false, message: '无效的操作' });
        }
    } catch (error) {
        console.error('主题操作错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});


router.post('/preview-theme', middleware.authMiddleware, (req, res) => {
    try {
        const { action, theme } = req.body;
        const user = req.session.user;

        // 读取用户JSON文件
        const userFilePath = path.join(__dirname, '../../user/user.json');
        let users = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));

        // 找到当前用户
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: '用户未找到' });
        }

        // 处理不同的操作
        switch (action) {
            case 'getTheme':
                // 获取当前主题
                return res.json({
                    success: true,
                    theme: parseInt(users[userIndex]['preview-theme'] || '0')
                });

            case 'setTheme':
                // 检查主题值
                if (typeof theme !== 'number' || theme < 0 || theme > 6) {
                    return res.status(400).json({ success: false, message: '无效的主题设置' });
                }

                // 更新主题
                users[userIndex]['preview-theme'] = theme.toString();

                // 写回文件
                fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2));

                return res.json({
                    success: true,
                    message: '主题设置成功',
                    theme: theme
                });

            default:
                return res.status(400).json({ success: false, message: '无效的操作' });
        }
    } catch (error) {
        console.error('主题操作错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});


module.exports = router; 