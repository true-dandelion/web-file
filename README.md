# 项目名称

web-file存储

## 安装

运行此程序前，需要先安装项目依赖：
npm install

## 运行

安装完成后，可以使用以下命令启动程序：
node main.js

## 项目结构

- `main.js` - 项目主程序入口

## 需要配置

-config/process.json

```
{  
  "port": 80,-----------------项目初始访问端口
  "https": {
    "enabled": false,---------是否启用https(是：true,否：false）    
    "port": 443,--------------https端口，可以从初始端口跳转到https    
    "cert": "",---------------证书（/证书） 证书存储（certificate）中    
    "key": ""-----------------证书密钥（/密钥）密码存储（certificate）中
  }  
}
```

-certificate

存放证书即密钥


## 相关app

如需要是app,请移动到app项目：[web-file-app](https://github.com/true-dandelion/web-file-app)
