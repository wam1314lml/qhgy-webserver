<template>
  <div class="admin-panel-permissions">
    <a-card title="管理面板权限分配" :loading="loading">
      <template #extra>
        <a-button type="primary" @click="fetchData">
          <ReloadOutlined />
          刷新
        </a-button>
      </template>

      <a-alert
        message="权限说明"
        description="admin 角色默认拥有所有管理面板权限，无需配置。其他角色可以通过此页面配置各个管理面板模块的访问权限。"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 权限等级选择 -->
      <a-form layout="vertical" style="margin-bottom: 24px">
        <a-form-item label="选择权限等级">
          <a-select
            v-model:value="selectedRoleId"
            placeholder="请选择要配置的权限等级"
            style="width: 300px"
            @change="handleRoleChange"
          >
            <a-select-option
              v-for="role in availableRoles"
              :key="role.id"
              :value="role.id"
              :disabled="role.name === 'admin'"
            >
              {{ role.name }} (等级: {{ role.level }})
              <span v-if="role.name === 'admin'" style="color: #999; margin-left: 8px">
                (默认全部权限)
              </span>
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

      <!-- 权限配置 -->
      <div v-if="selectedRoleId && currentRole" class="permissions-config">
        <a-divider orientation="left">
          {{ currentRole.name }} - 管理面板权限配置
        </a-divider>

        <a-alert
          v-if="currentRole.name === 'admin'"
          message="admin 角色拥有所有权限"
          type="success"
          show-icon
          style="margin-bottom: 16px"
        />

        <div v-else>
          <div style="margin-bottom: 16px">
            <a-space>
              <a-button @click="selectAll">全选</a-button>
              <a-button @click="unselectAll">全不选</a-button>
              <a-button type="primary" @click="handleSavePermissions" :loading="saving">
                <SaveOutlined />
                保存权限配置
              </a-button>
            </a-space>
          </div>

          <a-row :gutter="[16, 16]">
            <a-col
              v-for="module in adminPanelModules"
              :key="module.key"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
            >
              <a-card size="small" :class="{ 'module-card-selected': permissionsForm[module.key] }">
                <a-checkbox v-model:checked="permissionsForm[module.key]">
                  <strong>{{ module.name }}</strong>
                </a-checkbox>
                <div style="font-size: 12px; color: #999; margin-top: 4px">
                  {{ module.description }}
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </div>

      <a-empty v-else description="请选择一个权限等级以配置其管理面板权限" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import axios from '../utils/axios'
import {
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue'

const props = defineProps<{
  token: string
}>()

// 数据
const loading = ref(false)
const saving = ref(false)
const availableRoles = ref<any[]>([])
const adminPanelModules = ref<any[]>([])
const selectedRoleId = ref<number | null>(null)
const currentRole = ref<any>(null)
const permissionsForm = reactive<Record<string, boolean>>({})

// 获取所有权限等级
const fetchRoles = async () => {
  try {
    const response = await axios.get('/api/admin/permission-levels', {
      headers: { Authorization: `Bearer ${props.token}` },
    })
    if (response.data.success) {
      availableRoles.value = response.data.data
    }
  } catch (error: any) {
    console.error('获取权限等级列表失败:', error)
    message.error(error.response?.data?.message || '获取权限等级列表失败')
  }
}

// 获取所有可配置的管理面板模块
const fetchModules = async () => {
  try {
    const response = await axios.get('/api/admin/admin-panel-modules', {
      headers: { Authorization: `Bearer ${props.token}` },
    })
    if (response.data.success) {
      adminPanelModules.value = response.data.data
    }
  } catch (error: any) {
    console.error('获取管理面板模块列表失败:', error)
    message.error(error.response?.data?.message || '获取管理面板模块列表失败')
  }
}

// 获取指定角色的权限配置
const fetchRolePermissions = async (roleId: number) => {
  try {
    loading.value = true
    const response = await axios.get(`/api/admin/admin-panel-permissions/${roleId}`, {
      headers: { Authorization: `Bearer ${props.token}` },
    })
    if (response.data.success) {
      const { roleName, roleLevel, adminPanelAccess } = response.data.data
      currentRole.value = { name: roleName, level: roleLevel }

      // 初始化 permissionsForm
      Object.keys(permissionsForm).forEach((key) => {
        delete permissionsForm[key]
      })
      adminPanelModules.value.forEach((module) => {
        permissionsForm[module.key] = adminPanelAccess[module.key] === true
      })
    }
  } catch (error: any) {
    console.error('获取权限配置失败:', error)
    message.error(error.response?.data?.message || '获取权限配置失败')
  } finally {
    loading.value = false
  }
}

// 处理角色切换
const handleRoleChange = (roleId: number) => {
  if (roleId) {
    fetchRolePermissions(roleId)
  }
}

// 全选
const selectAll = () => {
  adminPanelModules.value.forEach((module) => {
    permissionsForm[module.key] = true
  })
}

// 全不选
const unselectAll = () => {
  adminPanelModules.value.forEach((module) => {
    permissionsForm[module.key] = false
  })
}

// 保存权限配置
const handleSavePermissions = async () => {
  if (!selectedRoleId.value) {
    message.warning('请先选择一个权限等级')
    return
  }

  try {
    saving.value = true
    const response = await axios.put(
      `/api/admin/admin-panel-permissions/${selectedRoleId.value}`,
      { adminPanelAccess: permissionsForm },
      { headers: { Authorization: `Bearer ${props.token}` } }
    )

    if (response.data.success) {
      message.success('权限配置保存成功')
    }
  } catch (error: any) {
    console.error('保存权限配置失败:', error)
    message.error(error.response?.data?.message || '保存权限配置失败')
  } finally {
    saving.value = false
  }
}

// 刷新数据
const fetchData = async () => {
  loading.value = true
  try {
    await Promise.all([fetchRoles(), fetchModules()])
    if (selectedRoleId.value) {
      await fetchRolePermissions(selectedRoleId.value)
    }
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.admin-panel-permissions {
  padding: 0;
}

.permissions-config {
  margin-top: 24px;
}

.module-card-selected {
  border-color: #1890ff;
  background-color: #f0f7ff;
}

:deep(.ant-card-small > .ant-card-body) {
  padding: 12px;
}
</style>
