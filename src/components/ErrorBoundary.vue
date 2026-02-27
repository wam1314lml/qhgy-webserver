<template>
  <div>
    <div v-if="hasError" class="error-boundary">
      <h2>出现了一些问题</h2>
      <p>{{ errorMessage }}</p>
      <a-button @click="resetError" class="retry-button">重试</a-button>
    </div>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((error: Error) => {
  console.error('ErrorBoundary捕获到错误:', error)
  hasError.value = true
  errorMessage.value = error.message || '未知错误'
  return false // 阻止错误继续传播
})

const resetError = () => {
  hasError.value = false
  errorMessage.value = ''
}
</script>

<style scoped>
.error-boundary {
  padding: 20px;
  text-align: center;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  margin: 20px;
}

.retry-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.retry-button:hover {
  background-color: #0056b3;
}
</style>