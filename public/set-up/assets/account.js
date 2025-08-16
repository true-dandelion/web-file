document.addEventListener('DOMContentLoaded', function () {
    // 初始化账户管理页面
    initAccountPage();
});

// 初始化账户管理页面
function initAccountPage() {
    // 个人信息功能
    initProfileInfo();

    // 密码修改功能
    initPasswordChange();

    // 设备管理功能
    initDevicesManagement();
}

// 初始化个人信息显示
function initProfileInfo() {
    // 获取用户个人信息
    fetchUserInformation();

    // 设置修改邮件地址按钮事件
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', function () {
            // 首先打开验证邮件模态窗口
            startEmailVerification();
        });
    }

    // 设置发送验证码按钮事件
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', function () {
            if (!this.disabled) {
                sendVerificationCode();
                // 隐藏发送按钮，显示重发按钮
                this.style.display = 'none';
                const resendBtn = document.getElementById('resendCodeBtn');
                if (resendBtn) {
                    resendBtn.style.display = 'block';
                }
                startCountdown();
            }
        });
    }

    // 设置重新发送验证码按钮事件
    const resendCodeBtn = document.getElementById('resendCodeBtn');
    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', function () {
            if (!this.disabled) {
                sendVerificationCode();
                startCountdown();
            }
        });
    }

    // 设置邮件验证表单提交事件
    const emailVerifyForm = document.getElementById('email-verify-form');
    if (emailVerifyForm) {
        emailVerifyForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const verifyCode = document.getElementById('verify-code').value;

            // 表单验证
            if (!verifyCode.trim()) {
                showToast('验证码不能为空', 'error');
                return;
            }

            // 发送到服务器验证邮箱验证码
            verifyEmailCode(verifyCode);
        });
    }

    // 设置邮件修改表单提交事件
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const newEmail = document.getElementById('new-email').value;

            // 表单验证
            if (!newEmail.trim()) {
                showToast('邮件地址不能为空', 'error');
                return;
            }

            // 检查邮件格式
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                showToast('请输入有效的邮件地址', 'error');
                return;
            }

            // 发送到服务器更新邮件地址
            updateEmailAddress(newEmail);
        });
    }
}

// 获取用户个人信息
function fetchUserInformation() {
    const usernameElement = document.getElementById('profile-username');
    const emailElement = document.getElementById('profile-email');
    const emailContainer = document.getElementById('email-container');

    // 显示加载状态
    if (usernameElement) {
        usernameElement.textContent = "加载中...";
    }

    fetch('/head/information', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 保存当前邮件地址，方便后续使用
                window.currentUserEmail = data.email || null;

                // 显示用户名
                if (usernameElement && data.username) {
                    // 添加淡入动画
                    usernameElement.style.opacity = '0';
                    usernameElement.textContent = data.username;

                    // 应用动画效果
                    setTimeout(() => {
                        usernameElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        usernameElement.style.opacity = '1';
                        usernameElement.style.transform = 'translateY(0)';
                    }, 100);
                }

                // 显示邮件地址，如果存在
                if (emailElement) {
                    // 添加淡入动画
                    emailElement.style.opacity = '0';

                    if (data.email) {
                        emailElement.textContent = data.email;
                        emailElement.style.color = '#333';
                    } else {
                        emailElement.textContent = "未设置";
                        emailElement.style.color = "#999";
                    }

                    // 应用动画效果，延迟一点以便有顺序感
                    setTimeout(() => {
                        emailElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        emailElement.style.opacity = '1';
                        emailElement.style.transform = 'translateY(0)';
                    }, 200);
                }
            } else {
                if (usernameElement) {
                    usernameElement.textContent = "获取信息失败";
                }
                showToast('获取个人信息失败', 'error');
            }
        })
        .catch(error => {
            console.error('获取个人信息时发生错误:', error);
            if (usernameElement) {
                usernameElement.textContent = "获取信息失败";
            }
            showToast('获取个人信息失败', 'error');
        });
}

