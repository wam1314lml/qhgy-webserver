<template>
  <a-card>
    <div class="packages-section">
      <div class="section-header">
        <h3>充值套餐管理</h3>
        <a-button type="primary" @click="handleCreatePackage">
          <PlusOutlined />
          添加套餐
        </a-button>
      </div>

      <custom-table
        :columns="packageColumns"
        :data-source="rechargePackages"
        row-key="id"
        :loading="loading"
        :pagination="{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number) => `共 ${total} 个套餐`,
        }"
      />
    </div>

    <!-- 充值套餐编辑Modal -->
    <a-modal
      :title="editingPackage ? '编辑充值套餐' : '添加充值套餐'"
      v-model:open="packageModalOpen"
      @ok="handleSavePackage"
      @cancel="
        () => {
          packageModalOpen = false
          editingPackage = null
        }
      "
      width="600px"
    >
      <a-form
        ref="packageFormRef"
        :model="packageForm"
        layout="vertical"
        @finish="handleSavePackage"
      >
        <a-form-item
          name="name"
          label="套餐名称"
          :rules="[{ required: true, message: '请输入套餐名称' }]"
        >
          <a-input placeholder="例如：新手套餐" v-model:value="packageForm.name" />
        </a-form-item>

        <a-form-item
          name="points"
          label="基础点数"
          :rules="[{ required: true, message: '请输入基础点数' }]"
        >
          <a-input-number
            :min="1"
            style="width: 100%"
            placeholder="例如：100"
            v-model:value="packageForm.points"
          />
        </a-form-item>

        <a-form-item
          name="price"
          label="价格（元）"
          :rules="[{ required: true, message: '请输入价格' }]"
        >
          <a-input-number
            :min="0.01"
            :step="0.01"
            :precision="2"
            style="width: 100%"
            placeholder="例如：25.00"
            v-model:value="packageForm.price"
          />
        </a-form-item>

        <a-form-item name="bonus_points" label="赠送点数" :rules="[{ required: false }]">
          <a-input-number
            :min="0"
            style="width: 100%"
            placeholder="例如：10"
            v-model:value="packageForm.bonus_points"
          />
        </a-form-item>

        <a-form-item name="sort_order" label="排序" :rules="[{ required: false }]">
          <a-input-number
            :min="0"
            style="width: 100%"
            placeholder="数字越小排序越靠前"
            v-model:value="packageForm.sort_order"
          />
        </a-form-item>

        <a-form-item
          name="max_purchase_count"
          label="购买次数限制"
          :rules="[{ required: false }]"
          tooltip="每个用户最多可购买次数，留空或设为0表示无限制"
        >
          <a-input-number
            :min="0"
            style="width: 100%"
            placeholder="例如：3（留空表示无限制）"
            v-model:value="packageForm.max_purchase_count"
          />
        </a-form-item>

        <a-form-item name="user_invite_rebate" label="普通用户返点" :rules="[{ required: false }]">
          <a-input
            style="width: 100%"
            placeholder="例如：1.50"
            addon-after="点"
            v-model:value="packageForm.user_invite_rebate"
          />
        </a-form-item>

        <a-form-item name="popular" label="推荐套餐">
          <a-switch v-model:checked="packageForm.popular" :checkedValue="1" :unCheckedValue="0" />
        </a-form-item>

        <a-form-item name="enabled" label="启用状态">
          <a-switch v-model:checked="packageForm.enabled" :checkedValue="1" :unCheckedValue="0" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h, resolveComponent } from 'vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { message, Button, Space, Popconfirm } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import CustomTable from '../CustomTable.vue'

interface RechargePackage {
  id: number
  name: string
  points: number
  price: number
  bonus_points: number
  total_points: number
  popular: boolean
  enabled: number
  sort_order: number
  max_purchase_count?: number
  user_invite_rebate: string
  created_at: string
  updated_at: string
}

interface Props {
  token: string
}

const props = defineProps<Props>()

// 响应式数据
const rechargePackages = ref<RechargePackage[]>([])
const loading = ref(false)
const packageModalOpen = ref(false)
const editingPackage = ref<RechargePackage | null>(null)

// 表单ref
const packageFormRef = ref<FormInstance>()

// 表单数据
const packageForm = ref({
  name: '',
  points: 0,
  price: 0,
  bonus_points: 0,
  sort_order: 0,
  popular: false,
  enabled: 1,
  max_purchase_count: 0,
  user_invite_rebate: '',
})

