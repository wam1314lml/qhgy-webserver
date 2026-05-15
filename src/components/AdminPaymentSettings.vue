<template>
  <a-card>
    <template #title>
      <SettingOutlined /> 支付方式设置
    </template>

    <a-typography-text type="secondary">
      管理支付渠道和商户配置；渠道启用开关控制前端显示；商户启用开关控制下单时使用哪个商户
    </a-typography-text>

    <a-divider />

    <div style="margin-bottom: 24px">
      <a-space direction="vertical" size="large" style="width: 100%">
        <a-card
          v-for="method in paymentMethods"
          :key="method.id"
          size="small"
          :style="{
            border: method.enabled ? '1px solid #d9d9d9' : '1px solid #f0f0f0',
            backgroundColor: method.enabled ? '#ffffff' : '#fafafa'
          }"
        >
          <!-- 顶部：图标 + 名称 + 模式 + 启用开关 -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px">
            <a-space size="middle">
              <component :is="getPaymentIcon(method.payment_method)" />
              <div>
                <a-typography-text strong style="font-size: 16px">
                  {{ method.display_name }}
                </a-typography-text>
                <br />
                <a-typography-text type="secondary" style="font-size: 12px">
                  {{ getMethodDesc(method) }}
                </a-typography-text>
              </div>
            </a-space>

            <a-space wrap>
              <!-- 商户调用模式 -->
              <a-space size="small">
                <a-typography-text style="font-size: 13px">调用模式：</a-typography-text>
                <a-radio-group
                  v-model:value="method.mode"
                  size="small"
                  button-style="solid"
                  @change="saveMethod(method, { mode: method.mode })"
                >
                  <a-radio-button value="single">单商户</a-radio-button>
                  <a-radio-button value="round_robin">轮询</a-radio-button>
                </a-radio-group>
              </a-space>

              <!-- 渠道启用开关 -->
              <a-space size="small">
                <a-typography-text :type="method.enabled ? 'success' : 'secondary'">
                  {{ method.enabled ? '已启用' : '已禁用' }}
                </a-typography-text>
                <a-switch
                  v-model:checked="method.enabled"
                  :loading="saving"
                  @change="(checked) => saveMethod(method, { enabled: checked as number })"
                  checked-children="启用"
                  un-checked-children="禁用"
                  :checkedValue="1"
                  :unCheckedValue="0"
                />
              </a-space>
            </a-space>
          </div>

          <!-- 时间段设置 -->
          <a-divider style="margin: 12px 0" />
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
            <a-typography-text style="font-size: 13px; white-space: nowrap">
              <ClockCircleOutlined style="margin-right: 4px" />生效时间段：
            </a-typography-text>
            <a-time-picker
              v-model:value="method._startTime"
              format="HH:mm"
              placeholder="开始时间"
              :allow-clear="true"
              size="small"
              style="width: 110px"
            />
            <span style="color: #999">至</span>
            <a-time-picker
              v-model:value="method._endTime"
              format="HH:mm"
              placeholder="结束时间"
              :allow-clear="true"
              size="small"
              style="width: 110px"
            />
            <a-typography-text type="secondary" style="font-size: 12px">
              （不填则全天有效，支持跨午夜）
            </a-typography-text>
            <a-button type="primary" size="small" :loading="method._saving" @click="saveTimeRange(method)">保存时间段</a-button>
            <a-button size="small" :loading="method._saving" @click="clearTimeRange(method)">清除</a-button>
          </div>

          <!-- 商户列表 -->
          <a-divider style="margin: 12px 0" />
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
              <a-typography-text strong style="font-size: 13px">
                <BankOutlined style="margin-right: 4px" />商户配置
              </a-typography-text>
              <a-button
                type="dashed"
                size="small"
                @click="openAddMerchant(method.payment_method)"
              >
                <template #icon><PlusOutlined /></template>
                添加商户
              </a-button>
            </div>

            <a-empty
              v-if="getMerchants(method.payment_method).length === 0"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="暂无商户配置，将使用环境变量配置"
              style="margin: 8px 0"
            />

            <a-table
              v-else
              :data-source="getMerchants(method.payment_method)"
              :columns="merchantColumns"
              :pagination="false"
              size="small"
              row-key="id"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="record.enabled ? 'green' : 'default'">
                    {{ record.enabled ? '已启用' : '已禁用' }}
                  </a-tag>
                </template>
                <template v-if="column.key === 'action'">
                  <a-space size="small">
                    <a-switch
                      :checked="record.enabled === 1"
                      :loading="record._toggling"
                      checked-children="启"
                      un-checked-children="禁"
                      size="small"
                      @change="(checked) => toggleMerchant(record, checked as boolean, method.payment_method)"
                    />
                    <a-button size="small" @click="openEditMerchant(record)">编辑</a-button>
                    <a-popconfirm
                      title="确认删除该商户？"
                      ok-text="删除"
                      cancel-text="取消"
                      @confirm="deleteMerchant(record.id)"
                    >
                      <a-button size="small" danger>删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
          </div>
        </a-card>
      </a-space>
    </div>

    <a-divider />
    <a-space>
      <a-button type="primary" :loading="loading" @click="fetchPaymentSettings">
        <template #icon><SettingOutlined /></template>
        刷新设置
      </a-button>
      <a-typography-text type="secondary" style="font-size: 12px">
        * 渠道启用/禁用和时间段立即生效；商户启用状态影响下单时选择哪个商户
      </a-typography-text>
    </a-space>
  </a-card>

  <!-- 商户编辑弹窗 -->
  <a-modal
    v-model:open="merchantModalVisible"
    :title="editingMerchant?.id ? '编辑商户' : '添加商户'"
    @ok="saveMerchant"
    @cancel="merchantModalVisible = false"
    :confirm-loading="merchantSaving"
    ok-text="保存"
    cancel-text="取消"
    :width="600"
  >
    <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }" style="margin-top: 16px">
      <a-form-item label="备注名称" required>
        <a-input v-model:value="editingMerchant.remark" placeholder="如：主商户、备用商户1" />
      </a-form-item>

      <a-form-item label="商户ID">
        <a-input v-model:value="editingMerchant.mch_id" placeholder="商户号，用于列表展示" />
      </a-form-item>

      <!-- 微信支付字段 -->
      <template v-if="editingMerchant.payment_method === 'wechat'">
        <a-form-item label="MCH_ID">
          <a-input v-model:value="editingMerchant.config.mch_id" placeholder="微信商户号" />
        </a-form-item>
        <a-form-item label="APP_ID">
          <a-input v-model:value="editingMerchant.config.app_id" placeholder="微信APPID" />
        </a-form-item>
        <a-form-item label="SERIAL_NO">
          <a-input v-model:value="editingMerchant.config.serial_no" placeholder="证书序列号" />
        </a-form-item>
        <a-form-item label="私钥(PRIVATE_KEY)">
          <a-textarea v-model:value="editingMerchant.config.private_key" :rows="4" placeholder="PEM内容或文件路径" />
        </a-form-item>
        <a-form-item label="公钥(PUBLIC_KEY)">
          <a-textarea v-model:value="editingMerchant.config.public_key" :rows="3" placeholder="PEM内容或文件路径" />
        </a-form-item>
        <a-form-item label="API_V3_KEY">
          <a-input v-model:value="editingMerchant.config.api_v3_key" placeholder="APIv3密钥" />
        </a-form-item>
      </template>

      <!-- 支付宝字段 -->
      <template v-if="editingMerchant.payment_method === 'alipay'">
        <a-form-item label="APP_ID">
          <a-input v-model:value="editingMerchant.config.app_id" placeholder="支付宝APPID" />
        </a-form-item>
        <a-form-item label="私钥(PRIVATE_KEY)">
          <a-textarea v-model:value="editingMerchant.config.private_key" :rows="5" placeholder="RSA私钥内容" />
        </a-form-item>
        <a-form-item label="公钥(PUBLIC_KEY)">
          <a-textarea v-model:value="editingMerchant.config.public_key" :rows="3" placeholder="支付宝公钥内容" />
        </a-form-item>
      </template>

      <!-- 盛付通字段 -->
      <template v-if="editingMerchant.payment_method === 'shengpay'">
        <a-form-item label="MCH_ID">
          <a-input v-model:value="editingMerchant.config.mch_id" placeholder="盛付通商户号" />
        </a-form-item>
        <a-form-item label="私钥(PRIVATE_KEY)">
          <a-textarea v-model:value="editingMerchant.config.private_key" :rows="4" placeholder="RSA私钥内容" />
        </a-form-item>
        <a-form-item label="商户公钥">
          <a-textarea v-model:value="editingMerchant.config.public_key" :rows="3" placeholder="商户RSA公钥（可选）" />
        </a-form-item>
        <a-form-item label="平台公钥">
          <a-textarea v-model:value="editingMerchant.config.platform_public_key" :rows="3" placeholder="盛付通平台公钥（验签用）" />
        </a-form-item>
      </template>

      <!-- 拉卡拉字段 -->
      <template v-if="editingMerchant.payment_method === 'lakalapay'">
        <a-form-item label="APP_ID">
          <a-input v-model:value="editingMerchant.config.app_id" placeholder="拉卡拉 businessChannel，如 C00000971" />
        </a-form-item>
        <a-form-item label="商户ID(MCH_ID)">
          <a-input v-model:value="editingMerchant.config.mch_id" placeholder="拉卡拉商户ID，如 M00002009" />
        </a-form-item>
        <a-form-item label="MOSS平台公钥">
          <a-textarea v-model:value="editingMerchant.config.moss_public_key" :rows="4" placeholder="MOSS平台公钥（X.509 PEM 或裸 Base64）" />
        </a-form-item>
        <a-form-item label="商户私钥">
          <a-textarea v-model:value="editingMerchant.config.private_key" :rows="4" placeholder="商户私钥（PKCS8 PEM 或裸 Base64）" />
        </a-form-item>
        <a-form-item label="回调地址">
          <a-input v-model:value="editingMerchant.config.notify_url" placeholder="支付结果异步回调地址（可选，默认用系统配置）" />
        </a-form-item>
        <a-form-item label="网关地址">
          <a-input v-model:value="editingMerchant.config.gateway" placeholder="留空则使用默认: https://moss.lakala.com/ord-api/unified/v3" />
        </a-form-item>
      </template>

      <!-- 微信小程序支付字段 -->
      <template v-if="editingMerchant.payment_method === 'wechatAppPay'">
        <a-form-item label="MCH_ID">
          <a-input v-model:value="editingMerchant.config.mch_id" placeholder="微信商户号" />
        </a-form-item>
        <a-form-item label="小程序 APP_ID">
          <a-input v-model:value="editingMerchant.config.app_id" placeholder="小程序 AppID（wx开头）" />
        </a-form-item>
        <a-form-item label="小程序 APP_SECRET">
          <a-input-password v-model:value="editingMerchant.config.app_secret" placeholder="小程序 AppSecret（用于 code2Session 换取 openid）" />
        </a-form-item>
        <a-form-item label="SERIAL_NO">
          <a-input v-model:value="editingMerchant.config.serial_no" placeholder="API证书序列号" />
        </a-form-item>
        <a-form-item label="私钥(PRIVATE_KEY)">
          <a-textarea v-model:value="editingMerchant.config.private_key" :rows="4" placeholder="apiclient_key.pem 内容（-----BEGIN PRIVATE KEY-----...）" />
        </a-form-item>
        <a-form-item label="公钥(PUBLIC_KEY)">
          <a-textarea v-model:value="editingMerchant.config.public_key" :rows="3" placeholder="apiclient_cert.pem 内容（-----BEGIN CERTIFICATE-----...）" />
        </a-form-item>
        <a-form-item label="API_V3_KEY">
          <a-input v-model:value="editingMerchant.config.api_v3_key" placeholder="APIv3密钥（32位字符串）" />
        </a-form-item>
        <a-form-item label="回调地址">
          <a-input v-model:value="editingMerchant.config.notify_url" placeholder="小程序支付结果回调地址（可选）" />
        </a-form-item>
      </template>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import {
  Card, Switch, Button, message, Space, Typography, Divider, TimePicker,
  Modal, Form, Input, Table, Tag, Popconfirm, Empty, Radio
} from 'ant-design-vue'
import {
  WechatOutlined, AlipayOutlined, SettingOutlined, ClockCircleOutlined,
  BankOutlined, PlusOutlined
} from '@ant-design/icons-vue'
import dayjs, { type Dayjs } from 'dayjs'
import axios from '../utils/axios'

