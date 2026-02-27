<template>
  <div class="personal-center-container">
    <h2>个人中心</h2>
    <div class="user-info">
      <p>用户名: {{ user.username }}</p>
      <p>邮箱: {{ user.email }}</p>
      <p>点数: {{ user.points }}</p>
      <p>角色: {{ user.role }}</p>
    </div>
    <a-button @click="$emit('logout')" class="logout-button">退出登录</a-button>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: number
  username: string
  email: string
  role: string
  points: number
  invite_code: string
  total_invites: number
  permissions?: any
}

interface Props {
  user: User
  token: string
  defaultTab?: string
}

defineProps<Props>()

defineEmits<{
  logout: []
  pointsUpdate: [points: number]
  close: []
}>()
</script>

<style scoped>
@import './PersonalCenter.css';
</style>