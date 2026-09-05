<template>
  <div class="permission-settings">
    <a-card title="权限设置">
      <template #extra>
        <a-button type="primary" @click="handleAdd">
          <template #icon>
            <PlusOutlined />
          </template>
          新建权限等级
        </a-button>
      </template>

      <custom-table
        :columns="columns"
        :data-source="permissionLevels"
        row-key="id"
        :loading="loading"
        :pagination="{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number) => `共 ${total} 条记录`,
        }"
      />
    </a-card>

    <a-modal
      :title="editingLevel ? '编辑权限等级' : '新建权限等级'"
      :open="modalVisible"
      @cancel="handleCancel"
      :footer="null"
      :width="600"
    >
      <a-form
        ref="formRef"
        :model="formData"
        layout="vertical"
        @finish="handleSubmit"
        :initialValues="{
          commission_rate: 0,
          is_active: 1,
          invite_system: false,
          admin_panel: false,
          performance_management: false,
        }"
      >
        <a-form-item
          name="name"
          label="权限名称"
          :rules="[{ required: true, message: '请输入权限名称' }]"
        >
          <a-input v-model:value="formData.name" placeholder="请输入权限名称" />
        </a-form-item>

        <a-form-item
          name="level"
          label="权限等级"
          :rules="[
            { required: true, message: '请输入权限等级' },
            { type: 'number', min: 1, max: 100, message: '权限等级必须在1-100之间' },
          ]"
        >
          <a-input-number
            v-model:value="formData.level"
            placeholder="请输入权限等级 (1-100)"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item
          name="description"
          label="描述"
          :rules="[{ required: true, message: '请输入描述' }]"
        >
          <a-textarea v-model:value="formData.description" placeholder="请输入权限描述" :rows="3" />
        </a-form-item>

        <a-form-item
          name="commission_rate"
          label="分成比例"
          :rules="[
            { required: true, message: '请输入分成比例' },
            { type: 'number', min: 0, max: 100, message: '分成比例必须在0-100之间' },
          ]"
        >
          <a-input-number
            v-model:value="formData.commission_rate"
            placeholder="请输入分成比例 (0-100%)"
            :min="0"
            :max="100"
            :step="0.1"
            :precision="1"
            style="width: 100%"
            :formatter="(value: any) => `${value}%`"
            :parser="(value: any) => Number(value.replace('%', ''))"
          />
        </a-form-item>

        <a-form-item name="invite_system" label="邀请权限">
          <a-switch v-model:checked="formData.invite_system" />
        </a-form-item>

        <a-form-item name="admin_panel" label="管理面板权限">
          <a-switch v-model:checked="formData.admin_panel" />
        </a-form-item>

        <a-form-item name="performance_management" label="业绩查看权限">
          <a-switch v-model:checked="formData.performance_management" />
        </a-form-item>

        <a-form-item name="is_active" label="启用状态">
          <a-switch v-model:checked="formData.is_active" />
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit">
              {{ editingLevel ? '更新' : '创建' }}
            </a-button>
            <a-button @click="handleCancel"> 取消 </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h, nextTick } from 'vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { Switch, Space, Button, Popconfirm } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import axios from '../utils/axios'
import CustomTable from './CustomTable.vue'

interface PermissionLevel {
  id: number
  name: string
  level: number
  description: string
  permissions: {
    admin_panel: boolean
    invite_system: boolean
    performance_management: boolean
  }
  commission_rate: number
  is_active: number
  is_system: boolean
  created_at: string
}

interface Props {
  token: string
}

const props = defineProps<Props>()