// 开始邮件验证流程
function startEmailVerification() {
    // 检查是否有当前邮件地址
    if (!window.currentUserEmail) {
        // 如果用户没有设置邮件地址，直接跳到设置邮件地址步骤
        openModal('email-modal');
        return;
    }

    // 显示当前邮件地址
    const emailDisplay = document.getElementById('current-email-display');
    if (emailDisplay) {
        emailDisplay.textContent = maskEmail(window.currentUserEmail);
    }

    // 重置验证码输入框
    const verifyCodeInput = document.getElementById('verify-code');
    if (verifyCodeInput) {
        verifyCodeInput.value = '';
    }

    // 显示发送按钮，隐藏重发按钮
    const sendBtn = document.getElementById('sendCodeBtn');
    const resendBtn = document.getElementById('resendCodeBtn');
    if (sendBtn && resendBtn) {
        sendBtn.style.display = 'block';
        sendBtn.disabled = false;
        resendBtn.style.display = 'none';

        // 如果有倒计时，清除它
        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
        }
    }

    // 打开验证邮件模态窗口
    openModal('email-verify-modal');
}

// 遮盖邮件地址中间部分
function maskEmail(email) {
    if (!email) return '';

    const parts = email.split('@');
    if (parts.length !== 2) return email;

    const name = parts[0];
    const domain = parts[1];

    let maskedName = name;
    if (name.length > 2) {
        maskedName = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    }

    return maskedName + '@' + domain;
}

// 发送验证码到邮箱
function sendVerificationCode() {
    // 显示加载状态
    showToast('正在发送验证码...', 'info');

    fetch('/account/send-verification-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: window.currentUserEmail
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('验证码已发送，请查收邮件', 'success');
            } else {
                showToast(data.message || '发送验证码失败', 'error');
            }
        })
        .catch(error => {
            console.error('发送验证码时发生错误:', error);
            showToast('发送验证码失败，请稍后再试', 'error');
        });
}

// 开始倒计时
function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendCodeBtn');

    if (!countdownElement || !resendBtn) return;

    // 清除之前的倒计时
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }

    let seconds = 60;
    countdownElement.textContent = seconds;
    resendBtn.disabled = true;

    const interval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;

        if (seconds <= 0) {
            clearInterval(interval);
            resendBtn.disabled = false;
            countdownElement.textContent = '60';
        }
    }, 1000);

    // 保存interval ID，以便在需要时清除
    window.countdownInterval = interval;
}

// 验证邮箱验证码
function verifyEmailCode(code) {
    // 显示加载状态
    showToast('正在验证...', 'info');

    fetch('/account/verify-email-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: code,
            email: window.currentUserEmail
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('验证成功！', 'success');

                // 关闭验证模态窗口
                closeModal('email-verify-modal');

                // 清除倒计时
                if (window.countdownInterval) {
                    clearInterval(window.countdownInterval);
                }

                // 重置验证表单
                const verifyForm = document.getElementById('email-verify-form');
                if (verifyForm) {
                    verifyForm.reset();
                }

                // 打开修改邮件地址模态窗口
                setTimeout(() => {
                    openModal('email-modal');
                }, 500);
            } else {
                showToast(data.message || '验证码不正确', 'error');
            }
        })
        .catch(error => {
            console.error('验证邮箱时发生错误:', error);
            showToast('验证失败，请稍后再试', 'error');
        });
}

// 更新邮件地址
function updateEmailAddress(newEmail) {
    // 显示加载状态
    showToast('正在更新邮件地址...', 'info');

    fetch('/account/update-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: newEmail
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('邮件地址更新成功！', 'success');
                closeModal('email-modal');

                // 更新当前邮件地址
                window.currentUserEmail = newEmail;

                // 重新获取用户信息以更新显示
                fetchUserInformation();

                // 重置表单
                const emailForm = document.getElementById('email-form');
                if (emailForm) {
                    emailForm.reset();
                }
            } else {
                showToast(data.message || '邮件地址更新失败', 'error');
            }
        })
        .catch(error => {
            console.error('更新邮件地址时发生错误:', error);
            showToast('邮件地址更新失败，请稍后再试', 'error');
        });
}

