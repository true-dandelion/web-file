const express = require('express')
const router = express.Router()
const path = require('path')
const { sessionMiddleware } = require('../middleware/middleware')

const authRedirectMiddleware = (req, res, next) => {
    if (req.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

router.use('/ico', express.static(path.join(__dirname, '../../public/ico')))
router.use('/login/assets', express.static(path.join(__dirname, '../../public/login/assets')))
router.use('/file/assets', express.static(path.join(__dirname, '../../public/home/assets')))
router.use('/setup/assets', express.static(path.join(__dirname, '../../public/set-up/assets')))
router.use('/share/assets', express.static(path.join(__dirname, '../../public/share/assets')))
router.use('/view/assets', express.static(path.join(__dirname, '../../public/view/assets')))
router.use('/share-view/assets', express.static(path.join(__dirname, '../../public/share-view/assets')))

router.use('/file/*path', sessionMiddleware, authRedirectMiddleware)
router.use('/setup/*path', sessionMiddleware, authRedirectMiddleware)

//302跳转到/login
router.get('/', (req, res) => {
    res.redirect(302, '/login')
})

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


router.get('/vector/vector.js', (req, res) =>{
res.sendFile(path.join(__dirname, '../../public/vector/vector.js'))
})

// 导出路由
module.exports = router