// 组件注册
const ACard = Card
const ASwitch = Switch
const AButton = Button
const ASpace = Space
const ATypographyText = Typography.Text
const ADivider = Divider
const ATimePicker = TimePicker
const AModal = Modal
const AForm = Form
const AFormItem = Form.Item
const AInput = Input
const ATextarea = Input.TextArea
const ATable = Table
const ATag = Tag
const APopconfirm = Popconfirm
const AEmpty = Empty
const ARadioGroup = Radio.Group
const ARadioButton = Radio.Button

interface PaymentMethod {
  id: number
  payment_method: string
  enabled: number
  display_name: string
  display_order: number
  mode: string
  config: any
  active_time_start: string | null
  active_time_end: string | null
  _startTime: Dayjs | null
  _endTime: Dayjs | null
  _saving: boolean
}

interface Merchant {
  id: number
  payment_method: string
  remark: string
  mch_id: string
  config: any
  enabled: number
  sort_order: number
  _toggling?: boolean
}

const paymentMethods = ref<PaymentMethod[]>([])
const merchants = ref<Merchant[]>([])
const loading = ref(false)
const saving = ref(false)

const merchantModalVisible = ref(false)
const merchantSaving = ref(false)
const editingMerchant = ref<any>({
  id: null,
  payment_method: '',
  remark: '',
  mch_id: '',
  config: {},
  enabled: 0
})

