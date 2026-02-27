<template>
  <a-modal
    v-model:open="visible"
    :title="`更新密码 ${accountName}（${serverName}）`"
    @ok="confirmUpdatePassword"
    @cancel="cancelUpdatePassword"
    okText="确认更新"
    cancelText="取消"
    :confirmLoading="updatingPassword"
    :okButtonProps="{ disabled: !form.password.trim() || updatingPassword }"
    width="400px"
    centered
  >
    <div class="update-password-form pt-2">
      <a-form layout="vertical" :model="form">
        <a-form-item
          label="新的游戏密码"
          name="password"
          :rules="[
            { required: true, message: '请输入新的游戏密码' },
            { min: 6, message: '密码长度至少6位' },
          ]"
        >
          <a-input-password
            v-model:value="form.password"
            placeholder="请输入新的游戏密码"
            size="large"
            :disabled="updatingPassword"
            class="rounded-lg"
          />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { LockOutlined } from '@ant-design/icons-vue'
import axios from '../utils/axios'

interface UpdatePasswordModalProps {
  isOpen: boolean
  accountId: number | null
  accountName: string
  serverName: string
}

interface UpdatePasswordModalEmits {
  (e: 'close'): void
  (e: 'success'): void
}

const props = defineProps<UpdatePasswordModalProps>()
const emit = defineEmits<UpdatePasswordModalEmits>()

// 响应式状态
const updatingPassword = ref(false)
const form = ref({
  password: '',
})

// 计算属性
const visible = computed({
  get: () => props.isOpen,
  set: (value: boolean) => {
    if (!value) {
      emit('close')
    }
  },
})

// 监听弹窗打开，重置表单
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      resetForm()
    }
  }
)

// 重置表单
const resetForm = () => {
  form.value.password = ''
}

// 确认更新密码
const confirmUpdatePassword = async () => {
  if (!props.accountId || !form.value.password.trim()) {
    message.error('请输入新密码')
    return
  }

  if (form.value.password.length < 6) {
    message.error('密码长度至少6位')
    return
  }

  updatingPassword.value = true
  try {
    const response = await axios.post(`/api/game-accounts/${props.accountId}/update-password`, {
      password: form.value.password,
    })

    console.log('📥 更新密码响应:', response.data)

    if (response.data.success) {
      message.success('密码更新成功')

      // 如果数据库同步失败但服务器更新成功，显示警告信息
      if (response.data.data?.databaseUpdated === false) {
        message.warning('服务器密码已更新，但数据库同步失败')
      }

      // 触发成功事件并关闭弹窗
      emit('success')
      emit('close')
    } else {
      message.error(response.data.message || '密码更新失败')
    }
  } finally {
    updatingPassword.value = false
  }
}

// 取消更新密码
const cancelUpdatePassword = () => {
  emit('close')
}
</script>

<style scoped>
/* 使用UnoCSS，无需额外样式 */
</style>