// 初始化密码修改功能
function initPasswordChange() {
    const passwordForm = document.getElementById('password-form');
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    const strengthBar = document.querySelector('.strength-bar');
    const passwordHint = document.querySelector('.password-hint');

    if (newPassword && strengthBar) {
        // 密码强度检测
        newPassword.addEventListener('input', function () {
            const strength = checkPasswordStrength(this.value);
            updatePasswordStrengthUI(strength, strengthBar, passwordHint);
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // 表单验证
            if (!currentPassword.value) {
                showToast('请输入当前密码', 'error');
                return;
            }

            if (!newPassword.value) {
                showToast('请输入新密码', 'error');
                return;
            }

            if (newPassword.value !== confirmPassword.value) {
                showToast('两次输入的密码不一致', 'error');
                return;
            }

            const strength = checkPasswordStrength(newPassword.value);
            if (strength === 'weak') {
                showToast('密码强度太弱，请设置更复杂的密码', 'error');
                return;
            }

            // 调用修改密码的后端接口
            changePasswordOnServer(currentPassword.value, newPassword.value, confirmPassword.value, passwordForm, strengthBar, passwordHint);
        });
    }

    // 打开密码修改模态框
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function () {
            openModal('password-modal');
        });
    }
}

// 检查密码强度
function checkPasswordStrength(password) {
    if (!password) return '';

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const score = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChars, isLongEnough].filter(Boolean).length;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
}

// 修改密码的后端接口调用
function changePasswordOnServer(currentPassword, newPassword, confirmPassword, passwordForm, strengthBar, passwordHint) {
    // 显示加载状态
    showToast('正在修改密码...', 'info');

    // 禁用提交按钮，防止重复提交
    const submitBtn = passwordForm.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '修改中...';
    }

    // 发送修改密码请求到后端
    fetch('/account/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            currentPassword: currentPassword,
            newPassword: newPassword,
            confirmPassword: confirmPassword
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 修改成功
                showToast('密码修改成功！', 'success');
                closeModal('password-modal');

                // 重置表单
                passwordForm.reset();
                strengthBar.className = 'strength-bar';
                passwordHint.textContent = '';

                // 可选：提示用户重新登录
                setTimeout(() => {
                    showToast('为了安全起见，建议您重新登录', 'info');
                }, 2000);
            } else {
                // 修改失败，显示错误信息
                showToast(data.message || '密码修改失败，请检查当前密码是否正确', 'error');
            }
        })
        .catch(error => {
            console.error('修改密码时发生错误:', error);
            showToast('密码修改失败，请稍后再试', 'error');
        })
        .finally(() => {
            // 恢复提交按钮状态
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '确认修改';
            }
        });
}

// 更新密码强度UI
function updatePasswordStrengthUI(strength, strengthBar, passwordHint) {
    // 移除所有类
    strengthBar.className = 'strength-bar';

    if (!strength) {
        passwordHint.textContent = '';
        return;
    }

    // 添加对应强度的类
    strengthBar.classList.add(`strength-${strength}`);

    // 更新提示文字
    switch (strength) {
        case 'weak':
            passwordHint.textContent = '密码强度：弱 - 建议包含大小写字母、数字和特殊字符';
            passwordHint.style.color = '#ff5252';
            break;
        case 'medium':
            passwordHint.textContent = '密码强度：中等 - 可以再增加一些复杂度';
            passwordHint.style.color = '#ffc107';
            break;
        case 'strong':
            passwordHint.textContent = '密码强度：强';
            passwordHint.style.color = '#4caf50';
            break;
    }
}

