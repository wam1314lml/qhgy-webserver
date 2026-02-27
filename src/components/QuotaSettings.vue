<template>
  <div class="quota-settings-container">
    <!-- 权限检查 -->
    <div v-if="!isAdmin" class="no-permission">
      <h3>权限不足</h3>
      <p>只有管理员才能访问配额设置</p>
      <p>当前用户: {{ user?.username || '未知' }}</p>
      <p>当前角色: {{ user?.role || '未知' }}</p>
      <p>当前状态: {{ user?.status || '未知' }}</p>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="loading">加载中...</div>

    <!-- 主要内容 -->
    <template v-else>
      <div class="quota-settings-header">
        <h2>配额设置管理</h2>
        <a-button class="btn-add" type="primary" @click="handleAddNew"> + 添加配额选项 </a-button>
      </div>

      <div class="quota-settings-list">
        <!-- 空状态 -->
        <div v-if="settings.length === 0" class="empty-state">
          <p>暂无配额设置，点击上方按钮添加</p>
        </div>

        <!-- 设置表格 -->
        <custom-table
          v-else
          :columns="columns"
          :data-source="settings"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'days'"> {{ record.days }}天 </template>
            <template v-else-if="column.key === 'points'"> {{ record.points }}积分 </template>
            <template v-else-if="column.key === 'description'">
              {{ record.description || '-' }}
            </template>
            <template v-else-if="column.key === 'is_active'">
              <a-tag :color="record.is_active ? 'green' : 'red'">
                {{ record.is_active ? '启用' : '禁用' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space size="small">
                <a-button @click="handleEdit(record)" size="small" type="primary" ghost>
                  编辑
                </a-button>
                <a-button
                  @click="handleToggleActive(record.id)"
                  size="small"
                  :type="record.is_active ? 'default' : 'primary'"
                >
                  {{ record.is_active ? '禁用' : '启用' }}
                </a-button>
                <a-button danger @click="handleDelete(record.id)" size="small"> 删除 </a-button>
              </a-space>
            </template>
          </template>
        </custom-table>
      </div>

      <!-- 添加/编辑弹窗 -->
      <a-modal
        v-model:open="showAddModal"
        :title="editingSetting ? '编辑配额设置' : '添加配额设置'"
        width="600px"
        @cancel="closeModal"
        :footer="null"
      >
        <a-form :model="formData" layout="vertical" @finish="handleSubmit" class="quota-form">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item
                label="标签"
                name="label"
                :rules="[{ required: true, message: '请输入标签' }]"
              >
                <a-input v-model:value="formData.label" placeholder="例如：7天套餐" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item
                label="天数"
                name="days"
                :rules="[
                  { required: true, message: '请输入天数' },
                  { type: 'number', min: 1, message: '天数必须大于0' },
                ]"
              >
                <a-input-number
                  v-model:value="formData.days"
                  placeholder="延期天数"
                  :min="1"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item
                label="所需积分"
                name="points"
                :rules="[
                  { required: true, message: '请输入所需积分' },
                  { type: 'number', min: 1, message: '积分必须大于0' },
                ]"
              >
                <a-input-number
                  v-model:value="formData.points"
                  placeholder="消耗积分数"
                  :min="1"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="排序" name="sort_order">
                <a-input-number
                  v-model:value="formData.sort_order"
                  placeholder="数字越小越靠前"
                  :min="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="描述" name="description">
            <a-textarea
              v-model:value="formData.description"
              placeholder="配额选项的详细描述（可选）"
              :rows="3"
            />
          </a-form-item>

          <a-form-item name="is_active">
            <a-checkbox v-model:checked="formData.is_active"> 启用此配额选项 </a-checkbox>
          </a-form-item>

          <a-form-item style="margin-bottom: 0; text-align: right">
            <a-space>
              <a-button @click="closeModal">取消</a-button>
              <a-button type="primary" html-type="submit">
                {{ editingSetting ? '更新' : '创建' }}
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import axios from '../utils/axios'
import { message, Modal } from 'ant-design-vue'
import CustomTable from './CustomTable.vue'

