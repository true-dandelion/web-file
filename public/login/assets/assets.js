const loginSwitch = document.querySelector('.login-switch');
const loginForm = document.getElementById('loginForm');
const qrLogin = document.querySelector('.qr-login');
let ws = null;

// 设置cookie的工具函数
function setCookie(name, value, days, path = '/') {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; path=${path}; expires=${expires.toUTCString()}; SameSite=Strict`;
}

async function loadQRCode() {
    try {
        const response = await fetch('/code/qrcode');
        const data = await response.json();

        const qrCodeElement = document.querySelector('.qr-code');
        const qrTip = document.querySelector('.qr-tip');
        qrCodeElement.innerHTML = `<img src="${data.qrCodeUrl}" alt="登录二维码">`;
        qrTip.textContent = '请使用手机扫码登录';

        connectWebSocket(data.webqrCodeId);

        setTimeout(() => {
            if (ws) {
                qrTip.textContent = '二维码已过期，请刷新';
                qrCodeElement.innerHTML = `
                    <div style="text-align: center;">
                        <button onclick="loadQRCode()" style="width: auto; margin-top: 10px;">刷新二维码</button>
                    </div>
                `;
                ws.close();
            }
        }, data.expireIn * 1000);

    } catch (error) {
        console.error('加载二维码失败:', error);
        const qrCodeElement = document.querySelector('.qr-code');
        const qrTip = document.querySelector('.qr-tip');
        qrTip.textContent = '加载二维码失败，请重试';
        qrCodeElement.innerHTML = `
            <div style="text-align: center;">
                <button onclick="loadQRCode()" style="width: auto; margin-top: 10px;">重试</button>
            </div>
        `;
    }
}

function connectWebSocket(webqrCodeId) {
    ws = new WebSocket(`wss://${window.location.host}/ws/${webqrCodeId}`);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const qrTip = document.querySelector('.qr-tip');
        const qrCodeElement = document.querySelector('.qr-code');

        switch (data.type) {
            case 'QR_STATUS_UPDATE':
                if (data.status === 'SCANNED') {
                    qrTip.textContent = '已扫描，请在APP上确认登录';

                    qrCodeElement.innerHTML = `
                        <div class="qr-mask">
                            <p>已扫描</p>
                        </div>
                    `;
                } else if (data.status === 'CONFIRMED') {
                    qrTip.textContent = '登录成功，正在跳转...';

                    // 将authToken存储到cookie中
                    if (data.userInfo && data.userInfo.authToken) {
                        // 保存token到cookie
                        setCookie('authToken', data.userInfo.authToken, 24);
                        console.log('authToken已保存到cookie');
                    } else {
                        console.error('登录成功但未收到authToken');
                    }

                    // 延迟一点再跳转，确保cookie设置完成
                    setTimeout(() => {
                        window.location.href = data.userInfo.redirectUrl;
                    }, 300);
                } else if (data.status === 'REJECTED') {
                    qrTip.textContent = '登录已被拒绝';
                    qrCodeElement.innerHTML = `
                        <div style="text-align: center;">
                            <p style="color: #ff4d4f; margin-bottom: 15px;">用户拒绝登录</p>
                            <button onclick="loadQRCode()" style="width: auto; margin-top: 10px;">重新获取二维码</button>
                        </div>
                    `;
                    if (ws) {
                        ws.close();
                        ws = null;
                    }
                }
                break;

            case 'QR_EXPIRED':
                qrTip.textContent = '二维码已过期，请刷新';
                qrCodeElement.innerHTML = `
                    <div style="text-align: center;">
                        <button onclick="loadQRCode()" style="width: auto; margin-top: 10px;">刷新二维码</button>
                    </div>
                `;
                break;
        }
    };

    ws.onerror = () => {
        const qrTip = document.querySelector('.qr-tip');
        qrTip.textContent = '连接异常，请刷新页面重试';

        const qrCodeElement = document.querySelector('.qr-code');
        qrCodeElement.innerHTML = `
            <div style="text-align: center;">
                <p style="color: #ff4d4f; margin-bottom: 15px;">连接出错</p>
                <button onclick="loadQRCode()" style="width: auto; margin-top: 10px;">重新连接</button>
            </div>
        `;
    };

    ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        // 如果是意外关闭，可以在这里处理重连逻辑
        ws = null;
    };
}

loginSwitch.addEventListener('click', () => {
    if (loginForm.style.display !== 'none') {
        loginForm.style.display = 'none';
        qrLogin.style.display = 'block';
        loginSwitch.querySelector('span').textContent = '账号密码登录';
        loadQRCode();
    } else {
        loginForm.style.display = 'block';
        qrLogin.style.display = 'none';
        loginSwitch.querySelector('span').textContent = '扫码登录';
        if (ws) {
            ws.close();
            ws = null;
        }
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const z = formData.get('z');
    const m = formData.get('m');

    // 检查用户名和密码是否为空
    const errorMessage = document.querySelector('.error-message');
    if (!z || !z.trim()) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '请输入用户名';
        return;
    }

    if (!m || !m.trim()) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '请输入密码';
        return;
    }

    // 检查公钥是否已获取
    if (!globalPublicKey) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '系统初始化中，请稍后重试';
        return;
    }

    const encryptedData = encryptLoginData(z, m);

    if (!encryptedData) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '加密过程出错，请稍后重试';
        return;
    }

    try {
        const response = await fetch('/login/pas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                y: encryptedData.y,
                k: encryptedData.k,
                conversation: globalConversationId
            }),
            credentials: 'include'
        });

        const data = await response.json();
        if (data.success) {
            window.location.href = data.data.redirectUrl;
        } else {
            const errorMessage = document.querySelector('.error-message');
            errorMessage.style.display = 'block';
            errorMessage.textContent = data.message;
        }
    } catch (error) {
        console.error('登录请求出错:', error);
        const errorMessage = document.querySelector('.error-message');
        errorMessage.style.display = 'block';
        errorMessage.textContent = '登录请求出错，请稍后重试';
    }
});

// 全局变量存储公钥和会话ID
let globalPublicKey = null;
let globalConversationId = null;


// 页面加载后获取公钥
document.addEventListener('DOMContentLoaded', function () {
    fetch('/conversation')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                globalPublicKey = data.m;
                globalConversationId = data.conversation;
            } else {
                console.error('获取公钥失败');
            }
        })
        .catch(error => {
            console.error('获取失败:', error);
        });
});