const merchantColumns = [
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '商户ID', dataIndex: 'mch_id', key: 'mch_id' },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 180 }
]

const strToDayjs = (str: string | null): Dayjs | null => {
  if (!str) return null
  return dayjs(`2000-01-01 ${str}`, 'YYYY-MM-DD HH:mm:ss')
}

const getMerchants = (pm: string) => merchants.value.filter(m => m.payment_method === pm)

const fetchPaymentSettings = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/payment/admin/payment-methods-admin')
    if (response.data.success) {
      paymentMethods.value = (response.data.data.channels as any[]).map(m => ({
        ...m,
        mode: m.mode || 'single',
        _startTime: strToDayjs(m.active_time_start),
        _endTime: strToDayjs(m.active_time_end),
        _saving: false,
      }))
      merchants.value = (response.data.data.merchants as any[]).map(m => ({
        ...m,
        config: typeof m.config === 'string' ? JSON.parse(m.config) : (m.config || {}),
        _toggling: false
      }))
    } else {
      message.error('获取支付设置失败')
    }
  } catch (error: any) {
    console.error('获取支付设置失败:', error)
    message.error(error.response?.status === 403 ? '需要管理员权限' : '获取支付设置失败')
  } finally {
    loading.value = false
  }
}

const saveMethod = async (method: PaymentMethod, payload: Record<string, any>) => {
  saving.value = true
  try {
    const response = await axios.put(`/api/payment/admin/payment-methods-admin/${method.id}`, payload)
    if (response.data.success) {
      message.success('更新成功')
    } else {
      message.error('更新失败')
    }
  } catch (error: any) {
    message.error(error.response?.status === 403 ? '需要管理员权限' : '更新失败')
  } finally {
    saving.value = false
  }
}

