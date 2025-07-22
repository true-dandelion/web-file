function updateFileStats(filename, content) {
    const lines = content.split('\n');
    const charCount = content.replace(/\n/g, '').length;

    // 更新页面标题为文件名
    document.title = filename;

    document.getElementById('filename').textContent = filename;
    document.getElementById('file-stats').textContent = `行：${lines.length} | 字符：${charCount}`;

    const lineNumbersEl = document.getElementById('line-numbers');
    lineNumbersEl.innerHTML = lines.map((_, index) => `<div>${index + 1}</div>`).join('');
}

// 显示文件内容
function displayFileContent(content) {
    const contentEl = document.getElementById('content');
    // 转义HTML特殊字符
    const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    contentEl.innerHTML = `<pre>${escapedContent}</pre>`;
}

// 显示错误信息
function showError(message) {
    document.getElementById('filename').textContent = '错误';
    document.getElementById('file-stats').textContent = '';
    document.getElementById('content').innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><h2>${message}</h2></div>`;
    document.getElementById('line-numbers').innerHTML = '';
}

// 显示二进制文件信息
function showBinaryFile(fileInfo) {
    document.getElementById('filename').textContent = fileInfo.fileName;
    document.getElementById('file-stats').textContent = `大小：${formatFileSize(fileInfo.fileSize)} | 类型：${fileInfo.mimeType}`;
    document.getElementById('content').innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <h2>二进制文件预览</h2>
            <p>文件名：${fileInfo.fileName}</p>
            <p>文件大小：${formatFileSize(fileInfo.fileSize)}</p>
            <p>文件类型：${fileInfo.mimeType}</p>
            <br>
            <a href="${fileInfo.downloadUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">下载文件</a>
        </div>
    `;
    document.getElementById('line-numbers').innerHTML = '';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 加载文件内容
function loadFileContent() {
    // 检查是否有预览ID
    if (!window.previewId) {
        showError('缺少预览ID');
        return;
    }

    // 显示加载状态
    document.getElementById('filename').textContent = '加载中...';
    document.getElementById('content').innerHTML = '<div style="padding: 20px; text-align: center;">正在加载文件内容...</div>';

    // 请求文件内容
    fetch(`/view/content/${window.previewId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.isText) {
                    // 文本文件
                    updateFileStats(data.fileName, data.content);
                    displayFileContent(data.content);
                } else {
                    // 二进制文件
                    showBinaryFile(data);
                }
            } else {
                showError(data.message || '加载文件失败');
            }
        })
        .catch(error => {
            console.error('加载文件内容失败:', error);
            showError('网络错误，无法加载文件');
        });
}

// 获取地址栏参数的函数
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 获取文件名的函数
function fetchFileName() {
    const bValue = getUrlParameter('b');

    fetch('/view/preview/filename', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ b: bValue })
    })
        .then(response => response.json())
        .then(data => {
            // 直接更新文件名显示
            if (data.filename) {
                // 更新页面标题
                document.title = `${data.filename}`;

                // 更新文件名显示
                document.getElementById('filename').textContent = `${data.filename}`;
            } else {
                // 如果没有文件名，设置默认标题
                document.title = '未知文件';
                document.getElementById('filename').textContent = '未知文件';
            }
        })
        .catch(error => {
            console.error('获取文件名失败:', error);

            // 设置错误标题
            document.title = '加载失败';
            document.getElementById('filename').textContent = '加载失败';
        });
}

// 简化的同步滚动实现
function setupSynchronizedScrolling(lines, startLineNumber = 1) {
    const contentElement = document.getElementById('content');
    const lineNumbersElement = document.getElementById('line-numbers');

    // 清除之前的内容
    contentElement.innerHTML = '';
    lineNumbersElement.innerHTML = '';

    // 创建内容
    const contentPre = document.createElement('pre');
    contentPre.textContent = lines.join('\n');
    contentPre.style.margin = '0';
    contentPre.style.lineHeight = '1.2em';
    contentPre.style.fontFamily = "'Courier New', monospace";
    contentPre.style.fontSize = '1em';
    contentElement.appendChild(contentPre);

    // 创建行号容器
    const lineNumbersContainer = document.createElement('div');
    lineNumbersContainer.style.margin = '0';
    lineNumbersContainer.style.padding = '0';

    // 创建行号（使用正确的起始行号）
    lines.forEach((_, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.textContent = startLineNumber + index;
        lineDiv.style.height = '1.2em';
        lineDiv.style.lineHeight = '1.2em';
        lineDiv.style.fontFamily = "'Courier New', monospace";
        lineDiv.style.fontSize = '1em';
        lineDiv.style.margin = '0';
        lineDiv.style.padding = '0';
        lineDiv.style.textAlign = 'right';
        lineNumbersContainer.appendChild(lineDiv);
    });

    lineNumbersElement.appendChild(lineNumbersContainer);

    // 同步滚动
    contentElement.addEventListener('scroll', function () {
        lineNumbersElement.scrollTop = contentElement.scrollTop;
    });
}

// 分页状态管理
const paginationState = {
    currentPage: 1,
    pageSize: 2000,
    totalPages: 1,
    hasMore: false,
    allLines: [],
    startLineNumber: 1
};

// 更新分页控制显示（优化版）
function updatePaginationControls() {
    const paginationControls = document.getElementById('pagination-controls');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const loadMoreButton = document.getElementById('load-more');

    // 只有多页时才显示分页控制
    if (paginationState.totalPages > 1) {
        paginationControls.style.display = 'flex';

        // 更新页面信息，增加更友好的显示
        pageInfo.textContent = `${paginationState.currentPage} / ${paginationState.totalPages} 页`;

        // 上一页按钮逻辑
        prevButton.disabled = paginationState.currentPage <= 1;
        prevButton.classList.toggle('disabled', paginationState.currentPage <= 1);
        prevButton.setAttribute('aria-disabled', paginationState.currentPage <= 1);

        // 下一页按钮逻辑
        nextButton.disabled = paginationState.currentPage >= paginationState.totalPages;
        nextButton.classList.toggle('disabled', paginationState.currentPage >= paginationState.totalPages);
        nextButton.setAttribute('aria-disabled', paginationState.currentPage >= paginationState.totalPages);

        // 加载更多按钮逻辑
        if (paginationState.hasMore) {
            loadMoreButton.style.display = 'inline-block';
            loadMoreButton.disabled = false;
            loadMoreButton.classList.remove('disabled');
            loadMoreButton.setAttribute('aria-disabled', 'false');
        } else {
            loadMoreButton.style.display = 'none';
        }
    } else {
        // 单页时隐藏所有分页控件
        paginationControls.style.display = 'none';
    }
}

// 改进的分页事件处理
function initPaginationEvents() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const loadMoreButton = document.getElementById('load-more');

    // 防抖函数，避免重复点击
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // 上一页处理
    const handlePrevPage = debounce(() => {
        if (paginationState.currentPage > 1) {
            showLoadingIndicator();
            fetchFilePreview(paginationState.currentPage - 1);
        }
    }, 300);

    // 下一页处理
    const handleNextPage = debounce(() => {
        if (paginationState.currentPage < paginationState.totalPages) {
            showLoadingIndicator();
            fetchFilePreview(paginationState.currentPage + 1);
        }
    }, 300);

    // 加载更多处理
    const handleLoadMore = debounce(() => {
        if (paginationState.hasMore) {
            showLoadingIndicator();
            fetchFilePreview(paginationState.currentPage + 1);
        }
    }, 300);

    // 添加事件监听器
    prevButton.addEventListener('click', handlePrevPage);
    nextButton.addEventListener('click', handleNextPage);
    loadMoreButton.addEventListener('click', handleLoadMore);
}

// 显示加载指示器
function showLoadingIndicator() {
    const content = document.getElementById('content');
    const lineNumbers = document.getElementById('line-numbers');
    
    // 保存原始内容
    content.dataset.originalContent = content.innerHTML;
    lineNumbers.dataset.originalContent = lineNumbers.innerHTML;

    // 显示加载动画
    content.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>正在加载...</p>
        </div>
    `;
    lineNumbers.innerHTML = '';
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    const content = document.getElementById('content');
    const lineNumbers = document.getElementById('line-numbers');

    // 恢复原始内容（如果存在）
    if (content.dataset.originalContent) {
        content.innerHTML = content.dataset.originalContent;
        delete content.dataset.originalContent;
    }
    if (lineNumbers.dataset.originalContent) {
        lineNumbers.innerHTML = lineNumbers.dataset.originalContent;
        delete lineNumbers.dataset.originalContent;
    }
}

// 更新地址栏参数的函数
function updateUrlParameters(page) {
    // 获取当前URL
    const url = new URL(window.location.href);
    
    // 获取 b 参数的值
    const bValue = getUrlParameter('b');
    
    // 如果页码大于1，添加 ye 参数
    if (page > 1 && bValue) {
        url.searchParams.set('ye', page.toString());
    } else {
        // 如果是第一页，移除 ye 参数
        url.searchParams.delete('ye');
    }

    // 使用 replaceState 更新地址栏，不触发页面刷新
    window.history.replaceState(null, '', url.toString());
}

// 修改文件预览函数以支持更好的错误处理
function fetchFilePreview(page = 1) {
    const bValue = getUrlParameter('b');

    // 显示加载状态
    showLoadingIndicator();

    // 更新地址栏参数
    updateUrlParameters(page);

    fetch('/view/preview/file-preview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            b: bValue,
            page: page
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('网络响应异常');
        }
        return response.json();
    })
    .then(data => {
        // 隐藏加载指示器
        hideLoadingIndicator();

        if (data.success && data.content) {
            // 更新分页状态
            paginationState.currentPage = data.currentPage || page;
            paginationState.pageSize = data.pageSize || 2000;
            paginationState.totalPages = data.totalPages || 1;
            paginationState.hasMore = data.hasMore || false;

            // 处理换行符，统一使用 \n
            const normalizedContent = data.content.replace(/\r\n/g, '\n');
            const lines = normalizedContent.split('\n');

            // 计算起始行号
            paginationState.startLineNumber = (paginationState.currentPage - 1) * paginationState.pageSize + 1;

            // 更新文件统计信息
            const charCount = normalizedContent.replace(/\n/g, '').length;
            const totalLines = data.totalLines || lines.length;
            document.getElementById('file-stats').textContent =
                `行：${paginationState.startLineNumber}-${paginationState.startLineNumber + lines.length - 1} / 总计：${totalLines} | 字符：${charCount}`;

            // 显示分页控制
            updatePaginationControls();

            // 渲染内容
            setupSynchronizedScrolling(lines, paginationState.startLineNumber);

            // 调整容器高度
            adjustContainerHeight(lines.length);
        } else {
            // 错误处理
            document.getElementById('content').innerHTML = `
                <div class="error-message">
                    <h3>无法预览文件内容</h3>
                    <p>${data.message || '未知错误'}</p>
                </div>
            `;
            document.getElementById('line-numbers').innerHTML = '';
            hidePaginationControls();
        }
    })
    .catch(error => {
        // 网络错误处理
        console.error('获取文件预览失败:', error);
        document.getElementById('content').innerHTML = `
            <div class="error-message">
                <h3>加载失败</h3>
                <p>网络错误或服务器异常</p>
                <button id="retry-load">重试</button>
            </div>
        `;
        document.getElementById('line-numbers').innerHTML = '';
        hidePaginationControls();

        // 添加重试按钮事件
        const retryButton = document.getElementById('retry-load');
        if (retryButton) {
            retryButton.addEventListener('click', () => fetchFilePreview(page));
        }
    });
}

