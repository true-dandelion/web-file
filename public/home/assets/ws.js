// 文件上传处理模块
(function() {
    // WebSocket相关变量
    let ws;
    const deviceId = generateDeviceId(); // 生成设备唯一标识
    const chunkSize = 1024 * 64; // 每个分块大小（64KB）
    // 上传队列变量
    let uploadQueue = [];
    let isUploading = false;
    let currentUploadArea = null;
    
    // 文件夹上传进度跟踪
    let folderUploadInfo = {
        totalFiles: 0,
        completedFiles: 0,
        totalSize: 0,        // 添加：总大小
        uploadedSize: 0,     // 添加：已上传大小
        currentFolderId: null,
        fileProgress: {}     // 添加：跟踪每个文件的进度
    };
    
    // 生成设备唯一标识
    function generateDeviceId() {
        // 结合时间戳和随机数生成唯一标识
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 连接WebSocket并开始上传
    function connectWebSocketAndUpload(files, currentPath, uploadArea) {
        // 保存上传区域引用
        currentUploadArea = uploadArea;
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // 在URL中添加设备ID参数
            const wsUrl = `${protocol}//${window.location.host}/file/file-upload?deviceId=${deviceId}`;

            // 显示连接中状态
            uploadArea.innerHTML = '<div class="connecting-message">正在连接服务器...</div>';
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                // 连接成功，清除连接中消息
                const connectingMsg = uploadArea.querySelector('.connecting-message');
                if (connectingMsg) connectingMsg.remove();
                
                // 准备上传队列并开始上传
                prepareUploadQueue(files, currentPath, uploadArea);
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data, uploadArea);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket错误:', error);
                uploadArea.innerHTML = `<div class="error-message">上传失败，请稍后再试</div>`;
                isUploading = false;
            };
            
            ws.onclose = (event) => {
                console.log('WebSocket连接关闭，代码:', event.code, '原因:', event.reason);
                isUploading = false;
                
                // 处理认证失败的情况 (关闭代码 4001)
                if (event.code === 4001) {
                    uploadArea.innerHTML = `<div class="error-message">认证失败：${event.reason || '请先登录'}</div>`;
                    
                    // 3秒后重定向到登录页面
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 3000);
                }
            };
        } else {
            // 如果WebSocket已连接，直接准备上传队列
            prepareUploadQueue(files, currentPath, uploadArea);
        }
    }

    // 准备上传队列
    function prepareUploadQueue(files, currentPath, uploadArea) {
        // 清空当前队列
        uploadQueue = [];
        
        // 清空上传区域内容
        uploadArea.innerHTML = '';
        
        // 重置文件夹上传信息
        folderUploadInfo = {
            totalFiles: 0,
            completedFiles: 0,
            totalSize: 0,
            uploadedSize: 0,
            currentFolderId: null,
            fileProgress: {}
        };
        
        // 计算文件夹中的总文件数和总大小
        files.forEach(item => {
            if (item.type === 'folder') {
                folderUploadInfo.totalFiles += item.files.length;
                // 计算总大小
                item.files.forEach(file => {
                    folderUploadInfo.totalSize += file.size;
                });
            }
        });
        
        // 将文件添加到队列
        files.forEach((item, index) => {
            if (item.type === 'file') {
                uploadQueue.push({
                    type: 'file',
                    fileId: `file_${index}`,
                    file: item.file,
                    name: item.name,
                    path: currentPath
                });
            } else if (item.type === 'folder') {
                // 先添加创建文件夹的任务
                const folderPath = `${currentPath}/${item.name}`.replace(/\/\//g, '/');
                uploadQueue.push({
                    type: 'createFolder',
                    path: folderPath
                });
                
                // 然后添加文件夹中的文件
                item.files.forEach((file, fileIndex) => {
                    const relativePath = file.webkitRelativePath;
                    uploadQueue.push({
                        type: 'file',
                        fileId: `${index}_${fileIndex}`,
                        file: file,
                        name: relativePath,
                        path: currentPath,
                        isInFolder: true,
                        isPartOfFolder: true  // 标记为文件夹的一部分
                    });
                });
            }
        });
        
        // 创建当前文件进度条容器（保持为空，等待第一个文件上传）
        createCurrentFileProgressContainer(uploadArea);
        
        // 开始上传队列
        processNextUpload(uploadArea);
    }
    
    // 创建当前文件进度条容器
    function createCurrentFileProgressContainer(uploadArea) {
        const container = document.createElement('div');
        container.className = 'current-file-container';
        container.id = 'current-file-progress-container';
        container.innerHTML = '<div class="current-file-title">当前文件上传进度</div>';
        uploadArea.appendChild(container);
    }
    
    // 处理队列中的下一个上传
    function processNextUpload(uploadArea) {
        if (uploadQueue.length === 0 || isUploading) {
            return;
        }
        
        isUploading = true;
        const item = uploadQueue.shift();
        
        if (item.type === 'createFolder') {
            // 处理创建文件夹
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    deviceId: deviceId,  // 添加设备ID
                    type: 'createFolder',
                    path: item.path
                }));
                
                // 创建文件夹后立即处理下一个任务
                isUploading = false;
                processNextUpload(uploadArea);
            }
        } else if (item.type === 'file') {
            // 清空当前文件进度条容器并创建新的进度条
            updateCurrentFileProgressBar(item.name, item.fileId);
            
            // 发送文件
            sendFileInChunks(item.file, item.fileId, item.name, item.path, item.isInFolder, item.isPartOfFolder);
        }
    }
    
    // 更新当前文件进度条
    function updateCurrentFileProgressBar(fileName, fileId) {
        const container = document.getElementById('current-file-progress-container');
        if (container) {
            // 保留标题，清除其他内容
            const title = container.querySelector('.current-file-title');
            container.innerHTML = '';
            if (title) container.appendChild(title);
            
            // 添加新的文件进度条
            const progressBarElement = document.createElement('div');
            progressBarElement.className = 'file-progress-container';
            progressBarElement.innerHTML = `
                <div class="file-name">${fileName}</div>
                <div class="upload-progress">
                    <div class="upload-progress-text">正在上传文件...</div>
                    <div class="upload-progress-bar">
                        <div class="progress-fill" id="progress-fill-${fileId}"></div>
                    </div>
                </div>
            `;
            container.appendChild(progressBarElement);
        }
    }
    
    // 更新文件夹总进度 - 更新处理逻辑
    function updateFolderProgress(fileId, uploadedBytes, totalBytes, isComplete = false) {
        if (folderUploadInfo.totalSize === 0) return;
        
        // 更新当前文件的进度
        folderUploadInfo.fileProgress[fileId] = {
            uploaded: uploadedBytes,
            total: totalBytes
        };
        
        // 如果文件已完成
        if (isComplete) {
            folderUploadInfo.completedFiles++;
            // 确保完成的文件计算进度为100%
            folderUploadInfo.fileProgress[fileId].uploaded = folderUploadInfo.fileProgress[fileId].total;
        }
        
        // 计算所有文件的总上传量
        let totalUploaded = 0;
        Object.values(folderUploadInfo.fileProgress).forEach(progress => {
            totalUploaded += progress.uploaded;
        });
        
        folderUploadInfo.uploadedSize = totalUploaded;
        
        // 计算总进度百分比
        const percent = Math.min(100, Math.floor((totalUploaded / folderUploadInfo.totalSize) * 100));
        
    }

    // 辅助函数: 格式化文件大小
    function formatFileSize(bytes) {
        if (typeof window.fileAcquisition !== 'undefined' && typeof window.fileAcquisition.formatFileSize === 'function') {
            return window.fileAcquisition.formatFileSize(bytes);
        }
        
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 分块发送文件 (修改为支持完成回调)
    function sendFileInChunks(file, fileId, fileName, path, isInFolder = false, isPartOfFolder = false) {
        let offset = 0;
        const totalChunks = Math.ceil(file.size / chunkSize);
        // 检测是否是文件夹中的文件
        isInFolder = isInFolder || fileName.includes('/');

        function sendNextChunk() {
            const chunk = file.slice(offset, offset + chunkSize);
            const isLastChunk = offset + chunkSize >= file.size;

            // 使用FileReader将文件块转换为Base64字符串
            const reader = new FileReader();
            reader.onload = function(e) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    // 提取Base64编码，去掉前缀 "data:application/octet-stream;base64,"
                    const base64data = e.target.result.split(',')[1];

                    const message = {
                        deviceId: deviceId,  // 添加设备ID
                        fileId: fileId,
                        fileName: fileName,
                        path: path,
                        chunk: base64data,  // 发送Base64编码的数据
                        offset: offset,
                        totalSize: file.size,
                        isLastChunk: isLastChunk,
                        isInFolder: isInFolder,
                        isPartOfFolder: isPartOfFolder
                    };

                    // 如果是文件夹中的文件，需要确保服务器创建对应的文件夹结构
                    if (isInFolder && offset === 0) {
                        // 第一块数据时发送创建文件夹的指令
                        // 从文件相对路径中提取文件夹路径
                        const folderPath = fileName.substring(0, fileName.lastIndexOf('/'));
                        message.folderPath = folderPath;
                    }

                    ws.send(JSON.stringify(message));

                    offset += chunkSize;
                    if (!isLastChunk) {
                        setTimeout(sendNextChunk, 10); // 控制发送频率
                    }
                    // 如果是最后一块，不需要做任何事，等待服务器的complete消息
                } else {
                    console.error('WebSocket未连接，无法发送数据');
                    isUploading = false;
                }
            };

            // 读取文件块并转换为Base64
            reader.readAsDataURL(chunk);
        }

        sendNextChunk();
    }

    // 处理WebSocket消息 (修改为支持队列处理和两种进度条)
    function handleWebSocketMessage(data, uploadArea) {
        if (data.type === 'authError') {
            // 处理认证错误
            uploadArea.innerHTML = `<div class="error-message">认证错误: ${data.message}</div>`;
            
            // 3秒后重定向到登录页面
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
            
            // 关闭连接
            closeWebSocketConnection();
            return;
        }
        
        if (data.type === 'progress') {
            const progressFill = document.getElementById(`progress-fill-${data.fileId}`);
            const progressText = progressFill ? progressFill.parentElement.previousElementSibling : null;
            if (progressFill) {
                progressFill.style.width = `${data.percent}%`;
                progressText.textContent = `正在上传文件... ${data.percent}%`;
            }
            
            // 如果是文件夹的一部分，还要更新文件夹总进度
            if (data.isPartOfFolder) {
                // 修复：更准确地计算已上传字节数
                const fileSize = data.totalSize || 0;
                const uploadedBytes = Math.floor(fileSize * (data.percent / 100));
                updateFolderProgress(data.fileId, uploadedBytes, fileSize);
            }
        } else if (data.type === 'complete') {
            const progressFill = document.getElementById(`progress-fill-${data.fileId}`);
            const progressText = progressFill ? progressFill.parentElement.previousElementSibling : null;
            if (progressFill) {
                progressFill.style.width = '100%';
            }
            if (progressText) {
                progressText.textContent = '文件上传完成';
            }

            // 检查是否是文件夹的一部分
            if (data.isPartOfFolder) {
                // 修复：确保将文件的全部大小计入进度
                const fileSize = data.totalSize || 0;
                updateFolderProgress(data.fileId, fileSize, fileSize, true);
            }
            
            // 标记当前文件上传完成
            isUploading = false;
            
            // 检查是否还有文件需要上传
            if (uploadQueue.length > 0) {
                // 处理下一个文件
                setTimeout(() => {
                    processNextUpload(currentUploadArea || uploadArea);
                },); // 短暂延迟，让用户可以看到完成状态
            } else {
                // 全部文件上传完成
                if (window.fileAcquisition && window.fileAcquisition.loadFilesFromServer) {
                    // 清空选择的文件列表
                    if (window.resetSelectedFiles) {
                        window.resetSelectedFiles();
                    }
                    
                    // 显示上传完成消息，但保留进度条显示
                    setTimeout(() => {
                        // 添加上传完成的消息
                        const emptyMessage = document.createElement('div');
                        emptyMessage.className = 'upload-complete-message';
                        uploadArea.appendChild(emptyMessage);
                        
                        // 刷新文件列表，使用当前路径而不是上传的路径
                        window.fileAcquisition.loadFilesFromServer(window.fileAcquisition.getCurrentPath() || '/');
                        
                        // 关闭WebSocket连接
                        closeWebSocketConnection();
                    }, 800); // 延迟执行，确保用户可以看到完成状态
                }
            }
        } else if (data.type === 'error') {
            uploadArea.innerHTML = `<div class="error-message">上传失败: ${data.message}</div>`;
            // 如果错误消息表明是认证问题，重定向到登录页
            if (data.message && data.message.includes('未登录') || data.message.includes('未授权')) {
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            }
            // 出错时也关闭连接
            closeWebSocketConnection();
            isUploading = false;
        }
    }

    // 关闭WebSocket连接函数
    function closeWebSocketConnection() {
        if (ws) {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            ws = null; // 重置ws变量，确保下次上传时创建新的连接
        }
        isUploading = false;
    }

    // 重试连接功能
    function retryConnection(files, currentPath, uploadArea, retryCount = 0) {
        // 最多重试3次
        if (retryCount >= 3) {
            uploadArea.innerHTML = `<div class="error-message">连接服务器失败，请检查网络后重试</div>`;
            return;
        }
        
        uploadArea.innerHTML = `<div class="connecting-message">连接失败，正在重试 (${retryCount + 1}/3)...</div>`;
        
        // 延迟1秒后重试
        setTimeout(() => {
            connectWebSocketAndUpload(files, currentPath, uploadArea);
        }, 1000);
    }

    // 暴露API
    window.fileUploader = {
        startUpload: function(files, currentPath, uploadArea) {
            // 确保每次上传前先关闭之前的连接
            closeWebSocketConnection();
            connectWebSocketAndUpload(files, currentPath, uploadArea);
        },
        
        refreshFileList: function() {
            if (window.fileAcquisition && window.fileAcquisition.loadFilesFromServer) {
                window.fileAcquisition.loadFilesFromServer(window.fileAcquisition.getCurrentPath() || '/');
                closeWebSocketConnection();
            }
        }
    };
})();