const saveTimeRange = async (method: PaymentMethod) => {
  method._saving = true
  try {
    const startStr = method._startTime ? method._startTime.format('HH:mm:ss') : null
    const endStr = method._endTime ? method._endTime.format('HH:mm:ss') : null
    const response = await axios.put(`/api/payment/admin/payment-methods-admin/${method.id}`, {
      active_time_start: startStr,
      active_time_end: endStr,
    })
    if (response.data.success) {
      method.active_time_start = startStr
      method.active_time_end = endStr
      message.success('时间段保存成功')
    } else {
      message.error('保存失败')
    }
  } catch {
    message.error('保存时间段失败')
  } finally {
    method._saving = false
  }
}

const clearTimeRange = async (method: PaymentMethod) => {
  method._startTime = null
  method._endTime = null
  await saveTimeRange(method)
}

// ==================== 商户操作 ====================

const emptyConfig = (pm: string) => {
  if (pm === 'wechat') return { mch_id: '', app_id: '', serial_no: '', private_key: '', public_key: '', api_v3_key: '' }
  if (pm === 'alipay') return { app_id: '', private_key: '', public_key: '' }
  if (pm === 'shengpay') return { mch_id: '', private_key: '', public_key: '', platform_public_key: '' }
  if (pm === 'lakalapay') return { app_id: '', mch_id: '', moss_public_key: '', private_key: '', notify_url: '', gateway: '' }
  if (pm === 'wechatAppPay') return { mch_id: '', app_id: '', app_secret: '', serial_no: '', private_key: '', public_key: '', api_v3_key: '', notify_url: '' }
  return {}
}

