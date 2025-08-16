function encryptLoginData(z, m) {
    try {
        // 检查是否已获取到公钥
        if (!globalPublicKey) {
            console.error('公钥尚未获取，请稍后重试');
            return null;
        }
        
        const publicKeyForge = forge.pki.publicKeyFromPem(globalPublicKey);
        
        const encryptedUsername = forge.util.encode64(
            publicKeyForge.encrypt(z, 'RSA-OAEP', {
                md: forge.md.sha256.create()
            })
        );
        
        const encryptedPassword = forge.util.encode64(
            publicKeyForge.encrypt(m, 'RSA-OAEP', {
                md: forge.md.sha256.create()
            })
        );
        
        return {
            y: encryptedUsername,
            k: encryptedPassword
        };
    } catch (error) {
        console.error('加密失败:', error);
        return null;
    }
}