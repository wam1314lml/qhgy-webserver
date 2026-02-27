<template>
  <div class="payment-success-container">
    <div class="success-card">
      <div class="success-icon">✅</div>
      <h1>支付成功</h1>
      <p>您的支付已成功处理</p>
      <a-button @click="goHome" class="home-button">返回首页</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
@import './PaymentSuccess.css';
</style>