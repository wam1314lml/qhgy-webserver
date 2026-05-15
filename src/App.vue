<template>
  <a-config-provider :locale="locale">
    <div class="App">
      <router-view />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { onMounted } from 'vue'
import { useTheme } from './composables/useTheme'

const locale = zhCN
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<style>
@import './App.css';
</style>