const permissionLevels = ref<PermissionLevel[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const editingLevel = ref<PermissionLevel | null>(null)
const formRef = ref<FormInstance>()

// 表单数据
const formData = ref({
  name: '',
  level: 1,
  description: '',
  commission_rate: 0,
  invite_system: false,
  admin_panel: false,
  performance_management: false,
  is_active: 1,
})

// 获取权限等级列表
const fetchPermissionLevels = async () => {
  loading.value = true
  try {
    const response = await axios.get(`/api/admin/permission-levels?t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })

    const data = response.data
    console.log('API返回的原始数据:', data)

    if (data.success) {
      const processedData = data.data.map((level: any) => {
        console.log(`处理权限等级 ${level.name}:`, level)

        let parsedPermissions
        if (typeof level.permissions === 'string') {
          try {
            parsedPermissions = JSON.parse(level.permissions)
          } catch (e) {
            console.error(`解析权限失败 ${level.name}:`, e)
            parsedPermissions = {
              admin_panel: false,
              invite_system: false,
              performance_management: false,
            }
          }
        } else {
          parsedPermissions = level.permissions || {
            admin_panel: false,
            invite_system: false,
            performance_management: false,
          }
        }

        console.log(`${level.name} 解析后的权限:`, parsedPermissions)

        return {
          ...level,
          permissions: parsedPermissions,
        }
      })

      console.log('最终处理的数据:', processedData)
      permissionLevels.value = processedData
    } else {
      message.error('获取权限等级失败')
    }
  } catch (error) {
    console.error('获取权限等级失败:', error)
    message.error('获取权限等级失败')
  } finally {
    loading.value = false
  }
}

// 创建或更新权限等级
const handleSubmit = async (values: any) => {
  try {
    console.log('表单提交的原始数据:', values)

    const submitData = {
      name: values.name,
      level: values.level,
      description: values.description,
      commission_rate: (values.commission_rate || 0) / 100,
      permissions: {
        admin_panel: values.admin_panel === true,
        invite_system: values.invite_system === true,
        performance_management: values.performance_management === true,
      },
      is_active: values.is_active,
    }

    console.log('处理后的提交数据:', submitData)

    if (editingLevel.value) {
      const response = await fetch(`/api/admin/permission-levels/${editingLevel.value.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${props.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          message.success('权限等级更新成功')
          fetchPermissionLevels()
          handleCancel()
        } else {
          message.error(data.message || '更新失败')
        }
      } else {
        message.error('更新失败')
      }
    } else {
      const response = await fetch('/api/admin/permission-levels', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${props.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          message.success('权限等级创建成功')
          fetchPermissionLevels()
          handleCancel()
        } else {
          message.error(data.message || '创建失败')
        }
      } else {
        message.error('创建失败')
      }
    }
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败')
  }
}

// 删除权限等级
const handleDelete = async (id: number) => {
  try {
    const response = await fetch(`/api/admin/permission-levels/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        message.success('权限等级删除成功')
        fetchPermissionLevels()
      } else {
        message.error(data.message || '删除失败')
      }
    } else {
      message.error('删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

// 切换权限等级状态
const handleToggleStatus = async (id: number, is_active: number) => {
  try {
    const response = await fetch(`/api/admin/permission-levels/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        message.success(`权限等级已${is_active ? '启用' : '禁用'}`)
        fetchPermissionLevels()
      } else {
        message.error(data.message || '操作失败')
      }
    } else {
      message.error('操作失败')
    }
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败')
  }
}

// 打开编辑模态框
const handleEdit = (level: PermissionLevel) => {
  editingLevel.value = level
  modalVisible.value = true

  // 更新表单数据
  formData.value = {
    name: level.name,
    level: level.level,
    description: level.description,
    commission_rate: Number((Number(level.commission_rate || 0) * 100).toFixed(1)),
    invite_system: level.permissions.invite_system,
    admin_panel: level.permissions.admin_panel,
    performance_management: level.permissions.performance_management,
    is_active: level.is_active,
  }

  nextTick(() => {
    if (formRef.value) {
      // 使用类型断言绕过类型检查
      ;(formRef.value as any).setFieldsValue(formData.value)
    }
  })
}

// 打开新建模态框
const handleAdd = () => {
  editingLevel.value = null

  // 重置表单数据
  formData.value = {
    name: '',
    level: 1,
    description: '',
    commission_rate: 0,
    invite_system: false,
    admin_panel: false,
    performance_management: false,
    is_active: 1,
  }

  formRef.value?.resetFields()
  modalVisible.value = true
}

