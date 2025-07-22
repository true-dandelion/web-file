const express = require('express')
const router = express.Router()
const path = require('path')
const { sessionMiddleware } = require('../middleware/middleware')

// 配置静态文件访问
router.use(express.static(path.join(__dirname, '../../public')))

const authRedirectMiddleware = (req, res, next) => {
    if (req.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

// 添加需要验证token的网页路由
router.get('/File', sessionMiddleware, authRedirectMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/home/index.html'))
})

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login/index.html'))
})

router.get('/setup', sessionMiddleware, authRedirectMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/set-up/index.html'))
})

// 导出路由
module.exports = router
