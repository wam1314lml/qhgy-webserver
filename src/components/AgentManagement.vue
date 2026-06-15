<template>
  <div class="agent-mgmt">
    <!-- 头部 -->
    <div class="agent-header">
      <h1>代理后台</h1>
      <p class="agent-subtitle">管理您的三级代理，查看实时业绩</p>
    </div>

    <!-- 我的分成卡片 -->
    <div class="agent-card my-commission-card">
      <h2>我的分成概览</h2>
      <div v-if="myCommissionError" class="load-error">{{ myCommissionError }}</div>
      <div v-else-if="myCommission" class="commission-grid">
        <div class="commission-item">
          <div class="commission-number">¥{{ fmt(myCommission?.stats?.total_commission) }}</div>
          <div class="commission-label">累计分成</div>
        </div>
        <div class="commission-item highlight">
          <div class="commission-number">¥{{ fmt(myCommission?.stats?.available_commission) }}</div>
          <div class="commission-label">可提现</div>
        </div>
        <div class="commission-item">
          <div class="commission-number">¥{{ fmt(myCommission?.stats?.withdrawn_commission) }}</div>
          <div class="commission-label">已提现</div>
        </div>
      </div>
      <div v-else class="loading-text">加载中...</div>
    </div>

    <!-- 三级代理总分成概览 -->
    <div class="agent-card my-commission-card">
      <h2>三级代理总分成概览</h2>
      <div v-if="subSummaryError" class="load-error">{{ subSummaryError }}</div>
      <div v-else-if="subSummary" class="commission-grid">
        <div class="commission-item">
          <div class="commission-number">¥{{ fmt(subSummary.total_commission) }}</div>
          <div class="commission-label">累计分成</div>
        </div>
        <div class="commission-item highlight">
          <div class="commission-number">¥{{ fmt(subSummary.available_commission) }}</div>
          <div class="commission-label">可提现</div>
        </div>
        <div class="commission-item">
          <div class="commission-number">¥{{ fmt(subSummary.withdrawn_commission) }}</div>
          <div class="commission-label">已提现</div>
        </div>
      </div>
      <div v-else class="loading-text">加载中...</div>
    </div>

    <!-- 任命三级代理 -->
    <div class="agent-card appoint-card">
      <h2>任命三级代理</h2>
      <div class="appoint-form">
        <div class="form-row">
          <input
            v-model="searchKeyword"
            class="agent-input"
            placeholder="输入用户名或邮箱搜索用户"
            @input="onSearchInput"
          />
          <button class="agent-btn primary" @click="doSearch">搜索</button>
        </div>

        <!-- 搜索结果 -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="user in searchResults"
            :key="user.id"
            class="search-result-item"
            :class="{
              selected: selectedUser?.id === user.id,
              disabled: isUserDisabled(user)
            }"
            @click="!isUserDisabled(user) && selectUser(user)"
          >
            <span class="result-name">{{ user.username }}</span>
            <span class="result-email">{{ user.email }}</span>
            <span class="result-role" :class="getRoleClass(user.role)">{{ getRoleLabel(user.role) }}</span>
            <span v-if="user.role === 'agent3'" class="result-tag disabled-tag">已是三级代理</span>
            <span v-else-if="isSecondLevel(user.role)" class="result-tag disabled-tag">无法任命</span>
          </div>
        </div>
        <div v-if="searchError" class="load-error">{{ searchError }}</div>
        <div v-else-if="searchDone && searchResults.length === 0" class="no-results">未找到相关用户</div>

        <!-- 选中用户后显示任命表单 -->
        <div v-if="selectedUser" class="appoint-detail">
          <div class="selected-user-info">
            <span>已选择：<strong>{{ selectedUser.username }}</strong>（{{ selectedUser.email }}）</span>
            <span class="current-role">当前角色：{{ selectedUser.role }}</span>
          </div>
          <div class="rate-input-row">
            <label>抽成比例：</label>
            <input
              v-model.number="appointRate"
              type="number"
              min="1"
              :max="myMaxRate - 1"
              class="agent-input rate-input"
              :placeholder="`1~${myMaxRate - 1}`"
            />
            <span class="rate-unit">%</span>
            <span class="rate-hint">最大可设 {{ myMaxRate - 1 }}%（您的比例 {{ myMaxRate }}%）</span>
          </div>
          <div class="appoint-actions">
            <button class="agent-btn primary" :disabled="appointLoading" @click="doAppoint">
              {{ appointLoading ? '任命中...' : '确认任命' }}
            </button>
            <button class="agent-btn secondary" @click="cancelAppoint">取消</button>
          </div>
          <p v-if="appointMsg" :class="appointSuccess ? 'msg-success' : 'msg-error'">
            {{ appointMsg }}
          </p>
        </div>
      </div>
    </div>

    <!-- 旗下三级代理列表 -->
    <div class="agent-card agents-list-card">
      <div class="card-header-row">
        <h2>旗下三级代理（{{ myAgents.length }}）</h2>
        <button class="agent-btn secondary small" @click="loadMyAgents">刷新</button>
      </div>

      <div v-if="agentsLoading" class="loading-text">加载中...</div>
      <div v-else-if="agentsError" class="load-error">{{ agentsError }}</div>
      <div v-else-if="myAgents.length === 0" class="empty-tip">暂无三级代理，去上方搜索并任命吧</div>

      <div v-else class="agents-table-wrap">
        <table class="agents-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>邀请人数</th>
              <th>抽成比例</th>
              <th>今日充值</th>
              <th>可提现</th>
              <th>已提现</th>
              <th>累计分成</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="agent in myAgents" :key="agent.id">
              <td>
                <div class="agent-name">{{ agent.username }}</div>
                <div class="agent-email">{{ agent.email }}</div>
              </td>
              <td>{{ agent.total_invites }}</td>
              <td>
                <div class="rate-cell">
                  <span class="rate-badge">{{ agent.commission_rate_percent }}</span>
                  <button
                    class="icon-btn"
                    title="修改抽成比例"
                    @click="openEditRate(agent)"
                  >✏️</button>
                </div>
              </td>
              <td class="amount-cell">¥{{ fmt(agent.today_recharge_amount) }}</td>
              <td class="amount-cell available">¥{{ fmt(agent.available_commission) }}</td>
              <td class="amount-cell">¥{{ fmt(agent.withdrawn_commission) }}</td>
              <td class="amount-cell">¥{{ fmt(agent.total_commission) }}</td>
              <td>
                <div class="action-btns">
                  <button class="agent-btn success small" @click="openWithdrawAgent(agent)" :disabled="agent.available_commission <= 0">提现</button>
                  <button class="agent-btn info small" @click="viewDetail(agent)">详情</button>
                  <button class="agent-btn danger small" @click="openDismiss(agent)">卸任</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 给三级代理提现弹窗 -->
    <div v-if="withdrawAgentTarget" class="modal-overlay" @click.self="withdrawAgentTarget = null">
      <div class="modal-box">
        <h3>给三级代理提现</h3>
        <p>代理：<strong>{{ withdrawAgentTarget.username }}</strong></p>
        <p>可提现金额：<strong class="amount-cell available">¥{{ fmt(withdrawAgentTarget.available_commission) }}</strong></p>
        <div class="rate-input-row">
          <label>提现金额：</label>
          <input
            v-model.number="withdrawAgentAmount"
            type="number"
            min="0.01"
            :max="withdrawAgentTarget.available_commission"
            step="0.01"
            class="agent-input rate-input"
            style="flex:1;width:auto"
            placeholder="请输入金额"
          />
          <span class="rate-unit">元</span>
        </div>
        <p v-if="withdrawAgentMsg" :class="withdrawAgentSuccess ? 'msg-success' : 'msg-error'">
          {{ withdrawAgentMsg }}
        </p>
        <div class="modal-actions">
          <button class="agent-btn success" :disabled="withdrawAgentLoading" @click="doWithdrawAgent">
            {{ withdrawAgentLoading ? '处理中...' : '确认提现' }}
          </button>
          <button class="agent-btn secondary" @click="withdrawAgentTarget = null">取消</button>
        </div>
      </div>
    </div>

    <!-- 修改抽成比例弹窗 -->
    <div v-if="editRateAgent" class="modal-overlay" @click.self="editRateAgent = null">
      <div class="modal-box">
        <h3>修改抽成比例</h3>
        <p>代理：<strong>{{ editRateAgent.username }}</strong></p>
        <p>当前比例：<strong>{{ editRateAgent.commission_rate_percent }}</strong></p>
        <div class="rate-input-row">
          <label>新比例：</label>
          <input
            v-model.number="editRateValue"
            type="number"
            min="1"
            :max="myMaxRate - 1"
            class="agent-input rate-input"
            :placeholder="`1~${myMaxRate - 1}`"
          />
          <span class="rate-unit">%</span>
          <span class="rate-hint">最大 {{ myMaxRate - 1 }}%</span>
        </div>
        <p v-if="editRateMsg" :class="editRateSuccess ? 'msg-success' : 'msg-error'">
          {{ editRateMsg }}
        </p>
        <div class="modal-actions">
          <button class="agent-btn primary" :disabled="editRateLoading" @click="doEditRate">
            {{ editRateLoading ? '保存中...' : '保存' }}
          </button>
          <button class="agent-btn secondary" @click="editRateAgent = null">取消</button>
        </div>
      </div>
    </div>

    <!-- 卸任确认弹窗 -->
    <div v-if="dismissAgent" class="modal-overlay" @click.self="dismissAgent = null">
      <div class="modal-box">
        <h3>卸任三级代理</h3>
        <p>确定卸任 <strong>{{ dismissAgent.username }}</strong> 吗？</p>
        <div class="void-option">
          <label>
            <input v-model="voidCommission" type="checkbox" />
            同时作废其所有可提现分成记录
          </label>
        </div>
        <p v-if="dismissMsg" :class="dismissSuccess ? 'msg-success' : 'msg-error'">
          {{ dismissMsg }}
        </p>
        <div class="modal-actions">
          <button class="agent-btn danger" :disabled="dismissLoading" @click="doDismiss">
            {{ dismissLoading ? '处理中...' : '确认卸任' }}
          </button>
          <button class="agent-btn secondary" @click="dismissAgent = null">取消</button>
        </div>
      </div>
    </div>

    <!-- 代理详情弹窗 -->
    <div v-if="detailData" class="modal-overlay detail-modal" @click.self="detailData = null">
      <div class="modal-box large">
        <div class="modal-title-row">
          <h3>{{ detailData.agentUsername }} 的详情</h3>
          <button class="close-btn" @click="detailData = null">✕</button>
        </div>

        <!-- 统计 -->
        <div class="detail-stats">
          <div class="detail-stat-item">
            <span class="stat-val">¥{{ fmt(detailData?.stats?.total_commission) }}</span>
            <span class="stat-lbl">累计分成</span>
          </div>
          <div class="detail-stat-item highlight">
            <span class="stat-val">¥{{ fmt(detailData?.stats?.available_commission) }}</span>
            <span class="stat-lbl">可提现</span>
          </div>
          <div class="detail-stat-item">
            <span class="stat-val">¥{{ fmt(detailData?.stats?.withdrawn_commission) }}</span>
            <span class="stat-lbl">已提现</span>
          </div>
        </div>

        <!-- 邀请用户 -->
        <h4>邀请的用户（{{ detailData.invitees.length }}）</h4>
        <div class="detail-table-wrap">
          <table class="agents-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>累计充值</th>
                <th>充值次数</th>
                <th>最后充值</th>
                <th>注册时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in detailData.invitees" :key="inv.id">
                <td>{{ inv.username }}</td>
                <td class="amount-cell">¥{{ fmt(inv.total_recharge_amount) }}</td>
                <td>{{ inv.recharge_count }}</td>
                <td>{{ formatDate(inv.last_recharge_time) }}</td>
                <td>{{ formatDate(inv.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分成记录 -->
        <h4 style="margin-top:16px">最近分成记录</h4>
        <div class="detail-table-wrap">
          <table class="agents-table">
            <thead>
              <tr>
                <th>来源用户</th>
                <th>充值金额</th>
                <th>比例</th>
                <th>分成</th>
                <th>状态</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cr in detailData.commissionRecords" :key="cr.id">
                <td>{{ cr.invitee_username }}</td>
                <td class="amount-cell">¥{{ fmt(cr.recharge_amount) }}</td>
                <td>{{ (parseFloat(cr.commission_rate) * 100).toFixed(0) }}%</td>
                <td class="amount-cell">¥{{ fmt(cr.commission_amount) }}</td>
                <td>
                  <span :class="'cr-status ' + cr.status">{{ statusLabel(cr.status) }}</span>
                </td>
                <td>{{ formatDate(cr.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axiosInstance from '../utils/axios'

// 使用项目 axios 实例（自动带 challenge 签名头 + token）
async function apiFetch(path: string, opts: { method?: string; body?: string } = {}) {
  const method = (opts.method || 'GET').toLowerCase()
  const data = opts.body ? JSON.parse(opts.body) : undefined
  let res: any
  if (method === 'post') {
    res = await axiosInstance.post(`/api/agent${path}`, data)
  } else if (method === 'put') {
    res = await axiosInstance.put(`/api/agent${path}`, data)
  } else if (method === 'delete') {
    res = await axiosInstance.delete(`/api/agent${path}`)
  } else {
    // path 可能含 query string，直接传完整路径
    res = await axiosInstance.get(`/api/agent${path}`)
  }
  return res.data
}

// ── 格式化 ──
function fmt(val: any) {
  return parseFloat(val || 0).toFixed(2)
}
function formatDate(d: any) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN')
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    available: '可提现',
    pending: '审核中',
    withdrawn: '已提现',
    voided: '已作废',
  }
  return map[s] || s
}
function getRoleClass(role: string) {
  if (['vip2', 'vip1'].includes(role)) return 'role-subadmin'
  if (role === 'agent3') return 'role-vip'
  if (role === 'vip') return 'role-vip'
  if (role === 'admin' || role === 'subadmin') return 'role-admin'
  return 'role-user'
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    admin: '管理员', subadmin: '总代',
    vip1: '二级代理', vip2: '二级代理',
    agent3: '三级代理', vip: 'VIP', user: '普通用户',
  }
  return map[role] || role
}

// 判断用户是否是二级代理（不可被任命为三级代理）
function isSecondLevel(role: string) {
  return ['vip1', 'vip2', 'admin', 'subadmin'].includes(role)
}

// 判断搜索结果中的用户是否不可选
function isUserDisabled(user: any) {
  return user.role === 'agent3' || isSecondLevel(user.role)
}

// ── 我的有效比例（从 /info 接口获取）──
const myMaxRate = ref(25) // 默认25，加载后更新
async function loadMyInfo() {
  try {
    const res = await apiFetch('/info')
    if (res.success && res.data) {
      const rate = parseFloat(res.data.effective_commission_rate || 0)
      myMaxRate.value = Math.round(rate * 100) // 转为整数百分比，如 0.25 → 25
    }
  } catch {}
}

// ── 三级代理总分成汇总 ──
const subSummary = ref<any>(null)
const subSummaryError = ref('')
async function loadSubSummary() {
  try {
    const res = await apiFetch('/sub-agents-summary')
    if (res.success) {
      subSummary.value = res.data
    } else {
      subSummaryError.value = res.message || '加载失败'
    }
  } catch {
    subSummaryError.value = '网络错误，请刷新重试'
  }
}

// ── 我的分成 ──
const myCommission = ref<any>(null)
const myCommissionError = ref('')
async function loadMyCommission() {
  try {
    const res = await apiFetch('/my-commission')
    if (res.success) {
      // 确保 stats 字段存在，防止模板访问报错
      myCommission.value = {
        stats: res.data?.stats || { total_commission: 0, available_commission: 0, withdrawn_commission: 0 },
        recentRecords: res.data?.recentRecords || [],
      }
    } else {
      myCommissionError.value = res.message || '加载失败'
    }
  } catch (e: any) {
    myCommissionError.value = '网络错误，请刷新重试'
  }
}

// ── 旗下代理 ──
const myAgents = ref<any[]>([])
const agentsLoading = ref(false)
const agentsError = ref('')
async function loadMyAgents() {
  agentsLoading.value = true
  agentsError.value = ''
  try {
    const res = await apiFetch('/my-agents')
    if (res.success) {
      myAgents.value = res.data
    } else {
      agentsError.value = res.message || '加载失败'
    }
  } catch (e: any) {
    agentsError.value = '网络错误，请刷新重试'
  }
  agentsLoading.value = false
}

// ── 搜索用户 ──
const searchKeyword = ref('')
const searchResults = ref<any[]>([])
const searchDone = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(doSearch, 400)
}
const searchError = ref('')
async function doSearch() {
  const q = searchKeyword.value.trim()
  if (!q) { searchResults.value = []; searchDone.value = false; searchError.value = ''; return }
  searchError.value = ''
  try {
    const res = await apiFetch(`/search-user?q=${encodeURIComponent(q)}`)
    if (res.success) {
      // 过滤掉 username 为空的用户
      searchResults.value = (res.data || []).filter((u: any) => u.username && u.username.trim())
    } else {
      searchResults.value = []
      searchError.value = res.message || '搜索失败，请重试'
    }
  } catch (e: any) {
    searchResults.value = []
    searchError.value = '网络错误，请检查登录状态后重试'
    console.error('[search-user error]', e)
  }
  searchDone.value = true
}

// ── 任命 ──
const selectedUser = ref<any>(null)
const appointRate = ref<number>(10)
const appointLoading = ref(false)
const appointMsg = ref('')
const appointSuccess = ref(false)

function selectUser(user: any) {
  selectedUser.value = user
  appointMsg.value = ''
}
function cancelAppoint() {
  selectedUser.value = null
  searchResults.value = []
  searchKeyword.value = ''
  searchDone.value = false
  appointMsg.value = ''
}
async function doAppoint() {
  if (!selectedUser.value) return
  const maxAllowed = myMaxRate.value - 1
  if (!appointRate.value || appointRate.value < 1 || appointRate.value > maxAllowed) {
    appointMsg.value = `抽成比例必须在 1%~${maxAllowed}% 之间`
    appointSuccess.value = false
    return
  }
  appointLoading.value = true
  appointMsg.value = ''
  const res = await apiFetch('/appoint', {
    method: 'POST',
    body: JSON.stringify({
      userId: selectedUser.value.id,
      commissionRate: appointRate.value,  // 后端期望整数百分比，如 10 表示 10%
    }),
  })
  appointSuccess.value = res.success
  appointMsg.value = res.message
  if (res.success) {
    cancelAppoint()
    await loadMyAgents()
  }
  appointLoading.value = false
}

// ── 修改抽成比例 ──
const editRateAgent = ref<any>(null)
const editRateValue = ref<number>(10)
const editRateLoading = ref(false)
const editRateMsg = ref('')
const editRateSuccess = ref(false)

function openEditRate(agent: any) {
  editRateAgent.value = agent
  editRateValue.value = Math.round(agent.commission_rate * 100)
  editRateMsg.value = ''
}
async function doEditRate() {
  if (!editRateAgent.value) return
  editRateLoading.value = true
  editRateMsg.value = ''
  const res = await apiFetch('/commission-rate', {
    method: 'PUT',
    body: JSON.stringify({
      userId: editRateAgent.value.id,
      commissionRate: editRateValue.value,  // 整数百分比，如 8 表示 8%，后端自行 /100
    }),
  })
  editRateSuccess.value = res.success
  editRateMsg.value = res.message
  if (res.success) {
    editRateAgent.value = null
    await loadMyAgents()
  }
  editRateLoading.value = false
}

// ── 卸任 ──
const dismissAgent = ref<any>(null)
const voidCommission = ref(true)
const dismissLoading = ref(false)
const dismissMsg = ref('')
const dismissSuccess = ref(false)

function openDismiss(agent: any) {
  dismissAgent.value = agent
  voidCommission.value = true
  dismissMsg.value = ''
}
async function doDismiss() {
  if (!dismissAgent.value) return
  dismissLoading.value = true
  dismissMsg.value = ''
  const res = await apiFetch('/dismiss', {
    method: 'POST',
    body: JSON.stringify({
      userId: dismissAgent.value.id,
      voidCommission: voidCommission.value,
    }),
  })
  dismissSuccess.value = res.success
  dismissMsg.value = res.message
  if (res.success) {
    dismissAgent.value = null
    await loadMyAgents()
  }
  dismissLoading.value = false
}

// ── 给三级代理提现 ──
const withdrawAgentTarget = ref<any>(null)
const withdrawAgentAmount = ref<number>(0)
const withdrawAgentLoading = ref(false)
const withdrawAgentMsg = ref('')
const withdrawAgentSuccess = ref(false)

function openWithdrawAgent(agent: any) {
  withdrawAgentTarget.value = agent
  withdrawAgentAmount.value = 0
  withdrawAgentMsg.value = ''
}
async function doWithdrawAgent() {
  if (!withdrawAgentTarget.value) return
  const max = parseFloat(withdrawAgentTarget.value.available_commission || 0)
  if (!withdrawAgentAmount.value || withdrawAgentAmount.value <= 0) {
    withdrawAgentMsg.value = '请输入有效的提现金额'
    withdrawAgentSuccess.value = false
    return
  }
  if (withdrawAgentAmount.value > max) {
    withdrawAgentMsg.value = `提现金额不能超过可提现金额 ¥${max.toFixed(2)}`
    withdrawAgentSuccess.value = false
    return
  }
  withdrawAgentLoading.value = true
  withdrawAgentMsg.value = ''
  const res = await apiFetch('/withdraw-for-agent', {
    method: 'POST',
    body: JSON.stringify({
      agentUserId: withdrawAgentTarget.value.id,
      amount: withdrawAgentAmount.value,
    }),
  })
  withdrawAgentSuccess.value = res.success
  withdrawAgentMsg.value = res.message
  if (res.success) {
    withdrawAgentTarget.value = null
    await Promise.all([loadMyAgents(), loadSubSummary()])
  }
  withdrawAgentLoading.value = false
}

// ── 详情 ──
const detailData = ref<any>(null)
async function viewDetail(agent: any) {
  const res = await apiFetch(`/agent-detail/${agent.id}`)
  if (res.success) detailData.value = res.data
}

// ── 初始化 ──
onMounted(() => {
  loadMyInfo()
  loadMyCommission()
  loadSubSummary()
  loadMyAgents()
})
</script>

<style scoped>
.agent-mgmt {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 80px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a2e;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  margin-bottom: 12px;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.25); }

.agent-header {
  margin-bottom: 24px;
}
.agent-header h1 {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.agent-subtitle {
  color: #888;
  font-size: 14px;
  margin: 0;
}

/* 卡片 */
.agent-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
}
.agent-card h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
}

