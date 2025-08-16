// 主题系统配置 - 只保留纯黑和纯白两个主题
const themes = [
    {
        name: '纯洁白色主题',
        description: '白天模式',
        primary: '#ffffff',
        secondary: '#f0f0f0',
        special: 'white'
    },
    {
        name: '纯绝黑色主题',
        description: '夜间模式',
        primary: '#121212',
        secondary: '#1e1e1e',
        special: 'black'
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
function setTheme(themeIndex, showToastMessage = false) {
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

    // 清除内联样式，让CSS规则生效
    document.body.style.background = '';

    // 显示提示信息
    if (showToastMessage) {
        showToast(`已自动切换到${theme.name}`);
    }
}

// 根据时间自动选择主题
function getThemeByTime() {
    const now = new Date();
    const hour = now.getHours();

    // 6:00-20:00 使用白色主题，18:00-6:00 使用黑色主题
    if (hour >= 6 && hour < 20) {
        return 0; // 白色主题
    } else {
        return 1; // 黑色主题
    }
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



// 初始化自动主题切换
function initAutoTheme() {
    // 根据当前时间设置主题
    const themeIndex = getThemeByTime();
    setTheme(themeIndex, false);

    // 每分钟检查一次是否需要切换主题
    setInterval(() => {
        const newThemeIndex = getThemeByTime();
        const currentTheme = document.body.getAttribute('data-theme');
        const expectedTheme = themes[newThemeIndex].special;

        if (currentTheme !== expectedTheme) {
            setTheme(newThemeIndex, true);
        }
    }, 60000); // 每分钟检查一次
}



// 初始化主题系统
function initThemeSystem() {
    // 初始化自动主题切换
    initAutoTheme();
}