// 初始化设备管理功能
function initDevicesManagement() {
    // 打开设备管理模态框
    const manageDevicesBtn = document.getElementById('manageDevicesBtn');
    if (manageDevicesBtn) {
        manageDevicesBtn.addEventListener('click', function () {
            // 显示加载状态
            const devicesList = document.querySelector('.devices-list');
            if (devicesList) {
                devicesList.innerHTML = `
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>正在加载设备信息...</p>
                    </div>
                `;
            }

            // 打开模态框
            openModal('devices-modal');

            // 从服务器获取设备列表
            fetch('/account/device-management', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getDevices'
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                        renderDevicesList(data.data);
                    } else {
                        // 显示无设备信息
                        if (devicesList) {
                            devicesList.innerHTML = `
                            <div class="empty-state">
                                <p>暂无设备登录信息</p>
                            </div>
                        `;
                        }
                    }
                })
                .catch(error => {
                    console.error('获取设备列表失败:', error);
                    // 显示错误信息
                    if (devicesList) {
                        devicesList.innerHTML = `
                        <div class="empty-state">
                            <p>获取设备信息失败，请稍后再试</p>
                        </div>
                    `;
                    }
                    showToast('获取设备信息失败，请稍后再试', 'error');
                });
        });
    }
}

// 渲染设备列表
function renderDevicesList(devices) {
    const devicesList = document.querySelector('.devices-list');
    if (!devicesList) return;

    // 清空现有列表
    devicesList.innerHTML = '';

    // 获取当前设备ID（假设最新的登录设备是当前设备）
    const currentDeviceId = devices[0].table;

    // 添加设备项
    devices.forEach(device => {
        const deviceItem = document.createElement('div');
        const isCurrent = device.table === currentDeviceId;
        deviceItem.className = `device-item ${isCurrent ? 'device-current' : ''}`;

        // 确定设备图标
        let deviceIcon = '';
        if (device.equipment.includes('Windows') || device.equipment.includes('macOS')) {
            deviceIcon = '<svg class="device-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21,14H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z" /></svg>';
        } else if (device.equipment.includes('Android')) {
            deviceIcon = '<svg class="device-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.2,16.8H9.6V21.6C9.6,22.9 10.6,24 12,24C13.4,24 14.4,22.9 14.4,21.6V16.8H16.8C19.4,16.8 21.6,14.6 21.6,12V4.8H2.4V12C2.4,14.6 4.6,16.8 7.2,16.8M16.8,2.4C17.4,2.4 18,2.8 18,3.6C18,4.2 17.4,4.8 16.8,4.8C16.2,4.8 15.6,4.2 15.6,3.6C15.6,2.8 16.2,2.4 16.8,2.4M7.2,2.4C7.8,2.4 8.4,2.8 8.4,3.6C8.4,4.2 7.8,4.8 7.2,4.8C6.6,4.8 6,4.2 6,3.6C6,2.8 6.6,2.4 7.2,2.4M12,0C8,0 4.7,2.6 3.8,6H20.2C19.3,2.6 16,0 12,0Z" /></svg>';
        } else if (device.equipment.includes('iOS') || device.equipment.includes('iPhone') || device.equipment.includes('iPad')) {
            deviceIcon = '<svg class="device-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z" /></svg>';
        } else {
            deviceIcon = '<svg class="device-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21,14H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z" /></svg>';
        }

        // 格式化登录时间
        const loginTime = formatLoginTime(device['login-time']);

        // 登录方式显示
        const loginMethod = device.user === 'normal' ? '账号密码登录' : '扫码登录';

        deviceItem.innerHTML = `
            <div class="device-info">
                ${deviceIcon}
                <div class="device-details">
                    <h4>${device.equipment} ${isCurrent ? '<span class="device-current-badge">当前设备</span>' : ''}</h4>
                    <p>登录IP: ${device.manage}</p>
                    <p>登录方式: ${loginMethod}</p>
                    <p>登录时间: ${loginTime}</p>
                </div>
            </div>
            ${!isCurrent ?
                `<button class="logout-device-btn" data-device-id="${device.table}">注销此设备</button>` :
                ''}
        `;

        devicesList.appendChild(deviceItem);
    });

    // 添加注销设备事件监听
    const logoutButtons = devicesList.querySelectorAll('.logout-device-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function () {
            const deviceId = this.getAttribute('data-device-id');

            // 显示注销中状态
            const deviceItem = this.closest('.device-item');
            deviceItem.style.opacity = '0.5';
            this.disabled = true;
            this.textContent = '正在注销...';

            // 发送注销请求到服务器
            fetch('/account/delete-device-management', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deviceId: deviceId
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 注销成功，移除设备项
                        setTimeout(() => {
                            deviceItem.remove();
                            showToast('设备已成功注销', 'success');
                        }, 300);
                    } else {
                        // 注销失败，恢复按钮状态
                        deviceItem.style.opacity = '1';
                        this.disabled = false;
                        this.textContent = '注销此设备';
                        showToast(data.message || '注销设备失败，请稍后再试', 'error');
                    }
                })
                .catch(error => {
                    console.error('注销设备失败:', error);
                    // 恢复按钮状态
                    deviceItem.style.opacity = '1';
                    this.disabled = false;
                    this.textContent = '注销此设备';
                    showToast('注销设备失败，请稍后再试', 'error');
                });
        });
    });
}