// 调整容器高度的函数
function adjustContainerHeight(lineCount) {
    const container = document.querySelector('.container');
    const header = document.querySelector('.header');
    const fileContent = document.querySelector('.file-content');

    // 计算最大高度
    const maxHeight = window.innerHeight * 0.9; // 90% 的窗口高度

    // 根据行数计算内容高度
    const lineHeight = 1.2; // em
    const estimatedContentHeight = lineCount * lineHeight + 2; // 额外的padding

    // 设置内容区域的最大高度
    fileContent.style.maxHeight = `${maxHeight - header.offsetHeight}px`;

    // 如果内容高度超过最大高度，启用滚动
    if (estimatedContentHeight > maxHeight) {
        fileContent.style.overflowY = 'auto';
    } else {
        fileContent.style.overflowY = 'hidden';
    }
}

// 隐藏分页控制
function hidePaginationControls() {
    document.getElementById('pagination-controls').style.display = 'none';
}

// 修改页面加载事件，支持从URL参数初始化页码
window.addEventListener('DOMContentLoaded', function () {
    // 初始化主题系统
    initThemeSystem();
    
    fetchFileName();

    // 尝试从URL获取初始页码
    const initialPage = parseInt(getUrlParameter('ye') || '1', 10);
    fetchFilePreview(initialPage);
    
    initPaginationEvents();
});


