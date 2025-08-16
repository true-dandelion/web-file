// 文件操作模块（下载和删除功能）
(function() {
    // 初始化
    function initialize() {
    }
    
    // 统一的下载函数，支持文件和文件夹
    function downloadFileOrFolder(path, name, type) {
        
        // 创建一个隐藏的下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = `/download?path=${encodeURIComponent(path)}&type=${type}`;
        downloadLink.download = name;
        downloadLink.style.display = 'none';
        
        // 添加到文档并触发点击
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // 清理DOM
        setTimeout(() => {
            document.body.removeChild(downloadLink);
        }, 100);
    }
    
    // 显示删除确认模态窗口
    function showDeleteConfirmModal(path, name, type, callback) {
        // 等待页面完全加载后再检查modalManager
        if (typeof window.modalManager === 'undefined') {
            console.error('模态窗口管理器未定义，等待加载...');
            
            // 延迟200ms后再次尝试，这时sysy.js应该已经加载完成
            setTimeout(() => {
                if (typeof window.modalManager !== 'undefined') {
                    showDeleteConfirmModal(path, name, type, callback);
                } else {
                    console.error('模态窗口管理器仍然未定义，无法显示确认对话框');
                    // 使用浏览器默认确认对话框作为备选
                    if (confirm(`确定要删除${type === 'folder' ? '文件夹' : '文件'} "${name}" 吗？此操作无法撤销。`)) {
                        deleteFileOrFolder(path, type, callback);
                    }
                }
            }, 200);
            return;
        }
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.width = '350px';
        content.style.backgroundColor = '#fff';
        content.style.padding = '25px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        content.style.opacity = '0';
        content.style.transform = 'translateY(-20px)';
        content.style.transition = 'all 0.3s ease';
        content.style.textAlign = 'center';
        
        content.innerHTML = `
            <div style="margin-bottom: 5px; font-size: 18px; color: #e53935;">
                <svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#e53935"/>
                </svg>
                <span style="vertical-align: middle; margin-left: 8px;">删除确认</span>
            </div>
            <p style="margin: 15px 0; font-size: 15px; color: #333; line-height: 1.5;">
                您确定要删除${type === 'folder' ? '文件夹' : '文件'} <strong>"${name}"</strong> 吗？<br>
                <span style="color: #e53935; font-size: 13px;">此操作无法撤销。</span>
            </p>
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px;">
                <button id="cancel-delete-btn" class="modal-button" 
                    style="padding: 8px 16px; background-color: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    取消
                </button>
                <button id="confirm-delete-btn" class="modal-button" 
                    style="padding: 8px 16px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    删除
                </button>
            </div>
        `;
        
        window.modalManager.createModal(content);
        
        // 动画显示
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 50);
        
        // 取消按钮点击事件
        const cancelBtn = content.querySelector('#cancel-delete-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.modalManager.closeActiveModal();
            });
        }
        
        // 确认删除按钮点击事件
        const confirmBtn = content.querySelector('#confirm-delete-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                window.modalManager.closeActiveModal();
                deleteFileOrFolder(path, type, callback);
            });
        }
    }
    
    // 删除文件或文件夹
    function deleteFileOrFolder(path, type, callback) {
        // 创建全屏删除状态
        createFullScreenDeletingState(type);
        
        // 如果有回调函数（用于从DOM中移除元素），立即执行
        if (typeof callback === 'function') {
            callback();
        }
        
        fetch('/delete-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                path: path,
                type: type
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`服务器返回错误状态码 ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 删除成功或失败后，移除全屏状态
            removeFullScreenDeletingState();
            
            if (data.success) {
                
                // 显示成功提示，并在用户点击确定后刷新文件列表
                setTimeout(() => {
                    showSuccessMessageWithRefresh(`${type === 'folder' ? '文件夹' : '文件'}删除成功`);
                }, 300);
            } else {
                console.error('删除失败:', data.message);
                setTimeout(() => {
                    window.modalManager.showMessage(`删除失败: ${data.message}`);
                }, 300);
            }
        })
        .catch(error => {
            // 删除出错后，移除全屏状态
            removeFullScreenDeletingState();
            
            console.error('删除请求出错:', error);
            setTimeout(() => {
                window.modalManager.showMessage('删除请求出错，请稍后再试');
            }, 300);
        });
    }
    
    // 显示成功消息并在用户确认后刷新文件列表
    function showSuccessMessageWithRefresh(message) {
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.width = '350px';
        content.style.backgroundColor = '#fff';
        content.style.padding = '25px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        content.style.opacity = '0';
        content.style.transform = 'translateY(-20px)';
        content.style.transition = 'all 0.3s ease';
        content.style.textAlign = 'center';
        
        content.innerHTML = `
            <div style="margin-bottom: 15px; font-size: 18px; color: #4caf50;">
                <svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#4caf50"/>
                </svg>
                <span style="vertical-align: middle; margin-left: 8px;">操作成功</span>
            </div>
            <p style="margin: 0 0 20px 0; font-size: 15px; color: #333;">${message}</p>
            <button id="refresh-confirm-btn" class="modal-button" 
                   style="padding: 8px 20px; background-color: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 80px;">
                确定
            </button>
        `;
        
        window.modalManager.createModal(content);
        
        // 动画显示
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 50);
        
        // 确认按钮点击事件
        const confirmBtn = content.querySelector('#refresh-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                window.modalManager.closeActiveModal();
                
                // 重新加载文件列表
                if (window.fileAcquisition && window.fileAcquisition.loadFilesFromServer) {
                    const currentPath = window.fileAcquisition.getCurrentPath();
                    window.fileAcquisition.loadFilesFromServer(currentPath);
                }
            });
        }
    }
    
    // 创建全屏删除状态
    function createFullScreenDeletingState(type) {
        // 移除可能存在的旧状态
        removeFullScreenDeletingState();
        
        // 创建全屏覆盖层
        const overlay = document.createElement('div');
        overlay.id = 'full-screen-deleting-state';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        
        // 创建加载动画
        const spinner = document.createElement('div');
        spinner.style.width = '50px';
        spinner.style.height = '50px';
        spinner.style.border = '5px solid #f3f3f3';
        spinner.style.borderTop = '5px solid #4285f4';
        spinner.style.borderRadius = '50%';
        spinner.style.marginBottom = '20px';
        spinner.style.animation = 'spin 1s linear infinite';
        
        // 创建文本提示
        const message = document.createElement('div');
        message.style.color = 'white';
        message.style.fontSize = '18px';
        message.style.fontWeight = 'bold';
        message.textContent = `正在删除${type === 'folder' ? '文件夹' : '文件'}...`;
        
        // 创建子提示文本
        const subMessage = document.createElement('div');
        subMessage.style.color = '#ccc';
        subMessage.style.fontSize = '14px';
        subMessage.style.marginTop = '10px';
        subMessage.textContent = '请稍候，此操作可能需要一些时间';
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        // 组装元素
        overlay.appendChild(style);
        overlay.appendChild(spinner);
        overlay.appendChild(message);
        overlay.appendChild(subMessage);
        document.body.appendChild(overlay);
        
        // 禁用页面滚动
        document.body.style.overflow = 'hidden';
    }
    
    // 移除全屏删除状态
    function removeFullScreenDeletingState() {
        const overlay = document.getElementById('full-screen-deleting-state');
        if (overlay) {
            document.body.removeChild(overlay);
            document.body.style.overflow = '';  // 恢复页面滚动
        }
    }
    
    // 暴露接口
    window.fileOperations = {
        initialize: initialize,
        downloadFileOrFolder: downloadFileOrFolder,
        deleteFileOrFolder: deleteFileOrFolder,
        showDeleteConfirmModal: showDeleteConfirmModal,
        createFullScreenDeletingState: createFullScreenDeletingState,
        removeFullScreenDeletingState: removeFullScreenDeletingState,
        showSuccessMessageWithRefresh: showSuccessMessageWithRefresh
    };
})();
