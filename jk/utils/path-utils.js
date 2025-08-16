const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '../../file');

// 确保目录存在
function ensureDirectoryExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

// 获取用户特定的文件路径
function getUserBasePath(userId) {
    const userPath = path.join(ROOT_DIR, userId.toString());
    ensureDirectoryExists(userPath);
    return userPath;
}

// 规范化路径，确保以用户ID开头
function normalizeUserPath(rawPath, userId) {
    // 去除开头的斜杠
    const cleanPath = rawPath.replace(/^\/+/, '');
    
    // 检查路径是否已经以用户ID开头
    if (cleanPath.startsWith(userId)) {
        return cleanPath;
    }
    
    // 添加用户ID
    return path.join(userId, cleanPath);
}

// 构建完整的系统路径
function buildFullPath(rawPath, userId) {
    const normalizedPath = normalizeUserPath(rawPath, userId);
    return path.join(ROOT_DIR, normalizedPath);
}

// 从完整路径提取相对路径(只包含用户ID后的部分)
function getRelativePath(fullPath, userId) {
    const relativePath = path.relative(ROOT_DIR, fullPath);
    
    // 确保路径包含用户ID
    if (relativePath.startsWith(userId)) {
        return relativePath;
    }
    
    return path.join(userId, relativePath);
}

// 检查路径是否在用户目录内
function isPathInUserDir(fullPath, userId) {
    const userBasePath = getUserBasePath(userId);
    return fullPath.startsWith(userBasePath);
}

module.exports = {
    ROOT_DIR,
    ensureDirectoryExists,
    getUserBasePath,
    normalizeUserPath,
    buildFullPath,
    getRelativePath,
    isPathInUserDir
}; 