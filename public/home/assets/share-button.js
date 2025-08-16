// 添加分享按钮功能
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已经执行过，避免重复添加
    if (window.shareButtonsAdded) return;
    window.shareButtonsAdded = true;
    
    // 添加分享按钮的函数
    function addShareButtons() {
        
        // 查找所有文件项行
        const fileItems = document.querySelectorAll('.file-item-row');
        let buttonCount = 0;
        
        fileItems.forEach(item => {
            // 查找分享按钮
            const shareBtn = item.querySelector('.file-item-share');
            
            // 如果找到分享按钮但没有点击事件
            if (shareBtn && !shareBtn._hasShareEvent) {
                // 标记已添加事件，避免重复绑定
                shareBtn._hasShareEvent = true;
                buttonCount++;
                
                // 添加点击事件监听器
                shareBtn.addEventListener('click', function(e) {
                    e.stopPropagation(); // 阻止事件冒泡
                    
                    // 获取文件名和路径
                    const nameElement = item.querySelector('.file-item-name span');
                    const fileName = nameElement.textContent;
                    
                    // 获取当前路径
                    const currentPath = window.fileAcquisition?.getCurrentPath() || '/';
                    
                    // 构建完整文件路径
                    const isFolder = item.classList.contains('folder-item');
                    const filePath = currentPath === '/' 
                        ? '/' + fileName 
                        : currentPath + '/' + fileName;
                    
                    
                    // 调用分享函数
                    if (isFolder) {
                        showShareModal(filePath, fileName, 'folder');
                    } else {
                        showShareModal(filePath, fileName, 'file');
                    }
                });
                
                // 添加样式，确保可点击的视觉反馈
                shareBtn.style.cursor = 'pointer';
                if (shareBtn.textContent === '分享') {
                    shareBtn.style.color = '#4285f4';
                }
                
                // 添加悬停效果
                shareBtn.addEventListener('mouseover', function() {
                    this.style.textDecoration = 'underline';
                });
                
                shareBtn.addEventListener('mouseout', function() {
                    this.style.textDecoration = 'none';
                });
            }
        });

    }
    
    // 显示分享模态框
    function showShareModal(filePath, fileName, type) {
        
        // 等待页面完全加载后再检查modalManager
        if (typeof window.modalManager === 'undefined') {
            console.error('模态窗口管理器未定义，等待加载...');
            
            // 延迟200ms后再次尝试，这时sysy.js应该已经加载完成
            setTimeout(() => {
                if (typeof window.modalManager !== 'undefined') {
                    showShareModal(filePath, fileName, type);
                } else {
                    console.error('模态窗口管理器仍然未定义，无法显示分享对话框');
                    // 使用备选方案
                    showLegacyShareModal(filePath, fileName, type);
                }
            }, 200);
            return;
        }
        
        // 创建模态窗口内容
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.width = '450px';
        content.style.backgroundColor = '#fff';
        content.style.padding = '25px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        content.style.opacity = '0';
        content.style.transform = 'translateY(-20px)';
        content.style.transition = 'all 0.3s ease';
        
        content.innerHTML = `
            <div style="margin-bottom: 15px; font-size: 18px; color: #4285f4; display: flex; align-items: center;">
                <svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle;">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="#4285f4"/>
                </svg>
                <span style="vertical-align: middle; margin-left: 8px;">创建分享链接</span>
            </div>
            
            <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                <div style="font-weight: bold; margin-bottom: 5px;">文件名：</div>
                <div style="word-break: break-all;">${fileName}</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="extractCode" style="display: block; margin-bottom: 5px; font-weight: bold;">提取码 (可选)：</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="extractCode" placeholder="输入提取码或保留空白" maxlength="4" 
                           style="flex-grow: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button id="randomCodeBtn" 
                            style="padding: 8px 12px; background-color: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">
                        随机生成
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="expireTime" style="display: block; margin-bottom: 5px; font-weight: bold;">有效期：</label>
                <select id="expireTime" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="86400000">1天</option>
                    <option value="259200000">3天</option>
                    <option value="604800000" selected>7天</option>
                    <option value="2592000000">30天</option>
                    <option value="7776000000">90天</option>
                    <option value="31536000000">365天</option>
                </select>
            </div>
            
            <div class="share-result" style="display: none; margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 6px;">
                <p style="margin-bottom: 10px; font-weight: bold;">分享链接已创建：</p>
                <div style="display: flex; margin-bottom: 10px;">
                    <input type="text" id="shareLink" readonly 
                           style="flex-grow: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px 0 0 4px;">
                    <button id="copyLinkBtn" 
                            style="padding: 8px 12px; background-color: #4285f4; color: white; border: none; border-radius: 0 4px 4px 0; cursor: pointer;">
                        复制链接
                    </button>
                </div>
                <div class="extract-code-container" style="display: none; margin-top: 10px;">
                    <p>提取码：<span id="shareExtractCode" style="font-weight: bold;"></span></p>
                </div>
                <p class="share-tip" style="color: #4caf50; margin-top: 10px; display: none;">链接已复制到剪贴板，快去分享吧！</p>
            </div>
            
            <div class="spinner" style="display: none; margin: 20px auto; width: 70px; text-align: center;">
                <div style="width: 12px; height: 12px; background-color: #4285f4; border-radius: 100%; display: inline-block; margin: 0 3px; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></div>
                <div style="width: 12px; height: 12px; background-color: #4285f4; border-radius: 100%; display: inline-block; margin: 0 3px; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></div>
                <div style="width: 12px; height: 12px; background-color: #4285f4; border-radius: 100%; display: inline-block; margin: 0 3px; animation: bounce 1.4s infinite ease-in-out both;"></div>
                <style>
                    @keyframes bounce {
                        0%, 80%, 100% { transform: scale(0); }
                        40% { transform: scale(1.0); }
                    }
                </style>
            </div>
            
            <div class="error-message" style="display: none; color: #e53935; margin-top: 15px; padding: 8px; background-color: rgba(229, 57, 53, 0.1); border-radius: 4px;"></div>
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button id="cancelShareBtn" 
                        style="padding: 8px 16px; background-color: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    取消
                </button>
                <button id="createShareBtn" 
                        style="padding: 8px 16px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 80px;">
                    创建分享
                </button>
            </div>
        `;
        
        // 使用模态窗口管理器创建模态窗口
        window.modalManager.createModal(content);
        
        // 动画显示
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 50);
        
        // 获取模态框中的元素
        const cancelBtn = content.querySelector('#cancelShareBtn');
        const createBtn = content.querySelector('#createShareBtn');
        const randomCodeBtn = content.querySelector('#randomCodeBtn');
        const copyLinkBtn = content.querySelector('#copyLinkBtn');
        const extractCodeInput = content.querySelector('#extractCode');
        const expireTimeSelect = content.querySelector('#expireTime');
        const shareResult = content.querySelector('.share-result');
        const shareLinkInput = content.querySelector('#shareLink');
        const extractCodeContainer = content.querySelector('.extract-code-container');
        const shareExtractCode = content.querySelector('#shareExtractCode');
        const spinner = content.querySelector('.spinner');
        const errorMessage = content.querySelector('.error-message');
        const shareTip = content.querySelector('.share-tip');
        
        // 取消按钮事件
        cancelBtn.addEventListener('click', () => {
            window.modalManager.closeActiveModal();
        });
        
        // 随机生成提取码
        randomCodeBtn.addEventListener('click', function() {
            extractCodeInput.value = generateRandomCode(4);
        });
        
        // 创建分享
        createBtn.addEventListener('click', function() {
            // 显示加载动画
            spinner.style.display = 'flex';
            errorMessage.style.display = 'none';
            createBtn.disabled = true;
            
            // 获取选项
            const extractCode = extractCodeInput.value.trim() || null;
            const expiresIn = parseInt(expireTimeSelect.value);
            
            
            // 创建分享
            createShareLink(filePath, extractCode, expiresIn)
                .then(data => {
                    
                    // 隐藏加载动画
                    spinner.style.display = 'none';
                    
                    // 显示结果
                    shareResult.style.display = 'block';
                    
                    // 设置链接
                    const fullShareUrl = window.location.origin + data.shareUrl;
                    shareLinkInput.value = fullShareUrl;
                    
                    // 如果有提取码，显示提取码
                    if (data.extractCode) {
                        extractCodeContainer.style.display = 'block';
                        shareExtractCode.textContent = data.extractCode;
                    } else {
                        extractCodeContainer.style.display = 'none';
                    }
                    
                    // 自动复制链接
                    copyToClipboard(fullShareUrl);
                    
                    // 更新按钮
                    createBtn.style.display = 'none';
                    cancelBtn.textContent = '关闭';
                    
                    // 显示复制成功提示，3秒后隐藏
                    shareTip.style.display = 'block';
                    setTimeout(() => {
                        shareTip.style.display = 'none';
                    }, 3000);
                })
                .catch(error => {
                    console.error('分享创建失败:', error);
                    
                    // 隐藏加载动画
                    spinner.style.display = 'none';
                    createBtn.disabled = false;
                    
                    // 显示错误
                    errorMessage.textContent = '创建分享失败: ' + error.message;
                    errorMessage.style.display = 'block';
                });
        });
        
        // 复制链接
        copyLinkBtn.addEventListener('click', function() {
            copyToClipboard(shareLinkInput.value);
            shareTip.style.display = 'block';
            setTimeout(() => {
                shareTip.style.display = 'none';
            }, 3000);
        });
    }
    
    // 旧的模态窗口实现，作为备选方案
    function showLegacyShareModal(filePath, fileName, type) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal-container';
        modal.innerHTML = `
            <div class="modal share-modal">
                <div class="modal-header">
                    <h3>文件分享</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>文件名：${fileName}</p>
                    <div class="share-options">
                        <div class="option-group">
                            <label for="extractCode">提取码(可选)：</label>
                            <input type="text" id="extractCode" placeholder="输入提取码或保留空白" maxlength="4">
                            <button id="randomCodeBtn">随机生成</button>
                        </div>
                        <div class="option-group">
                            <label for="expireTime">有效期：</label>
                            <select id="expireTime">
                                <option value="86400000">1天</option>
                                <option value="259200000">3天</option>
                                <option value="604800000" selected>7天</option>
                                <option value="2592000000">30天</option>
                                <option value="7776000000">90天</option>
                                <option value="31536000000">365天</option>
                            </select>
                        </div>
                    </div>
                    <div class="share-result" style="display:none;">
                        <p>分享链接已创建：</p>
                        <div class="share-link-container">
                            <input type="text" id="shareLink" readonly>
                            <button id="copyLinkBtn">复制链接</button>
                        </div>
                        <div class="extract-code-container" style="display:none;">
                            <p>提取码：<span id="shareExtractCode"></span></p>
                        </div>
                        <p class="share-tip">链接已复制到剪贴板，快去分享吧！</p>
                    </div>
                    <div class="spinner" style="display:none;">
                        <div class="bounce1"></div>
                        <div class="bounce2"></div>
                        <div class="bounce3"></div>
                    </div>
                    <div class="error-message" style="display:none;"></div>
                </div>
                <div class="modal-footer">
                    <button id="cancelShareBtn">取消</button>
                    <button id="createShareBtn">创建分享</button>
                </div>
            </div>
        `;
        
        // 添加到body
        document.body.appendChild(modal);
        
        // 获取模态框中的元素
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#cancelShareBtn');
        const createBtn = modal.querySelector('#createShareBtn');
        const randomCodeBtn = modal.querySelector('#randomCodeBtn');
        const copyLinkBtn = modal.querySelector('#copyLinkBtn');
        const extractCodeInput = modal.querySelector('#extractCode');
        const expireTimeSelect = modal.querySelector('#expireTime');
        const shareResult = modal.querySelector('.share-result');
        const shareLinkInput = modal.querySelector('#shareLink');
        const extractCodeContainer = modal.querySelector('.extract-code-container');
        const shareExtractCode = modal.querySelector('#shareExtractCode');
        const spinner = modal.querySelector('.spinner');
        const errorMessage = modal.querySelector('.error-message');
        const shareTip = modal.querySelector('.share-tip');
        
        // 关闭模态框的函数
        function closeModal() {
            document.body.removeChild(modal);
        }
        
        // 关闭按钮事件
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // 点击模态框外部关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // 随机生成提取码
        randomCodeBtn.addEventListener('click', function() {
            extractCodeInput.value = generateRandomCode(4);
        });
        
        // 创建分享
        createBtn.addEventListener('click', function() {
            // 显示加载动画
            spinner.style.display = 'flex';
            errorMessage.style.display = 'none';
            createBtn.disabled = true;
            
            // 获取选项
            const extractCode = extractCodeInput.value.trim() || null;
            const expiresIn = parseInt(expireTimeSelect.value);
            
            // 创建分享
            createShareLink(filePath, extractCode, expiresIn)
                .then(data => {
                    // 隐藏加载动画
                    spinner.style.display = 'none';
                    
                    // 显示结果
                    shareResult.style.display = 'block';
                    
                    // 设置链接
                    const fullShareUrl = window.location.origin + data.shareUrl;
                    shareLinkInput.value = fullShareUrl;
                    
                    // 如果有提取码，显示提取码
                    if (data.extractCode) {
                        extractCodeContainer.style.display = 'block';
                        shareExtractCode.textContent = data.extractCode;
                    } else {
                        extractCodeContainer.style.display = 'none';
                    }
                    
                    // 自动复制链接
                    copyToClipboard(fullShareUrl);
                    
                    // 更新按钮
                    createBtn.style.display = 'none';
                    cancelBtn.textContent = '关闭';
                    
                    // 显示复制成功提示，3秒后隐藏
                    shareTip.style.display = 'block';
                    setTimeout(() => {
                        shareTip.style.display = 'none';
                    }, 3000);
                })
                .catch(error => {
                    // 隐藏加载动画
                    spinner.style.display = 'none';
                    createBtn.disabled = false;
                    
                    // 显示错误
                    errorMessage.textContent = '创建分享失败: ' + error.message;
                    errorMessage.style.display = 'block';
                });
        });
        
        // 复制链接
        copyLinkBtn.addEventListener('click', function() {
            copyToClipboard(shareLinkInput.value);
            shareTip.style.display = 'block';
            setTimeout(() => {
                shareTip.style.display = 'none';
            }, 3000);
        });
    }
    
    // 生成随机提取码
    function generateRandomCode(length) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // 复制到剪贴板
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
    
    // 创建分享链接
    async function createShareLink(filePath, extractCode, expiresIn) {
        try {
            
            const response = await fetch('/share-json/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filePath,
                    extractCode,
                    expiresIn
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error('创建分享链接失败:', error);
            throw error;
        }
    }
    
    // 立即调用一次
    addShareButtons();
    
    // 稍后再调用一次，确保在DOM完全加载后运行
    setTimeout(addShareButtons, 500);
    
    // 监听文件列表变化
    const fileListContainer = document.getElementById('file-list-container');
    if (fileListContainer) {
        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver(function(mutations) {
            addShareButtons();
        });
        
        // 配置observer
        observer.observe(fileListContainer, { 
            childList: true,
            subtree: true 
        });
    }
    
    // 暴露更新方法，以便其他模块可以调用
    window.updateShareButtons = addShareButtons;
}); 