// 充值套餐表格列
const packageColumns = computed(() => [
  {
    title: '套餐名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '基础点数',
    dataIndex: 'points',
    key: 'points',
    customRender: ({ text }: { text: any }) => `${parseInt(text || 0)} 点`,
  },
  {
    title: '价格',
    dataIndex: 'price',
    key: 'price',
    customRender: ({ text }: { text: any }) => `¥${parseFloat(text || 0).toFixed(2)}`,
  },
  {
    title: '赠送点数',
    dataIndex: 'bonus_points',
    key: 'bonus_points',
    customRender: ({ text }: { text: any }) => {
      const bonusNum = parseInt(text || 0)
      return bonusNum > 0 ? `+${bonusNum} 点` : '-'
    },
  },
  {
    title: '总点数',
    dataIndex: 'total_points',
    key: 'total_points',
    customRender: ({ text }: { text: any }) => `${parseInt(text || 0)} 点`,
  },
  {
    title: '推荐',
    dataIndex: 'popular',
    key: 'popular',
    customRender: ({ text }: { text: boolean }) => {
      return h(
        resolveComponent('a-tag'),
        { color: text ? 'red' : 'default' },
        text ? '推荐' : '普通',
      )
    },
  },
  {
    title: '购买限制',
    dataIndex: 'max_purchase_count',
    key: 'max_purchase_count',
    customRender: ({ text }: { text: any }) => {
      const maxCount = parseInt(text || 0)
      return maxCount > 0 ? `${maxCount}次` : '无限制'
    },
  },
  {
    title: '普通用户返点',
    dataIndex: 'user_invite_rebate',
    key: 'user_invite_rebate',
    customRender: ({ text }: { text: string }) => {
      return text || '-'
    },
  },
  {
    title: '状态',
    dataIndex: 'enabled',
    key: 'enabled',
    customRender: ({ text }: { text: boolean }) => {
      return h(resolveComponent('a-tag'), { color: text ? 'green' : 'red' }, text ? '启用' : '禁用')
    },
  },
  {
    title: '排序',
    dataIndex: 'sort_order',
    key: 'sort_order',
  },
  {
    title: '操作',
    key: 'action',
    customRender: ({ record }: { record: RechargePackage }) => {
      return h(Space, {}, [
        h(
          Button,
          {
            size: 'small',
            onClick: () => handleEditPackage(record),
          },
          [h(EditOutlined), '编辑'],
        ),
        h(
          Popconfirm,
          {
            title: '确定删除这个套餐吗？',
            onConfirm: () => handleDeletePackage(record.id),
            okText: '确定',
            cancelText: '取消',
          },
          [
            h(
              Button,
              {
                size: 'small',
                danger: true,
              },
              [h(DeleteOutlined), '删除'],
            ),
          ],
        ),
      ])
    },
  },
])

// 获取充值套餐
const fetchRechargePackages = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/admin/recharge-packages', {
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      rechargePackages.value = data.packages || []
    }
  } catch {
    message.error('获取充值套餐失败')
  } finally {
    loading.value = false
  }
}

// 创建充值套餐
const handleCreatePackage = () => {
  editingPackage.value = null
  packageForm.value = {
    name: '',
    points: 0,
    price: 0,
    bonus_points: 0,
    sort_order: 0,
    popular: false,
    enabled: 1,
    max_purchase_count: 0,
    user_invite_rebate: '',
  }
  packageModalOpen.value = true
}

// 编辑充值套餐
const handleEditPackage = (pkg: RechargePackage) => {
  editingPackage.value = pkg
  packageForm.value = {
    name: pkg.name,
    points: pkg.points,
    price: pkg.price,
    bonus_points: pkg.bonus_points,
    sort_order: pkg.sort_order,
    popular: pkg.popular,
    enabled: pkg.enabled,
    max_purchase_count: pkg.max_purchase_count || 0,
    user_invite_rebate: pkg.user_invite_rebate || '',
  }
  packageModalOpen.value = true
}

// 删除充值套餐
const handleDeletePackage = async (id: number) => {
  try {
    const response = await fetch(`/api/admin/recharge-packages/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.ok) {
      message.success('套餐删除成功')
      fetchRechargePackages()
    } else {
      message.error('删除失败')
    }
  } catch {
    message.error('网络错误')
  }
}

// 保存充值套餐
const handleSavePackage = async () => {
  try {
    const url = editingPackage.value
      ? `/api/admin/recharge-packages/${editingPackage.value.id}`
      : '/api/admin/recharge-packages'

    const method = editingPackage.value ? 'PUT' : 'POST'

    // 处理表单数据，将max_purchase_count为0时转换为null
    const formData = {
      ...packageForm.value,
      max_purchase_count:
        packageForm.value.max_purchase_count === 0 ? null : packageForm.value.max_purchase_count,
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })

    if (response.ok) {
      message.success(editingPackage.value ? '套餐更新成功' : '套餐创建成功')
      packageModalOpen.value = false
      fetchRechargePackages()
      // 重置表单
      packageForm.value = {
        name: '',
        points: 0,
        price: 0,
        bonus_points: 0,
        sort_order: 0,
        popular: false,
        enabled: 1,
        max_purchase_count: 0,
        user_invite_rebate: '',
      }
    } else {
      message.error('保存失败')
    }
  } catch {
    message.error('网络错误')
  }
}

onMounted(() => {
  fetchRechargePackages()
})
</script>

<style scoped>
.packages-section {
  width: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}
</style>
