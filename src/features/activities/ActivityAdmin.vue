<template>
  <section class="activity-admin">
    <div class="admin-activity-toolbar">
      <div><h2>活动管理</h2><p>创建独立活动期数，配置公会集结配额与签到奖励。</p></div>
      <a-space><a-button :loading="loading" @click="load">刷新</a-button><a-button type="primary" @click="create">添加活动</a-button></a-space>
    </div>
    <a-alert message="活动配额仅在公会集结活动中配置，与普通配额套餐独立。已有参与记录后，参与条件和奖励规则锁定；标题、说明、背景、启停及延后结束时间仍可修改。" type="info" show-icon class="admin-activity-notice" />
    <a-alert v-if="error" :message="error" type="error" show-icon class="admin-activity-notice" />
    <p class="muted">到期的公会集结和签到活动可删除。删除后从活动列表移除，已发奖励、卡密及领取记录继续保留。</p>
    <a-table :columns="columns" :data-source="items" :loading="loading" row-key="id" :pagination="{ pageSize: 10, showSizeChanger: false }" :scroll="{ x: 900 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'"><strong>{{ record.title }}</strong><div class="muted">活动 ID：{{ record.id }}</div></template>
        <template v-else-if="column.key === 'type'">{{ record.type === 'guild_rally' ? '公会集结' : '签到' }}</template>
        <template v-else-if="column.key === 'period'"><div>{{ formatActivityTime(record.startAt) }}</div><div>至 {{ formatActivityTime(record.endAt) }}</div></template>
        <template v-else-if="column.key === 'status'"><a-tag :color="record.status === 'active' ? 'green' : record.status === 'upcoming' ? 'blue' : 'default'">{{ statusLabels[record.status] || (record.enabled ? '已启用' : '已停用') }}</a-tag><div v-if="record.hasParticipation" class="muted">规则已锁定</div></template>
        <template v-else-if="column.key === 'actions'">
          <a-space :size="0"><a-button type="link" :disabled="!!deleting" @click="edit(record)">编辑活动</a-button>
            <a-popconfirm v-if="record.canDelete" :title="`删除已到期活动「${record.title}」？`" description="活动将从列表移除，已发奖励和领取记录继续保留。" ok-text="确认删除" cancel-text="取消" :disabled="!!deleting" @confirm="removeActivity(record)"><a-button type="link" danger :loading="deleting === record.id" :disabled="!!deleting && deleting !== record.id">删除活动</a-button></a-popconfirm>
            <a-tooltip v-else title="活动到期后可删除，停用不代表到期"><span><a-button type="link" disabled>删除活动</a-button></span></a-tooltip>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="open" :title="form.id ? `编辑活动 #${form.id}` : '添加活动'" :width="820" :confirm-loading="saving" :mask-closable="!saving && !uploading" :closable="!saving && !uploading" :keyboard="!saving && !uploading" :ok-button-props="{ disabled: uploading }" :cancel-button-props="{ disabled: saving || uploading }" ok-text="保存活动" cancel-text="取消" @ok="save">
      <a-form layout="vertical" class="activity-editor">
        <a-alert v-if="locked" message="本期已有参与记录，规则已锁定。如需更换配额、奖励或参与条件，请新建一期活动。" type="warning" show-icon class="admin-activity-notice" />
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12"><a-form-item label="活动类型" required><a-select v-model:value="form.type" :disabled="locked || saving" :options="[{ label: '公会集结', value: 'guild_rally' }, { label: '签到', value: 'sign_in' }]" @change="changeType" /></a-form-item></a-col>
          <a-col :xs="24" :sm="12"><a-form-item label="启用状态"><a-switch v-model:checked="form.enabled" :disabled="saving" checked-children="启用" un-checked-children="停用" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="活动名称" required><a-input v-model:value="form.title" :maxlength="100" :disabled="saving" placeholder="例如：十月公会集结" /></a-form-item>
        <a-form-item label="活动说明"><a-textarea v-model:value="form.description" :maxlength="2000" :rows="3" :disabled="saving" placeholder="向玩家说明本期活动内容" /></a-form-item>
        <a-form-item label="活动背景图片">
          <div class="background-preview"><ActivityArtwork :type="form.type" :background-url="form.backgroundUrl" /><span v-if="form.backgroundUrl === ''">当前不显示背景图片</span></div>
          <input ref="imageInput" class="background-file-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="选择活动背景图片" :disabled="saving || uploading" @change="uploadBackground" />
          <a-space wrap><a-button :loading="uploading" :disabled="saving" @click="imageInput?.click()">上传背景图片</a-button><a-button :disabled="saving || uploading" @click="form.backgroundUrl = null">恢复默认图片</a-button><a-button :disabled="saving || uploading" @click="form.backgroundUrl = ''">移除背景</a-button></a-space>
          <p class="muted">支持 PNG/JPEG/WebP（最大 8 MB），上传图片按原比例完整显示；上传后请保存活动。已参与的活动也可更换背景，奖励规则保持原设置。</p>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12"><a-form-item label="开始时间（北京时间）" required><a-input v-model:value="startText" type="datetime-local" :disabled="locked || saving" /></a-form-item></a-col>
          <a-col :xs="24" :sm="12"><a-form-item :label="locked ? '结束时间（仅可延后，北京时间）' : '结束时间（北京时间）'" required><a-input v-model:value="endText" type="datetime-local" :disabled="saving" /></a-form-item></a-col>
        </a-row>

        <fieldset v-if="form.type === 'guild_rally' && form.quota" class="rule-section" :disabled="locked || saving">
          <legend>活动配额分配</legend>
          <p class="muted">角色必须已同步公会 ID 与名称。首次分配成功即参与，同一真实角色只计一人。</p>
          <a-row :gutter="16">
            <a-col :xs="24" :sm="8"><a-form-item label="每次增加时长（天）" required><a-input-number v-model:value="form.quota.days" :min="1" :max="3650" :precision="0" :disabled="locked || saving" /></a-form-item></a-col>
            <a-col :xs="24" :sm="8"><a-form-item label="每次消耗点数" required><a-input-number v-model:value="form.quota.points" :min="0" :max="10000000" :precision="0" :disabled="locked || saving" /></a-form-item></a-col>
            <a-col :xs="24" :sm="8"><a-form-item label="每角色本期可分配次数" required><a-input-number v-model:value="form.quota.maxPerRole" :min="1" :max="100" :precision="0" :disabled="locked || saving" /></a-form-item></a-col>
          </a-row>
        </fieldset>
        <a-alert v-else message="签到按网站账号统计，北京时间每日一次；累计天数无需连续，未绑定游戏角色也可签到。" type="info" show-icon class="admin-activity-notice" />

        <div class="admin-reward-title"><h3>奖励档位</h3><a-button :disabled="locked || saving || form.rewards.length >= 30" @click="addReward">添加奖励档位</a-button></div>
        <p class="muted">每档支持 1～3 个不同类型的可选奖励，玩家任选一项。福利卡面额为点数，不限制兑换人。</p>
        <div v-for="(reward, index) in form.rewards" :key="reward.id" class="admin-reward">
          <div class="admin-reward-title"><strong>奖励 {{ index + 1 }}</strong><a-button danger type="text" size="small" :disabled="locked || saving" @click="form.rewards.splice(index, 1)">移除此档</a-button></div>
          <a-form-item label="奖励名称" required><a-input v-model:value="reward.label" :maxlength="100" :disabled="locked || saving" placeholder="例如：集结 5 人礼" /></a-form-item>
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12"><a-form-item label="领取条件"><a-select v-model:value="reward.kind" :disabled="locked || saving" :options="rewardKinds" @change="() => onKindChange(reward)" /></a-form-item></a-col>
            <a-col v-if="reward.kind !== 'daily'" :xs="24" :sm="12"><a-form-item :label="reward.kind === 'guild' ? '集结人数' : '累计签到天数'" required><a-input-number v-model:value="reward.threshold" :min="1" :max="100000" :precision="0" :disabled="locked || saving" /></a-form-item></a-col>
          </a-row>
          <div v-for="(option, optionIndex) in reward.options" :key="option.id" class="admin-option">
            <a-select v-model:value="option.type" aria-label="奖励类型" :disabled="locked || saving" :options="optionTypes(reward, option.id)" />
            <a-input-number v-model:value="option.value" :aria-label="option.type === 'time' ? '奖励小时数' : '奖励点数'" :min="option.type === 'time' ? 0.01 : 1" :max="option.type === 'time' ? 87600 : 10000000" :precision="option.type === 'time' ? 2 : 0" :disabled="locked || saving" />
            <span>{{ option.type === 'time' ? '小时' : '点' }}</span>
            <a-button type="text" danger :disabled="locked || saving || reward.options.length <= 1" @click="reward.options.splice(optionIndex, 1)">移除</a-button>
          </div>
          <a-button type="dashed" :disabled="locked || saving || reward.options.length >= 3" @click="addOption(reward)">添加可选奖励</a-button>
        </div>
        <a-alert v-if="formError" :message="formError" type="error" show-icon />
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { activitiesApi, activityError, formatActivityTime, newRequestId } from './api'
import { notifyWelfareChanged } from './useWelfareNotifications'
import ActivityArtwork from './ActivityArtwork.vue'
import { prepareActivityImage } from './imageUpload'
import type { ActivityConfig, ActivityReward, RewardType } from './types'