// 格式化登录时间
function formatLoginTime(timestamp) {
    if (!timestamp) return '未知时间';

    const date = new Date(parseInt(timestamp));
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Shanghai'
    };

    return new Intl.DateTimeFormat('zh-CN', options).format(date);
}

// 打开模态框
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');

        // 添加关闭按钮事件
        const closeButtons = modal.querySelectorAll('.close-modal, .cancel-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', function () {
                closeModal(modalId);
            });
        });

        // 仅对非密码修改模态窗口添加点击遮罩层关闭功能
        if (modalId !== 'password-modal') {
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', function (e) {
                    if (e.target === overlay) {
                        closeModal(modalId);
                    }
                });
            }
        }
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 检查是否已经存在全局的 showToast 函数
    if (window.showToast && typeof window.showToast === 'function' && window.showToast !== showToast) {
        // set-up.js 中的 showToast 只接收一个参数，直接传递消息
        window.showToast(message);
        return;
    }

    // 如果没有全局函数，则使用自己的实现
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 设置样式
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = type === 'error' ? '#ff5252' :
        type === 'success' ? '#4caf50' :
            type === 'warning' ? '#ffc107' : '#4285f4';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    toast.style.zIndex = '1200';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';

    // 显示toast
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // 自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';

        // 移除元素
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 处理退出登录功能
function handleLogout() {
    // 发送退出请求到服务器
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin' // 确保发送cookies
    })
        .then(response => {
            if (response.ok) {
                // 退出成功，跳转到登录页面
                window.location.href = '/login';
            } else {
                // 处理错误情况
                return response.json().then(data => {
                    throw new Error(data.message || '退出失败');
                });
            }
        })
        .catch(error => {
            console.error('退出时发生错误:', error);
            showToast('退出失败: ' + error.message, 'error');
        });
}

// 页面加载完成后，为退出按钮添加事件监听器
document.addEventListener('DOMContentLoaded', function () {
    const quitButton = document.querySelector('.quit');
    if (quitButton) {
        quitButton.addEventListener('click', handleLogout);
    }
});

// 获取用户信息并显示用户名
function fetchUserInfo() {
    fetch('/head/user')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.username) {
                // 找到用户名显示元素
                const usernameElement = document.getElementById('id-username');
                const usernameText = usernameElement ? usernameElement.querySelector('.username-text') : null;

                if (usernameElement && usernameText) {
                    // 添加淡入动画
                    usernameElement.style.opacity = '0';
                    usernameText.textContent = data.username;

                    // 应用动画效果
                    setTimeout(() => {
                        usernameElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        usernameElement.style.opacity = '1';
                        usernameElement.style.transform = 'translateY(0)';
                    }, 100);

                    // 添加鼠标悬停提示
                    usernameElement.title = `用户: ${data.username}`;
                }
            } else {
            }
        })
        .catch(error => {
            console.error('获取用户信息时发生错误:', error);
            showToast('获取用户信息失败', 'error');
        });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', fetchUserInfo);
