const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { authMiddleware } = require('../middleware/middleware')

// 添加 POST 路由获取设备管理信息
router.post('/device-management', authMiddleware, (req, res) => {
    try {
        // 获取当前用户ID
        const userId = req.user.id.toString()
        
        // 读取登录记录数据
        const manageDataPath = path.resolve(__dirname, '../user/manage.json')
        const userData = JSON.parse(fs.readFileSync(manageDataPath, 'utf8'))
        
        // 查找当前用户的登录记录
        const userLoginInfo = userData.find(user => user.id.toString() === userId)
        
        if (!userLoginInfo) {
            return res.status(404).json({
                success: false,
                error: '未找到用户登录信息'
            })
        }
        
        // 返回该用户的登录列表
        res.json({
            success: true,
            data: userLoginInfo['Login-lists']
        })
    } catch (error) {
        console.error('获取设备登录信息失败:', error)
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        })
    }
})

// 添加删除设备登录记录的接口
router.post('/delete-device-management', authMiddleware, (req, res) => {
    try {
        const { deviceId } = req.body
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数 deviceId'
            })
        }
        
        // 获取当前用户ID
        const userId = req.user.id.toString()
        
        // 读取登录记录数据
        const manageDataPath = path.resolve(__dirname, '../user/manage.json')
        const userData = JSON.parse(fs.readFileSync(manageDataPath, 'utf8'))
        
        // 查找当前用户的索引
        const userIndex = userData.findIndex(user => user.id.toString() === userId)
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: '未找到用户登录信息'
            })
        }
        
        // 查找要删除的设备记录索引
        const loginLists = userData[userIndex]['Login-lists']
        const deviceIndex = loginLists.findIndex(device => device.table === deviceId)
        
        if (deviceIndex === -1) {
            return res.status(404).json({
                success: false,
                error: '未找到指定设备记录'
            })
        }
        
        // 删除设备记录
        userData[userIndex]['Login-lists'].splice(deviceIndex, 1)
        
        // 保存更新后的数据
        fs.writeFileSync(manageDataPath, JSON.stringify(userData, null, 2), 'utf8')
        
        res.json({
            success: true,
            message: '设备记录已成功删除'
        })
    } catch (error) {
        console.error('删除设备记录失败:', error)
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        })
    }
})

// 导出路由
module.exports = router