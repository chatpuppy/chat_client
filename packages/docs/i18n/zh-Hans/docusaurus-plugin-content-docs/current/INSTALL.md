---
id: install
title: 安装
sidebar_label: 安装
---

## 环境准备

要运行 ChatPuppy, 你需要 Node.js(推荐 v14 LTS 版本), MongoDB 和 redis

-   安装 Node.js
    -   官网 <http://nodejs.cn/download/>
    -   更推荐使用 nvm 安装 Node.js
        -   安装 nvm <https://github.com/nvm-sh/nvm#install--update-script>
        -   通过 nvm 安装 Node.js <https://github.com/nvm-sh/nvm#usage>
-   安装 MongoDB
    -   官网 <https://docs.mongodb.com/manual/installation/#install-mongodb>
-   安装 redis
    -   官网 <https://redis.io/topics/quickstart>

推荐在 Linux 或者 MacOS 系统上运行

## 如何运行

1. 克隆项目到本地 `git clone https://github.com/chatpuppy/chat_client.git -b master`
2. 确保安装了 [yarn](https://www.npmjs.com/package/yarn), 如果没有安装请执行 `npm install -g yarn`
3. 安装项目依赖 `yarn install`
4. 构建客户端代码 `yarn build:web`
5. 配置 JwtSecret `echo "JwtSecret=<string>" > .env2`. 要将 `<string>` 替换为一个秘密文本
6. 启动服务端 `yarn start`
7. 使用浏览器打开 `http://[ip地址]:[端口]`(比如 `http://127.0.0.1:9200`)

### 在后台运行

使用 `yarn start` 运行服务端会在断开 ssh 连接后停止运行, 推荐使用 pm2 来运行

```bash
# 安装 pm2
npm install -g pm2

# 使用 pm2 运行 chatpuppy
pm2 start yarn --name chatpuppy -- start

# 查看 pm2 应用状态
pm2 ls

# 查看 pm2 chatpuppy 日志
pm2 logs chatpuppy
```

### 运行开发模式

1. 启动服务端 `yarn dev:server`
2. 启动客户端 `yarn dev:web`
3. 使用浏览器打开 `http://localhost:8080`

### docker 运行

首先安装 docker <https://docs.docker.com/install/>


#### 本地构建镜像运行

1. 克隆项目到本地 `git clone https://github.com/chatpuppy/chat_client.git -b master`
2. 构建镜像 `docker-compose build --no-cache --force-rm`
3. 运行 `docker-compose up`
