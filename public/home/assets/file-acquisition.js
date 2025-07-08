// 文件获取和展示模块
(function() {
    // 文件系统相关变量
    let currentPath = "/"; // 当前路径，根目录为"/"
    let currentPathHistory = []; // 路径历史记录，用于返回上一级
    let fileListContainer;
    let currentPathElement;

    // 获取上一级路径
    function getParentPath(path) {
        // 移除末尾的斜杠
        path = path.replace(/\/$/, '');
        
        // 如果是根目录，保持不变
        if (path === '') {
            return '/';
        }
        
        // 分割路径
        const pathParts = path.split('/').filter(part => part !== '');
        
        // 如果只有一级路径，返回根目录
        if (pathParts.length <= 1) {
            return '/';
        }
        
        // 移除最后一个路径部分，重新构建路径
        pathParts.pop();
        return '/' + pathParts.join('/') + '/';
    }
    
    // 重建完整的路径历史
    function rebuildPathHistory(currentPath) {
        // 移除末尾的斜杠
        currentPath = currentPath.replace(/\/$/, '');
        
        // 分割路径
        const pathParts = currentPath.split('/').filter(part => part !== '');
        
        // 构建路径历史
        const pathHistory = ['/'];
        
        // 逐步构建路径
        for (let i = 0; i < pathParts.length - 1; i++) {
            const partialPath = '/' + pathParts.slice(0, i + 1).join('/') + '/';
            pathHistory.push(partialPath);
        }
        
        return pathHistory;
    }
    
    // 初始化模块
    function initialize(container, pathElement) {
        fileListContainer = container;
        currentPathElement = pathElement;
        
        // 尝试从 pathHandler 获取初始路径
        const initialPath = window.pathHandler ? window.pathHandler.extractPathFromURL() : '/';
        
        // 如果初始路径不是根目录，重建路径历史
        if (initialPath !== '/') {
            currentPathHistory = rebuildPathHistory(initialPath);
        } else {
            currentPathHistory = [];
        }
        
        loadFilesFromServer(initialPath);
    }
    
    // 从服务器加载文件列表
    function loadFilesFromServer(path) {
        currentPath = path;
        currentPathElement.textContent = path === "/" ? "根目录" : path;

        fetch('/file-acquisition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path })
        })
        .then(response => {
            // 使用全局认证检查函数
            if (window.checkAuthStatus) {
                window.checkAuthStatus(response);
            }
            
            if (!response.ok) {
                throw new Error(`服务器返回错误状态码 ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 使用全局认证检查函数
            if (window.checkAuthStatus) {
                window.checkAuthStatus(data);
            }
            renderFileList(data);
        })
        .catch(error => {
            // 使用全局错误处理函数
            if (window.handleAuthError && window.handleAuthError(error)) {
                return; // 认证错误已处理
            }
            fileListContainer.innerHTML = `<div class="error-message">文件列表加载失败</div>`;
        });
    }
    
    // 渲染文件列表
    function renderFileList(data) {
        fileListContainer.innerHTML = '';
        
        // 如果不是根目录，添加返回上一级的选项
        if (currentPath !== "/") {
            const backItem = document.createElement('div');
            backItem.className = 'file-item-row file-back-item';
            backItem.innerHTML = `
                <div class="file-item-name" style="cursor: pointer;" >
                    <div class="file-item-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#555555"/>
                        </svg>
                    </div>
                    <span>返回上一级</span>
                </div>
                <div class="file-item-share"></div>
                <div class="file-item-download"></div>
                <div class="file-item-delete"></div>
                <div class="file-item-size"></div>
                <div class="file-item-time"></div>
            `;
            
            backItem.addEventListener('click', function() {
                navigateBack();
            });
            
            fileListContainer.appendChild(backItem);
        }
        
        // 对文件夹和文件进行排序（a-z）
        data.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        data.files.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        
        // 先显示文件夹
        data.folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'file-item-row folder-item';
            folderItem.innerHTML = `
                <div class="file-item-name">
                    <div class="file-item-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#90caf9"/>
                        </svg>
                    </div>
                    <span>${folder.name}</span>
                </div>
                <div class="file-item-share">分享</div>
                <div class="file-item-download">下载</div>
                <div class="file-item-delete">删除</div>
                <div class="file-item-size">-</div>
                <div class="file-item-time">${formatDateTime(folder.modified)}</div>
            `;
            
            // 添加文件夹点击事件
            const nameElement = folderItem.querySelector('.file-item-name');
            nameElement.addEventListener('click', function(e) {
                navigateToFolder(folder.path);
            });
            
            // 添加下载按钮点击事件
            const downloadBtn = folderItem.querySelector('.file-item-download');
            downloadBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.downloadFileOrFolder(folder.path, folder.name, 'folder');
                }
            });
            
            // 添加删除按钮点击事件
            const deleteBtn = folderItem.querySelector('.file-item-delete');
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.showDeleteConfirmModal(folder.path, folder.name, 'folder', function() {
                        loadFilesFromServer(currentPath); // 刷新当前目录
                    });
                }
            });
            
            fileListContainer.appendChild(folderItem);
        });
        
        // 再显示文件
        data.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item-row';
            fileItem.innerHTML = `
                <div class="file-item-name">
                    <div class="file-item-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 5H7V5h6v2z" fill="#a5d6a7"/>
                        </svg>
                    </div>
                    <span>${file.name}</span>
                </div>
                <div class="file-item-share">分享</div>
                <div class="file-item-download">下载</div>
                <div class="file-item-delete">删除</div>
                <div class="file-item-size">${formatFileSize(file.size)}</div>
                <div class="file-item-time">${formatDateTime(file.modified)}</div>
            `;
            
            // 添加下载按钮点击事件
            const downloadBtn = fileItem.querySelector('.file-item-download');
            downloadBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.downloadFileOrFolder(file.path, file.name, 'file');
                }
            });
            
            // 添加删除按钮点击事件
            const deleteBtn = fileItem.querySelector('.file-item-delete');
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.showDeleteConfirmModal(file.path, file.name, 'file', function() {
                        loadFilesFromServer(currentPath); // 刷新当前目录
                    });
                }
            });
            
            fileListContainer.appendChild(fileItem);
        });
        
        // 确保分享按钮功能被应用
        if (window.updateShareButtons) {
            // 立即调用一次
            window.updateShareButtons();
            
            // 确保100ms后再次调用，解决可能的时序问题
            setTimeout(() => {
                window.updateShareButtons();
            }, 100);
        } else {
            // 如果updateShareButtons还未加载，等待它加载并执行
            const checkInterval = setInterval(() => {
                if (window.updateShareButtons) {
                    window.updateShareButtons();
                    clearInterval(checkInterval);
                }
            }, 100);
            
            // 最多等待5秒
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 5000);
        }
    }
    
    // 返回上一级
    function navigateBack() {
        if (currentPathHistory.length > 0) {
            const previousPath = currentPathHistory.pop();
            loadFilesFromServer(previousPath);
            
            // 触发路径变更事件
            const event = new CustomEvent('filePathChanged', {
                detail: { path: previousPath }
            });
            document.dispatchEvent(event);
        } else {
            // 如果没有历史记录，计算当前路径的上一级
            const parentPath = getParentPath(currentPath);
            
            loadFilesFromServer(parentPath);
            
            // 触发路径变更事件
            const event = new CustomEvent('filePathChanged', {
                detail: { path: parentPath }
            });
            document.dispatchEvent(event);
        }
    }
    
    // 导航到文件夹
    function navigateToFolder(path) {
        // 在导航到新文件夹之前，将当前路径添加到历史记录
        currentPathHistory.push(currentPath);
        
        loadFilesFromServer(path);
        
        // 触发路径变更事件
        const event = new CustomEvent('filePathChanged', {
            detail: { path: path }
        });
        document.dispatchEvent(event);
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 格式化时间日期
    function formatDateTime(isoDateString) {
        if (!isoDateString) return '-';
        
        try {
            const date = new Date(isoDateString);
            
            // 获取年、月、日、时、分
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            // 格式化为 "YYYY-MM-DD HH:MM"
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch (e) {
            console.error('日期格式化错误:', e);
            return isoDateString || '-';
        }
    }

    // 获取当前路径
    function getCurrentPath() {
        return currentPath;
    }

    // 暴露接口
    window.fileAcquisition = {
        initialize: initialize,
        loadFilesFromServer: loadFilesFromServer,
        getCurrentPath: getCurrentPath,
        formatFileSize: formatFileSize,
        formatDateTime: formatDateTime
    };
})();
