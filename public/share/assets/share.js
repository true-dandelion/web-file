document.addEventListener('DOMContentLoaded', () => {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');
    const extractCode = urlParams.get('extract');
    const error = urlParams.get('error');
    const folderPath = urlParams.get('share-folder') || '';

    // 获取页面元素
    const codeInputPage = document.getElementById('codeInputPage');
    const downloadPage = document.getElementById('downloadPage');
    const errorMessage = document.getElementById('errorMessage');
    const submitCodeBtn = document.getElementById('submitCode');
    const extractCodeInput = document.getElementById('extractCode');
    const breadcrumb = document.getElementById('breadcrumb');

    // 添加加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingIndicator);

    // 添加模态窗口
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3 class="modal-title">提示</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                <p class="modal-message"></p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-confirm">确定</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalContainer);

    // 设置模态窗口关闭事件
    const modalClose = modalContainer.querySelector('.modal-close');
    const modalConfirm = modalContainer.querySelector('.modal-confirm');
    modalClose.addEventListener('click', hideModal);
    modalConfirm.addEventListener('click', hideModal);

    // 初始状态：隐藏所有页面和错误信息
    codeInputPage.style.display = 'none';
    downloadPage.style.display = 'none';
    errorMessage.style.display = 'none';
    loadingIndicator.style.display = 'none';

    // 处理错误URL参数
    if (error) {
        if (error === 'not_found') {
            showError('分享的文件不存在或已过期');
        } else if (error === 'file_not_found') {
            showError('文件不存在或已被删除');
        } else {
            showError('出现错误: ' + error);
        }
        return;
    }

    // 如果没有文件ID，显示错误
    if (!fileId) {
        showError('无效的分享链接');
        return;
    }

    // 无论是否有提取码，都立即向后端发送校验请求
    showLoading();

    // 构建请求URL
    let contentUrl = `/share/share/content?fileId=${fileId}`;
    if (extractCode) {
        contentUrl += `&extract=${extractCode}`;
    }

    // 发送校验请求
    fetch(contentUrl)
        .then(response => response.json())
        .then(data => {
            hideLoading();

            if (data.success) {
                // 校验成功，处理内容
                if (folderPath) {
                    // 如果有文件夹路径，则请求文件夹内容
                    showLoading();
                    fetchFolderContent(fileId, extractCode, folderPath)
                        .then(response => {
                            hideLoading();
                            if (response.success) {
                                displayFolderContent(response, fileId, extractCode);
                                updatePageUrl(fileId, extractCode, folderPath);
                            } else {
                                handleContentError(response, fileId, folderPath);
                            }
                        })
                        .catch(error => {
                            hideLoading();
                            console.error('获取文件夹内容出错:', error);
                            showError('获取文件夹内容失败，请稍后重试');
                        });
                } else {
                    // 否则显示文件/根目录内容
                    displayContent(data, fileId, extractCode);
                    updatePageUrl(fileId, extractCode, '');
                }
            } else {
                // 校验失败，检查是否需要提取码
                if (data.requiresExtractCode) {
                    // 需要提取码，显示输入页面
                    showCodeInputPage();
                    if (extractCode) {
                        showErrorMessage('提取码错误，请重新输入');
                    }

                    // 设置提取码提交按钮事件
                    setupExtractCodeSubmission(fileId, folderPath);
                } else {
                    // 其他错误
                    showError(data.error || '获取内容失败');
                }
            }
        })
        .catch(error => {
            hideLoading();
            console.error('校验请求出错:', error);
            showError('校验请求失败，请稍后重试');
        });

    /**
     * 判断文件是否支持预览
     * @param {string} fileName - 文件名
     * @returns {boolean} - 是否支持预览
     */
    function isPreviewableFile(fileName) {
        const supportedExtensions = ['.txt', '.html', '.htm', '.xml', '.css', '.json', '.js', '.md', '.java', '.py', '.cpp', '.c', '.php', '.rb', '.go', '.swift', '.kotlin', '.sql', '.sh', '.bat', '.cmd', '.yaml', '.yml', '.ini', '.log', '.csv', '.ts', '.less', '.sass', '.scss', '.pl', '.lua'];
        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return supportedExtensions.includes(extension);
    }

    /**
     * 显示加载中指示器
     */
    function showLoading() {
        loadingIndicator.style.display = 'flex';
    }

    /**
     * 隐藏加载中指示器
     */
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    /**
     * 更新页面URL，不触发页面重载
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @param {string} folderPath - 文件夹路径
     */
    function updatePageUrl(fileId, extractCode, folderPath) {
        let url = `/share/share?fileId=${fileId}`;
        if (extractCode) {
            url += `&extract=${extractCode}`;
        }
        if (folderPath) {
            url += `&share-folder=${encodeURIComponent(folderPath)}`;
        }

        // 使用 History API 更新 URL 而不刷新页面
        window.history.pushState({ fileId, extractCode, folderPath }, '', url);
    }

    // 监听前进/后退按钮事件
    window.onpopstate = function (event) {
        // 处理浏览器的前进/后退导航
        if (event.state) {
            const { fileId, extractCode, folderPath } = event.state;
            loadContent(fileId, extractCode, folderPath);
        }
    };

    /**
     * 根据参数加载内容
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @param {string} folderPath - 文件夹路径
     */
    function loadContent(fileId, extractCode, folderPath) {
        if (!extractCode) {
            showCodeInputPage();
            setupExtractCodeSubmission(fileId, folderPath);
            return;
        }

        if (folderPath) {
            showLoading();
            fetchFolderContent(fileId, extractCode, folderPath)
                .then(response => {
                    hideLoading();
                    if (response.success) {
                        displayFolderContent(response, fileId, extractCode);
                    } else {
                        handleContentError(response, fileId, folderPath);
                    }
                })
                .catch(error => {
                    hideLoading();
                    console.error('获取文件夹内容出错:', error);
                    showError('获取文件夹内容失败，请稍后重试');
                });
        } else {
            showLoading();
            fetchFileContent(fileId, extractCode)
                .then(response => {
                    hideLoading();
                    if (response.success) {
                        displayContent(response, fileId, extractCode);
                    } else {
                        handleContentError(response, fileId, folderPath);
                    }
                })
                .catch(error => {
                    hideLoading();
                    console.error('获取文件内容出错:', error);
                    showError('获取文件内容失败，请稍后重试');
                });
        }
    }

    /**
     * 处理内容加载错误
     * @param {Object} response - 响应数据
     * @param {string} fileId - 文件ID
     * @param {string} folderPath - 文件夹路径
     */
    function handleContentError(response, fileId, folderPath) {
        if (response.requiresExtractCode) {
            showCodeInputPage();
            showErrorMessage('提取码错误，请重新输入');
            setupExtractCodeSubmission(fileId, folderPath);
        } else {
            showError(response.error || '获取内容失败');
        }
    }

    /**
     * 设置提取码提交事件
     * @param {string} fileId - 文件ID
     * @param {string} folderPath - 文件夹路径(可选)
     */
    function setupExtractCodeSubmission(fileId, folderPath = '') {
        // 解除之前可能的事件绑定
        submitCodeBtn.removeEventListener('click', submitCodeHandler);
        extractCodeInput.removeEventListener('keypress', keypressHandler);

        // 提取码提交处理函数
        function submitCodeHandler() {
            const code = extractCodeInput.value.trim();
            if (!code) {
                showErrorMessage('请输入提取码');
                return;
            }

            // 验证提取码
            showLoading();
            verifyExtractCode(fileId, code)
                .then(isValid => {
                    hideLoading();
                    if (isValid) {
                        // 验证成功，加载内容
                        loadContent(fileId, code, folderPath);

                        // 更新 URL
                        updatePageUrl(fileId, code, folderPath);
                    } else {
                        // 验证失败，显示错误
                        showErrorMessage('提取码错误，请重新输入');
                    }
                })
                .catch(error => {
                    hideLoading();
                    showErrorMessage('验证失败，请重试');
                    console.error('验证提取码出错:', error);
                });
        }

        // 回车键处理函数
        function keypressHandler(e) {
            if (e.key === 'Enter') {
                submitCodeBtn.click();
            }
        }

        // 绑定事件
        submitCodeBtn.addEventListener('click', submitCodeHandler);
        extractCodeInput.addEventListener('keypress', keypressHandler);
    }

    /**
     * 获取文件内容
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @returns {Promise<Object>} - 文件内容信息
     */
    async function fetchFileContent(fileId, extractCode) {
        try {
            // 构建请求URL
            let url = `/share/share/content?fileId=${fileId}`;
            if (extractCode) {
                url += `&extract=${extractCode}`;
            }

            const response = await fetch(url);

            // 这里假设API总是返回JSON，即使是错误
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('获取文件内容出错:', error);
            return { success: false, error: '请求失败' };
        }
    }

    /**
     * 获取文件夹内容
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @param {string} path - 文件夹路径
     * @returns {Promise<Object>} - 文件夹内容信息
     */
    async function fetchFolderContent(fileId, extractCode, path) {
        try {
            const response = await fetch('/share/share-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileId: fileId,
                    extractCode: extractCode,
                    path: path
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('获取文件夹内容出错:', error);
            return { success: false, error: '请求失败' };
        }
    }

    /**
     * 验证提取码
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @returns {Promise<boolean>} - 是否有效
     */
    async function verifyExtractCode(fileId, extractCode) {
        try {
            const response = await fetch('/share/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileId, extractCode })
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('验证提取码出错:', error);
            return false;
        }
    }

    /**
     * 显示提取码输入页面
     */
    function showCodeInputPage() {
        // 隐藏其他页面，显示提取码输入页面
        codeInputPage.style.display = 'flex';
        downloadPage.style.display = 'none';

        // 确保错误消息初始隐藏
        errorMessage.style.display = 'none';

        // 清空之前的输入
        extractCodeInput.value = '';

        // 清除可能存在的预览区域
        const prevPreviewArea = document.querySelector('.preview-area');
        if (prevPreviewArea) {
            prevPreviewArea.remove();
        }

        // 设置焦点到输入框
        setTimeout(() => {
            extractCodeInput.focus();
        }, 300);
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    function showErrorMessage(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';

        // 添加轻微震动效果
        codeInputPage.classList.add('shake');
        setTimeout(() => {
            codeInputPage.classList.remove('shake');
        }, 500);
    }

    /**
     * 显示致命错误（覆盖整个页面）
     * @param {string} message - 错误消息
     */
    function showError(message) {
        // 创建错误显示容器
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        errorContainer.innerHTML = `
            <div class="error-box">
                <h2>出错了</h2>
                <p>${message}</p>
                <a href="/login">返回首页</a>
            </div>
        `;

        // 清空并添加到body
        document.body.innerHTML = '';
        document.body.appendChild(errorContainer);
    }

    /**
     * 显示文件内容
     * @param {Object} contentData - 文件内容数据
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     */
    function displayContent(contentData, fileId, extractCode) {
        codeInputPage.style.display = 'none';
        downloadPage.style.display = 'block';

        // 清除可能存在的预览区域
        const prevPreviewArea = document.querySelector('.preview-area');
        if (prevPreviewArea) {
            prevPreviewArea.remove();
        }

        // 更新面包屑
        updateBreadcrumb(contentData.fileName, [{ name: contentData.fileName, path: '' }], fileId, extractCode);

        // 创建文件列表表格
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        // 创建表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>名称</th>
                <th>大小</th>
                <th>修改时间</th>
                <th>操作</th>
            </tr>
        `;
        fileList.appendChild(thead);

        // 创建表体
        const tbody = document.createElement('tbody');

        if (contentData.type === 'directory') {
            // 处理目录

            // 对内容进行排序：文件夹在上，文件在下，按字母a-z排序
            let sortedContents = [...contentData.contents];
            sortedContents.sort((a, b) => {
                // 首先按照类型排序：文件夹在前，文件在后
                if (a.isDirectory && !b.isDirectory) {
                    return -1; // a是文件夹，b是文件，a排在前面
                }
                if (!a.isDirectory && b.isDirectory) {
                    return 1; // a是文件，b是文件夹，b排在前面
                }

                // 如果类型相同，按字母a-z排序（不区分大小写）
                return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' });
            });

            // 遍历排序后的内容生成表格行
            sortedContents.forEach(item => {
                const tr = document.createElement('tr');
                const icon = item.isDirectory ? window.VectorIcons.folderIcon : getFileIcon(item.name);

                tr.innerHTML = `
                    <td>
                        <div class="file-name ${item.isDirectory ? 'folder-item' : ''}" data-path="${item.name}">
                            <span class="icon">${icon}</span>
                            <span>${item.name}</span>
                        </div>
                    </td>
                    <td>${item.isDirectory ? '-' : formatSize(item.size)}</td>
                    <td>${formatDate(new Date(item.modifiedTime))}</td>
                    <td>
                        ${!item.isDirectory ?
                        `<div class="action-buttons${isPreviewableFile(item.name) ? ' has-preview' : ''}">
                            ${isPreviewableFile(item.name) ?
                                `<a href="#" class="preview-btn" data-filename="${encodeURIComponent(item.name)}">预览</a>` :
                                ''}
                            <a href="#" class="download-btn" data-filename="${encodeURIComponent(item.name)}">下载</a>
                         </div>` :
                        ''}
                    </td>
                `;

                tbody.appendChild(tr);
            });
        } else {
            // 处理单个文件
            const tr = document.createElement('tr');
            const icon = getFileIcon(contentData.fileName);

            tr.innerHTML = `
                <td>
                    <div class="file-name">
                        <span class="icon">${icon}</span>
                        <span>${contentData.fileName}</span>
                    </div>
                </td>
                <td>${formatSize(contentData.fileSize)}</td>
                <td>${formatDate(new Date(contentData.createdAt))}</td>
                <td>
                    <a href="#" class="download-btn" data-filename="${encodeURIComponent(contentData.fileName)}">下载</a>
                </td>
            `;

            tbody.appendChild(tr);

            // 如果是图片或PDF等可以预览的文件，添加预览区域
            if (isPreviewable(contentData.mimeType)) {
                addPreviewArea(contentData);
            }
        }

        fileList.appendChild(tbody);

        // 添加目录导航功能
        addDirectoryNavigation(fileId, extractCode, '');

        // 为下载按钮添加点击事件
        addDownloadButtonEvents(fileId, extractCode, '');

        // 为预览按钮添加点击事件
        addPreviewButtonEvents(fileId, extractCode, '');
    }

    /**
     * 显示文件夹内容
     * @param {Object} folderData - 文件夹内容数据
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     */
    function displayFolderContent(folderData, fileId, extractCode) {
        codeInputPage.style.display = 'none';
        downloadPage.style.display = 'block';

        // 清除可能存在的预览区域
        const prevPreviewArea = document.querySelector('.preview-area');
        if (prevPreviewArea) {
            prevPreviewArea.remove();
        }

        // 更新面包屑
        updateBreadcrumb(folderData.fileName, folderData.breadcrumbs, fileId, extractCode);

        // 创建文件列表表格
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        // 创建表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>名称</th>
                <th>大小</th>
                <th>修改时间</th>
                <th>操作</th>
            </tr>
        `;
        fileList.appendChild(thead);

        // 创建表体
        const tbody = document.createElement('tbody');

        // 对内容进行排序：文件夹在上，文件在下，按字母a-z排序
        let sortedContents = [...folderData.contents];
        sortedContents.sort((a, b) => {
            // 首先按照类型排序：文件夹在前，文件在后
            if (a.isDirectory && !b.isDirectory) {
                return -1; // a是文件夹，b是文件，a排在前面
            }
            if (!a.isDirectory && b.isDirectory) {
                return 1; // a是文件，b是文件夹，b排在前面
            }

            // 如果类型相同，按字母a-z排序（不区分大小写）
            return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' });
        });

        // 遍历排序后的内容生成表格行
        sortedContents.forEach(item => {
            const tr = document.createElement('tr');
            const icon = item.isDirectory ? window.VectorIcons.folderIcon : getFileIcon(item.name);
            const currentPath = folderData.currentPath || '';
            const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;

            tr.innerHTML = `
                <td>
                    <div class="file-name ${item.isDirectory ? 'folder-item' : ''}" data-path="${itemPath}">
                        <span class="icon">${icon}</span>
                        <span>${item.name}</span>
                    </div>
                </td>
                <td>${item.isDirectory ? '-' : (item.sizeFormatted || formatSize(item.size))}</td>
                <td>${item.modifiedTimeFormatted || formatDate(new Date(item.modifiedTime))}</td>
                <td>
                    ${!item.isDirectory ?
                    `<div class="action-buttons${isPreviewableFile(item.name) ? ' has-preview' : ''}">
                        ${isPreviewableFile(item.name) ?
                            `<a href="#" class="preview-btn" data-path="${encodeURIComponent(itemPath)}">预览</a>` :
                            ''}
                        <a href="#" class="download-btn" data-path="${encodeURIComponent(itemPath)}">下载</a>
                     </div>` :
                    ''}
                </td>
            `;

            tbody.appendChild(tr);
        });

        fileList.appendChild(tbody);

        // 添加目录导航功能
        addDirectoryNavigation(fileId, extractCode, folderData.currentPath);

        // 为下载按钮添加点击事件
        addDownloadButtonEvents(fileId, extractCode, folderData.currentPath);
    }

    /**
     * 添加目录导航功能
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @param {string} currentPath - 当前路径
     */
    function addDirectoryNavigation(fileId, extractCode, currentPath) {
        // 仅为文件名添加点击事件
        const fileNames = document.querySelectorAll('.file-name');
        fileNames.forEach(fileNameDiv => {
            const parent = fileNameDiv.closest('tr');
            if (parent && parent.querySelector('td:nth-child(2)').textContent === '-') {
                // 这是一个文件夹项
                fileNameDiv.addEventListener('click', (e) => {
                    e.preventDefault();
                    // 获取文件夹路径
                    const folderPath = fileNameDiv.getAttribute('data-path');
                    if (folderPath) {
                        // 异步加载文件夹内容，而不是重新导航
                        showLoading();
                        fetchFolderContent(fileId, extractCode, folderPath)
                            .then(response => {
                                hideLoading();
                                if (response.success) {
                                    // 成功获取文件夹内容，更新显示
                                    displayFolderContent(response, fileId, extractCode);

                                    // 更新 URL 而不重新加载页面
                                    updatePageUrl(fileId, extractCode, folderPath);
                                } else {
                                    // 处理错误
                                    if (response.requiresExtractCode) {
                                        showCodeInputPage();
                                        showErrorMessage('提取码已过期，请重新输入');
                                        setupExtractCodeSubmission(fileId, folderPath);
                                    } else {
                                        showError(response.error || '获取文件夹内容失败');
                                    }
                                }
                            })
                            .catch(error => {
                                hideLoading();
                                console.error('获取文件夹内容出错:', error);
                                showError('获取文件夹内容失败，请稍后重试');
                            });
                    }
                });
                fileNameDiv.style.cursor = 'pointer';
            }
        });

        // 为面包屑项也添加导航功能
        const breadcrumbLinks = document.querySelectorAll('.breadcrumb-item');
        breadcrumbLinks.forEach(link => {
            if (link.getAttribute('href') && link.getAttribute('href').includes('share-folder=')) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    const url = new URL(link.getAttribute('href'), window.location.origin);
                    const pathParam = url.searchParams.get('share-folder') || '';

                    // 异步加载内容
                    showLoading();
                    fetchFolderContent(fileId, extractCode, pathParam)
                        .then(response => {
                            hideLoading();
                            if (response.success) {
                                displayFolderContent(response, fileId, extractCode);
                                updatePageUrl(fileId, extractCode, pathParam);
                            } else {
                                handleContentError(response, fileId, pathParam);
                            }
                        })
                        .catch(error => {
                            hideLoading();
                            console.error('获取文件夹内容出错:', error);
                            showError('获取文件夹内容失败，请稍后重试');
                        });
                });
            } else if (link.getAttribute('href').includes('/share/share')) {
                // 首页链接处理 - 导航到分享的初始页面
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    // 加载根目录内容
                    showLoading();
                    fetchFileContent(fileId, extractCode)
                        .then(response => {
                            hideLoading();
                            if (response.success) {
                                displayContent(response, fileId, extractCode);
                                updatePageUrl(fileId, extractCode, '');
                            } else {
                                handleContentError(response, fileId, '');
                            }
                        })
                        .catch(error => {
                            hideLoading();
                            console.error('获取文件内容出错:', error);
                            showError('获取文件内容失败，请稍后重试');
                        });
                });
            }
        });
    }

    /**
     * 更新面包屑导航
     * @param {string} currentName - 当前文件/目录名
     * @param {Array} breadcrumbs - 面包屑数组
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     */
    function updateBreadcrumb(currentName, breadcrumbs, fileId, extractCode) {
        if (!breadcrumbs || breadcrumbs.length === 0) {
            // 如果没有提供面包屑，则只显示当前名称
            breadcrumb.innerHTML = `
                <a href="/share/share?fileId=${fileId}${extractCode ? `&extract=${extractCode}` : ''}" class="breadcrumb-item">首页</a>
                <span class="breadcrumb-separator">&gt;</span>
                <span class="breadcrumb-current">${currentName}</span>
            `;
            return;
        }

        // 构建面包屑HTML，"首页"链接指向当前分享的初始页面，而不是网站根目录
        let breadcrumbHtml = `<a href="/share/share?fileId=${fileId}${extractCode ? `&extract=${extractCode}` : ''}" class="breadcrumb-item">首页</a>`;

        // 添加面包屑项
        breadcrumbs.forEach((item, index) => {
            breadcrumbHtml += `<span class="breadcrumb-separator">&gt;</span>`;

            // 最后一项不是链接
            if (index === breadcrumbs.length - 1) {
                breadcrumbHtml += `<span class="breadcrumb-current">${item.name}</span>`;
            } else {
                // 构建导航链接
                const path = item.path === '' ? '' : `&share-folder=${encodeURIComponent(item.path)}`;
                breadcrumbHtml += `<a href="/share/share?fileId=${fileId}${extractCode ? `&extract=${extractCode}` : ''}${path}" class="breadcrumb-item">${item.name}</a>`;
            }
        });

        breadcrumb.innerHTML = breadcrumbHtml;
    }

    /**
     * 添加文件预览区域
     * @param {Object} fileData - 文件数据
     */
    function addPreviewArea(fileData) {
        // 创建预览区域
        const previewArea = document.createElement('div');
        previewArea.className = 'preview-area';
        previewArea.innerHTML = '<h3>文件预览</h3><div class="preview-loading">加载预览中...</div>';

        // 先添加到下载页面，显示加载中状态
        downloadPage.appendChild(previewArea);

        // 获取文件名
        const filePath = fileData.fileName || fileData.path || '';

        if (fileData.mimeType.startsWith('image/')) {
            // 先生成一次性下载链接用于预览
            generateDownloadLink(fileId, extractCode, filePath)
                .then(downloadLink => {
                    if (downloadLink) {
                        // 图片预览
                        previewArea.innerHTML = `
                            <h3>文件预览</h3>
                            <div class="image-preview">
                                <img src="${downloadLink}" alt="${fileData.fileName || '预览图片'}" 
                                     onload="this.style.opacity='1'" 
                                     onerror="this.parentNode.innerHTML='<p class=\'preview-error\'>图片加载失败</p>'" 
                                     style="opacity:0;transition:opacity 0.3s ease;"/>
                            </div>
                        `;
                    } else {
                        previewArea.innerHTML = `
                            <h3>文件预览</h3>
                            <div class="preview-error">无法加载预览，请尝试下载后查看</div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('获取预览链接出错:', error);
                    previewArea.innerHTML = `
                        <h3>文件预览</h3>
                        <div class="preview-error">预览加载失败: ${error.message || '服务器错误'}</div>
                    `;
                });
        } else if (fileData.mimeType === 'application/pdf') {
            // 先生成一次性下载链接用于预览
            generateDownloadLink(fileId, extractCode, filePath)
                .then(downloadLink => {
                    if (downloadLink) {
                        // PDF预览
                        previewArea.innerHTML = `
                            <h3>文件预览</h3>
                            <div class="pdf-preview">
                                <iframe src="${downloadLink}" width="100%" height="500px"
                                        onload="this.style.opacity='1'" 
                                        onerror="this.parentNode.innerHTML='<p class=\'preview-error\'>PDF加载失败</p>'"
                                        style="opacity:0;transition:opacity 0.3s ease;"></iframe>
                            </div>
                        `;
                    } else {
                        previewArea.innerHTML = `
                            <h3>文件预览</h3>
                            <div class="preview-error">无法加载预览，请尝试下载后查看</div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('获取预览链接出错:', error);
                    previewArea.innerHTML = `
                        <h3>文件预览</h3>
                        <div class="preview-error">预览加载失败: ${error.message || '服务器错误'}</div>
                    `;
                });
        } else {
            // 不可预览的文件类型
            previewArea.innerHTML = `
                <h3>文件预览</h3>
                <div class="preview-note">此文件类型不支持预览，请下载后查看</div>
            `;
        }
    }

    /**
     * 是否为可预览的文件类型
     * @param {string} mimeType - MIME类型
     * @returns {boolean} - 是否可预览
     */
    function isPreviewable(mimeType) {
        return mimeType.startsWith('image/') || mimeType === 'application/pdf';
    }

    /**
     * 获取文件图标
     * @param {string} fileName - 文件名
     * @returns {string} - SVG图标
     */
    function getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();

        switch (ext) {
            case 'txt': return window.VectorIcons.txtIcon;
            case 'js': return window.VectorIcons.jsIcon;
            case 'py': return window.VectorIcons.pyIcon;
            case 'json': return window.VectorIcons.jsonIcon;
            case 'html': return window.VectorIcons.htmlIcon;
            case 'htm': return window.VectorIcons.htmlIcon;
            case 'css': return window.VectorIcons.cssIcon;
            case 'exe': return window.VectorIcons.exeIcon;
            case 'zip': return window.VectorIcons.zipIcon;
            case 'rar': return window.VectorIcons.zipIcon;
            case '7z': return window.VectorIcons.zipIcon;
            default: return window.VectorIcons.emptyIcon;
        }
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} - 格式化后的大小
     */
    function formatSize(bytes) {
        if (bytes === 0 || bytes === undefined) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
    }

    /**
     * 格式化日期
     * @param {Date} date - 日期对象
     * @returns {string} - 格式化后的日期字符串
     */
    function formatDate(date) {
        if (!date || isNaN(date.getTime())) {
            return '未知时间';
        }
        return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
    }

    /**
     * 数字补零
     * @param {number} num - 数字
     * @returns {string} - 补零后的字符串
     */
    function padZero(num) {
        return num < 10 ? `0${num}` : num;
    }

    /**
     * 生成文件下载链接
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @param {string} path - 文件路径（可选）
     * @returns {Promise<string>} - 下载链接
     */
    async function generateDownloadLink(fileId, extractCode, path = null) {
        try {
            // 构建基础URL
            let url = `/share/download-link?fileId=${encodeURIComponent(fileId)}`;

            // 添加路径参数，如果有的话
            if (path) {
                // 从路径中提取文件名或最后一个路径段
                const pathSegments = path.split('/');
                const fileName = pathSegments[pathSegments.length - 1];

                // 将路径添加到URL中
                url += `&path=${encodeURIComponent(fileName)}`;
            }

            // 添加提取码参数，如果有的话
            if (extractCode) {
                url += `&extract=${encodeURIComponent(extractCode)}`;
            }

            // 发送请求
            const response = await fetch(url);

            // 处理HTTP错误状态码
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `请求失败 (${response.status})`);
            }

            // 解析响应数据
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || '生成下载链接失败');
            }

            // 返回完整的下载链接
            return data.downloadLink;
        } catch (error) {
            console.error('生成下载链接出错:', error);
            throw error; // 重新抛出错误，让调用者处理
        }
    }

    /**
     * 为下载按钮添加点击事件
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @param {string} currentPath - 当前路径
     */
    function addDownloadButtonEvents(fileId, extractCode, currentPath) {
        const downloadButtons = document.querySelectorAll('.download-btn');
        downloadButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.preventDefault();

                // 显示加载指示器
                showLoading();

                // 获取文件名或路径
                const filename = button.getAttribute('data-filename');
                const path = button.getAttribute('data-path');

                // 根据当前路径和文件名/路径构建完整路径
                const fullPath = path ? path : (currentPath ? `${currentPath}/${filename}` : filename);

                // 文件名用于显示
                const displayName = filename || (path ? path.split('/').pop() : '文件');

                try {
                    // 生成下载链接
                    generateDownloadLink(fileId, extractCode, fullPath)
                        .then(downloadLink => {
                            hideLoading();
                            if (downloadLink) {
                                // 使用生成的下载链接
                                window.location.href = downloadLink;
                            } else {
                                // 使用模态窗口显示错误，而不是整页错误
                                showModalError(`文件"${displayName}"无法下载，请稍后重试`);
                            }
                        })
                        .catch(error => {
                            hideLoading();

                            console.error('下载链接生成失败:', error);

                            // 处理特定错误类型
                            if (error.message && error.message.includes('提取码错误')) {
                                showCodeInputPage();
                                showErrorMessage('提取码已过期，请重新输入');
                                setupExtractCodeSubmission(fileId, currentPath);
                            } else if (error.message && (error.message.includes('分享的文件不存在') ||
                                error.message.includes('文件不存在'))) {
                                showModalError(`文件"${displayName}"不存在或已被删除`);
                            } else if (error.message && error.message.includes('无权访问')) {
                                showModalError(`您没有权限下载文件"${displayName}"`);
                            } else if (error.message && error.message.includes('不能直接下载文件夹')) {
                                showModalError('不能直接下载文件夹，请进入文件夹选择要下载的文件');
                            } else {
                                showModalError(`下载文件"${displayName}"失败: ${error.message || '服务器错误，请稍后重试'}`);
                            }
                        });
                } catch (e) {
                    hideLoading();
                    console.error('处理下载请求出错:', e);
                    showModalError(`下载请求处理失败，请稍后重试`);
                }
            });
        });
    }

    /**
     * 显示模态窗口错误提示
     * @param {string} message - 错误消息
     * @param {Function} callback - 可选的回调函数
     */
    function showModalError(message, callback) {
        const modalMessage = modalContainer.querySelector('.modal-message');
        modalMessage.textContent = message;

        modalContainer.style.display = 'flex';

        // 设置确认按钮回调
        if (callback) {
            modalConfirm.onclick = function () {
                hideModal();
                callback();
            };
        } else {
            modalConfirm.onclick = hideModal;
        }

        // 添加渐入效果
        setTimeout(() => {
            modalContainer.classList.add('active');
        }, 10);
    }

    /**
     * 添加预览按钮事件
     * @param {string} fileId - 文件ID
     * @param {string} extractCode - 提取码
     * @param {string} currentPath - 当前路径
     */
    function addPreviewButtonEvents(fileId, extractCode, currentPath) {
        const previewButtons = document.querySelectorAll('.preview-btn');
        previewButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.preventDefault();

                // 显示加载指示器
                showLoading();

                // 获取文件名或路径
                const filename = button.getAttribute('data-filename');
                const path = button.getAttribute('data-path');

                // 根据当前路径和文件名/路径构建完整路径
                const fullPath = path ? path : (currentPath ? `${currentPath}/${filename}` : filename);

                // 文件名用于显示
                const displayName = filename || (path ? path.split('/').pop() : '文件');

                try {
                    // 调用预览接口
                    fetch('/share-view/random-preview', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            filePath: fullPath,
                            fileId: fileId,
                            extractCode: extractCode
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            hideLoading();
                            if (data.success && data.previewUrl) {
                                // 在新窗口中打开预览
                                window.open(data.previewUrl, '_blank');
                            } else {
                                showModalError(`文件"${displayName}"预览失败: ${data.error || '服务器错误'}`);
                            }
                        })
                        .catch(error => {
                            hideLoading();
                            console.error('预览请求失败:', error);
                            showModalError(`文件"${displayName}"预览失败，请稍后重试`);
                        });
                } catch (e) {
                    hideLoading();
                    console.error('处理预览请求出错:', e);
                    showModalError(`预览请求处理失败，请稍后重试`);
                }
            });
        });
    }

    /**
     * 隐藏模态窗口
     */
    function hideModal() {
        modalContainer.classList.remove('active');
        setTimeout(() => {
            modalContainer.style.display = 'none';
        }, 300);
    }
});