#!/bin/bash

# GitHub Actions 部署快速设置脚本

set -e

echo "🚀 Heart Signal GitHub Actions 部署设置"
echo "================================================"

# 1. 生成 SSH 密钥
echo ""
echo "1️⃣  生成 SSH 密钥对..."

KEY_NAME="heart-signal"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

if [ -f "$KEY_PATH" ]; then
    echo "⚠️  SSH 密钥已存在：$KEY_PATH"
    read -p "是否覆盖？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "跳过密钥生成"
    else
        rm "$KEY_PATH" "$KEY_PATH.pub"
        ssh-keygen -t ed25519 -C "heart-signal-deployment" -f "$KEY_PATH" -N ""
        echo "✅ SSH 密钥已生成"
    fi
else
    ssh-keygen -t ed25519 -C "heart-signal-deployment" -f "$KEY_PATH" -N ""
    echo "✅ SSH 密钥已生成"
fi

# 2. 显示公钥
echo ""
echo "2️⃣  SSH 公钥（需要添加到服务器 ~/.ssh/authorized_keys）："
echo "================================================"
cat "$KEY_PATH.pub"
echo ""

# 3. 显示私钥用于 GitHub Secrets
echo "3️⃣  SSH 私钥内容（用于 GitHub Secret SSH_PRIVATE_KEY）："
echo "================================================"
echo "请复制以下内容到 GitHub Secrets："
echo ""
cat "$KEY_PATH"
echo ""

# 4. 收集服务器信息
echo "4️⃣  收集服务器信息..."
echo ""

read -p "服务器公网 IP（例：203.0.113.42）: " SERVER_HOST
read -p "SSH 用户名（例：ubuntu）: " SERVER_USER
read -p "SSH 端口（默认：22）: " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-22}
read -p "项目在服务器上的绝对路径（例：/home/ubuntu/heart-signal）: " PROJECT_PATH

# 5. 总结
echo ""
echo "✅ 设置完成！请在 GitHub 仓库添加以下 Secrets："
echo "================================================"
echo ""
echo "Secret 名称：SERVER_HOST"
echo "Secret 值：$SERVER_HOST"
echo ""
echo "Secret 名称：SERVER_USER"
echo "Secret 值：$SERVER_USER"
echo ""
echo "Secret 名称：SERVER_PORT"
echo "Secret 值：$SERVER_PORT"
echo ""
echo "Secret 名称：PROJECT_PATH"
echo "Secret 值：$PROJECT_PATH"
echo ""
echo "Secret 名称：SSH_PRIVATE_KEY"
echo "Secret 值：$(cat $KEY_PATH)"
echo ""
echo "================================================"
echo ""
echo "📝 GitHub Secrets 配置步骤："
echo "1. 访问：https://github.com/YangYongAn/heart-signal/settings/secrets/actions"
echo "2. 点击「New repository secret」"
echo "3. 添加上面列出的所有 secrets"
echo ""
echo "🔐 服务器配置步骤："
echo "1. SSH 连接到服务器"
echo "2. 运行："
echo "   mkdir -p ~/.ssh"
echo "   echo '$(cat $KEY_PATH.pub)' >> ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "✨ 完成后，push 代码到 main 分支即可自动部署！"
