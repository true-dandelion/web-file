const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { verify } = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const authConfig = require('../config/auth');

// 创建一个基本路由，确保router是有效的
router.get('/ws-status', (req, res) => {
    res.json({ status: 'WebSocket服务已启动' });
});

// 跟踪不同设备的上传
const deviceUploads = new Map();  // 设备ID -> Map(fileId -> uploadInfo)
const deviceChunks = new Map();   // 设备ID -> Map(fileId -> chunks[])

// 创建WebSocket服务器
function createWebSocketServer() {
    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', function connection(ws, req) {
        // 获取设备ID (从URL参数中)
        const url = new URL(req.url, `http://${req.headers.host}`);
        const deviceId = url.searchParams.get('deviceId') || 'default';

        // 获取用户ID
        const userId = req.user.id.toString();
        const userBasePath = path.join('file', userId);

        // 确保用户目录存在
        if (!fs.existsSync(userBasePath)) {
            fs.mkdirSync(userBasePath, { recursive: true });
        }

        // 为每个设备初始化文件块存储
        if (!deviceChunks.has(deviceId)) {
            deviceChunks.set(deviceId, new Map());
        }

        // 为每个设备初始化上传信息存储
        if (!deviceUploads.has(deviceId)) {
            deviceUploads.set(deviceId, new Map());
        }

        // 获取当前设备的分块存储
        const fileChunks = deviceChunks.get(deviceId);

        // 获取当前设备的上传信息存储
        const uploads = deviceUploads.get(deviceId);

        ws.on('message', async function incoming(message) {
            try {
                const data = JSON.parse(message.toString());
                const deviceIdFromMessage = data.deviceId || deviceId;

                // 处理创建文件夹的消息
                if (data.type === 'createFolder') {
                    handleCreateFolder(data.path, ws, userId);
                    return;
                }

                // 处理文件分块 - 使用消息中的设备ID
                const { fileId, fileName, path: uploadPath, chunk, offset, totalSize, isLastChunk, isInFolder, folderPath } = data;

                // 清除路径中可能的前导斜杠
                const cleanPath = uploadPath.replace(/^\//, '');

                // 如果是文件夹中的文件且带有文件夹路径，确保文件夹存在
                if (isInFolder && folderPath) {
                    // 确保folderPath使用正斜杠并去除前导斜杠
                    const cleanFolderPath = folderPath.replace(/^\//, '').replace(/\\/g, '/');
                    const fullFolderPath = path.join('file', userId, cleanPath, cleanFolderPath);
                    await ensureDirectoryExists(fullFolderPath);
                }

                // 获取或创建文件分块数组
                if (!fileChunks.has(fileId)) {
                    fileChunks.set(fileId, []);
                    // 初始化上传跟踪
                    uploads.set(fileId, {
                        fileName,
                        uploadPath: cleanPath,
                        totalSize,
                        receivedSize: 0,
                        userId: userId, // 存储用户ID
                        isInFolder: isInFolder, // 添加是否在文件夹中的标记
                        folderPath: folderPath // 保存文件夹路径
                    });
                }

                // 现在chunk应该是Base64编码的字符串
                const chunkBuffer = Buffer.from(chunk || '', 'base64');

                // 添加分块到数组
                const chunks = fileChunks.get(fileId);
                chunks[Math.floor(offset / (1024 * 64))] = chunkBuffer;

                // 更新接收的大小
                const upload = uploads.get(fileId);
                upload.receivedSize += chunkBuffer.length;

                // 发送进度更新
                sendProgressUpdate(ws, fileId, deviceIdFromMessage);

                // 如果是最后一个分块，保存文件
                if (isLastChunk) {
                    // 确定保存路径
                    let savePath;
                    const uploadInfo = uploads.get(fileId);
                    
                    if (uploadInfo.isInFolder) {
                        // 确保folderPath使用正斜杠并去除前导斜杠
                        const cleanFolderPath = uploadInfo.folderPath ? uploadInfo.folderPath.replace(/^\//, '').replace(/\\/g, '/') : '';

                        const fileNameOnly = path.basename(uploadInfo.fileName);

                        // 构建完整保存路径：用户ID + 用户指定路径 + 文件夹结构 + 文件名
                        savePath = path.join('file', userId, uploadInfo.uploadPath, cleanFolderPath, fileNameOnly);

                        // 检查是否尝试写入目录
                        if (fs.existsSync(savePath) && fs.statSync(savePath).isDirectory()) {
                            throw new Error(`无法写入文件，路径 '${savePath}' 是一个目录`);
                        }
                    } else {
                        // 非文件夹内文件的处理不变
                        savePath = path.join('file', userId, uploadInfo.uploadPath, uploadInfo.fileName);
                        if (fs.existsSync(savePath) && fs.statSync(savePath).isDirectory()) {
                            throw new Error(`无法写入文件，路径 '${savePath}' 是一个目录`);
                        }
                    }

                    // 确保父目录存在
                    await ensureDirectoryExists(path.dirname(savePath));

                    // 组合所有分块并写入文件
                    const fileData = Buffer.concat(chunks.filter(c => c));
                    fs.writeFileSync(savePath, fileData);

                    // 清理该文件的分块
                    fileChunks.delete(fileId);
                    uploads.delete(fileId);

                    // 发送完成消息，返回的路径不包含用户ID，且使用正斜杠
                    let displayPath = '/' + uploadInfo.uploadPath.replace(/\\/g, '/');
                    
                    // 如果是文件夹内的文件，添加文件夹路径
                    if (uploadInfo.isInFolder && uploadInfo.folderPath) {
                        const cleanFolderPath = uploadInfo.folderPath.replace(/^\//, '').replace(/\\/g, '/');
                        const fileNameOnly = path.basename(uploadInfo.fileName);
                        displayPath = path.posix.join(displayPath, cleanFolderPath);
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'complete',
                        fileId,
                        path: displayPath,
                        count: 1 // 单个文件完成
                    }));
                }
            } catch (error) {
                console.error('处理文件上传时出错:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        });

        // 连接关闭时清理设备资源
        ws.on('close', () => {
        });
    });

    return wss;
}

// 设置WebSocket服务器（兼容旧版）
function setupWebSocketServer(server) {
    const wss = createWebSocketServer();

    // 添加升级事件处理
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const pathname = url.pathname;

        // 只处理 /file/file-upload 路径
        if (pathname === '/file/file-upload') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
        // 不处理其他路径，让其他WebSocket服务器处理
    });

    return wss;
}

// 修改进度更新函数
function sendProgressUpdate(ws, fileId, deviceId) {
    if (deviceUploads.has(deviceId)) {
        const uploads = deviceUploads.get(deviceId);
        const upload = uploads.get(fileId);
        if (upload) {
            const percent = Math.floor((upload.receivedSize / upload.totalSize) * 100);
            ws.send(JSON.stringify({
                type: 'progress',
                fileId,
                percent
            }));
        }
    }
}

// 处理创建文件夹的请求
function handleCreateFolder(folderPath, ws, userId) {
    try {
        // 清除路径中可能的前导斜杠并确保使用正斜杠
        const cleanPath = folderPath.replace(/^\//, '').replace(/\\/g, '/');

        // 构建完整路径，包含用户ID和用户指定路径
        const fullPath = path.join('file', userId, cleanPath);

        // 确保目录存在
        ensureDirectoryExists(fullPath);

        // 返回给客户端的路径不包含用户ID，且使用正斜杠
        const displayPath = '/' + cleanPath.replace(/\\/g, '/');
        ws.send(JSON.stringify({
            type: 'complete',
            path: displayPath,
            count: 1
        }));
    } catch (error) {
        console.error('创建文件夹时出错:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: error.message
        }));
    }
}

// 确保目录存在
async function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
}

// 从请求中提取认证令牌
function extractAuthToken(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    return cookies['authToken'] || null;
}

// 解析cookie字符串
function parseCookies(cookieHeader) {
    return cookieHeader.split(';')
      .map(cookie => cookie.trim())
      .reduce((cookies, cookie) => {
            const [name, value] = cookie.split('=');
            cookies[decodeURIComponent(name)] = decodeURIComponent(value);
            return cookies;
        }, {});
}

module.exports = {
    router,
    createWebSocketServer,  // 新接口
    setupWebSocketServer    // 兼容旧版
};    