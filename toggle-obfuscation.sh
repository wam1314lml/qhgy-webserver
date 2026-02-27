#!/bin/bash
# 快速切换代码混淆开关

CONFIG_FILE="build.config.js"

# 检查当前状态
if grep -q "ENABLE_OBFUSCATION: true" "$CONFIG_FILE"; then
    echo "🔄 当前状态: 混淆已启用"
    echo "正在关闭混淆..."
    sed -i 's/ENABLE_OBFUSCATION: true/ENABLE_OBFUSCATION: false/' "$CONFIG_FILE"
    sed -i 's/REMOVE_CONSOLE: true/REMOVE_CONSOLE: false/' "$CONFIG_FILE"
    echo "✅ 混淆已关闭！执行 npm run build 重新构建"
else
    echo "🔄 当前状态: 混淆已关闭"
    echo "正在启用混淆..."
    sed -i 's/ENABLE_OBFUSCATION: false/ENABLE_OBFUSCATION: true/' "$CONFIG_FILE"
    sed -i 's/REMOVE_CONSOLE: false/REMOVE_CONSOLE: true/' "$CONFIG_FILE"
    echo "✅ 混淆已启用！执行 npm run build 重新构建"
fi

echo ""
echo "当前配置:"
cat "$CONFIG_FILE"
