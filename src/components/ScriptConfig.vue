<template>
  <div class="script-config-container">
    <div class="flex flex-wrap gap-4 justify-center md:justify-start">
      <div v-if="accounts.length === 0" class="add-account-card" @click="handleAddAccount">
        <div class="add-icon">+</div>
        <div class="add-text">添加游戏账号</div>
      </div>
      <template v-else>
        <div v-for="account in accounts" :key="account.id" class="account-card">
          <div class="account-header">
            <div class="account-name">
              {{ account.nickname }}
              <!-- 支付宝授权状态（platform===1） -->
              <template v-if="account.platform === 1">
                <span
                  v-if="getAlipayTokenStatus(account)?.state === 'expired'"
                  class="alipay-token-tag alipay-token-expired"
                  >支付宝授权已过期</span
                >
                <span
                  v-else-if="getAlipayTokenStatus(account)?.state === 'no_record'"
                  class="alipay-token-tag alipay-token-warn"
                  >未读取到最新支付宝授权请重扫</span
                >
                <span
                  v-else-if="getAlipayTokenStatus(account)?.state === 'ok'"
                  class="alipay-token-tag alipay-token-ok"
                  >支付宝码有效期剩余 {{ getAlipayTokenStatus(account)?.timeLeft }}</span
                >
              </template>
            </div>
            <div class="account-header-right">
              <div class="server-line">
                <img v-if="account.platform === 1" src="/icons/alipay.svg" width="18" class="v-sub" />
                <img v-if="account.platform === 2" src="/icons/douyin.svg" width="18" class="v-sub" />
                <img v-if="account.platform === 3" src="/icons/huawei.svg" width="18" class="v-sub" />
                {{ account.server_name || account.server_id }}
              </div>
              <div class="account-menu">
                <a-dropdown trigger="click">
                  <a-tooltip
                    v-if="account.id === expiredTooltipAccountId"
                    :open="expiredTooltipOpen"
                    placement="bottomRight"
                    :title="expiredTooltipText"
                    :overlayStyle="expiredTooltipOuterStyle"
                    :overlayInnerStyle="expiredTooltipInnerStyle"
                    :getPopupContainer="getTooltipContainer"
                    arrow-point-at-center
                    destroy-tooltip-on-hide
                    :auto-adjust-overflow="false"
                  >
                    <a-button
                      class="menu-button"
                      shape="circle"
                      type="text"
                      :data-account-id="account.id"
                      :icon="h(MoreOutlined)"
                    >
                    </a-button>
                  </a-tooltip>
                  <a-button
                    v-else
                    class="menu-button"
                    shape="circle"
                    type="text"
                    :data-account-id="account.id"
                    :icon="h(MoreOutlined)"
                  >
                  </a-button>
                  <template #overlay>
                    <a-menu @click="(e: any) => handleMenuClick(e, account)">
                      <a-menu-item key="extend">
                        <template #icon>
                          <PlusOutlined />
                        </template>
                        增加配额
                      </a-menu-item>
                      <!-- 开通试用选项：暂时关闭入口
                      <a-menu-item
                        v-if="canActivateTrial(account)"
                        key="activateTrial"
                        class="trial-item"
                      >
                        <template #icon>
                          <GiftOutlined />
                        </template>
                        开通试用
                      </a-menu-item>
                      -->
                      <a-menu-item v-if="account.platform === 1" key="alipayRescan">
                        <template #icon>
                          <SyncOutlined />
                        </template>
                        三十天扫码保持（防掉线）
                      </a-menu-item>
                      <a-menu-item key="updatePassword">
                        <template #icon>
                          <LockOutlined />
                        </template>
                        更新游戏密码
                      </a-menu-item>
                      <!-- :disabled="
                      !(
                        operatingAccounts.has(account.id) ||
                        getAccountStartedStatus(account) ||
                        !hasAccountRecord(account) ||
                        !account.expire_time ||
                        new Date(account.expire_time) < new Date()
                      )
                    " -->
                      <a-menu-item
                        :disabled="operatingAccounts.has(account.id)"
                        key="delete"
                        class="delete-item"
                      >
                        <template #icon>
                          <DeleteOutlined />
                        </template>
                        删除角色
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
            </div>
          </div>

          <div class="account-info">
            <div class="stats-grid resource-stats">
              <div class="stat-item compact">
                <span class="stat-label">等级</span>
                <span class="stat-value">{{ getAccountGameData(account).level }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">水滴</span>
                <span class="stat-value">{{ getAccountGameData(account).water }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">元宝</span>
                <span class="stat-value">{{ getAccountGameData(account).diamond }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">金币</span>
                <span class="stat-value">{{ formatGoldAmount(getAccountGameData(account).gold) }}</span>
              </div>
            </div>
            <div class="stats-grid task-stats">
              <div class="stat-item compact">
                <span class="stat-label">加速卡</span>
                <span class="stat-value">{{ getAccountGameData(account).speedCard }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">雇佣书</span>
                <span class="stat-value">{{ getAccountGameData(account).hireBook }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">珍珠</span>
                <span class="stat-value">{{ getAccountGameData(account).pearl }}</span>
              </div>
            </div>
            <div class="stats-grid task-stats">
              <div class="stat-item compact">
                <span class="stat-label">花坊币</span>
                <span class="stat-value">{{ getAccountGameData(account).floralCoin }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">喵币</span>
                <span class="stat-value">{{ getAccountGameData(account).meowCoin }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">公会竞赛</span>
                <span class="stat-value"
                  >{{ getAccountGameData(account).usedTaskNum }}/{{
                    getAccountGameData(account).totalTaskNum
                  }}</span
                >
              </div>
            </div>
            <div class="stats-grid task-stats">
              <div class="stat-item compact">
                <span class="stat-label">居民订单</span>
                <span class="stat-value">{{ getAccountGameData(account).flowerFinish }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">绸缎订单</span>
                <span class="stat-value">{{ getAccountGameData(account).satinFinish }}</span>
              </div>
              <div class="stat-item compact">
                <span class="stat-label">建材订单</span>
                <span class="stat-value">{{ getAccountGameData(account).decorateFinish }}</span>
              </div>
            </div>
            <div class="flex justify-between items-baseline info-line expire-line">
              <div class="stat-item compact">
                <span class="stat-label">顾客订单</span>
                <span class="stat-value">{{ getAccountGameData(account).customerFinish }}</span>
              </div>
              <div>
                到期时间：<span
                  :style="{
                    color: isAccountExpired(account) ? '#ff4d4f' : 'inherit',
                  }"
                >
                  {{ formatExpireTime(account.expire_time) }}
                </span>
              </div>
            </div>
          </div>

          <div class="account-actions">
            <div
              :class="`status-indicator ${getAccountStartedStatus(account) ? 'online' : 'offline'}`"
              :style="{
                backgroundColor: getStatusColor(account.status, getAccountStartedStatus(account)),
              }"
            ></div>
            <!-- 启动按钮 -->
            <a-button
              :class="`action-button secondary ${
                !account.expire_time || new Date(account.expire_time) < new Date() ? 'disabled' : ''
              }`"
              @click="handleToggleAccount(account.id, 'inactive')"
              :disabled="
                operatingAccounts.has(account.id) ||
                getAccountStartedStatus(account) ||
                !hasAccountRecord(account) ||
                !account.expire_time ||
                new Date(account.expire_time) < new Date()
              "
              type="primary"
            >
              启动
            </a-button>
            <!-- 停止按钮 -->
            <a-button
              class="action-button secondary"
              @click="handleToggleAccount(account.id, 'active')"
              :disabled="operatingAccounts.has(account.id) || !getAccountStartedStatus(account)"
              type="primary"
              danger
            >
              停止
            </a-button>
            <a-button
              :class="`action-button secondary ${
                !account.expire_time || new Date(account.expire_time) < new Date() ? 'disabled' : ''
              }`"
              @click="handleViewLogs(account.id)"
              :disabled="!account.expire_time || new Date(account.expire_time) < new Date()"
              type="primary"
            >
              查看日志
            </a-button>
            <a-button
              class="action-button secondary"
              @click="handleConfigAccount(account.id)"
              type="primary"
            >
              修改配置
            </a-button>
          </div>
        </div>

        <div class="add-account-card" @click="handleAddAccount">
          <div class="add-icon">+</div>
          <div class="add-text">添加游戏账号</div>
        </div>
      </template>
    </div>

    <AddAccountModal
      :is-open="showAddModal"
      @close="showAddModal = false"
      @success="handleAccountAdded"
      :token="token"
    />

    <LogViewModal
      :is-open="logModalOpen"
      @close="
        () => {
          logModalOpen = false
          selectedAccountId = null
        }
      "
      :account-id="selectedAccountId!"
      :token="token"
    />

    <RechargeModal
      :visible="rechargeModalOpen"
      @close="rechargeModalOpen = false"
      :user="currentUser"
    />

    <!-- 配额延期弹窗 -->
    <a-modal
      v-model:open="showQuotaModal"
      :title="`延期配额 - ${currentAccountNickname}`"
      :confirmLoading="addingQuota"
      @ok="confirmExtendQuota"
      @cancel="showQuotaModal = false"
      okText="确认延期"
      cancelText="取消"
      :okButtonProps="{ disabled: !selectedQuotaDays || addingQuota }"
      width="560px"
    >
      <div class="quota-info">
        <p style="display: flex; align-items: center; gap: 8px">
          当前配额: <span class="points">{{ userPoints }}</span>
          <a-button
            type="link"
            size="small"
            @click="handleOpenRecharge"
            style="padding: 0; height: auto"
          >
            <template #icon>
              <ShoppingCartOutlined />
            </template>
            充值
          </a-button>
        </p>
        <p v-if="currentAccountExpiry" style="font-size: 13px; color: #666">
          当前到期: {{ currentAccountExpiry }}
        </p>
        <p>选择延期时长:</p>
      </div>
      <div class="quota-options">
        <div v-if="quotaOptions.length === 0" class="no-options">
          <p>暂无可用的配额选项</p>
          <p>请联系管理员配置</p>
        </div>
        <div
          v-else
          v-for="option in quotaOptions"
          :key="option.id"
          :class="`quota-option ${selectedQuotaDays === option.days ? 'selected' : ''}`"
          @click="
            () => {
              selectedQuotaDays = option.days
              baseQuotaPoints = option.points
            }
          "
        >
          <div class="option-header">
            <span class="days"
              >{{ option.label }}
              <a-tag :bordered="false" color="red" v-if="isSuperValueQuotaOption(option)"
                >超值
              </a-tag></span
            >
            <span class="cost">-{{ option.points }}配额</span>
          </div>
          <div class="option-desc">
            {{ option.description || `延期${option.days}天` }}
          </div>
        </div>
      </div>

      <!-- 额外配额调整 -->
      <div
        v-if="selectedQuotaDays"
        style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px"
      >
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          "
        >
          <span style="font-size: 14px; color: #666">调整额外配额:</span>
          <span style="font-size: 16px; font-weight: 600; color: #3b82f6">
            {{ baseQuotaPoints + additionalPoints }} 点
          </span>
        </div>
        <div
          style="
            margin-bottom: 12px;
            padding: 10px 12px;
            background: #fff1f0;
            border: 1px solid #ffccc7;
            border-radius: 6px;
            color: #cf1322;
            font-size: 13px;
            line-height: 1.6;
            font-weight: 600;
          "
        >
          注：如本身套餐消耗 10 配额增加 10 天，这里再设置 10 则消耗 20 配额增加 20 天
        </div>
        <div style="display: flex; gap: 12px; align-items: center">
          <a-slider
            v-model:value="additionalPoints"
            :min="0"
            :max="Math.max(0, userPoints - baseQuotaPoints)"
            :marks="{ 0: '0' }"
            style="flex: 1"
          />
          <a-input-number
            v-model:value="additionalPoints"
            :min="0"
            :max="Math.max(0, userPoints - baseQuotaPoints)"
            :step="1"
            style="width: 100px"
            placeholder="额外点数"
          />
        </div>
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 12px;
            color: #999;
          "
        >
          <span>套餐: {{ baseQuotaPoints }}点</span>
          <span>额外: {{ additionalPoints }}点</span>
        </div>
        <!-- 预计到期时间 -->
        <div
          v-if="predictedExpiryTime"
          style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb"
        >
          <div style="font-size: 13px; color: #666; margin-bottom: 4px">预计到期时间:</div>
          <div style="font-size: 14px; font-weight: 500; color: #10b981">
            {{ predictedExpiryTime }}
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 删除确认弹窗 -->
    <a-modal
      v-model:open="showDeleteModal"
      title="确认删除账号"
      @ok="confirmDeleteAccount"
      @cancel="cancelDelete"
      :okText="canConfirmDelete ? '确认删除' : `等待 ${deleteCountdown}s`"
      cancelText="取消"
      :okButtonProps="{
        disabled: !canConfirmDelete,
        danger: true,
        loading: false,
      }"
    >
      <div class="delete-warning">
        <div class="warning-icon">⚠️</div>
        <p>
          您即将删除游戏账号：<strong>{{ deleteAccountName }}</strong>
        </p>
        <p class="warning-text">
          此操作不可撤销，该角色卡的剩余时间和所有配置数据将被永久删除！不可恢复！
        </p>
        <div v-if="deleteCountdown > 0" class="countdown-info">
          <p>
            请等待 <span class="countdown">{{ deleteCountdown }}</span> 秒后确认删除
          </p>
          <div class="countdown-bar">
            <div
              class="countdown-progress"
              :style="{ width: `${((20 - deleteCountdown) / 20) * 100}%` }"
            ></div>
          </div>
        </div>
        <div v-if="canConfirmDelete" class="ready-to-delete">
          <p class="ready-text">✅ 现在可以确认删除</p>
        </div>
      </div>
    </a-modal>

    <UpdatePasswordModal
      :is-open="showUpdatePasswordModal"
      :account-id="updatePasswordAccountId"
      :account-name="updatePasswordAccountName"
      :server-name="updateServerName"
      @close="closeUpdatePasswordModal"
      @success="handleUpdatePasswordSuccess"
    />

    <!-- 抖音重认证弹窗 -->
    <a-modal
      v-model:open="douyinReauthVisible"
      title="🎵 抖音重新认证"
      :width="400"
      ok-text="取消认证"
      :ok-button-props="{ danger: true }"
      :cancel-button-props="{ style: 'display:none' }"
      @ok="handleDouyinReauthCancel"
      @cancel="handleDouyinReauthCancel"
    >
      <DouyinReauthModal
        :qr-b64="douyinReauthQrB64"
        :scan-status="douyinReauthScanStatus"
        :sid="douyinReauthSid"
        :on-submit-sms="handleDouyinReauthSubmitSms"
      />
    </a-modal>

    <!-- 客服模态框 -->
    <a-modal
      v-model:open="showCustomerServiceModal"
      title="加入群聊"
      @cancel="showCustomerServiceModal = false"
      :footer="null"
      centered
      width="300px"
    >
      <div class="customer-service-content">
        <a-spin :spinning="groupChatImageLoading" tip="加载中...">
          <div class="qrcode-container">
            <img
              v-if="groupChatImage && !groupChatImageLoading"
              :src="groupChatImage"
              alt="客服二维码"
              class="qrcode-image"
            />
            <div v-else-if="!groupChatImageLoading" class="no-image">
              <p>暂无群聊二维码</p>
            </div>
          </div>
          <p class="service-text">扫描二维码加入群聊</p>
        </a-spin>
        <div class="service-footer">
          <a-button type="primary" size="large" block @click="showCustomerServiceModal = false">
            关闭
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- 悬浮按钮组 -->
    <a-float-button-group
      trigger="click"
      type="primary"
      shape="square"
      :style="{ right: '24px', borderRadius: '8px' }"
      :open="floatButtonOpen || (tourOpen && !isFirstAccountTour)"
      @openChange="handleFloatButtonOpenChange"
      description="菜单"
    >
      <template #icon>
        <PlusOutlined />
      </template>

      <a-float-button
        tooltip="充值点数"
        @click="
          () => {
            rechargeModalOpen = true
            floatButtonOpen = false
          }
        "
        class="tour-2 tour-recharge-btn"
      >
        <template #icon>
          <ShoppingCartOutlined />
        </template>
      </a-float-button>

      <a-float-button
        tooltip="添加账号"
        @click="
          () => {
            handleAddAccount()
            floatButtonOpen = false
          }
        "
        class="tour-3"
      >
        <template #icon>
          <PlusOutlined />
        </template>
      </a-float-button>

      <a-tooltip placement="right" :open="groupChatTooltipOpen">
        <template #title>
          <span>点它获取设置图文教程，很详细哦</span>
        </template>
        <a-float-button @click="onShowLink">
          <template #icon>
            <QuestionCircleOutlined />
          </template>
        </a-float-button>
      </a-tooltip>

      <a-float-button
        @click="
          () => {
            showCustomerServiceModal = true
            floatButtonOpen = false
          }
        "
        class="tour-4"
        :open="true"
      >
        <template #icon>
          <CustomerServiceOutlined />
        </template>
      </a-float-button>
    </a-float-button-group>

    <!-- Tour 漫游式引导 -->
    <Tour
      v-model:open="tourOpen"
      v-model:current="tourCurrentStep"
      :steps="tourSteps"
      :scrollIntoViewOptions="{ behavior: 'smooth', block: 'center' }"
      :z-index="10000"
      placement="bottom"
      @close="handleTourClose"
      @change="handleTourChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, onBeforeUnmount, h, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../utils/axios'
import { message, Tour, Modal } from 'ant-design-vue'
import type { TourProps } from 'ant-design-vue'
import {
  ShoppingCartOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  CustomerServiceOutlined,
  MoreOutlined,
  DeleteOutlined,
  LockOutlined,
  GiftOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue'
import AddAccountModal from './AddAccountModal.vue'
import LogViewModal from './LogViewModal.vue'
import RechargeModal from './RechargeModal.vue'
import UpdatePasswordModal from './UpdatePasswordModal.vue'
import AlipayReauthModal from './AlipayReauthModal.vue'
import HuaweiReauthModal from './HuaweiReauthModal.vue'
import DouyinReauthModal from './DouyinReauthModal.vue'
import { updateUserBalance } from '../utils/userUtils'

// 基础账户信息接口
interface GameAccount {
  id: number
  user_id: number
  slot_id: number
  account_name: string
  nickname: string
  server_id: string
  username: string
  channel: string
  platform: number
  server_name: string
  script_server_id: string
  script_server_ip: string
  script_server_port: number
  status: 'active' | 'inactive' | 'error'
  vip_level: number
  expire_time: string | null
  is_online: boolean
  created_at: string
  updated_at: string
  // 游戏记录数据，使用 player_record 的原始格式
  record?: PlayerRecord
}

// 游戏记录详情接口
interface GameRecordDetails {
  player?: {
    nickName: string
  }
  homeland?: {
    worker?: {
      free: number
      total: number
      energy: number
      ready: boolean
    }
    lastUpdate: string
  }
  bag?: {
    xianYu: string
    peach: string
    lastUpdate: string
  }
  palace?: {
    totalCount: number
    dailyResetTime: string
    lastUpdate: string
  }
  dispatchAllWorker?: {
    lastDispatchTime: string | null
    totalCount: number
  }
  isOnline: boolean
  lastOnlineUpdate: string
  // 支付宝七天授权相关字段（platform===1，ZFB_ 账号有效）
  Is7dayTokenExpire?: boolean // true = 七天码已过期
  '7dayTokenRescanTime'?: string | number | null // 上次扫码时间
  '7daytokenExpireTime'?: string | null // 七天码过期时间
  '7dayExpireReason'?: string | null // 过期原因
  [key: string]: any // 允许脚本服扩展字段
}

// 玩家记录数据接口（对应 player_record API 返回格式）
interface PlayerRecord {
  id: string
  serverId: string
  username: string
  isStarted: boolean
  isReconnect: boolean // 新增字段：是否重连状态
  isOnline: boolean
  record: GameRecordDetails | null // record可能为null（离线状态）
  status: string // 新增字段：状态信息，如 "offline", "online" 等
}

interface ScriptConfigProps {
  user: any
  token: string
  onBack?: () => void
  onUserUpdate?: (user: any) => void
}

const props = defineProps<ScriptConfigProps>()
const emit = defineEmits<{
  'expiry-banner-change': [visible: boolean]
}>()

console.log('🚀 ScriptConfig 组件加载')

// 所有状态管理
const accounts = ref<GameAccount[]>([])
const showAddModal = ref(false)
const isLoading = ref(false)
const operatingAccounts = ref<Set<number>>(new Set())
const logModalOpen = ref(false)
const selectedAccountId = ref<number | null>(null)
const rechargeModalOpen = ref(false)
const currentUser = ref(props.user)
const autoRefreshEnabled = ref(true)
const EXPIRY_NOTICE_WINDOW_DAYS = 7
const EXPIRY_NOTICE_DURATION_MS = 20000
const expiringBannerVisible = ref(false)
let expiringBannerTimer: number | null = null
let expiringBannerKey: string | null = null

// 计算属性：获取账号的游戏数据
const getAccountGameData = (account: GameAccount) => {
  const empty = {
    level: 0,
    water: 0,
    diamond: 0,
    gold: 0,
    floralCoin: 0,
    meowCoin: 0,
    speedCard: 0,
    hireBook: 0,
    pearl: 0,
    usedTaskNum: 0,
    totalTaskNum: 0,
    flowerFinish: 0,
    decorateFinish: 0,
    satinFinish: 0,
    customerFinish: 0,
    isStarted: false,
    isOnline: false,
  }

  if (!account.record) return empty

  const isStarted = account.record.isStarted || false
  const isOnline = account.record.isOnline || false

  const gameRecordDetails = account.record.record as any

  if (!gameRecordDetails) return { ...empty, isStarted, isOnline }

  const attrs = gameRecordDetails.playerAttrs || {}
  const orders = gameRecordDetails.orderStats || {}
  const fmlRace = gameRecordDetails.fmlRace || {}

  return {
    level: attrs.level ?? 0,
    water: attrs.water ?? 0,
    diamond: attrs.diamond ?? 0,
    gold: attrs.gold ?? 0,
    floralCoin: attrs.floralCoin ?? 0,
    meowCoin: attrs.meowCoin ?? 0,
    speedCard: attrs.speedCard ?? 0,
    hireBook: attrs.hireBook ?? 0,
    pearl: attrs.pearl ?? 0,
    usedTaskNum: fmlRace.usedTaskNum ?? 0,
    totalTaskNum: fmlRace.totalTaskNum ?? 0,
    flowerFinish: orders.flowerFinish ?? 0,
    decorateFinish: orders.decorateFinish ?? 0,
    satinFinish: orders.satinFinish ?? 0,
    customerFinish: orders.customerFinish ?? 0,
    isStarted,
    isOnline: gameRecordDetails.isOnline || isOnline,
  }
}

// 检查账号是否有record数据
const hasAccountRecord = (account: GameAccount): boolean => {
  return !!account.record
}

// 获取账号的启动状态
const getAccountStartedStatus = (account: GameAccount): boolean => {
  return account.record?.isStarted || false
}

const getExpiryDaysLeft = (account: GameAccount): number | null => {
  if (!account.expire_time) return null
  const expiryTime = new Date(account.expire_time).getTime()
  if (Number.isNaN(expiryTime)) return null
  const diffMs = expiryTime - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * 获取支付宝授权状态（platform===1 专用）
 * 数据在 account.record.record（GameRecordDetails）层：
 *   Is7dayTokenExpire    - true = 七天码已过期
 *   7dayTokenRescanTime  - 上次扫码时间（有效期30天）
 * 返回：
 *   { state: 'expired' }          - Is7dayTokenExpire===true
 *   { state: 'no_record' }        - 没有 record 或没有 7dayTokenRescanTime
 *   { state: 'ok', daysLeft: N }  - 正常，N = 距到期剩余天数（30天有效期）
 */
const getAlipayTokenStatus = (account: GameAccount) => {
  if (account.platform !== 1) return null
  if (!account.record) return { state: 'no_record' as const }

  // 启动时：七天授权字段在 record.record（GameRecordDetails）层
  // 未启动时：后端直接把授权字段挂在 record 顶层（record.record 为 undefined）
  const gameRecord = (account.record.record as any) ?? (account.record as any)

  if (gameRecord['Is7dayTokenExpire'] === true) return { state: 'expired' as const }

  const rawTime = gameRecord['7dayTokenRescanTime']
  if (!rawTime) return { state: 'no_record' as const }

  const ts = typeof rawTime === 'number' ? rawTime : new Date(rawTime).getTime()
  if (!ts || Number.isNaN(ts)) return { state: 'no_record' as const }

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const expireTs = ts + THIRTY_DAYS_MS
  const diffMs = expireTs - Date.now()
  if (diffMs <= 0) return { state: 'ok' as const, timeLeft: '0m' }
  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  let timeLeft = ''
  if (days > 0) timeLeft += `${days}d`
  if (hours > 0) timeLeft += `${hours}h`
  timeLeft += `${minutes}m`
  return { state: 'ok' as const, timeLeft }
}

const isAccountExpired = (account: GameAccount): boolean => {
  if (!account.expire_time) return true
  const expiryTime = new Date(account.expire_time).getTime()
  if (Number.isNaN(expiryTime)) return true
  return expiryTime <= Date.now()
}

const formatExpireTime = (expireTime: string | null | undefined): string => {
  if (!expireTime) return '已过期'
  const date = new Date(expireTime)
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return '已过期'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatGoldAmount = (value: number | null | undefined): string => {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return '0'
  if (num >= 100000000) {
    return `${parseFloat((num / 100000000).toFixed(3))}亿`
  }
  if (num >= 10000) {
    return `${parseFloat((num / 10000).toFixed(1))}万`
  }
  return String(num)
}

const isExpiringSoon = (account: GameAccount): boolean => {
  const daysLeft = getExpiryDaysLeft(account)
  return daysLeft !== null && daysLeft > 0 && daysLeft <= EXPIRY_NOTICE_WINDOW_DAYS
}

const getExpiringBannerKey = (list: GameAccount[]): string => {
  return list
    .filter((account) => isExpiringSoon(account))
    .map((account) => `${account.id}:${account.expire_time || ''}`)
    .sort()
    .join('|')
}

const showExpiringBanner = () => {
  expiringBannerVisible.value = true
  if (expiringBannerTimer) {
    clearTimeout(expiringBannerTimer)
  }
  expiringBannerTimer = window.setTimeout(() => {
    expiringBannerVisible.value = false
    expiringBannerTimer = null
  }, EXPIRY_NOTICE_DURATION_MS)
}

watch(
  expiringBannerVisible,
  (visible) => {
    emit('expiry-banner-change', visible)
  },
  { immediate: true }
)

// 配额管理相关状态
const showQuotaModal = ref(false)
const selectedQuotaDays = ref<number | null>(null)
const addingQuota = ref(false)
const userPoints = ref(props.user?.points || 0)
const currentQuotaAccountId = ref<number | null>(null)
const currentAccountNickname = ref<string>('') // 当前账号昵称
const currentAccountExpiry = ref<string | null>(null) // 当前账号到期时间
const additionalPoints = ref(0) // 额外配额点数
const baseQuotaPoints = ref(0) // 套餐基础点数
const quotaOptions = ref<
  Array<{
    id: number
    days: number
    points: number
    label: string
    description?: string
  }>
>([])

// 计算预计到期时间
const predictedExpiryTime = computed(() => {
  if (!selectedQuotaDays.value || baseQuotaPoints.value + additionalPoints.value === 0) {
    return null
  }

  // 获取当前账号
  const account = accounts.value.find((acc: GameAccount) => acc.id === currentQuotaAccountId.value)
  if (!account) return null

  // 计算总配额
  const totalPoints = baseQuotaPoints.value + additionalPoints.value

  // 获取当前套餐配置
  const selectedOption = quotaOptions.value.find((opt) => opt.days === selectedQuotaDays.value)
  if (!selectedOption) return null

  // 计算每点配额对应的天数
  const daysPerPoint = selectedOption.days / selectedOption.points

  // 计算总延期天数
  const totalDays = Math.floor(totalPoints * daysPerPoint)

  // 计算新的到期时间
  const currentExpiry = account.expire_time ? new Date(account.expire_time) : new Date()
  const now = new Date()

  // 如果当前到期时间早于现在,从现在开始计算
  const startDate = currentExpiry > now ? currentExpiry : now

  const newExpiry = new Date(startDate)
  newExpiry.setDate(newExpiry.getDate() + totalDays)

  return newExpiry.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

// 删除确认弹窗相关状态
const showDeleteModal = ref(false)
const deleteAccountId = ref<number | null>(null)
const deleteAccountName = ref<string>('')
const deleteCountdown = ref<number>(20)
const canConfirmDelete = ref(false)

// 更新密码弹窗相关状态
const showUpdatePasswordModal = ref(false)
const updatePasswordAccountId = ref<number | null>(null)
const updatePasswordAccountName = ref<string>('')
const updateServerName = ref<string>('')

// 群聊图片
const groupChatImage = ref<string>('')
const groupChatImageLoading = ref(false)

// 定时器引用
let autoRefreshInterval: number | null = null
let deleteCountdownInterval: number | null = null

// 工具函数：延迟执行
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 获取配额选项
const fetchQuotaOptions = async () => {
  try {
    const response = await axios.get('/api/quota-settings/active')

    if (response.data.success) {
      quotaOptions.value = response.data.data
    }
  } catch (error) {
    console.error('获取配额选项失败:', error)
  }
}

const isSuperValueQuotaOption = (option: { days: number; points: number }) =>
  Number(option.days) > Number(option.points)

// 获取群聊二维码图片
const fetchGroupChatImage = async () => {
  try {
    groupChatImageLoading.value = true
    const response = await axios.get('/api/auth/group-chat-image')

    if (response.data.success && response.data.data?.image) {
      groupChatImage.value = response.data.data.image
    } else {
      // 如果没有配置图片，使用默认图片
      groupChatImage.value = '/images/qrcode.jpg'
    }
  } catch (error) {
    console.error('获取群聊二维码图片失败:', error)
    // 如果接口失败，使用默认图片
    groupChatImage.value = '/images/qrcode.jpg'
  } finally {
    groupChatImageLoading.value = false
  }
}

// 通用的 player_record 数据获取函数（单个账号）- 已废弃，统一使用批量接口
// const fetchPlayerRecord = async (accountId: number) => {
//   // 此函数已废弃，请使用 fetchPlayerRecords([accountId]) 替代
// }

// 批量获取多个账号的 player_records 数据
const fetchPlayerRecords = async (accountIds: number[]) => {
  if (accountIds.length === 0) {
    return {
      success: true,
      records: [],
      errors: [],
      total: 0,
      successCount: 0,
      errorCount: 0,
    }
  }

  try {
    // 限制单次最多查询100个账号
    const limitedIds = accountIds.slice(0, 100)
    const response = await axios.get(
      '/api/game-accounts/player_records?ids=' + limitedIds.map((id) => id.toString())
    )

    if (response.data.code === 200 && response.data.data) {
      const { results, total, success, failed } = response.data.data

      console.log(`✅ 批量获取player_records成功: ${success}/${total} 个账号`)

      return {
        success: true,
        records: results || [],
        errors: [], // 新格式中没有单独的errors数组
        total: total || 0,
        successCount: success || 0,
        errorCount: failed || 0,
      }
    } else {
      console.error('❌ 批量获取player_records失败:', response.data)
      return {
        success: false,
        records: [],
        errors: [],
        total: limitedIds.length,
        successCount: 0,
        errorCount: limitedIds.length,
        reason: response.data.msg || '批量接口返回错误',
      }
    }
  } catch (error: any) {
    console.error('❌ 批量获取player_records异常:', error)
    return {
      success: false,
      records: [],
      errors: [],
      total: accountIds.length,
      successCount: 0,
      errorCount: accountIds.length,
      reason: `API调用异常: ${error.message || error}`,
    }
  }
}

// 通用的账号 record 数据更新函数
const updateAccountRecord = (accountId: number, recordData: PlayerRecord | null) => {
  accounts.value = accounts.value.map((account: GameAccount) => {
    if (account.id === accountId) {
      const updatedAccount = { ...account, record: recordData || undefined }

      if (recordData?.record?.player?.nickName) {
        updatedAccount.nickname = recordData?.record?.player?.nickName
      }

      return updatedAccount
    }
    return account
  })
}

// 获取并更新单个账号的 player_record 数据（使用批量接口）
const fetchAndUpdateSingleAccountRecord = async (accountId: number) => {
  const batchResult = await fetchPlayerRecords([accountId])

  if (batchResult.success && batchResult.records && batchResult.records.length > 0) {
    const record = batchResult.records[0]
    updateAccountRecord(accountId, record) // 新格式中record本身就是PlayerRecord数据
    return true
  }

  // 新格式中没有单独的errors数组，检查是否获取失败
  if (batchResult.errorCount > 0) {
    console.warn(`⚠️ 账号 ${accountId} 获取记录失败，失败数量: ${batchResult.errorCount}`)
  }

  return false
}

// 获取游戏账号数据（包含状态数据）
const fetchGameAccounts = async () => {
  isLoading.value = true
  try {
    // 1. 先获取账号列表
    const response = await axios.get('/api/game-accounts/list')

    if (response.data.success) {
      const newAccounts = response.data.data

      // 2. 如果有账号，立即并行获取所有账号的状态数据
      if (newAccounts.length > 0) {
        const accountIds = newAccounts.map((acc: GameAccount) => acc.id)
        const recordsResult = await fetchPlayerRecords(accountIds)

        // 3. 合并账号列表和状态数据
        if (recordsResult.success && recordsResult.records) {
          const recordsMap = new Map(
            recordsResult.records.map((record: any) => [parseInt(record.id), record])
          )

          accounts.value = newAccounts.map((account: GameAccount) => {
            const record = recordsMap.get(account.id) as PlayerRecord | undefined

            console.log(account, record)
            if (isAccountExpired(account) && record?.status === 'online') {
              console.warn(`⚠️ 账号 ${account.id} 已过期，expire_time: ${account.expire_time}`)
              handleToggleAccount(account.id, 'active')
            }
            // 如果有 record 且包含玩家昵称，更新账号昵称
            if (record?.record?.player?.nickName) {
              return { ...account, nickname: record.record.player.nickName, record }
            }
            return { ...account, record: record || undefined }
          })

          console.log(
            `✅ 获取账号列表及状态成功: ${newAccounts.length} 个账号, ${recordsResult.successCount} 个状态`
          )
        } else {
          // 如果获取状态失败，也要设置账号列表（只是没有状态数据）
          accounts.value = newAccounts
          console.warn('⚠️ 获取账号列表成功，但状态数据获取失败')
        }
      } else {
        // 没有账号
        accounts.value = newAccounts
      }
    } else {
      message.error('获取账号列表失败')
    }
  } catch (error: any) {
    console.error('❌ 获取游戏账号失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 自动刷新所有角色数据 - 使用批量接口（预留功能，用于定时刷新）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const refreshAllAccountsData = async () => {
  if (!autoRefreshEnabled.value || accounts.value.length === 0) {
    return
  }

  try {
    const accountIds = accounts.value.map((account: GameAccount) => account.id)
    const batchResult = await fetchPlayerRecords(accountIds)

    if (batchResult.success) {
      // 处理成功的记录
      if (batchResult.records && batchResult.records.length > 0) {
        batchResult.records.forEach((record: any) => {
          const accountId = parseInt(record.id)
          updateAccountRecord(accountId, record) // 新格式中record本身就是PlayerRecord数据
        })
      }

      // 新格式中不再有单独的errors数组，失败的记录也在results中，通过record为null或status判断
      // 所有记录统一在上面的records循环中处理

      if (batchResult.successCount > 0) {
        console.log(`✅ 批量刷新成功 ${batchResult.successCount}/${batchResult.total} 个账号数据`)
      }
    } else {
      console.error('❌ 批量刷新失败:', batchResult.reason)
    }
  } catch (error) {
    console.error('❌ 刷新账号数据失败:', error)
  }
}

// 处理添加账号
const handleAddAccount = () => {
  showAddModal.value = true
}

const handleAccountAdded = async () => {
  // 记录添加前的账号数量
  const previousAccountCount = accounts.value.length

  // 刷新账号列表
  await fetchGameAccounts()
  showAddModal.value = false

  // 如果是首次添加账号（从0到1），启动引导
  if (previousAccountCount === 0 && accounts.value.length === 1) {
    // 延迟启动引导，确保页面渲染完成
    setTimeout(() => {
      startFirstAccountTour()
    }, 500)
  }
}

// 处理菜单点击事件
const handleMenuClick = (e: any, account: GameAccount) => {
  const key = e.key
  const accountId: number = account.id
  console.log('🎯 菜单点击:', { key, accountId })
  if (key === 'extend') {
    handleExtendQuota(accountId)
  } else if (key === 'activateTrial') {
    handleActivateTrial(accountId)
  } else if (key === 'updatePassword') {
    handleUpdatePassword(accountId)
  } else if (key === 'alipayRescan') {
    handleAlipayRescan(account)
  } else if (key === 'delete') {
    if (getAccountStartedStatus(account)) {
      message.warning('请先停止账号后再删除！')
    } else {
      handleDeleteAccount(accountId)
    }
  }
}

// 判断账号是否可以开通试用
const canActivateTrial = (account: GameAccount): boolean => {
  // 检查创建时间是否在2025-12-07之后
  const createdAt = new Date(account.created_at)
  const cutoffDate = new Date('2025-12-07T00:00:00')

  // 检查是否有配额
  const hasExpireTime = account.expire_time !== null

  return createdAt >= cutoffDate && !hasExpireTime
}

// 处理开通试用
const handleActivateTrial = async (accountId: number) => {
  console.log('🎁 开通试用:', accountId)

  try {
    Modal.confirm({
      title: '确认开通试用',
      content: '将为该账号开通24小时试用期，每个账号仅可试用一次，确认开通吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.post(`/api/game-accounts/${accountId}/activate-trial`)

          if (response.data.success) {
            message.success('试用开通成功！有效期24小时')
            // 刷新账号列表
            fetchGameAccounts()
          } else {
            message.error(response.data.message || '开通试用失败')
          }
        } catch (error: any) {
          console.error('开通试用失败:', error)
          const errorMsg = error.response?.data?.message || '开通试用失败，请稍后重试'
          message.error(errorMsg)
        }
      },
    })
  } catch (error) {
    console.error('开通试用失败:', error)
    message.error('操作失败，请稍后重试')
  }
}

// 处理延长配额
const handleExtendQuota = (accountId: number) => {
  console.log('🎯 handleExtendQuota 被调用，accountId:', accountId)
  currentQuotaAccountId.value = accountId

  // 获取账号信息
  const account = accounts.value.find((acc: GameAccount) => acc.id === accountId)
  if (account) {
    currentAccountNickname.value = account.nickname || `账号_${accountId}`
    currentAccountExpiry.value = account.expire_time || null
    console.log('📝 账号信息:', {
      nickname: currentAccountNickname.value,
      expiry: currentAccountExpiry.value,
    })
  }

  // 在打开弹窗前先从缓存更新用户积分
  try {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      userPoints.value = user.points || 0
      console.log('📊 从缓存更新用户积分:', userPoints.value)
    }
  } catch (error) {
    console.error('获取缓存用户信息失败:', error)
  }

  // 重置额外配额
  additionalPoints.value = 0
  baseQuotaPoints.value = 0

  showQuotaModal.value = true
  // 默认选中第一个配额选项
  if (quotaOptions.value.length > 0) {
    selectedQuotaDays.value = quotaOptions.value[0].days
    baseQuotaPoints.value = quotaOptions.value[0].points
  } else {
    selectedQuotaDays.value = null
  }
}

// 确认延期配额
const confirmExtendQuota = async () => {
  if (!currentQuotaAccountId.value || !selectedQuotaDays.value) {
    message.error('请选择延期时长')
    return
  }

  // 找到选中的配额选项
  const selectedOption = quotaOptions.value.find(
    (option: any) => option.days === selectedQuotaDays.value
  )
  if (!selectedOption) {
    message.error('无效的配额选项')
    return
  }

  // 计算总配额
  const totalPoints = selectedOption.points + additionalPoints.value

  // 前端校验：检查积分是否足够
  if (userPoints.value < totalPoints) {
    message.error('积分不足，请先充值')
    return
  }

  // 前端校验：确保额外配额不为负数
  if (additionalPoints.value < 0) {
    message.error('额外配额不能为负数')
    return
  }

  addingQuota.value = true
  try {
    console.log('🚀 准备发送延期请求:', {
      accountId: currentQuotaAccountId.value,
      days: selectedQuotaDays.value,
      additionalPoints: additionalPoints.value,
      additionalPointsType: typeof additionalPoints.value,
      totalPoints,
      userPoints: userPoints.value,
    })

    const response = await axios.post(
      `/api/game-accounts/${currentQuotaAccountId.value}/extend-quota`,
      {
        days: selectedQuotaDays.value,
        additionalPoints: additionalPoints.value,
      },
      {}
    )

    console.log('📥 收到响应:', response.data)

    if (response.data.success) {
      const {
        extendedDays,
        totalPoints: usedPoints,
        basePoints,
        additionalPoints: extraPoints,
      } = response.data.data

      let successMsg = `成功延期${extendedDays}天`
      if (extraPoints > 0) {
        successMsg += ` (使用${usedPoints}点: 套餐${basePoints}点 + 额外${extraPoints}点)`
      }

      message.success(successMsg)

      // 使用后端返回的新余额更新用户积分
      const newBalance = response.data.data.newBalance
      userPoints.value = newBalance

      // 更新 localStorage 中的用户信息
      await updateUserBalance()

      // 更新用户状态
      const updatedUser = { ...currentUser.value, points: newBalance }
      currentUser.value = updatedUser

      if (props.onUserUpdate) {
        props.onUserUpdate(updatedUser)
      }

      // 刷新游戏账户列表（包含状态数据）
      await fetchGameAccounts()

      // 关闭弹窗
      showQuotaModal.value = false
      currentQuotaAccountId.value = null
      selectedQuotaDays.value = null
      additionalPoints.value = 0
      baseQuotaPoints.value = 0
    } else {
      message.error(response.data.message || '延期失败')
    }
  } catch (error: any) {
    console.error('延期配额失败:', error)
    message.error(error.response?.data?.message || '延期失败')
  } finally {
    addingQuota.value = false
  }
}

const handleViewLogs = (accountId: number) => {
  selectedAccountId.value = accountId
  logModalOpen.value = true
}

const router = useRouter()

// 客服模态框相关状态
const showCustomerServiceModal = ref(false)

// 监听客服模态框打开状态，打开时获取最新图片
watch(showCustomerServiceModal, (newVal) => {
  if (newVal) {
    fetchGroupChatImage()
  }
})

// 浮动按钮组展开状态
const floatButtonOpen = ref(false)

// 支付宝重新认证相关状态
const alipayReauthPolling = ref<number | null>(null)
// 支付宝七天续期扫码是否已停止
const alipayRescanStopped = ref(false)

// 抖音重认证相关状态
const douyinReauthVisible = ref(false)
const douyinReauthAccountId = ref<number>(0)
const douyinReauthSid = ref('')
const douyinReauthQrB64 = ref('')
const douyinReauthScanStatus = ref('')
let douyinReauthPollTimer: ReturnType<typeof setInterval> | null = null
let douyinReauthPollInFlight = false
const douyinReauthHandled = ref(false)

// Tour 漫游引导相关状态
const tourOpen = ref(false)
const tourCurrentStep = ref(0)
const isFirstAccountTour = ref(false)
const isFloatMenuExpanded = computed(
  () => floatButtonOpen.value || (tourOpen.value && !isFirstAccountTour.value)
)
const expiredTooltipAccountId = ref<number | null>(null)
const expiredTooltipOpen = ref(false)
const expiredTooltipText = '如需试用、使用辅助，请点击三个点，开通试用/增加配额'
const expiredTooltipOuterStyle = {
  width: 'min(360px, calc(100vw - 50px))',
}
const expiredTooltipInnerStyle = {
  whiteSpace: 'normal',
}
const EXPIRED_TOOLTIP_SHOW_MS = 5000
const EXPIRED_TOOLTIP_HIDE_MS = 5000
let expiredTooltipTimer: number | null = null
let expiredTooltipPhase: 'show' | 'hide' = 'hide'
const groupChatTooltipOpen = ref(false)
const GROUP_CHAT_TOOLTIP_SHOW_MS = 5000
const GROUP_CHAT_TOOLTIP_HIDE_MS = 5000
const GROUP_CHAT_TOOLTIP_INITIAL_DELAY_MS = 400
let groupChatTooltipTimer: number | null = null
let groupChatTooltipPhase: 'show' | 'hide' = 'hide'

const getTooltipContainer = (triggerNode: HTMLElement) => {
  const docBody = triggerNode?.ownerDocument?.body
  if (docBody) {
    return docBody
  }
  if (typeof document !== 'undefined' && document.body) {
    return document.body
  }
  return triggerNode
}

const tourSteps = ref<TourProps['steps']>([
  {
    title: '用户中心',
    description: '点击头像可以查看个人信息、进入个人中心或退出登录',
    target: () => document.querySelector('.tour-1') as HTMLElement,
  },
  {
    title: '充值点数',
    description: '点击这里可以充值点数，用于延期游戏账号配额',
    target: () => document.querySelector('.tour-2') as HTMLElement,
  },
  {
    title: '添加账号',
    description: '点击这里可以添加新的游戏账号进行托管',
    target: () => document.querySelector('.tour-3') as HTMLElement,
  },
  {
    title: '客服支持',
    description: '遇到问题时可以点击这里加入群聊获取帮助',
    target: () => document.querySelector('.tour-4') as HTMLElement,
  },
])

// 首次添加账号的引导步骤
const firstAccountTourSteps = ref<TourProps['steps']>([
  {
    title: '展开功能菜单',
    description: '首先，点击这个悬浮按钮展开功能菜单',
    target: () =>
      document.querySelector('.ant-float-btn-group  > .ant-float-btn .anticon-plus') as HTMLElement,
    placement: 'top',
  },
  {
    title: '充值点数',
    description: '点击这里可以充值点数，用于购买游戏账号的使用配额',
    target: () => document.querySelector('.tour-recharge-btn') as HTMLElement,
    placement: 'bottom',
  },
  {
    title: '账号菜单',
    description: '点击账号卡片右上角的菜单按钮，可以管理账号配额',
    target: () => document.querySelector('.account-menu .menu-button') as HTMLElement,
    placement: 'bottom',
  },
  {
    title: '增加配额',
    description: '在下拉菜单中点击"增加配额"，即可为账号购买使用时长',
    target: () => {
      // 等待下拉菜单渲染后再查找元素
      return document.querySelector(
        '.ant-dropdown-menu .ant-dropdown-menu-item:first-child'
      ) as HTMLElement
    },
    placement: 'bottom',
  },
])

const getExpiredAccountForTooltip = (list: GameAccount[]): GameAccount | null => {
  return list.find((account) => isAccountExpired(account)) || null
}

const clearExpiredTooltipTimer = () => {
  if (expiredTooltipTimer) {
    clearTimeout(expiredTooltipTimer)
    expiredTooltipTimer = null
  }
}

const clearGroupChatTooltipTimer = () => {
  if (groupChatTooltipTimer) {
    clearTimeout(groupChatTooltipTimer)
    groupChatTooltipTimer = null
  }
}

const stopExpiredTooltipLoop = () => {
  clearExpiredTooltipTimer()
  expiredTooltipOpen.value = false
  expiredTooltipAccountId.value = null
  expiredTooltipPhase = 'hide'
}

const stopGroupChatTooltipLoop = () => {
  clearGroupChatTooltipTimer()
  groupChatTooltipOpen.value = false
  groupChatTooltipPhase = 'hide'
}

const scheduleExpiredTooltipLoop = (delayMs: number) => {
  clearExpiredTooltipTimer()
  expiredTooltipTimer = window.setTimeout(() => {
    runExpiredTooltipLoop()
  }, delayMs)
}

const scheduleGroupChatTooltipLoop = (delayMs: number) => {
  clearGroupChatTooltipTimer()
  groupChatTooltipTimer = window.setTimeout(() => {
    runGroupChatTooltipLoop()
  }, delayMs)
}

const runExpiredTooltipLoop = async () => {
  if (expiredTooltipPhase === 'show') {
    expiredTooltipOpen.value = false
    expiredTooltipPhase = 'hide'
    scheduleExpiredTooltipLoop(EXPIRED_TOOLTIP_HIDE_MS)
    return
  }

  if (tourOpen.value || isFirstAccountTour.value) {
    expiredTooltipOpen.value = false
    expiredTooltipAccountId.value = null
    expiredTooltipPhase = 'hide'
    scheduleExpiredTooltipLoop(EXPIRED_TOOLTIP_HIDE_MS)
    return
  }

  const targetAccount = getExpiredAccountForTooltip(accounts.value)
  if (!targetAccount) {
    stopExpiredTooltipLoop()
    return
  }

  expiredTooltipAccountId.value = targetAccount.id
  await nextTick()

  const targetButton = document.querySelector(
    `.menu-button[data-account-id="${targetAccount.id}"]`
  ) as HTMLElement | null
  if (!targetButton) {
    expiredTooltipAccountId.value = null
    expiredTooltipPhase = 'hide'
    scheduleExpiredTooltipLoop(EXPIRED_TOOLTIP_HIDE_MS)
    return
  }

  expiredTooltipOpen.value = true
  expiredTooltipPhase = 'show'
  scheduleExpiredTooltipLoop(EXPIRED_TOOLTIP_SHOW_MS)
}

const runGroupChatTooltipLoop = () => {
  if (groupChatTooltipPhase === 'show') {
    groupChatTooltipOpen.value = false
    groupChatTooltipPhase = 'hide'
    scheduleGroupChatTooltipLoop(GROUP_CHAT_TOOLTIP_HIDE_MS)
    return
  }

  if (!isFloatMenuExpanded.value) {
    stopGroupChatTooltipLoop()
    return
  }

  groupChatTooltipOpen.value = true
  groupChatTooltipPhase = 'show'
  scheduleGroupChatTooltipLoop(GROUP_CHAT_TOOLTIP_SHOW_MS)
}

// 处理 Tour 步骤变化
const handleTourChange = (current: number) => {
  console.log('🎯 Tour 步骤变化:', current)

  // 如果是首次账号引导
  if (isFirstAccountTour.value) {
    // 步骤0 -> 步骤1：等待400ms后显示步骤1
    if (current === 1) {
      // 先停留在步骤0
      tourCurrentStep.value = 0

      // 展开悬浮菜单
      floatButtonOpen.value = true

      // 等待400ms后进入步骤2
      setTimeout(() => {
        tourCurrentStep.value = 1
      }, 400)
    }
    // 步骤1 -> 步骤2：等待400ms后显示步骤2
    else if (current === 2) {
      // 先停留在步骤1
      tourCurrentStep.value = 1

      // 等待400ms后进入步骤3
      setTimeout(() => {
        tourCurrentStep.value = 2
      }, 400)
    }
    // 步骤2 -> 步骤3：等待400ms后显示步骤3，然后展开下拉菜单
    else if (current === 3) {
      // 先停留在步骤2
      tourCurrentStep.value = 2

      // 展开下拉菜单
      const menuButton = document.querySelector('.account-menu .menu-button') as HTMLElement
      if (menuButton) {
        menuButton.click()

        // 等待400ms下拉菜单渲染完成后，再进入步骤4
        setTimeout(() => {
          tourCurrentStep.value = 3
        }, 400)
      } else {
        // 如果找不到菜单按钮，等待400ms后直接进入步骤4
        setTimeout(() => {
          tourCurrentStep.value = 3
        }, 400)
      }
    }
    // 其他步骤正常更新
    else {
      tourCurrentStep.value = current
    }
  } else {
    tourCurrentStep.value = current
  }
}

// 处理浮动按钮组的展开状态变化
const handleFloatButtonOpenChange = (open: boolean) => {
  // 如果 Tour 正在进行，不允许收起浮动菜单
  if (tourOpen.value && !open) {
    return
  }
  // 正常情况下更新浮动菜单状态
  floatButtonOpen.value = open
}

// Tour 关闭时的处理函数
const handleTourClose = () => {
  console.log('🚪 Tour 引导关闭')
  tourOpen.value = false
  isFirstAccountTour.value = false
  tourCurrentStep.value = 0

  // 关闭可能打开的下拉菜单
  const openDropdown = document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden)')
  if (openDropdown) {
    // 点击页面其他地方关闭下拉菜单
    document.body.click()
  }
}

const handleConfigAccount = (accountId: number) => {
  console.log('🔧 点击修改配置按钮:', accountId)
  router.push({
    name: 'GameConfig',
    params: { accountId: accountId.toString() },
    query: {
      firstAccountId: accounts.value[0]?.id?.toString(),
    },
  })
}

const handleToggleAccount = async (accountId: number, currentStatus: string) => {
  // 防止重复操作
  if (operatingAccounts.value.has(accountId)) {
    message.warning('操作进行中，请稍等...')
    return
  }

  const action = currentStatus === 'active' ? 'stop' : 'start'

  // 如果是启动操作，先检查是否已过期
  if (action === 'start') {
    try {
      const expiredResponse = await axios.get(`/api/game-accounts/${accountId}/expired`)

      if (expiredResponse.data.success && expiredResponse.data.data.isExpired) {
        message.error('账号已过期，请先增加配额')
        return
      }
    } catch {
      return
    }
  }

  // 添加到操作中的账号列表
  operatingAccounts.value = new Set([...operatingAccounts.value, accountId])

  try {
    const response = await axios.post(`/api/game-accounts/${accountId}/${action}`, {})

    if (action === 'stop') {
      await wait(1000)
    }

    if (response.data.success) {
      message.success(`游戏账号${action === 'start' ? '启动' : '停止'}成功`)

      // 立即更新账号状态（预估值）
      accounts.value = accounts.value.map((account: GameAccount) => {
        if (account.id === accountId) {
          const updatedRecord = account.record
            ? {
                ...account.record,
                isStarted: action === 'start',
              }
            : undefined
          return { ...account, record: updatedRecord }
        }
        return account
      })

      // 延迟1秒后获取当前账号的最新 player_record 数据
      await fetchAndUpdateSingleAccountRecord(accountId)

      // 如果是停止操作，移除操作状态，让启动按钮可以点击
      if (action === 'stop') {
        const newSet = new Set(operatingAccounts.value)
        newSet.delete(accountId)
        operatingAccounts.value = newSet
        return // 提前返回，避免在finally中重复移除状态
      }
    } else {
      // 检查是否需要重新认证
      if (response.data.code === 'DOUYIN_REAUTH_REQUIRED') {
        await handleDouyinReauth(accountId)
      } else if (response.data.code === 'ALIPAY_REAUTH_REQUIRED') {
        await handleAlipayReauth(accountId)
      } else if (response.data.code === 'HUAWEI_REAUTH_REQUIRED') {
        await handleHuaweiReauth(accountId)
      } else {
        let errorMsg = response.data.message || '操作失败'
        if (response.data.data && response.data.data.msg) {
          errorMsg += `: ${response.data.data.msg}`
        }
        message.error(errorMsg)
      }
    }
  } catch (error: any) {
    console.error('操作游戏账号失败:', error)

    // 检查错误响应中是否包含重新认证要求
    if (error.response?.data?.code === 'DOUYIN_REAUTH_REQUIRED') {
      await handleDouyinReauth(accountId)
    } else if (error.response?.data?.code === 'ALIPAY_REAUTH_REQUIRED') {
      await handleAlipayReauth(accountId)
    } else if (error.response?.data?.code === 'HUAWEI_REAUTH_REQUIRED') {
      await handleHuaweiReauth(accountId)
    } else {
      let errorMsg = error.response?.data?.message || '操作失败'
      if (error.response?.data?.data && error.response.data.data.msg) {
        errorMsg += `: ${error.response.data.data.msg}`
      }
      message.error(errorMsg)
    }
  } finally {
    // 移除操作状态（对于启动操作或失败情况）
    const newSet = new Set(operatingAccounts.value)
    newSet.delete(accountId)
    operatingAccounts.value = newSet
  }
}

// 配额管理相关函数已整合到handleExtendQuota和confirmExtendQuota中

const handleDeleteAccount = (accountId: number) => {
  console.log('🗑️ handleDeleteAccount 被调用，accountId:', accountId)
  const account = accounts.value.find((acc: GameAccount) => acc.id === accountId)
  if (!account) return

  deleteAccountId.value = accountId
  deleteAccountName.value = account.nickname || account.username
  showDeleteModal.value = true
  deleteCountdown.value = 20
  canConfirmDelete.value = false

  // 开始20秒倒计时
  deleteCountdownInterval = setInterval(() => {
    deleteCountdown.value--
    if (deleteCountdown.value <= 0) {
      if (deleteCountdownInterval) {
        clearInterval(deleteCountdownInterval)
      }
      canConfirmDelete.value = true
    }
  }, 1000)
}

const confirmDeleteAccount = async () => {
  if (!deleteAccountId.value || !canConfirmDelete.value) return

  try {
    const response = await axios.delete(`/api/game-accounts/${deleteAccountId.value}`)

    if (response.data.success) {
      message.success('游戏账号已删除')
      fetchGameAccounts() // 刷新列表
      showDeleteModal.value = false
      deleteAccountId.value = null
      deleteAccountName.value = ''
    } else {
      message.error(response.data.message || '删除失败')
    }
  } catch (error: any) {
    message.error(error.response?.data?.message || '删除失败')
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  deleteAccountId.value = null
  deleteAccountName.value = ''
  deleteCountdown.value = 20
  canConfirmDelete.value = false
  if (deleteCountdownInterval) {
    clearInterval(deleteCountdownInterval)
    deleteCountdownInterval = null
  }
}

// 支付宝三十天扫码保持（防掉线）
const handleAlipayRescan = async (account: GameAccount) => {
  const accountId = account.id

  // 检查是否启动，如果启动则弹窗确认停止
  if (getAccountStartedStatus(account)) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '提示',
        content: '扫码需停止辅助，是否停止？',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) return

    // 停止辅助
    await handleToggleAccount(accountId, 'active')
  }

  try {
    // ① 获取二维码（accountId 传给后端用于会话绑定）
    const resp = await axios.post('/api/game-accounts/alipay_get_qrcode', { accountId })
    if (!resp.data.success) {
      message.error(resp.data.message || '获取支付宝二维码失败')
      return
    }
    const { qrcodeUrl } = resp.data.data

    // ② 弹出二维码 Modal
    const modalInstance = Modal.info({
      title: '🔄 支付宝三十天续期（防掉线）',
      content: h(AlipayReauthModal, { qrcodeUrl, mode: 'rescan' }),
      width: 400,
      okText: '取消',
      okButtonProps: { danger: true },
      onOk() {
        alipayRescanStopped.value = true
        message.info('已取消扫码续期')
      },
    })

    // ③ 无状态短轮询，直接读 Redis（后台 Poller 在服务端跑）
    alipayRescanStopped.value = false
    const maxAttempts = 200
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (alipayRescanStopped.value) return

      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (alipayRescanStopped.value) return

      try {
        const pollResp = await axios.get('/api/game-accounts/alipay/rescan_poll')
        const { code, message: msg } = pollResp.data

        if (code === 'COMPLETED') {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          await fetchAndUpdateSingleAccountRecord(accountId)
          message.success('支付宝续期成功！三十天防掉线已更新')
          return
        }

        if (code === 'CANCELLED') {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          return
        }

        if (code === 'EXPIRED') {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          message.error(msg || '续期失败，请重试')
          return
        }
        // PENDING：继续等待
      } catch (err: any) {
        if (err.response?.status === 404) {
          // 会话不存在，稍等
        } else if (err.response?.status === 400) {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          message.error(err.response?.data?.message || '续期失败，请重试')
          return
        } else if (err.response?.status === 408) {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          message.error(err.response?.data?.message || '续期超时，请重试')
          return
        } else {
          console.error('[alipayRescan poll]', err.message)
        }
      }
    }

    // 超时
    alipayRescanStopped.value = true
    modalInstance.destroy()
    message.error('扫码超时，请重新操作')
  } catch (error: any) {
    console.error('支付宝扫码续期失败:', error)
    message.error(error.response?.data?.message || '支付宝扫码续期失败')
  }
}

// 支付宝重新认证（异地重扫）- 改为走七天续期流程（alipay_get_qrcode + rescan_poll）
const handleAlipayReauth = async (accountId: number) => {
  // 直接复用七天续期流程：获取二维码 → 轮询 rescan_poll → 成功后启动账号
  const account = accounts.value.find((a: GameAccount) => a.id === accountId)
  if (!account) {
    message.error('账号不存在')
    return
  }
  try {
    const resp = await axios.post('/api/game-accounts/alipay_get_qrcode', { accountId })
    if (!resp.data.success) {
      message.error(resp.data.message || '获取支付宝二维码失败')
      return
    }
    const { qrcodeUrl } = resp.data.data

    const modalInstance = Modal.info({
      title: '🔐 支付宝重新认证（异地重扫）',
      content: h(AlipayReauthModal, { qrcodeUrl }),
      width: 400,
      okText: '取消',
      okButtonProps: { danger: true },
      onOk() {
        alipayRescanStopped.value = true
        message.info('已取消重新认证')
      },
    })

    alipayRescanStopped.value = false
    const maxAttempts = 200
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (alipayRescanStopped.value) return

      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (alipayRescanStopped.value) return

      try {
        const pollResp = await axios.get('/api/game-accounts/alipay/rescan_poll')
        const { code, message: msg } = pollResp.data

        if (code === 'COMPLETED') {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          await fetchAndUpdateSingleAccountRecord(accountId)
          message.success('🎉 支付宝重新认证成功！正在启动账号...')
          setTimeout(async () => {
            await handleToggleAccount(accountId, 'inactive')
          }, 500)
          return
        }

        if (code === 'CANCELLED') {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          return
        }

        if (code === 'EXPIRED') {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          message.error(msg || '认证失败，请重试')
          return
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          // 会话不存在
        } else if (err.response?.status === 400) {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          message.error(err.response?.data?.message || '认证失败，请重试')
          return
        } else if (err.response?.status === 408) {
          alipayRescanStopped.value = true
          modalInstance.destroy()
          message.error(err.response?.data?.message || '认证超时，请重试')
          return
        } else {
          console.error('[alipayReauth poll]', err.message)
        }
      }
    }

    alipayRescanStopped.value = true
    modalInstance.destroy()
    message.error('扫码超时，请重新操作')
  } catch (error: any) {
    console.error('支付宝重新认证失败:', error)
    message.error(error.response?.data?.message || '支付宝重新认证失败')
  }
}

// 华为重新认证相关函数
const handleHuaweiReauth = async (accountId: number) => {
  try {
    // 调用后端生成华为二维码
    const response = await axios.post('/api/game-accounts/huawei/qrcode2', {
      accountId: accountId,
    })

    if (response.data.success) {
      const { qrcodeUrl } = response.data.data

      // 显示华为二维码模态框
      showHuaweiReauthModal(accountId, qrcodeUrl)
    } else {
      message.error(response.data.message || '生成华为二维码失败')
    }
  } catch (error: any) {
    console.error('华为重新认证失败:', error)
    const errorMsg =
      error.response?.data?.error || error.response?.data?.message || '华为重新认证失败'

    message.error(errorMsg)
  }
}

const showHuaweiReauthModal = (accountId: number, qrcodeUrl: string) => {
  // 使用专门的Vue组件来显示二维码
  Modal.info({
    title: '🔐 华为重新认证',
    content: h(HuaweiReauthModal, {
      qrcodeUrl: qrcodeUrl,
    }),
    width: 400,
    okText: '取消认证',
    okButtonProps: {
      danger: true,
    },
    async onOk() {
      try {
        // 调用后端取消接口
        await axios.post('/api/game-accounts/huawei/cancel2')
        message.info('已取消华为重新认证')
      } catch (error) {
        console.error('取消华为认证失败:', error)
        message.info('已取消华为重新认证')
      }
    },
  })

  // 开始轮询认证状态
  startHuaweiReauthPolling(accountId)
}

const startHuaweiReauthPolling = async (accountId: number) => {
  const maxAttempts = 160
  let attempt = 0

  while (attempt < maxAttempts) {
    attempt++
    try {
      const response = await axios.get('/api/game-accounts/huawei/poll2', { timeout: 10000 })

      if (response.data.code === 'COMPLETED') {
        Modal.destroyAll()
        message.success('🎉 华为重新认证成功！正在启动账号...')
        setTimeout(async () => {
          await handleToggleAccount(accountId, 'inactive')
        }, 500)
        return
      }

      if (response.data.code === 'EXPIRED' || response.data.code === 'CANCELLED') {
        message.error(response.data.message || '华为认证已过期，请重试')
        Modal.destroyAll()
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error: any) {
      if (error.response?.status === 404) {
        message.error('会话不存在，请重新认证')
        Modal.destroyAll()
        return
      }
      if (error.response?.status === 408) {
        message.error(error.response?.data?.message || '华为认证超时，请重试')
        Modal.destroyAll()
        return
      }
      console.error('华为认证轮询请求失败:', error.message)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  message.error('华为认证超时，请重试')
  Modal.destroyAll()
}

// ── 抖音重认证 ────────────────────────────────────────────────────
const isAccountAlreadyRunningError = (payload: any): boolean => {
  const text = [payload?.message, payload?.data?.msg, payload?.data?.message]
    .filter(Boolean)
    .join(' ')
  return /已在运行|already running/i.test(text)
}

const completeDouyinReauthAfterScan = async (accountId: number) => {
  await fetchAndUpdateSingleAccountRecord(accountId)
  const account = accounts.value.find((a: GameAccount) => a.id === accountId)
  if (account && getAccountStartedStatus(account)) {
    message.success('🎉 抖音重认证成功！')
    return
  }

  if (operatingAccounts.value.has(accountId)) {
    message.success('🎉 抖音重认证成功！')
    return
  }

  message.success('🎉 抖音重认证成功！正在启动账号...')
  operatingAccounts.value = new Set([...operatingAccounts.value, accountId])

  try {
    const response = await axios.post(`/api/game-accounts/${accountId}/start`, {})

    if (response.data.success) {
      message.success('游戏账号启动成功')
      accounts.value = accounts.value.map((item: GameAccount) => {
        if (item.id === accountId) {
          const updatedRecord = item.record
            ? { ...item.record, isStarted: true }
            : undefined
          return { ...item, record: updatedRecord }
        }
        return item
      })
      await fetchAndUpdateSingleAccountRecord(accountId)
      return
    }

    if (isAccountAlreadyRunningError(response.data)) {
      await fetchAndUpdateSingleAccountRecord(accountId)
      return
    }

    if (response.data.code === 'DOUYIN_REAUTH_REQUIRED') {
      await handleDouyinReauth(accountId)
      return
    }

    let errorMsg = response.data.message || '操作失败'
    if (response.data.data?.msg) {
      errorMsg += `: ${response.data.data.msg}`
    }
    message.error(errorMsg)
  } catch (error: any) {
    if (isAccountAlreadyRunningError(error.response?.data)) {
      await fetchAndUpdateSingleAccountRecord(accountId)
      return
    }

    if (error.response?.data?.code === 'DOUYIN_REAUTH_REQUIRED') {
      await handleDouyinReauth(accountId)
      return
    }

    let errorMsg = error.response?.data?.message || '操作失败'
    if (error.response?.data?.data?.msg) {
      errorMsg += `: ${error.response.data.data.msg}`
    }
    message.error(errorMsg)
  } finally {
    const newSet = new Set(operatingAccounts.value)
    newSet.delete(accountId)
    operatingAccounts.value = newSet
  }
}

const handleDouyinReauth = async (accountId: number) => {
  try {
    douyinReauthHandled.value = false
    const resp = await axios.post('/api/douyin/scan/reauth/start', { accountId })
    if (!resp.data.ok) {
      message.error(resp.data.err || '生成抖音二维码失败')
      return
    }
    douyinReauthAccountId.value = accountId
    douyinReauthSid.value       = resp.data.sid || ''
    douyinReauthQrB64.value     = resp.data.qr_png_b64 || ''
    douyinReauthScanStatus.value = 'waiting'
    douyinReauthVisible.value   = true
    startDouyinReauthPolling(accountId, resp.data.sid)
  } catch (err: any) {
    message.error(err.response?.data?.err || '抖音重认证失败')
  }
}

const stopDouyinReauthPolling = () => {
  if (douyinReauthPollTimer) {
    clearInterval(douyinReauthPollTimer)
    douyinReauthPollTimer = null
  }
}

const handleDouyinReauthCancel = () => {
  douyinReauthVisible.value    = false
  douyinReauthScanStatus.value = ''
  douyinReauthQrB64.value      = ''
  douyinReauthHandled.value    = false
  stopDouyinReauthPolling()
  message.info('已取消抖音重认证')
}

const handleDouyinReauthSubmitSms = async (sid: string, code: string): Promise<{ ok: boolean; msg?: string }> => {
  try {
    const res = await axios.post('/api/douyin/scan/verify', { sid, code })
    if (res.data.ok) {
      message.success('验证码已提交，等待确认...')
      return { ok: true }
    }
    message.error(res.data.msg || '验证码提交失败')
    return { ok: false, msg: res.data.msg }
  } catch (err: any) {
    const msg = err.response?.data?.err || '提交验证码失败'
    message.error(msg)
    return { ok: false, msg }
  }
}

const startDouyinReauthPolling = (accountId: number, sid: string) => {
  stopDouyinReauthPolling()
  douyinReauthPollInFlight = false
  douyinReauthPollTimer = setInterval(async () => {
    if (!douyinReauthVisible.value || douyinReauthHandled.value) {
      stopDouyinReauthPolling()
      return
    }
    if (douyinReauthPollInFlight) return

    douyinReauthPollInFlight = true
    try {
      const resp = await axios.get('/api/douyin/scan/reauth/poll', {
        params: { sid, accountId },
        timeout: 10000,
      })
      const d = resp.data

      if (douyinReauthHandled.value) return

      // 补充二维码（start 时可能为空）
      if (d.qr_png_b64 && !douyinReauthQrB64.value) {
        douyinReauthQrB64.value = d.qr_png_b64
      }

      // 更新扫码状态（控制短信输入框显示）
      if (d.scan_status) {
        douyinReauthScanStatus.value = d.scan_status
      }

      // 成功完成
      if (d.ok && d.scan_status === 'reauth_done') {
        douyinReauthHandled.value = true
        stopDouyinReauthPolling()
        douyinReauthVisible.value = false
        await completeDouyinReauthAfterScan(accountId)
        return
      }

      // 过期或出错
      if (d.scan_status === 'expired' || d.scan_status === 'error') {
        stopDouyinReauthPolling()
        douyinReauthVisible.value = false
        message.error(d.err || '扫码失败，请重试', 5)
      }
    } catch (pollErr: any) {
      console.error('[douyinReauth] 轮询失败:', pollErr.message)
    } finally {
      douyinReauthPollInFlight = false
    }
  }, 2000)
}

// 更新密码相关函数
const handleUpdatePassword = (accountId: number) => {
  console.log('🔐 handleUpdatePassword 被调用，accountId:', accountId)
  const account = accounts.value.find((acc: GameAccount) => acc.id === accountId)
  if (!account) return

  updatePasswordAccountId.value = accountId
  updatePasswordAccountName.value = account.nickname
  updateServerName.value = account.server_name
  showUpdatePasswordModal.value = true
}

const closeUpdatePasswordModal = () => {
  showUpdatePasswordModal.value = false
  updatePasswordAccountId.value = null
  updatePasswordAccountName.value = ''
  updateServerName.value = ''
}

const handleUpdatePasswordSuccess = () => {
  console.log('✅ 密码更新成功')
  // 可以在这里添加其他成功后的逻辑，比如刷新账号列表等
}

const handleOpenRecharge = () => {
  showQuotaModal.value = false
  rechargeModalOpen.value = true
}

const getStatusColor = (status: string, isOnline: boolean) => {
  if (status === 'error') return '#ff6b6b'
  // 主要基于 isOnline 状态判断颜色
  return isOnline ? '#4ade80' : '#94a3b8'
}

const onShowTour = () => {
  // 启动 Tour，浮动菜单会通过 :open="floatButtonOpen || tourOpen" 自动展开
  setTimeout(() => {
    const tourElements = ['.tour-1', '.tour-2', '.tour-3', '.tour-4']
    const missingElements = tourElements.filter((selector) => !document.querySelector(selector))

    if (missingElements.length > 0) {
      console.warn('部分引导元素未找到:', missingElements)
      // 过滤掉缺失的步骤
      const availableSteps =
        tourSteps.value?.filter((step) => {
          if (typeof step.target === 'function') {
            const element = step.target()
            return element && element.offsetParent !== null // 检查元素是否存在且可见
          }
          return false
        }) || []

      if (availableSteps.length === 0) {
        message.warning('暂无可用的引导步骤')
        return
      }
    }

    // 启动 Tour，浮动菜单将自动保持展开状态
    tourOpen.value = true
  }, 100)
}

// 显示帮助文档链接
const onShowLink = () => {
  floatButtonOpen.value = false

  Modal.info({
    title: '📖 辅助教程',
    content: h('div', { style: 'padding: 16px 0;' }, [
      h(
        'p',
        { style: 'margin-bottom: 12px; font-size: 14px; color: #666;' },
        '点击下方链接查看详细的辅助教程：'
      ),
      h(
        'a',
        {
          href: 'https://www.kdocs.cn/l/ctNasBUS3vcG',
          target: '_blank',
          rel: 'noopener noreferrer',
          style:
            'font-size: 15px; color: #1890ff; text-decoration: underline; word-break: break-all;',
        },
        'https://www.kdocs.cn/l/ctNasBUS3vcG'
      ),
    ]),
    okText: '关闭',
    width: 500,
    centered: true,
  })
}

// 启动首次添加账号的引导
const startFirstAccountTour = () => {
  console.log('🎯 启动首次添加账号引导')

  // 标记为首次账号引导
  isFirstAccountTour.value = true

  // 使用首次添加账号的引导步骤
  const originalSteps = tourSteps.value
  tourSteps.value = firstAccountTourSteps.value

  // 重置步骤索引
  tourCurrentStep.value = 0

  // 先收起悬浮按钮组
  floatButtonOpen.value = false

  // 延迟启动引导，确保悬浮菜单收起动画完成
  setTimeout(() => {
    // 启动引导时，悬浮菜单保持收起状态，这样才能看到展开按钮
    tourOpen.value = true
  }, 300)

  // 监听引导关闭，恢复原始步骤
  const unwatchTour = watch(tourOpen, (isOpen) => {
    if (!isOpen) {
      tourSteps.value = originalSteps
      isFirstAccountTour.value = false
      unwatchTour()
    }
  })
}

// 生命周期函数
onMounted(async () => {
  // 检测上一页是否为登录页，如果是则打开悬浮按钮组
  const previousRoute = sessionStorage.getItem('previousRoute')

  if (previousRoute === 'Login') {
    floatButtonOpen.value = true
    // 清除标记，避免下次进入时重复触发
    sessionStorage.removeItem('previousRoute')
  }

  await fetchGameAccounts()
  await fetchQuotaOptions()

  // 如果是从登录页进入且没有任何账号，自动显示 Tour 引导
  if (previousRoute === 'Login' && accounts.value.length === 0) {
    setTimeout(() => {
      onShowTour()
    }, 50) // 延迟500ms确保页面渲染完成
  }
})

onUnmounted(() => {
  // 清除所有定时器
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
  }
  if (deleteCountdownInterval) {
    clearInterval(deleteCountdownInterval)
  }
  if (alipayReauthPolling.value) {
    clearInterval(alipayReauthPolling.value)
  }
  if (expiringBannerTimer) {
    clearTimeout(expiringBannerTimer)
    expiringBannerTimer = null
  }
  stopExpiredTooltipLoop()
  stopGroupChatTooltipLoop()
  emit('expiry-banner-change', false)
})

watch(
  isFloatMenuExpanded,
  (isOpen) => {
    if (!isOpen) {
      stopGroupChatTooltipLoop()
      return
    }

    if (!groupChatTooltipTimer) {
      scheduleGroupChatTooltipLoop(GROUP_CHAT_TOOLTIP_INITIAL_DELAY_MS)
    }
  },
  { immediate: true }
)

// 自动刷新定时器
watch(
  [autoRefreshEnabled, () => accounts.value.length],
  ([enabled, accountsCount]) => {
    // 清除现有定时器
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
      autoRefreshInterval = null
    }

    if (!enabled || accountsCount === 0) {
      return
    }

    // 立即执行一次刷新
    // refreshAllAccountsData()

    // 设置10秒定时器
    // autoRefreshInterval = setInterval(() => {
    //   refreshAllAccountsData()
    // }, 10000) // 10秒
  },
  { immediate: true }
)

watch(
  accounts,
  (list) => {
    if (expiredTooltipAccountId.value) {
      const currentAccount = list.find((account) => account.id === expiredTooltipAccountId.value)
      if (!currentAccount || !isAccountExpired(currentAccount)) {
        expiredTooltipAccountId.value = null
        expiredTooltipOpen.value = false
        expiredTooltipPhase = 'hide'
      }
    }

    const targetAccount = getExpiredAccountForTooltip(list)
    if (!targetAccount) {
      stopExpiredTooltipLoop()
      return
    }

    if (!expiredTooltipTimer) {
      scheduleExpiredTooltipLoop(0)
    }
  },
  { immediate: true, deep: true }
)

watch(
  accounts,
  (list) => {
    const key = getExpiringBannerKey(list)
    if (!key) {
      expiringBannerVisible.value = false
      expiringBannerKey = null
      if (expiringBannerTimer) {
        clearTimeout(expiringBannerTimer)
        expiringBannerTimer = null
      }
      return
    }

    if (key !== expiringBannerKey) {
      expiringBannerKey = key
      showExpiringBanner()
    }
  },
  { immediate: true, deep: true }
)

// 组件卸载时清理定时器
onBeforeUnmount(() => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
})

// 调试信息
console.log('🔍 渲染状态:', {
  accountsCount: accounts.value.length,
})
</script>

<style scoped lang="scss">
@import './ScriptConfig.css';
.menu-button {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 支付宝授权状态 tag */
.alipay-token-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: normal;
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
  white-space: nowrap;
}
.alipay-token-expired {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}
.alipay-token-warn {
  background: #fffbe6;
  color: #faad14;
  border: 1px solid #ffe58f;
}
.alipay-token-ok {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}
</style>

<style>
/* 非 scoped 样式确保"开通试用"菜单项金色样式生效 */
li.ant-dropdown-menu-item.trial-item,
.ant-dropdown-menu-item.trial-item {
  color: #d4af37 !important;
  font-weight: 700 !important;
}

li.ant-dropdown-menu-item.trial-item span,
.ant-dropdown-menu-item.trial-item span {
  color: #d4af37 !important;
  font-weight: 700 !important;
}

li.ant-dropdown-menu-item.trial-item:hover,
.ant-dropdown-menu-item.trial-item:hover {
  background: rgba(212, 175, 55, 0.1) !important;
}

li.ant-dropdown-menu-item.trial-item .anticon,
.ant-dropdown-menu-item.trial-item .anticon {
  color: #d4af37 !important;
}

/* 右下角悬浮按钮组 - 全量主题色覆盖，消除蓝色残留 */

/* 按钮组容器背景 */
.ant-float-btn-group,
.ant-float-btn-group-wrap {
  background: transparent !important;
}

/* 所有 primary 浮动按钮的 body */
.ant-float-btn-primary .ant-float-btn-body {
  background-color: var(--theme-primary, #22c55e) !important;
  box-shadow: 0 4px 16px rgba(var(--theme-primary-rgb, 34,197,94), 0.45) !important;
}
.ant-float-btn-primary .ant-float-btn-body:hover {
  background-color: var(--theme-primary-dark, #16a34a) !important;
  box-shadow: 0 6px 20px rgba(var(--theme-primary-rgb, 34,197,94), 0.6) !important;
}

/* 按钮组触发主按钮（shape=square 时也要覆盖） */
.ant-float-btn-group > .ant-float-btn-primary .ant-float-btn-body,
.ant-float-btn-group-square > .ant-float-btn-primary .ant-float-btn-body {
  background-color: var(--theme-primary, #22c55e) !important;
}

/* 按钮本身的背景（有时 Ant Design 会给 .ant-float-btn 加背景） */
.ant-float-btn-primary {
  background-color: transparent !important;
}

/* shape=square 时四个角的圆角容器 */
.ant-float-btn-group-square-shadow,
.ant-float-btn-square .ant-float-btn-body {
  background-color: var(--theme-primary, #22c55e) !important;
}

/* 图标和描述文字 */
.ant-float-btn-primary .ant-float-btn-icon,
.ant-float-btn-primary .ant-float-btn-description,
.ant-float-btn-primary .ant-float-btn-body .ant-float-btn-icon,
.ant-float-btn-primary .ant-float-btn-body .ant-float-btn-description {
  color: #fff !important;
}

/* 非 primary 的子浮动按钮（展开后的图标按钮）也跟主题走 */
.ant-float-btn-group-wrap .ant-float-btn-default .ant-float-btn-body {
  background: rgba(255, 255, 255, 0.92) !important;
  border: 1px solid rgba(var(--theme-primary-rgb, 34,197,94), 0.25) !important;
}
.ant-float-btn-group-wrap .ant-float-btn-default .ant-float-btn-body:hover {
  background: rgba(255, 255, 255, 1) !important;
  border-color: var(--theme-primary, #22c55e) !important;
}
.ant-float-btn-group-wrap .ant-float-btn-default .ant-float-btn-icon {
  color: var(--theme-primary, #22c55e) !important;
}


/* 账号卡片操作按钮 - 用实色确保覆盖 Ant Design */
/* 启动 / 查看日志：浅灰实色 */
/* .account-actions .ant-btn {
  background: #f0f0f0 !important;
  border: 1px solid #d0d0d0 !important;
  color: #444 !important;
  border-radius: 8px !important;
  font-size: 13px !important;
  height: 30px !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
}
.account-actions .ant-btn:hover:not(:disabled) {
  background: #e6e6e6 !important;
  border-color: var(--theme-primary, #22c55e) !important;
  color: var(--theme-primary, #22c55e) !important;
  box-shadow: 0 3px 10px rgba(0,0,0,0.15) !important;
}
.account-actions .ant-btn:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
} */
/* 修改配置（ant-btn-primary 非危险）：主题色实色 */
/* .account-actions .ant-btn-primary:not(.ant-btn-dangerous) {
  background: var(--theme-primary, #22c55e) !important;
  border-color: var(--theme-primary, #22c55e) !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(var(--theme-primary-rgb, 34,197,94), 0.4) !important;
}
.account-actions .ant-btn-primary:not(.ant-btn-dangerous):hover:not(:disabled) {
  filter: brightness(1.1) !important;
  box-shadow: 0 4px 14px rgba(var(--theme-primary-rgb, 34,197,94), 0.5) !important;
  transform: translateY(-1px) !important;
} */
/* 停止按钮：红色实色 */
/* .account-actions .ant-btn-primary.ant-btn-dangerous {
  background: #fff0f0 !important;
  border-color: #ffb3b3 !important;
  color: #e53935 !important;
  box-shadow: 0 1px 3px rgba(229,57,53,0.15) !important;
}
.account-actions .ant-btn-primary.ant-btn-dangerous:hover:not(:disabled) {
  background: #ffe0e0 !important;
  border-color: #e53935 !important;
  color: #e53935 !important;
  box-shadow: 0 3px 10px rgba(229,57,53,0.25) !important;
} */
</style>