interface QuotaSetting {
  id: number
  days: number
  points: number
  label: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface Props {
  user: any
  token: string
}

const props = defineProps<Props>()

const settings = ref<QuotaSetting[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const editingSetting = ref<QuotaSetting | null>(null)
const formData = reactive<{
  days: number | undefined
  points: number | undefined
  label: string
  description: string
  is_active: boolean
  sort_order: number
}>({
  days: undefined,
  points: undefined,
  label: '',
  description: '',
  is_active: true,
  sort_order: 0,
})

// 表格列配置
const columns = [
  {
    title: '标签',
    dataIndex: 'label',
    key: 'label',
    width: 150,
  },
  {
    title: '天数',
    dataIndex: 'days',
    key: 'days',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '积分',
    dataIndex: 'points',
    key: 'points',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    align: 'center' as const,
  },
]

// 检查管理员权限
console.log('QuotaSettings - 用户信息:', props.user)
console.log('QuotaSettings - 用户角色:', props.user?.role, '用户状态:', props.user?.status)

const isAdmin = computed(() => {
  return (
    props.user &&
    (props.user.role === 'admin' ||
      props.user.status === 'admin' ||
      props.user.username === 'admin')
  )
})

const fetchSettings = async () => {
  try {
    loading.value = true
    const response = await axios.get('/api/quota-settings/admin/list', {})

    if (response.data.success) {
      settings.value = response.data.data
    }
  } catch (error) {
    console.error('获取配额设置失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  // 数据验证
  if (!formData.days || !formData.points || !formData.label) {
    message.error('请填写所有必填字段')
    return
  }

  if (formData.days <= 0) {
    message.error('天数必须是大于0的数字')
    return
  }

  if (formData.points <= 0) {
    message.error('点数必须是大于0的数字')
    return
  }

  try {
    const data = {
      days: formData.days,
      points: formData.points,
      label: formData.label.trim(),
      description: formData.description.trim(),
      is_active: formData.is_active,
      sort_order: formData.sort_order,
    }

    console.log('发送数据:', data)

    if (editingSetting.value) {
      // 更新
      const response = await axios.put(
        `/api/quota-settings/admin/${editingSetting.value.id}`,
        data,
        {},
      )
      console.log('更新响应:', response.data)
    } else {
      // 创建
      const response = await axios.post('/api/quota-settings/admin/create', data, {})
      console.log('创建响应:', response.data)
    }

    // 重新获取数据
    await fetchSettings()

    // 关闭弹窗
    closeModal()

    message.success('保存成功！')
  } catch (error: any) {
    console.error('保存配额设置失败:', error)
    console.error('错误详情:', error.response?.data)

    const errorMessage = error.response?.data?.message || '保存失败，请重试'
    message.error(errorMessage)
  }
}

const handleEdit = (setting: QuotaSetting) => {
  editingSetting.value = setting
  formData.days = setting.days
  formData.points = setting.points
  formData.label = setting.label
  formData.description = setting.description || ''
  formData.is_active = setting.is_active
  formData.sort_order = setting.sort_order
  showAddModal.value = true
}

const handleDelete = async (id: number) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个配额设置吗？此操作不可恢复。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await axios.delete(`/api/quota-settings/admin/${id}`, {})
        await fetchSettings()
        message.success('删除成功')
      } catch (error) {
        console.error('删除配额设置失败:', error)
        message.error('删除失败，请重试')
      }
    },
  })
}

const handleToggleActive = async (id: number) => {
  try {
    await axios.patch(`/api/quota-settings/admin/${id}/toggle`, {}, {})

    await fetchSettings()
    message.success('状态切换成功')
  } catch (error) {
    console.error('切换状态失败:', error)
    message.error('操作失败，请重试')
  }
}

const resetForm = () => {
  formData.days = undefined
  formData.points = undefined
  formData.label = ''
  formData.description = ''
  formData.is_active = true
  formData.sort_order = 0
}

const handleAddNew = () => {
  editingSetting.value = null
  resetForm()
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingSetting.value = null
  resetForm()
}

onMounted(() => {
  if (isAdmin.value) {
    fetchSettings()
  }
})
</script>

<style scoped>
@import './QuotaSettings.css';
</style>
