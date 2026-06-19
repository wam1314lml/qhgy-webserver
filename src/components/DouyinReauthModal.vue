<template>
  <div class="douyin-reauth-content">
    <p class="hint-text">检测到 token 已失效，请使用抖音 App 扫描下方二维码重新登录，无法通过相册截图扫码</p>

    <!-- 二维码 -->
    <div class="qrcode-section">
      <img
        v-if="qrB64"
        :src="`data:image/png;base64,${qrB64}`"
        class="qrcode-img"
        alt="抖音重认证二维码"
      />
      <a-spin v-else size="large" style="margin: 40px 0" />
    </div>

    <!-- 状态文字 -->
    <p v-if="statusText" class="status-text">{{ statusText }}</p>

    <!-- 短信验证码（verify_sms 状态才显示） -->
    <div v-if="scanStatus === 'verify_sms'" class="sms-section">
      <p class="sms-hint">📩 请输入抖音发送的短信验证码</p>
      <div class="sms-row">
        <a-input
          v-model:value="smsCode"
          placeholder="输入短信验证码"
          :maxlength="6"
          class="sms-input"
          @keyup.enter="handleSubmitSms"
        />
        <a-button
          type="primary"
          :loading="submitting"
          :disabled="!smsCode || submitting"
          @click="handleSubmitSms"
        >
          提交
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  qrB64: string
  scanStatus: string
  sid: string
  onSubmitSms: (sid: string, code: string) => Promise<{ ok: boolean; msg?: string }>
}>()

const smsCode = ref('')
const submitting = ref(false)

const statusText = computed(() => {
  const map: Record<string, string> = {
    waiting:    '⏳ 等待扫码...',
    scanned:    '✅ 已扫码，请在手机上确认...',
    finalizing: '⏳ 正在验证...',
    verify_sms: '📩 需要短信验证码',
    expired:    '⚠️ 二维码已过期，请关闭后重试',
    error:      '❌ 扫码出错，请关闭后重试',
  }
  return map[props.scanStatus] || ''
})

const handleSubmitSms = async () => {
  if (!smsCode.value.trim() || !props.sid) return
  submitting.value = true
  try {
    await props.onSubmitSms(props.sid, smsCode.value.trim())
    smsCode.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.douyin-reauth-content {
  text-align: center;
  padding: 8px 0 4px;
}
.hint-text {
  color: #faad14;
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.5;
}
.qrcode-section {
  margin-bottom: 12px;
  min-height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.qrcode-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}
.status-text {
  color: #888;
  font-size: 13px;
  margin-bottom: 12px;
}
.sms-section {
  text-align: left;
  margin-top: 12px;
  padding: 12px;
  background: #fffbe6;
  border-radius: 6px;
  border: 1px solid #ffe58f;
}
.sms-hint {
  color: #d48806;
  font-size: 13px;
  margin-bottom: 8px;
}
.sms-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.sms-input {
  flex: 1;
}
</style>