const props = defineProps<{ token?: string }>()
const items = ref<ActivityConfig[]>([])
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const imageInput = ref<HTMLInputElement>()
const deleting = ref<number>()
const statusLabels: Record<string, string> = { active: '进行中', upcoming: '未开始', ended: '已到期', disabled: '已停用' }
const error = ref('')
const formError = ref('')
const open = ref(false)
const form = ref<ActivityConfig>(emptyForm())
const startText = ref('')
const endText = ref('')
const originalEnd = ref(0)
const locked = computed(() => !!form.value.hasParticipation)
const rewardKinds = computed(() => form.value.type === 'guild_rally'
  ? [{ label: '公会集结人数', value: 'guild' }]
  : [{ label: '每日签到奖励', value: 'daily' }, { label: '累计签到奖励', value: 'cumulative' }])
const types: { label: string; value: RewardType }[] = [
  { label: '福利卡（点数）', value: 'card' }, { label: '直接到账点数', value: 'points' }, { label: '角色时长（小时）', value: 'time' },
]
const columns = [
  { title: '活动', key: 'name', width: 220 }, { title: '类型', key: 'type', width: 100 },
  { title: '活动时间（北京时间）', key: 'period', width: 260 }, { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'actions', width: 200 },
]
function emptyForm(): ActivityConfig {
  return { id: 0, type: 'guild_rally', title: '', description: '', startAt: Date.now(), endAt: Date.now() + 7 * 86_400_000, enabled: false, quota: { days: 7, points: 0, maxPerRole: 1 }, rewards: [] }
}
function dateText(timestamp: number) { return new Date(timestamp + 8 * 3_600_000).toISOString().slice(0, 16) }
function prepare() {
  startText.value = dateText(form.value.startAt)
  endText.value = dateText(form.value.endAt)
  originalEnd.value = form.value.endAt
  formError.value = ''
  open.value = true
}
function create() { form.value = emptyForm(); addReward(); prepare() }
function edit(item: ActivityConfig) { form.value = JSON.parse(JSON.stringify(item)); prepare() }
function changeType() {
  if (locked.value) return
  form.value.quota = form.value.type === 'guild_rally' ? { days: 7, points: 0, maxPerRole: 1 } : null
  form.value.rewards = []
  addReward()
}
function addReward() {
  if (form.value.rewards.length >= 30) return
  const kind = form.value.type === 'guild_rally' ? 'guild' : form.value.rewards.some(item => item.kind === 'daily') ? 'cumulative' : 'daily'
  form.value.rewards.push({ id: `reward_${newRequestId()}`, label: '', kind, threshold: kind === 'daily' ? 0 : kind === 'guild' ? 5 : 7, options: [{ id: `option_${newRequestId()}`, type: 'points', value: 1 }] })
}
function addOption(reward: ActivityReward) {
  const type = types.find(item => !reward.options.some(option => option.type === item.value))?.value
  if (type) reward.options.push({ id: `option_${newRequestId()}`, type, value: 1 })
}
function optionTypes(reward: ActivityReward, id: string) {
  return types.map(type => ({ ...type, disabled: reward.options.some(option => option.id !== id && option.type === type.value) }))
}
function onKindChange(reward: ActivityReward) { reward.threshold = reward.kind === 'daily' ? 0 : Math.max(1, reward.threshold) }
async function load() {
  loading.value = true
  try { items.value = await activitiesApi.adminList(props.token); error.value = '' }
  catch (err) { error.value = activityError(err) }
  finally { loading.value = false }
}
function validate(): string {
  if (!form.value.title.trim()) return '请输入活动名称'
  const start = Date.parse(`${startText.value}+08:00`)
  const end = Date.parse(`${endText.value}+08:00`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '请设置有效的开始和结束时间，结束必须晚于开始'
  // 时间控件精度为分钟，未修改时保留原时间戳，避免截断秒导致已参与活动误判缩短。
  form.value.startAt = startText.value === dateText(form.value.startAt) ? form.value.startAt : start
  form.value.endAt = endText.value === dateText(originalEnd.value) ? originalEnd.value : end
  if (locked.value && form.value.endAt < originalEnd.value) return '已有参与记录的活动只能延后结束时间'
  const quota = form.value.quota
  if (form.value.type === 'guild_rally' && (!quota || !Number.isInteger(quota.days) || quota.days < 1 || quota.days > 3650 || !Number.isInteger(quota.points) || quota.points < 0 || quota.points > 10000000 || !Number.isInteger(quota.maxPerRole) || quota.maxPerRole < 1 || quota.maxPerRole > 100)) return '请正确设置活动配额：1～3650 天、0～10000000 点、每角色 1～100 次'
  if (!form.value.rewards.length || form.value.rewards.length > 30) return '请设置 1～30 个奖励档位'
  if (form.value.rewards.filter(item => item.kind === 'daily').length > 1) return '每日签到奖励只能设置一档；请在同一档中添加可选奖励'
  for (const reward of form.value.rewards) {
    if (!reward.label.trim()) return '请填写每档奖励名称'
    if (reward.kind !== 'daily' && (!Number.isInteger(reward.threshold) || reward.threshold < 1 || reward.threshold > 100000)) return '人数或累计天数必须为 1～100000 的整数'
    if (reward.options.length < 1 || reward.options.length > 3 || new Set(reward.options.map(option => option.type)).size !== reward.options.length) return '每档需要 1～3 个不同类型的可选奖励'
    for (const option of reward.options) {
      if (!Number.isFinite(option.value) || option.value <= 0 || (option.type !== 'time' && (!Number.isInteger(option.value) || option.value > 10000000)) || (option.type === 'time' && (option.value > 87600 || Math.abs(option.value * 100 - Math.round(option.value * 100)) > 0.00001))) return '奖励点数需为 1～10000000 的整数；时长需大于 0、最多 87600 小时，且最多两位小数'
    }
  }
  return ''
}
async function removeActivity(item: ActivityConfig) {
  if (!item.id || !item.canDelete || deleting.value) return
  deleting.value = item.id
  try {
    await activitiesApi.remove(item.id, props.token)
    message.success('活动已删除，已发奖励和领取记录已保留')
    notifyWelfareChanged()
    await load()
  } catch (err) { error.value = activityError(err) }
  finally { deleting.value = undefined }
}
async function save() {
  if (saving.value || uploading.value) return
  formError.value = validate()
  if (formError.value) return
  saving.value = true
  try {
    const payload = JSON.parse(JSON.stringify(form.value)) as ActivityConfig
    delete payload.hasParticipation
    delete payload.canDelete
    delete payload.status
    await activitiesApi.save(payload, props.token)
    message.success('活动已保存')
    open.value = false
    notifyWelfareChanged()
    await load()
  } catch (err) { formError.value = activityError(err) }
  finally { saving.value = false }
}
async function uploadBackground(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || uploading.value || saving.value) return
  uploading.value = true
  formError.value = ''
  try {
    const image = await prepareActivityImage(file)
    form.value.backgroundUrl = (await activitiesApi.uploadBackground(image, props.token)).url
    message.success('背景已上传，请保存活动以生效')
  } catch (err) { formError.value = activityError(err) }
  finally { uploading.value = false; input.value = '' }
}
onMounted(load)
</script>

