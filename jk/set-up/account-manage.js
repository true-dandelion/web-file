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
        const manageDataPath = path.resolve(__dirname, '../../user/manage.json')
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
        const manageDataPath = path.resolve(__dirname, '../../user/manage.json')
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



//邮件地址修改
router.post('/update-email', authMiddleware, (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数 email'
            })
        }

        // 获取当前用户ID
        const userId = req.user.id.toString()

        // 读取用户数据
        const userDataPath = path.resolve(__dirname, '../../user/user.json')
        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'))

        // 查找当前用户的索引
        const userIndex = userData.findIndex(user => user.id.toString() === userId)

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: '未找到用户信息'
            })
        }

        // 更新邮箱地址
        userData[userIndex].email = email

        // 保存更新后的数据
        fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8')

        res.json({
            success: true,
            message: '邮箱地址已成功更新'
        })
    } catch (error) {
        console.error('更新邮箱地址失败:', error)
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        })
    }
})

//修改密码
router.post('/change-password', authMiddleware, (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body

        // 参数验证
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数：当前密码、新密码和确认密码'
            })
        }

        // 新密码和确认密码是否一致
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: '新密码和确认密码不一致'
            })
        }

        // 密码强度验证
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: '新密码长度至少为6位'
            })
        }

        // 新密码不能与当前密码相同
        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                error: '新密码不能与当前密码相同'
            })
        }

        // 获取当前用户ID
        const userId = req.user.id.toString()

        // 读取用户数据
        const userDataPath = path.resolve(__dirname, '../../user/user.json')
        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'))

        // 查找当前用户的索引
        const userIndex = userData.findIndex(user => user.id.toString() === userId)

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: '未找到用户信息'
            })
        }

        // 验证当前密码是否正确
        if (userData[userIndex].password !== currentPassword) {
            return res.status(401).json({
                success: false,
                error: '当前密码不正确'
            })
        }

        // 更新密码
        userData[userIndex].password = newPassword

        // 保存更新后的数据
        fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8')

        // 密码修改成功后，清除当前会话强制重新登录
        res.clearCookie('authToken')

        res.json({
            success: true,
            message: '密码修改成功，请重新登录',
            requireRelogin: true
        })
    } catch (error) {
        console.error('修改密码失败:', error)
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        })
    }
})



// 导出路由
module.exports = router