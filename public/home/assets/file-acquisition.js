(function () {

    let currentPath = "/";
    let currentPathHistory = [];
    let fileListContainer;
    let currentPathElement;

    // 处理文件预览
    function handlePreview(filePath) {
        fetch('/view/random-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: filePath })
        })
            .then(response => {
                // 使用全局认证检查函数
                if (window.checkAuthStatus) {
                    window.checkAuthStatus(response);
                }

                if (!response.ok) {
                    throw new Error(`预览请求失败，状态码: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // 使用全局认证检查函数
                if (window.checkAuthStatus) {
                    window.checkAuthStatus(data);
                }

                if (data.success && data.previewUrl) {
                    // 在新窗口中打开预览页面
                    window.open(data.previewUrl, '_blank');
                } else {
                    console.error('预览失败:', data);
                    alert('文件预览失败，请稍后重试');
                }
            })
            .catch(error => {
                // 使用全局错误处理函数
                if (window.handleAuthError && window.handleAuthError(error)) {
                    return; // 认证错误已处理
                }
                console.error('预览请求错误:', error);
                alert('文件预览失败，请稍后重试');
            });
    }

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
                    ${window.VectorIcons.returnIcon}
                    </div>
                    <span>返回上一级</span>
                </div>
                <div class="file-item-share"></div>
                <div class="file-item-download"></div>
                <div class="file-item-delete"></div>
                <div class="file-item-size"></div>
                <div class="file-item-time"></div>
            `;

            backItem.addEventListener('click', function () {
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
                    ${window.VectorIcons.folderIcon}
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
            nameElement.addEventListener('click', function (e) {
                navigateToFolder(folder.path);
            });

            // 添加下载按钮点击事件
            const downloadBtn = folderItem.querySelector('.file-item-download');
            downloadBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.downloadFileOrFolder(folder.path, folder.name, 'folder');
                }
            });

            // 添加删除按钮点击事件
            const deleteBtn = folderItem.querySelector('.file-item-delete');
            deleteBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.showDeleteConfirmModal(folder.path, folder.name, 'folder', function () {
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

            // 获取文件扩展名
            const extension = file.name.split('.').pop().toLowerCase();

            // 定义可预览的文件类型
            const previewableTypes = ['txt', 'html', 'htm', 'xml', 'css', 'json', 'js', 'md', 'java', 'py', 'cpp', 'c', 'php', 'rb', 'go', 'swift', 'kotlin', 'sql', 'sh', 'bat', 'cmd', 'yaml', 'yml', 'ini', 'log', 'csv', 'ts', 'less', 'sass', 'scss', 'pl', 'lua'];

            // 构建文件项的 HTML
            let fileItemHTML = `
                <div class="file-item-name">
                    <div class="file-item-icon">
                        ${getFileIcon(file.name)}
                    </div>
                    <span>${file.name}</span>
                </div>
                ${previewableTypes.includes(extension) ? '<div class="file-item-preview">预览</div>' : ''}
                <div class="file-item-share">分享</div>
                <div class="file-item-download">下载</div>
                <div class="file-item-delete">删除</div>
                <div class="file-item-size">${formatFileSize(file.size)}</div>
                <div class="file-item-time">${formatDateTime(file.modified)}</div>
            `;

            fileItem.innerHTML = fileItemHTML;

            // 只为可预览文件类型添加预览事件
            if (previewableTypes.includes(extension)) {
                const previewBtn = fileItem.querySelector('.file-item-preview');
                previewBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    handlePreview(file.path);
                });
            }

            // 添加下载按钮点击事件
            const downloadBtn = fileItem.querySelector('.file-item-download');
            downloadBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.downloadFileOrFolder(file.path, file.name, 'file');
                }
            });

            // 添加删除按钮点击事件
            const deleteBtn = fileItem.querySelector('.file-item-delete');
            deleteBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (window.fileOperations) {
                    window.fileOperations.showDeleteConfirmModal(file.path, file.name, 'file', function () {
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

    // 根据文件扩展名获取对应的图标
    function getFileIcon(fileName) {
        if (!fileName) return window.VectorIcons.emptyIcon;

        // 获取文件扩展名（转为小写）
        const extension = fileName.split('.').pop().toLowerCase();

        // 根据扩展名返回对应图标
        switch (extension) {
            case 'exe':
                return window.VectorIcons.exeIcon;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'svg':
                return window.VectorIcons.imgIcon || window.VectorIcons.file;
            case 'html':
            case 'htm':
                return window.VectorIcons.htmlIcon;
            case 'zip':
            case 'rar':
            case '7z':
            case 'tar':
            case 'gz':
                return window.VectorIcons.zipIcon;
            case 'css':
                return window.VectorIcons.cssIcon;
            case 'json':
                return window.VectorIcons.jsonIcon;
            case 'py':
                return window.VectorIcons.pyIcon;
            case 'js':
                return window.VectorIcons.jsIcon;
            case 'txt':
                return window.VectorIcons.txtIcon;
            default:
                return window.VectorIcons.file;
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