// 关闭模态框
const handleCancel = () => {
  modalVisible.value = false
  editingLevel.value = null

  // 重置表单数据
  formData.value = {
    name: '',
    level: 1,
    description: '',
    commission_rate: 0,
    invite_system: false,
    admin_panel: false,
    performance_management: false,
    is_active: 1,
  }

  formRef.value?.resetFields()
}

const columns = computed(() => [
  {
    title: '权限名称',
    key: 'name',
    customRender: ({ record }: { record: PermissionLevel }) => {
      console.log(
        `渲染权限名称 - ID: ${record.id}, Name: ${record.name}, is_system: ${record.is_system}`,
      )
      return h('span', [
        record.name,
        record.is_system
          ? h('span', { style: { color: '#1890ff', marginLeft: '8px' } }, '(系统)')
          : null,
      ])
    },
  },
  {
    title: '权限等级',
    key: 'level',
    customRender: ({ record }: { record: PermissionLevel }) => h('span', record.level),
    sorter: (a: PermissionLevel, b: PermissionLevel) => a.level - b.level,
  },
  {
    title: '描述',
    key: 'description',
    customRender: ({ record }: { record: PermissionLevel }) => h('span', record.description),
  },
  {
    title: '邀请权限',
    key: 'invite_system',
    customRender: ({ record }: { record: PermissionLevel }) =>
      h(
        'span',
        { style: { color: record.permissions.invite_system ? '#52c41a' : '#ff4d4f' } },
        record.permissions.invite_system ? '✓' : '✗',
      ),
  },
  {
    title: '管理面板',
    key: 'admin_panel',
    customRender: ({ record }: { record: PermissionLevel }) =>
      h(
        'span',
        { style: { color: record.permissions.admin_panel ? '#52c41a' : '#ff4d4f' } },
        record.permissions.admin_panel ? '✓' : '✗',
      ),
  },
  {
    title: '业绩查看',
    key: 'performance_management',
    customRender: ({ record }: { record: PermissionLevel }) =>
      h(
        'span',
        { style: { color: record.permissions.performance_management ? '#52c41a' : '#ff4d4f' } },
        record.permissions.performance_management ? '✓' : '✗',
      ),
  },
  {
    title: '分成比例',
    dataIndex: 'commission_rate',
    key: 'commission_rate',
    customRender: ({ text }: { text: number | string }) =>
      h(
        'span',
        { style: { color: '#1890ff', fontWeight: 'bold' } },
        `${(parseFloat(text?.toString() || '0') * 100).toFixed(1)}%`,
      ),
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    customRender: ({ record }: { record: PermissionLevel }) =>
      h(Switch, {
        checked: record.is_active,
        disabled: record.is_system,
        'onUpdate:checked': (checked: any) => handleToggleStatus(record.id, checked),
        checkedValue: 1,
        unCheckedValue: 0,
      }),
  },
  {
    title: '操作',
    key: 'action',
    customRender: ({ record }: { record: PermissionLevel }) =>
      h(Space, { size: 'middle' }, [
        h(
          Button,
          {
            type: 'link',
            disabled: record.is_system,
            onClick: () => handleEdit(record),
          },
          {
            icon: () => h(EditOutlined),
            default: () => '编辑',
          },
        ),
        h(
          Popconfirm,
          {
            title: '确定要删除这个权限等级吗？',
            onConfirm: () => handleDelete(record.id),
            okText: '确定',
            cancelText: '取消',
            disabled: record.is_system,
          },
          {
            default: () =>
              h(
                Button,
                {
                  type: 'link',
                  danger: true,
                  disabled: record.is_system,
                },
                {
                  icon: () => h(DeleteOutlined),
                  default: () => '删除',
                },
              ),
          },
        ),
      ]),
  },
])

onMounted(() => {
  fetchPermissionLevels()
})
</script>

<style scoped>
@import './PermissionSettings.css';
</style>
