function encryptLoginData(z, m) {
    try {
        const publicKey = getRSAPublicKey();
        
        const publicKeyForge = forge.pki.publicKeyFromPem(publicKey);
        
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