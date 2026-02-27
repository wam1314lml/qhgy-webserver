<template>
  <div class="huawei-reauth-content">
    <div class="warning-section">
      <div class="warning-box">
        <p class="warning-text">🚨 检测到异地登录</p>
      </div>
    </div>
    
    <p class="instruction-text">请使用华为账号扫描下方二维码完成重新认证</p>
    
    <div class="qrcode-section">
      <div class="qrcode-container">
        <div v-if="qrcodeUrl" class="qrcode-content">
          <!-- 使用在线二维码生成服务，因为Ant Design的a-qrcode组件在Modal中无法正常显示 -->
          <img 
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrcodeUrl)}`"
            style="width: 200px; height: 200px; margin: 20px auto; display: block;"
            alt="华为二维码"
          />
          <p class="qrcode-status-text">📱 请使用华为账号扫描二维码</p>
        </div>
        <div v-else class="qrcode-loading">
          二维码加载中...
        </div>
      </div>
    </div>
    
    <div class="timeout-warning">
      <p class="timeout-text">⏰ 请在5分钟内完成扫码认证，认证成功后将自动启动账号</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  qrcodeUrl: string
}

defineProps<Props>()
</script>

<style scoped>
.huawei-reauth-content {
  text-align: center;
  padding: 20px;
}

.warning-section {
  margin-bottom: 20px;
}

.warning-box {
  background: #fff0f0;
  padding: 15px;
  border-radius: 8px;
}

.warning-text {
  margin: 0;
  color: #ff4d4f;
  font-weight: 500;
}

.instruction-text {
  margin-bottom: 20px;
  font-size: 14px;
}

.qrcode-section {
  margin-bottom: 20px;
}

.qrcode-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.qrcode-content {
  text-align: center;
}

.qrcode-status-text {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
}

.qrcode-loading {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.timeout-warning {
  background: #fff7e6;
  padding: 10px;
  border-radius: 6px;
  border-left: 4px solid #faad14;
}

.timeout-text {
  margin: 0;
  color: #d48806;
  font-size: 12px;
}
</style>
