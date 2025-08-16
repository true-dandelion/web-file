module.exports = {
    JWT_SECRET: 'a83cf4060fb6d007290bc4d3d6eadfc3a130130b63d56847c1f21202d93264fe5670699a73ce5ccafc16276e6c1522de25b5fc2cdee5ececd4ab28f6456ea9d0dc524250ea21fc1d7ecda073eb11e700ea4c6b8b4c01acdb1b7036d928ad7fad705335fa4f473a476c810556124ca303b146e4d5664f766b4d115a754beb609f1020ae7d60ec5acc1fbcea51fa30cc8ccb2b5b34a7d090eac22255c6200e14e1b897e54ed4eb755c04730c171087a3810c489e96a20434ebee5674cbdc0183bc1acebe15c2e1b8b457d6e8063366d76f894f29cd315976f2ad55773dec5ab181363080abcc3883adc37f047268c6599be7dfed5240f1e7f32704cf90f7272733',
    
    // JWT过期时间
    JWT_EXPIRES_IN: '24h',
    
    //设置过期时间
    COOKIE_OPTIONS: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, 
        sameSite: 'strict'
    }
}; 