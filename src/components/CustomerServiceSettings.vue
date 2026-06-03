<template>
  <div class="customer-service-settings p-0">
    <a-card title="客服配置" class="w-full">
      <a-spin :spinning="loading">
        <div class="flex justify-center">
          <a-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            layout="horizontal"
            :label-col="{ span: 6 }"
            :wrapper-col="{ span: 18 }"
            class="w-full max-w-4xl"
          >
            <!-- 启用状态 -->
            <a-form-item label="启用客服" name="enabled">
              <a-switch v-model:checked="formData.enabled" @change="handleFormChange">
                <template #checkedChildren>启用</template>
                <template #unCheckedChildren>禁用</template>
              </a-switch>
            </a-form-item>

            <!-- 微信号 -->
            <a-form-item label="微信号" name="qq_group_number">
              <a-input
                v-model:value="formData.qq_group_number"
                placeholder="请输入微信号"
                :maxlength="50"
                show-count
                @change="handleFormChange"
                :disabled="!formData.enabled"
                class="w-full"
              />
              <div class="text-gray-500 text-sm mt-1">最多50个字符</div>
            </a-form-item>

            <!-- QQ群名称 -->
            <a-form-item label="显示名称" name="qq_group_name">
              <a-input
                v-model:value="formData.qq_group_name"
                placeholder="请输入显示名称"
                :maxlength="100"
                show-count
                @change="handleFormChange"
                :disabled="!formData.enabled"
                class="w-full"
              />
              <div class="text-gray-500 text-sm mt-1">显示给用户的群名称，最多100个字符</div>
            </a-form-item>
          </a-form>
        </div>

        <!-- 保存按钮 -->
        <div class="flex justify-center">
          <a-button
            type="primary"
            size="large"
            :loading="submitting"
            @click="handleSubmit"
            :disabled="!formChanged"
          >
            保存配置
          </a-button>
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import axios from '@/utils/axios'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'

// 接口类型定义
interface CustomerServiceSettings {
  id?: number
  qq_group_number: string
  qq_group_name: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive<CustomerServiceSettings>({
  qq_group_number: '',
  qq_group_name: '',
  enabled: true,
})

// 原始数据，用于检测是否有修改
const originalData = ref<CustomerServiceSettings>({
  qq_group_number: '',
  qq_group_name: '',
  enabled: true,
})

// 检测表单是否有修改
const formChanged = computed(() => {
  return (
    formData.qq_group_number !== originalData.value.qq_group_number ||
    formData.qq_group_name !== originalData.value.qq_group_name ||
    formData.enabled !== originalData.value.enabled
  )
})

// 表单验证规则
const formRules: Record<string, Rule[]> = {
  qq_group_number: [
    {
      validator: (_, value) => {
        if (!formData.enabled) return Promise.resolve()
        if (!value) return Promise.reject(new Error('微信号不能为空'))
        if (value.length > 50) {
          return Promise.reject(new Error('微信号不能超过50个字符'))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  qq_group_name: [
    {
      validator: (_, value) => {
        if (!formData.enabled) return Promise.resolve()
        if (!value) return Promise.reject(new Error('显示名称不能为空'))
        if (value.length > 100) {
          return Promise.reject(new Error('显示名称不能超过100个字符'))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
}

// 获取客服设置
const fetchCustomerServiceSettings = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/admin/customer-service-settings')
    if (response.data.success && response.data.data) {
      const data = response.data.data
      formData.qq_group_number = data.qq_group_number || ''
      formData.qq_group_name = data.qq_group_name || ''
      formData.enabled = data.enabled === 1 ? true : false

      // 保存原始数据
      originalData.value = { ...formData }
    }
  } catch (error) {
    console.error('获取客服设置失败:', error)
  } finally {
    loading.value = false
  }
}

// 更新客服设置
const updateCustomerServiceSettings = async () => {
  submitting.value = true
  try {
    const payload: Partial<CustomerServiceSettings> = {
      enabled: formData.enabled,
    }

    // 只有在启用时才发送群信息
    if (formData.enabled) {
      payload.qq_group_number = formData.qq_group_number
      payload.qq_group_name = formData.qq_group_name
    }

    const response = await axios.put('/api/admin/customer-service-settings', payload)

    if (response.data.success) {
      message.success('客服设置更新成功')
      // 更新原始数据
      originalData.value = { ...formData }
    }
  } catch (error) {
    console.error('更新客服设置失败:', error)
  } finally {
    submitting.value = false
  }
}

// 表单提交
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    await updateCustomerServiceSettings()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 表单变化处理
const handleFormChange = () => {
  // 当禁用客服功能时，清空相关字段的验证错误
  if (!formData.enabled) {
    formRef.value?.clearValidate(['qq_group_number', 'qq_group_name'])
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchCustomerServiceSettings()
})
</script>
