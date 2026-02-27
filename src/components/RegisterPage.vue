<template>
  <RegisterForm @switch-to-login="handleSwitchToLogin" />
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import RegisterForm from './RegisterForm.vue'

const router = useRouter()
const route = useRoute()

const handleSwitchToLogin = () => {
  // 保留 invite 参数
  const inviteCode = route.query.invite
  if (inviteCode) {
    router.push({ path: '/login', query: { invite: inviteCode } })
  } else {
    router.push('/login')
  }
}
</script>
