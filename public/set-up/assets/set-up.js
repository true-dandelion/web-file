document.addEventListener('DOMContentLoaded', function() {
    // 初始化SVG图标
    if (window.svgIcons && typeof window.svgIcons.init === 'function') {
        window.svgIcons.init();
    }
    
    // 获取返回按钮元素
    const backButton = document.querySelector('.back-button');
    
    // 添加点击事件监听器
    if (backButton) {
        backButton.addEventListener('click', function() {
            // 返回到/file页面
            window.location.href = '/file';
        });
    }
    
    // 获取导航菜单项和内容区域
    const menuItems = document.querySelectorAll('.nav-menu a');
    const sections = document.querySelectorAll('.section');
    
    // 为导航菜单项添加点击事件
    menuItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault(); // 阻止默认锚点行为
            
            // 获取目标区域ID
            const targetId = this.getAttribute('href').substring(1);
            
            // 移除所有菜单项的活动状态
            menuItems.forEach(function(mi) {
                mi.parentElement.classList.remove('active');
            });
            
            // 添加活动状态到当前菜单项
            this.parentElement.classList.add('active');
            
            // 隐藏所有内容区域
            sections.forEach(function(section) {
                section.classList.remove('active');
            });
            
            // 显示目标内容区域
            document.getElementById(targetId).classList.add('active');
            
            // 保存当前活动的菜单项到本地存储（方便下次访问时恢复状态）
            localStorage.setItem('activeSection', targetId);
            
            // 如果是链接管理区域，加载分享链接数据
            if (targetId === 'general') {
                loadShareLinks();
            }
        });
    });
    
    // 从本地存储恢复活动状态
    const activeSection = localStorage.getItem('activeSection');
    if (activeSection) {
        // 找到对应的菜单项并触发点击
        const targetMenuItem = document.querySelector(`.nav-menu a[href="#${activeSection}"]`);
        if (targetMenuItem) {
            targetMenuItem.click();
        }
    } else {
        // 默认加载分享链接数据
        loadShareLinks();
    }
    
    // 为刷新按钮添加事件监听器
    const refreshButton = document.getElementById('refreshShareLinks');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            loadShareLinks(true);
        });
    }
    
    // 添加主题切换功能
    function createThemeSelector() {
        const themeSection = document.getElementById('theme');
        if (!themeSection) return;
        
        // 创建主题选择器
        const themeSelector = document.createElement('div');
        themeSelector.className = 'theme-selector';
        
        // 预定义主题 - 二次元风格
        const themes = [
            { name: '纯洁白色', primary: '#ffffff', secondary: '#f0f0f0', description: '极简清新的白色系' },
            { name: '纯绝黑色', primary: '#121212', secondary: '#1e1e1e', description: '高端沉稳的黑色系' },
            { name: '粉色少女', primary: '#ff6b81', secondary: '#6c5ce7', description: '温柔可爱的粉色系' },
            { name: '蓝色海洋', primary: '#0984e3', secondary: '#00cec9', description: '清爽沁凉的蓝色系' },
            { name: '绿色森林', primary: '#00b894', secondary: '#6ab04c', description: '自然舒适的绿色系' },
            { name: '紫色魔法', primary: '#a29bfe', secondary: '#fd79a8', description: '神秘梦幻的紫色系' },
            { name: '橙色阳光', primary: '#fdcb6e', secondary: '#e17055', description: '活力四溢的橙色系' }
        ];
        
        // 创建主题标题
        const title = document.createElement('h2');
        title.textContent = '选择您喜欢的主题';
        themeSection.appendChild(title);
        
        // 添加主题描述
        const description = document.createElement('p');
        description.textContent = '选择一个符合您个性的主题风格，让界面更加美观~';
        themeSection.appendChild(description);
        
        // 创建主题卡片容器
        const themeCards = document.createElement('div');
        themeCards.className = 'theme-cards';
        
        // 添加主题卡片
        themes.forEach((theme, index) => {
            const card = document.createElement('div');
            card.className = 'theme-card';
            card.dataset.themeIndex = index;
            
            // 创建主题预览区域，使用SVG渐变背景
            const svgGradient = `
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="${theme.name.replace(/\s+/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="${theme.primary}" />
                            <stop offset="100%" stop-color="${theme.secondary}" />
                        </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#${theme.name.replace(/\s+/g, '')})" />
                    
                    <!-- 添加二次元装饰元素 -->
                    ${theme.name === '纯洁白色' ? `
                        <circle cx="70%" cy="30%" r="10" fill="#000000" opacity="0.05" />
                        <circle cx="80%" cy="20%" r="5" fill="#000000" opacity="0.03" />
                        <circle cx="20%" cy="70%" r="8" fill="#000000" opacity="0.03" />
                    ` : theme.name === '纯绝黑色' ? `
                        <circle cx="70%" cy="30%" r="10" fill="#ffffff" opacity="0.1" />
                        <circle cx="80%" cy="20%" r="5" fill="#ffffff" opacity="0.05" />
                        <circle cx="20%" cy="70%" r="8" fill="#ffffff" opacity="0.05" />
                    ` : `
                    <circle cx="70%" cy="30%" r="10" fill="#ffffff" opacity="0.3" />
                    <circle cx="80%" cy="20%" r="5" fill="#ffffff" opacity="0.2" />
                    <circle cx="20%" cy="70%" r="8" fill="#ffffff" opacity="0.2" />
                    `}
                </svg>
            `;
            
            card.innerHTML = `
                <div class="theme-preview">${svgGradient}</div>
                <div class="theme-name">${theme.name}</div>
            `;
            
            // 为主题卡片添加点击事件
            card.addEventListener('click', function(e) {
                // 设置主题色
                setTheme(theme);
                
                // 移除所有卡片的活动状态
                document.querySelectorAll('.theme-card').forEach(c => {
                    c.classList.remove('active');
                });
                
                // 添加活动状态到当前卡片
                card.classList.add('active');
                
                // 显示可爱的选择提示
                showToast(`已选择 ${theme.name} 主题~`);
                
                // 保存主题选择到服务器
                // 使用主题在数组中的索引
                const themeIndex = themes.findIndex(t => t.name === theme.name);
                if (themeIndex !== -1) {
                    saveThemePreference(themeIndex);
                }
            });
            
            themeCards.appendChild(card);
        });
        
        themeSection.appendChild(themeCards);
        
        // 从服务器获取主题设置
        fetchThemePreference();
    }
    
    // 从服务器获取主题设置
    function fetchThemePreference() {
        fetch('/view/theme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getTheme'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.theme !== undefined) {
                // 根据返回的主题索引设置主题
                applyThemeByIndex(data.theme);
            }
        })
        .catch(error => {
            console.error('获取主题设置失败:', error);
            // 如果获取失败，尝试从本地存储恢复
            restoreThemeFromLocalStorage();
        });
    }
    
    // 保存主题选择到服务器
    function saveThemePreference(themeIndex) {
        fetch('/view/theme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'setTheme',
                theme: themeIndex
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('保存主题设置失败');
            }
        })
        .catch(error => {
            console.error('保存主题设置失败:', error);
        });
    }
    
    // 根据主题索引应用主题
    function applyThemeByIndex(index) {
        // 预定义主题列表
        const themes = [
            { name: '纯洁白色', primary: '#ffffff', secondary: '#f0f0f0', description: '极简清新的白色系' },
            { name: '纯绝黑色', primary: '#121212', secondary: '#1e1e1e', description: '高端沉稳的黑色系' },
            { name: '粉色少女', primary: '#ff6b81', secondary: '#6c5ce7', description: '温柔可爱的粉色系' },
            { name: '蓝色海洋', primary: '#0984e3', secondary: '#00cec9', description: '清爽沁凉的蓝色系' },
            { name: '绿色森林', primary: '#00b894', secondary: '#6ab04c', description: '自然舒适的绿色系' },
            { name: '紫色魔法', primary: '#a29bfe', secondary: '#fd79a8', description: '神秘梦幻的紫色系' },
            { name: '橙色阳光', primary: '#fdcb6e', secondary: '#e17055', description: '活力四溢的橙色系' }
        ];
        
        // 检查索引是否有效
        if (index >= 0 && index < themes.length) {
            // 应用主题
            setTheme(themes[index]);
            
            // 如果在主题页面，标记对应的卡片为活动状态
            const themeCards = document.querySelectorAll('.theme-card');
            themeCards.forEach(card => {
                // 对于白色和黑色主题（索引0和1），需要特殊处理
                if (index === 0) {
                    // 白色主题
                    card.classList.toggle('active', card.querySelector('.theme-name').textContent === '纯洁白色');
                } else if (index === 1) {
                    // 黑色主题
                    card.classList.toggle('active', card.querySelector('.theme-name').textContent === '纯绝黑色');
                } else {
                    // 其他主题
                    card.classList.toggle('active', parseInt(card.dataset.themeIndex) === index);
                }
            });
        }
    }
    
    // 从本地存储恢复主题
    function restoreThemeFromLocalStorage() {
        const savedTheme = localStorage.getItem('selectedTheme');
        if (savedTheme) {
            try {
                const theme = JSON.parse(savedTheme);
                setTheme(theme);
                
                // 标记当前主题卡片为活动状态
                const themeCards = document.querySelectorAll('.theme-card');
                themeCards.forEach(card => {
                    const cardThemeName = card.querySelector('.theme-name').textContent;
                    if (cardThemeName === theme.name) {
                        card.classList.add('active');
                    }
                });
            } catch (e) {
                console.error('主题恢复失败', e);
            }
        }
    }
    
    // 设置主题函数
    function setTheme(theme) {
        // 设置颜色变量
        document.documentElement.style.setProperty('--primary-color', theme.primary);
        document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        
        // 提取RGB值并设置
        const primaryRgb = hexToRgb(theme.primary);
        const secondaryRgb = hexToRgb(theme.secondary);
        
        if (primaryRgb) {
            document.documentElement.style.setProperty(
                '--primary-color-rgb', 
                `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`
            );
        }
        
        if (secondaryRgb) {
            document.documentElement.style.setProperty(
                '--secondary-color-rgb', 
                `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`
            );
        }
        
        // 设置主题特定的数据属性
        if (theme.name === '纯洁白色') {
            document.body.setAttribute('data-theme', 'white');
        } else if (theme.name === '纯绝黑色') {
            document.body.setAttribute('data-theme', 'black');
        } else {
            document.body.removeAttribute('data-theme');
        }
        
        // 保存主题选择到本地存储
        localStorage.setItem('selectedTheme', JSON.stringify(theme));
    }
    
    // 显示Toast消息
    window.showToast = function(message) {
        // 检查是否已存在toast元素
        let toast = document.querySelector('.toast');
        
        if (!toast) {
            // 创建新的toast元素
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
            
            // 添加样式
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(var(--primary-color-rgb), 0.9)';
            toast.style.color = 'white';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '20px';
            toast.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            toast.style.zIndex = '1200';
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.fontWeight = 'bold';
        }
        
        // 设置消息内容
        toast.textContent = message;
        
        // 显示toast
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);
        
        // 3秒后隐藏
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }
    
    // 辅助函数：将十六进制颜色转换为RGB
    function hexToRgb(hex) {
        // 移除#号
        hex = hex.replace(/^#/, '');
        
        // 处理简写形式
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        // 解析RGB值
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        
        return { r, g, b };
    }

    // 初始化复制提示
    function initCopyTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'copy-tooltip';
        tooltip.textContent = '已复制到剪贴板';
        document.body.appendChild(tooltip);
        
        return tooltip;
    }
    
    // 复制文本到剪贴板并显示提示
    function copyToClipboard(text, event) {
        navigator.clipboard.writeText(text).then(() => {
            const tooltip = document.querySelector('.copy-tooltip') || initCopyTooltip();
            
            // 设置提示位置
            tooltip.style.left = `${event.clientX}px`;
            tooltip.style.top = `${event.clientY - 30}px`;
            
            // 显示提示
            tooltip.classList.add('visible');
            
            // 1.5秒后隐藏提示
            setTimeout(() => {
                tooltip.classList.remove('visible');
            }, 1500);
        }).catch(err => {
            console.error('复制失败：', err);
            showToast('复制失败，请手动复制');
        });
    }
    
    // 获取分享链接的完整URL（使用当前域名和端口）
    function getFullShareUrl(shareLink) {
        try {
            // 检查是否是完整URL（包含协议和域名）
            if (shareLink.match(/^https?:\/\//)) {
                // 提取分享路径部分 (/share/share?fileId=xxx)
                const urlObj = new URL(shareLink);
                const sharePath = urlObj.pathname + urlObj.search + urlObj.hash;
                
                // 构建完整URL，使用当前域名和端口
                return `${window.location.origin}${sharePath}`;
            } else {
                // 如果是相对路径，直接拼接当前域名和端口
                const path = shareLink.startsWith('/') ? shareLink : `/${shareLink}`;
                return `${window.location.origin}${path}`;
            }
        } catch (error) {
            console.error('解析分享链接失败:', error);
            // 如果解析失败，返回原始链接
            return shareLink;
        }
    }
    
    // 将Unix时间戳转换为上海时间字符串
    function formatTimestamp(timestamp) {
        if (!timestamp) return '永久有效';
        
        const date = new Date(timestamp);
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Shanghai'
        };
        
        return new Intl.DateTimeFormat('zh-CN', options).format(date);
    }

    // 检查链接是否已过期
    function isExpired(timestamp) {
        if (!timestamp) return false; // 永久有效
        return Date.now() > timestamp;
    }
    
    // 加载分享链接数据
    function loadShareLinks(isRefresh = false) {
        const loadingIndicator = document.getElementById('linkLoadingIndicator');
        const emptyState = document.getElementById('emptyShareLinks');
        const container = document.getElementById('shareLinksContainer');
        
        if (!loadingIndicator || !emptyState || !container) return;
        
        // 显示加载状态
        loadingIndicator.style.display = 'flex';
        emptyState.style.display = 'none';
        container.style.display = 'none';
        container.innerHTML = '';
        
        // 如果是刷新操作，显示toast提示
        if (isRefresh) {
            showToast('正在刷新链接数据...');
        }
        
        // 请求API获取分享链接数据
        fetch('/set/link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getLinks'
            })
        })
            .then(response => response.json())
            .then(data => {
                // 隐藏加载状态
                loadingIndicator.style.display = 'none';
                
                if (data.success && data.data && Object.keys(data.data).length > 0) {
                    // 显示链接容器
                    container.style.display = 'grid';
                    
                    // 处理并显示链接数据
                    renderShareLinks(data.data, container);
                    
                    // 如果是刷新操作，显示刷新成功提示
                    if (isRefresh) {
                        showToast('链接数据刷新成功');
                    }
                } else {
                    // 显示空状态
                    emptyState.style.display = 'flex';
                    
                    // 如果是刷新操作，提示无数据
                    if (isRefresh) {
                        showToast('没有找到分享链接');
                    }
                }
            })
            .catch(error => {
                console.error('获取分享链接失败:', error);
                
                // 隐藏加载状态
                loadingIndicator.style.display = 'none';
                
                // 显示空状态
                emptyState.style.display = 'flex';
                
                // 显示错误提示
                showToast('获取分享链接失败，请稍后再试');
            });
    }
    
    // 渲染分享链接列表
    function renderShareLinks(data, container) {
        // 按创建时间倒序排序链接
        const sortedLinks = Object.entries(data).sort((a, b) => {
            return b[1].createdAt - a[1].createdAt;
        });
        
        // 渲染每个链接卡片
        sortedLinks.forEach(([id, link]) => {
            const card = createShareLinkCard(id, link);
            container.appendChild(card);
        });
    }
    
    // 创建分享链接卡片
    function createShareLinkCard(id, link) {
        const card = document.createElement('div');
        card.className = 'share-link-card';
        card.dataset.id = id;
        
        // 检查链接是否过期
        const expired = isExpired(link.expiresAt);
        const expiryClass = expired ? 'expired' : '';
        
        // 确定文件图标
        const iconName = link.fileName.endsWith('/') || link.filePath.endsWith('/') ? 'folder' : 'file';
        
        let cardHtml = `
            <div class="file-name">
                <span class="file-icon" data-icon="${iconName}"></span>
                ${link.fileName}
            </div>
            <div class="file-path" title="${link.filePath}">${link.filePath}</div>
        `;
        
        // 添加过期标记（如果已过期）
        if (expired) {
            cardHtml += `<div class="expired-badge">已过期</div>`;
        }
        
        cardHtml += `
            <div class="info-row">
                <span class="info-label">分享地址：</span>
                <span class="info-value">${link.shareLink}</span>
            </div>
        `;
        
        cardHtml += `
            <div class="info-row">
                <span class="info-label">提取码：</span>
                <span class="info-value">
                    <span class="extract-code">${(link.hasExtractCode && link.extractCode) ? link.extractCode : ''}</span>
                </span>
            </div>
        `;
        
        // 添加时间信息
        cardHtml += `
            <div class="info-row">
                <span class="info-label">创建时间：</span>
                <span class="info-value">${formatTimestamp(link.createdAt)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">失效时间：</span>
                <span class="info-value ${expiryClass}">${formatTimestamp(link.expiresAt)}</span>
            </div>
            <div class="link-actions">
                <button class="action-btn copy-link-btn">
                    <span class="icon" data-icon="copy"></span>复制链接
                </button>
                ${link.hasExtractCode && link.extractCode ? `
                <button class="action-btn copy-code-btn">
                    <span class="icon" data-icon="key"></span>复制提取码
                </button>
                ` : ''}
                <button class="action-btn open-link-btn">
                    <span class="icon" data-icon="external"></span>打开
                </button>
                <button class="action-btn delete-link-btn">
                    <span class="icon" data-icon="delete"></span>删除
                </button>
            </div>
        `;
        
        card.innerHTML = cardHtml;
        
        // 添加复制链接事件
        const copyLinkBtn = card.querySelector('.copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', function(e) {
                // 使用当前域名和端口构建完整的分享链接
                const fullShareUrl = getFullShareUrl(link.shareLink);
                copyToClipboard(fullShareUrl, e);
            });
        }
        
        // 添加复制提取码事件
        const copyCodeBtn = card.querySelector('.copy-code-btn');
        if (copyCodeBtn && link.extractCode) {
            copyCodeBtn.addEventListener('click', function(e) {
                copyToClipboard(link.extractCode, e);
            });
        }
        
        // 添加打开链接事件
        const openLinkBtn = card.querySelector('.open-link-btn');
        if (openLinkBtn) {
            openLinkBtn.addEventListener('click', function() {
                // 使用当前域名和端口构建完整的分享链接
                const fullShareUrl = getFullShareUrl(link.shareLink);
                window.open(fullShareUrl, '_blank');
            });
        }
        
        // 添加删除链接事件
        const deleteBtn = card.querySelector('.delete-link-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                showDeleteModal(id, link, card);
            });
        }
        
        return card;
    }
    
    // 显示删除确认模态窗口
    function showDeleteModal(linkId, link, cardElement) {
        const modal = document.getElementById('deleteModal');
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancelDelete');
        const confirmBtn = document.getElementById('confirmDelete');
        const fileNameEl = modal.querySelector('.modal-file-name');
        const filePathEl = modal.querySelector('.modal-file-path');
        
        // 设置文件信息
        fileNameEl.textContent = link.fileName;
        filePathEl.textContent = link.filePath;
        
        // 添加分享链接信息
        let shareLinkInfo = modal.querySelector('.modal-share-link');
        if (!shareLinkInfo) {
            shareLinkInfo = document.createElement('div');
            shareLinkInfo.className = 'modal-share-link';
            modal.querySelector('.modal-file-info').appendChild(shareLinkInfo);
        }
        
        // 显示完整分享链接
        const fullShareUrl = getFullShareUrl(link.shareLink);
        shareLinkInfo.textContent = `分享链接: ${fullShareUrl}`;
        
        // 显示模态窗口
        modal.classList.add('active');
        
        // 关闭模态窗口的函数
        const closeModal = () => {
            modal.classList.remove('active');
        };
        
        // 添加关闭按钮事件
        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = closeModal;
        }
        
        // 添加点击模态窗口外部关闭事件
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            };
        }
        
        // 添加确认删除事件
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                closeModal();
                deleteShareLink(linkId, cardElement);
            };
        }
        
        // 添加ESC键关闭事件
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    // 删除分享链接
    function deleteShareLink(linkId, cardElement) {
        // 显示加载状态
        showToast('正在删除链接...');
        
        // 发送删除请求
        fetch('/set/del', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                linkId: linkId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 删除成功，移除卡片元素
                cardElement.classList.add('deleting');
                
                // 添加动画效果
                setTimeout(() => {
                    cardElement.style.height = '0';
                    cardElement.style.opacity = '0';
                    cardElement.style.padding = '0';
                    cardElement.style.margin = '0';
                    cardElement.style.overflow = 'hidden';
                    
                    // 动画完成后移除元素
                    setTimeout(() => {
                        cardElement.remove();
                        
                        // 检查是否还有链接卡片
                        const container = document.getElementById('shareLinksContainer');
                        const emptyState = document.getElementById('emptyShareLinks');
                        
                        if (container && emptyState && container.children.length === 0) {
                            container.style.display = 'none';
                            emptyState.style.display = 'flex';
                        }
                    }, 300);
                }, 10);
                
                showToast('链接已成功删除');
            } else {
                // 删除失败
                showToast(data.message || '删除链接失败，请稍后再试');
            }
        })
        .catch(error => {
            console.error('删除链接失败:', error);
            showToast('删除链接失败，请稍后再试');
        });
    }
    
    // 初始化主题选择器
    createThemeSelector();
});