// 增强全局认证检查处理函数，添加对WebSocket的支持
window.checkAuthStatus = function(response) {
    // 处理HTTP 401状态码
    if (response && response.status === 401) {
        window.location.href = '/login';
        throw new Error('未登录或会话已过期');
    }
    
    // 处理响应JSON中的未登录信息
    if (response && typeof response === 'object' && 
        response.success === false && 
        (response.message === "未登录或会话已过期" || 
         response.message === "未授权" || 
         response.message.includes("认证失败"))) {
        window.location.href = '/login';
        throw new Error('未登录或会话已过期');
    }
    
    return response;
};

// 全局处理WebSocket认证错误
window.handleWebSocketAuthError = function(event) {
    if (event.code === 4001 || 
        (event.reason && (
            event.reason.includes('未登录') || 
            event.reason.includes('未授权') || 
            event.reason.includes('认证')
        ))) {
        console.log('WebSocket认证失败，即将重定向到登录页面');
        
        // 显示错误消息
        const uploadArea = document.querySelector('.upload-area') || document.createElement('div');
        uploadArea.innerHTML = `<div class="error-message">认证失败：${event.reason || '请先登录'}</div>`;
        
        // 3秒后重定向到登录页面
        setTimeout(() => {
            window.location.href = '/login';
        }, 3000);
        
        return true; // 表示已处理
    }
    return false; // 表示未处理
};    