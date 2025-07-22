const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { authMiddleware } = require('../middleware/middleware')

// 处理文件路径，只保留用户ID之后的部分
function shortenFilePath(filePath, userId) {
    // 检查是Windows路径还是Linux路径
    const isWindows = filePath.includes('\\')
    const separator = isWindows ? '\\\\' : '/' // 使用双反斜杠转义Windows路径分隔符
    
    try {
        // 查找用户ID在路径中的位置
        const userIdPattern = new RegExp(`${separator}${userId}${separator}`)
        const match = filePath.match(userIdPattern)
        
        if (match && match.index !== -1) {
            // 获取用户ID之后的路径部分
            const startIndex = match.index + match[0].length - 1
            return filePath.substring(startIndex)
        }
    } catch (error) {
        console.error('路径处理错误:', error)
        // 出错时返回原路径
    }
    
    // 如果找不到用户ID或处理出错，返回原路径
    return filePath
}

router.post('/link', authMiddleware, (req, res) => {
    try {
        const shareDataPath = path.resolve(__dirname, '../../config/share-data.json')
        const shareData = JSON.parse(fs.readFileSync(shareDataPath, 'utf8'))
        
        const userId = req.user.id.toString()
        const userShares = {}
        
        Object.entries(shareData.shares).forEach(([shareId, shareInfo]) => {
            if (shareInfo.createdBy.toString() === userId) {
                let shareLink = `/share/share?fileId=${shareId}`;
                if (shareInfo.extractCode) {
                    shareLink += `&extract=${shareInfo.extractCode}`;
                }
                
                // 简化文件路径
                const shortenedPath = shortenFilePath(shareInfo.filePath, userId)
                
                userShares[shareId] = {
                    ...shareInfo,
                    filePath: shortenedPath, // 使用简化后的路径
                    shareLink,
                    hasExtractCode: shareInfo.extractCode !== null
                }
            }
        })
        
        res.json({
            success: true,
            data: userShares
        })
    } catch (error) {
        console.error('获取分享链接失败:', error)
        res.status(500).json({ error: '服务器内部错误' })
    }
})

// 添加删除分享链接的接口
router.post('/del', authMiddleware, (req, res) => {
    try {
        const { linkId } = req.body
        
        if (!linkId) {
            return res.status(400).json({ 
                success: false,
                error: '缺少必要参数 linkId' 
            })
        }
        
        // 读取分享数据文件
        const shareDataPath = path.resolve(__dirname, '../../config/share-data.json')
        const shareData = JSON.parse(fs.readFileSync(shareDataPath, 'utf8'))
        
        // 检查链接是否存在
        if (!shareData.shares[linkId]) {
            return res.status(404).json({ 
                success: false,
                error: '分享链接不存在' 
            })
        }
        
        // 验证是否为当前用户创建的链接
        const userId = req.user.id.toString()
        if (shareData.shares[linkId].createdBy.toString() !== userId) {
            return res.status(403).json({ 
                success: false,
                error: '无权删除此分享链接' 
            })
        }
        
        // 删除分享链接
        delete shareData.shares[linkId]
        
        // 保存更新后的数据
        fs.writeFileSync(shareDataPath, JSON.stringify(shareData, null, 2), 'utf8')
        
        res.json({
            success: true,
            message: '分享链接已成功删除'
        })
    } catch (error) {
        console.error('删除分享链接失败:', error)
        res.status(500).json({ 
            success: false,
            error: '服务错误' 
        })
    }
})




// 导出路由
module.exports = router