<template>
  <div class="wx-reauth-content">
    <template v-if="phase === 'prompt'">
      <p class="hint-text">
        检测到微信登录凭据已失效。重新认证会刷新当前账号凭据，不会新增或删除游戏账号。
      </p>
      <div class="action-row">
        <a-button :loading="canceling" @click="emit('cancel')">取消</a-button>
        <a-button type="primary" @click="emit('start')">重新认证</a-button>
      </div>
    </template>

    <template v-else-if="phase === 'starting'">
      <a-spin size="large" />
      <p class="status-text">正在尝试刷新微信登录凭据...</p>
      <div class="action-row">
        <a-button :loading="canceling" @click="emit('cancel')">取消</a-button>
      </div>
    </template>

    <template v-else-if="phase === 'scanning'">
      <p class="hint-text">请使用微信扫描二维码，并在手机上确认登录。</p>
      <div v-if="qrImage" class="qrcode-section">
        <img :src="qrImage" class="qrcode-img" alt="微信重认证二维码" />
      </div>
      <a-spin v-else size="large" />
      <p class="status-text">{{ statusText }}</p>
      <div class="action-row">
        <a-button :loading="canceling" @click="emit('cancel')">取消认证</a-button>
      </div>
    </template>

    <template v-else>
      <p :class="['failure-text', phase === 'expired' ? 'is-expired' : 'is-error']">
        {{ errorMessage || defaultFailureText }}
      </p>
      <div class="action-row">
        <a-button :loading="canceling" @click="emit('cancel')">取消</a-button>
        <a-button type="primary" @click="emit('start')">重新获取</a-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  phase: 'prompt' | 'starting' | 'scanning' | 'expired' | 'error'
  qrImage: string
  scanStatus: string
  errorMessage: string
  canceling: boolean
}>()

const emit = defineEmits<{
  start: []
  cancel: []
}>()

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    SCAN_REQUIRED: '等待扫码...',
    PENDING: '等待扫码...',
    WAITING: '等待扫码...',
    SCANNED: '已扫码，请在手机上确认...',
    PROCESSING: '正在刷新微信登录凭据...',
    CONFIRMED: '已确认，正在刷新登录凭据...',
    EXCHANGING: '正在刷新登录凭据...',
    REBINDING: '正在写入新的微信登录凭据...',
  }
  return statusMap[props.scanStatus.toUpperCase()] || '等待微信扫码确认...'
})

const defaultFailureText = computed(() =>
  props.phase === 'expired' ? '微信二维码已过期，请重新获取。' : '微信重认证失败，请重新获取。',
)
</script>

<style scoped>
.wx-reauth-content {
  padding: 8px 0 4px;
  text-align: center;
}

.hint-text {
  margin-bottom: 16px;
  color: #595959;
  font-size: 13px;
  line-height: 1.6;
}

.qrcode-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  margin-bottom: 12px;
}

.qrcode-img {
  width: 200px;
  height: 200px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
}

.status-text {
  margin: 14px 0;
  color: #888;
  font-size: 13px;
}

.failure-text {
  margin-bottom: 18px;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.failure-text.is-expired {
  color: #d48806;
  background: #fffbe6;
  border: 1px solid #ffe58f;
}

.failure-text.is-error {
  color: #cf1322;
  background: #fff1f0;
  border: 1px solid #ffa39e;
}

.action-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}
</style>
