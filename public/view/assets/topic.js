// 主题系统配置
const themes = [
    {
        name: '纯洁白色主题',
        description: '极简清新的白色系',
        primary: '#ffffff',
        secondary: '#f0f0f0',
        special: 'white'
    },
    {
        name: '纯绝黑色主题',
        description: '高端沉稳的黑色系',
        primary: '#121212',
        secondary: '#1e1e1e',
        special: 'black'
    },
    {
        name: '粉色少女主题',
        description: '温柔可爱的粉色系',
        primary: '#ff6b81',
        secondary: '#6c5ce7',
    },
    {
        name: '蓝色海洋主题',
        description: '清爽沁凉的蓝色系',
        primary: '#0984e3',
        secondary: '#00cec9',
    },
    {
        name: '绿色森林主题',
        description: '自然舒适的绿色系',
        primary: '#00b894',
        secondary: '#6ab04c',
    },
    {
        name: '紫色魔法主题',
        description: '神秘梦幻的紫色系',
        primary: '#a29bfe',
        secondary: '#fd79a8',
    },
    {
        name: '橙色阳光主题',
        description: '活力四溢的橙色系',
        primary: '#fdcb6e',
        secondary: '#e17055',
    }
];

// 颜色转换函数
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// 设置主题函数
function setTheme(themeIndex, showToastMessage = true, saveToServer = true) {
    const theme = themes[themeIndex];
    if (!theme) return;

    const root = document.documentElement;
    const primaryRgb = hexToRgb(theme.primary);
    const secondaryRgb = hexToRgb(theme.secondary);

    // 设置CSS变量
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--primary-color-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--secondary-color-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);

    // 应用特殊主题属性
    document.body.removeAttribute('data-theme');
    if (theme.special) {
        document.body.setAttribute('data-theme', theme.special);
    }

    // 为其他主题设置背景渐变
    if (!theme.special) {
        const primaryRgba = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`;
        const secondaryRgba = `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.1)`;
        document.body.style.background = `linear-gradient(135deg, ${primaryRgba}, ${secondaryRgba})`;
    } else {
        // 清除内联样式，让CSS规则生效
        document.body.style.background = '';
    }

    // 更新主题卡片的活动状态
    updateThemeCardStates(themeIndex);

    // 保存到本地存储
    localStorage.setItem('selectedTheme', themeIndex.toString());

    // 只在用户主动切换时同步到服务器
    if (saveToServer) {
        saveThemeToServer(themeIndex);
    }

    // 只在用户主动切换时显示提示
    if (showToastMessage) {
        showToast(`已切换到${theme.name}`);
    }
}

// 更新主题卡片状态
function updateThemeCardStates(activeIndex) {
    const cards = document.querySelectorAll('.theme-card');
    cards.forEach((card, index) => {
        card.classList.toggle('active', index === activeIndex);
    });
}

// 保存主题到服务器
function saveThemeToServer(themeIndex) {
    fetch('/view/preview-theme', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'setTheme',
            theme: themeIndex
        })
    })
        .catch(error => {
            console.error('保存主题到服务器失败:', error);
        });
}

// 显示Toast提示
function showToast(message) {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 3秒后自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 创建主题选择器
function createThemeSelector() {
    const selector = document.createElement('div');
    selector.className = 'theme-selector';

    // 创建切换按钮
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.innerHTML = '主题';
    toggleBtn.title = '切换主题';

    // 创建主题面板
    const panel = document.createElement('div');
    panel.className = 'theme-panel';

    const title = document.createElement('h3');
    title.textContent = '选择主题';
    panel.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'theme-grid';

    // 创建主题卡片
    themes.forEach((theme, index) => {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.setAttribute('data-theme', index.toString());

        card.innerHTML = `
            <h4>${theme.name}</h4>
            <p>${theme.description}</p>
        `;

        card.addEventListener('click', () => {
            setTheme(index);
            panel.classList.remove('show');
        });

        grid.appendChild(card);
    });

    panel.appendChild(grid);

    // 切换面板显示/隐藏
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('show');
    });

    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
        if (!selector.contains(e.target)) {
            panel.classList.remove('show');
        }
    });

    selector.appendChild(toggleBtn);
    selector.appendChild(panel);
    document.body.appendChild(selector);
}

// 初始化主题请求
function initThemeRequest() {
    fetch('/view/preview-theme', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'getTheme' })
    })
        .then(response => response.json())
        .then(data => {
            let themeIndex = 0; // 默认主题

            if (data && data.theme !== undefined) {
                themeIndex = parseInt(data.theme, 10);
            } else {
                // 从本地存储获取主题
                const savedTheme = localStorage.getItem('selectedTheme');
                if (savedTheme !== null) {
                    themeIndex = parseInt(savedTheme, 10);
                }
            }

            // 确保主题索引有效
            if (themeIndex < 0 || themeIndex >= themes.length) {
                themeIndex = 0;
            }

            // 应用主题（初始化时不显示Toast，不保存到服务器）
            setTheme(themeIndex, false, false);
        })
        .catch(error => {
            console.error('获取主题失败:', error);

            // 从本地存储获取主题作为备份
            const savedTheme = localStorage.getItem('selectedTheme');
            const themeIndex = savedTheme ? parseInt(savedTheme, 10) : 0;
            setTheme(themeIndex, false, false);
        });
}

// 初始化主题系统
function initThemeSystem() {
    // 创建主题选择器
    createThemeSelector();

    // 初始化主题
    initThemeRequest();
}