const openAddMerchant = (pm: string) => {
  editingMerchant.value = { id: null, payment_method: pm, remark: '', mch_id: '', config: emptyConfig(pm), enabled: 0 }
  merchantModalVisible.value = true
}

const openEditMerchant = async (record: Merchant) => {
  // 重新拉取含config的商户详情
  try {
    const res = await axios.get(`/api/payment/admin/payment-merchants?payment_method=${record.payment_method}`)
    const full = (res.data.data as any[]).find(m => m.id === record.id)
    const cfg = typeof full.config === 'string' ? JSON.parse(full.config) : (full.config || emptyConfig(record.payment_method))
    editingMerchant.value = { ...full, config: cfg }
  } catch {
    const cfg = typeof record.config === 'string' ? JSON.parse(record.config) : (record.config || emptyConfig(record.payment_method))
    editingMerchant.value = { ...record, config: cfg }
  }
  merchantModalVisible.value = true
}

const saveMerchant = async () => {
  const m = editingMerchant.value
  if (!m.remark) { message.warning('备注不能为空'); return }
  merchantSaving.value = true
  try {
    const payload = {
      payment_method: m.payment_method,
      remark: m.remark,
      mch_id: m.mch_id || (m.config?.mch_id || m.config?.app_id || ''),
      config: m.config,
      enabled: m.enabled ? 1 : 0,
    }
    let res
    if (m.id) {
      res = await axios.put(`/api/payment/admin/payment-merchants/${m.id}`, payload)
    } else {
      res = await axios.post('/api/payment/admin/payment-merchants', payload)
    }
    if (res.data.success) {
      message.success(m.id ? '商户更新成功' : '商户添加成功')
      merchantModalVisible.value = false
      await fetchPaymentSettings()
    } else {
      message.error(res.data.message || '操作失败')
    }
  } catch (error: any) {
    message.error(error.response?.data?.message || '操作失败')
  } finally {
    merchantSaving.value = false
  }
}

const toggleMerchant = async (record: Merchant, checked: boolean, pm: string) => {
  record._toggling = true
  try {
    const res = await axios.put(`/api/payment/admin/payment-merchants/${record.id}`, {
      payment_method: pm,
      enabled: checked ? 1 : 0
    })
    if (res.data.success) {
      message.success(checked ? '商户已启用' : '商户已禁用')
      await fetchPaymentSettings()
    } else {
      message.error('操作失败')
    }
  } catch {
    message.error('操作失败')
  } finally {
    record._toggling = false
  }
}

const deleteMerchant = async (id: number) => {
  try {
    const res = await axios.delete(`/api/payment/admin/payment-merchants/${id}`)
    if (res.data.success) {
      message.success('商户已删除')
      await fetchPaymentSettings()
    } else {
      message.error('删除失败')
    }
  } catch {
    message.error('删除失败')
  }
}

// ==================== 展示辅助 ====================

const getMethodDesc = (method: PaymentMethod): string => {
  const base = method.payment_method === 'wechat' ? '微信扫码支付'
    : method.payment_method === 'alipay' ? '支付宝扫码支付'
    : method.payment_method === 'wechatAppPay' ? '微信小程序JSAPI支付'
    : '微信/支付宝扫码支付'
  const modeStr = method.mode === 'round_robin' ? '轮询模式' : '单商户模式'
  if (method.active_time_start && method.active_time_end) {
    const s = method.active_time_start.substring(0, 5)
    const e = method.active_time_end.substring(0, 5)
    return `${base} · ${modeStr} · 生效时段 ${s}~${e}`
  }
  return `${base} · ${modeStr} · 全天有效`
}

const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'wechat':
      return h(WechatOutlined, { style: { color: '#07C160', fontSize: '20px' } })
    case 'alipay':
      return h(AlipayOutlined, { style: { color: '#1677FF', fontSize: '20px' } })
    case 'shengpay':
      return h('span', {}, [
        h(WechatOutlined, { style: { color: '#FF6600', fontSize: '20px' } }),
        h(AlipayOutlined, { style: { color: '#FF6600', fontSize: '20px', marginLeft: '2px' } })
      ])
    case 'wechatAppPay':
      return h(WechatOutlined, { style: { color: '#07C160', fontSize: '20px' } })
    default:
      return h(SettingOutlined, { style: { fontSize: '20px' } })
  }
}

onMounted(() => {
  fetchPaymentSettings()
})
</script>