<style scoped>
.admin-activity-toolbar, .admin-reward-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.admin-activity-toolbar h2, .admin-reward-title h3 { margin: 0 0 4px; }
.admin-activity-toolbar p, .muted { color: #64748b; font-size: 13px; line-height: 1.7; margin: 4px 0; }
.admin-activity-notice { margin-bottom: 18px; }
.activity-editor { padding-top: 12px; }
.background-preview { overflow: hidden; max-width: 480px; border-radius: 8px; margin-bottom: 12px; }
.background-preview > span { display: block; padding: 30px; text-align: center; background: #f5f7f6; color: #819077; }
.background-file-input { display: none; }
.activity-editor :deep(.ant-input-number) { width: 100%; }
.rule-section { border: 1px solid #dbe4ef; border-radius: 8px; padding: 18px 16px 0; margin-bottom: 24px; }
.rule-section legend { width: auto; padding: 0 8px; margin: 0; font-size: 15px; font-weight: 600; }
.rule-section .muted { margin-bottom: 16px; }
.admin-reward { padding: 18px 16px; margin-bottom: 18px; border: 1px solid #dbe4ef; border-radius: 8px; }
.admin-option { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(80px, 1fr) 34px 60px; align-items: center; gap: 8px; margin-bottom: 12px; }
@media (max-width: 600px) {
  .admin-activity-toolbar { align-items: flex-start; flex-direction: column; }
  .admin-reward { padding: 14px 10px; }
  .admin-option { grid-template-columns: minmax(0, 1fr) 95px 30px; }
  .admin-option > .ant-btn { grid-column: 3; padding: 0; }
}
</style>