/* 我的分成 */
.commission-grid {
  display: flex;
  gap: 24px;
}
.commission-item {
  flex: 1;
  background: #f8f9ff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}
.commission-item.highlight {
  background: linear-gradient(135deg, #667eea22, #764ba222);
  border: 1px solid #667eea44;
}
.commission-number {
  font-size: 22px;
  font-weight: 700;
  color: #333;
}
.commission-label {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

/* 任命表单 */
.form-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.agent-input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.agent-input:focus {
  border-color: #667eea;
}
.rate-input {
  flex: 0 0 80px;
  width: 80px;
}
.rate-unit {
  align-self: center;
  font-weight: 600;
  color: #667eea;
  margin-left: 4px;
}
.rate-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}
.rate-input-row label {
  font-size: 14px;
  color: #555;
}

/* 搜索结果 */
.search-results {
  border: 1px solid #eee;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-result-item:hover,
.search-result-item.selected {
  background: #f0f2ff;
}
.result-name {
  font-weight: 600;
  min-width: 100px;
}
.result-email {
  color: #888;
  font-size: 13px;
  flex: 1;
}
.result-role {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #f0f0f0;
}
.role-vip { background: #fdf3e3; color: #e67e22; }
.role-subadmin { background: #eaf0fb; color: #3498db; }
.role-admin { background: #fde8e8; color: #e74c3c; }
.role-user { background: #f0f0f0; color: #888; }

.no-results { color: #aaa; font-size: 14px; padding: 8px 0; }

/* 禁用状态的搜索结果项 */
.search-result-item.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f9f9f9;
}
.search-result-item.disabled:hover {
  background: #f9f9f9;
}
.result-tag {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  margin-left: auto;
  white-space: nowrap;
}
.disabled-tag {
  background: #fee2e2;
  color: #dc2626;
}

/* 比例提示文字 */
.rate-hint {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.selected-user-info {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}
.current-role { color: #888; }

.appoint-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

/* 按钮 */
.agent-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
  font-weight: 500;
}
.agent-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.agent-btn.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}
.agent-btn.secondary {
  background: #f0f0f0;
  color: #555;
}
.agent-btn.danger {
  background: #fee2e2;
  color: #dc2626;
}
.agent-btn.info {
  background: #e0f2fe;
  color: #0369a1;
}
.agent-btn.success {
  background: #dcfce7;
  color: #16a34a;
}
.agent-btn.small {
  padding: 5px 12px;
  font-size: 13px;
}

/* 反馈信息 */
.msg-success { color: #16a34a; font-size: 13px; margin-top: 6px; }
.msg-error   { color: #dc2626; font-size: 13px; margin-top: 6px; }
.loading-text { color: #aaa; font-size: 14px; }
.empty-tip    { color: #aaa; font-size: 14px; padding: 16px 0; }
.load-error   { color: #dc2626; font-size: 14px; padding: 12px 0; }

/* 代理列表 */
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-header-row h2 { margin: 0; }

.agents-table-wrap {
  overflow-x: auto;
}
.agents-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.agents-table th {
  background: #f8f9ff;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: #555;
  border-bottom: 1px solid #eee;
}
.agents-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f3f3f3;
  vertical-align: middle;
}
.agent-name { font-weight: 600; }
.agent-email { color: #aaa; font-size: 12px; }
.amount-cell { font-weight: 600; }
.amount-cell.available { color: #16a34a; }

.rate-cell { display: flex; align-items: center; gap: 6px; }
.rate-badge {
  background: linear-gradient(135deg, #667eea22, #764ba222);
  color: #667eea;
  border: 1px solid #667eea44;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  padding: 2px;
  line-height: 1;
}
.action-btns { display: flex; gap: 6px; }

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal-box {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  width: 420px;
  max-width: 100%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
}
.modal-box.large {
  width: 860px;
  max-height: 80vh;
  overflow-y: auto;
}
.modal-box h3 {
  margin: 0 0 16px;
  font-size: 18px;
}
.modal-box p {
  font-size: 14px;
  margin: 6px 0;
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.modal-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.modal-title-row h3 { margin: 0; }
.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #888;
}
.close-btn:hover { color: #333; }

.void-option {
  margin: 12px 0;
  font-size: 14px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.void-option input { cursor: pointer; }

/* 详情弹窗 */
.detail-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.detail-stat-item {
  flex: 1;
  background: #f8f9ff;
  border-radius: 10px;
  padding: 12px 16px;
  text-align: center;
}
.detail-stat-item.highlight {
  background: linear-gradient(135deg, #667eea22, #764ba222);
  border: 1px solid #667eea44;
}
.stat-val {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}
.stat-lbl {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  display: block;
}
.detail-table-wrap {
  overflow-x: auto;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
}

/* 分成状态标签 */
.cr-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}
.cr-status.available  { background: #dcfce7; color: #16a34a; }
.cr-status.pending    { background: #fef9c3; color: #ca8a04; }
.cr-status.withdrawn  { background: #e0f2fe; color: #0369a1; }
.cr-status.voided     { background: #fee2e2; color: #dc2626; }

/* 响应式 */
@media (max-width: 640px) {
  .commission-grid { flex-direction: column; }
  .detail-stats    { flex-direction: column; }
  .modal-box.large { width: 100%; }
}
</style>
