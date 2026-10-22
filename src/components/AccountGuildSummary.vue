<template>
  <section class="account-guild" aria-label="公会信息">
    <template v-if="guild.status === 'joined'">
      <div class="guild-header">
        <div class="guild-avatar" role="img" aria-label="公会徽章">
          <template v-if="art.avatar && !avatarFailed">
            <img class="guild-avatar-bg" :src="art.avatar.background" :style="art.avatar.backgroundStyle" alt="" @error="avatarFailed = true" />
            <img :src="art.avatar.texture" :style="art.avatar.textureStyle" alt="" @error="avatarFailed = true" />
            <img :src="art.avatar.icon" :style="art.avatar.iconStyle" alt="" @error="avatarFailed = true" />
            <img class="guild-avatar-mask-check" :src="art.avatar.mask" alt="" @error="avatarFailed = true" />
          </template>
          <span v-else class="guild-avatar-fallback">会</span>
        </div>
        <div class="guild-identity">
          <div class="guild-name-row">
            <a-tooltip :title="guild.name || '名称待同步'" :trigger="['hover', 'click']">
              <strong class="guild-name" tabindex="0">{{ guild.name || '名称待同步' }}</strong>
            </a-tooltip>
            <span v-if="guild.level !== null" class="guild-level" :aria-label="`公会${guild.level}级`">
              <b>{{ guild.level }}</b>
            </span>
            <span v-if="art.title?.src && !titleFailed" class="guild-title-badge" :aria-label="art.title.name" :title="art.title.name">
              <img :src="art.title.src" alt="" @error="titleFailed = true" />
              <span :style="{ color: art.title.color, textShadow: `0 1px 1px ${art.title.outline}, 1px 0 1px ${art.title.outline}, -1px 0 1px ${art.title.outline}, 0 -1px 1px ${art.title.outline}` }">{{ art.title.name }}</span>
            </span>
            <span v-else-if="art.title?.name || guild.titleName" class="guild-title-text">{{ art.title?.name || guild.titleName }}</span>
          </div>
          <div class="guild-id">ID {{ guild.id || '—' }}<span v-if="!online" class="guild-snapshot">上次同步</span></div>
        </div>
      </div>
    </template>
    <div v-else class="guild-empty"><span class="guild-empty-mark">会</span>{{ guild.status === 'not_joined' ? '尚未加入公会' : '公会信息待同步' }}</div>
    <div class="guild-stats">
      <template v-if="guild.status === 'joined'">
        <a-tooltip :title="`成员人数 / 容量：${guildNumber(guild.members)} / ${guildNumber(guild.capacity)}`" :trigger="['hover', 'click']">
          <span tabindex="0" aria-label="成员人数"><small>人数</small>{{ guildNumber(guild.members) }}/{{ guildNumber(guild.capacity) }}</span>
        </a-tooltip>
        <a-tooltip :title="`公会财富：${guildNumber(guild.wealth)}`" :trigger="['hover', 'click']">
          <span tabindex="0" aria-label="公会财富"><small>财富</small>{{ guildWealth(guild.wealth) }}</span>
        </a-tooltip>
        <a-tooltip :title="`公会币：${guildNumber(guild.guildCoin)}`" :trigger="['hover', 'click']">
          <span tabindex="0" aria-label="公会币"><small>公会币</small>{{ guildNumber(guild.guildCoin) }}</span>
        </a-tooltip>
      </template>
      <a-tooltip :title="`公会竞赛：${raceCount}`" :trigger="['hover', 'click']">
        <span class="guild-race" tabindex="0" aria-label="公会竞赛"><small>竞赛</small><b>{{ raceCount }}</b></span>
      </a-tooltip>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { accountGuild, guildArtwork, guildNumber, guildWealth } from '../utils/accountGuild'
const props = defineProps<{ record?: unknown; online?: boolean; race?: { usedTaskNum?: number; totalTaskNum?: number } }>()
const guild = computed(() => accountGuild(props.record))
const raceCount = computed(() => `${props.race?.usedTaskNum ?? 0}/${props.race?.totalTaskNum ?? 0}`)
const art = computed(() => guildArtwork(guild.value))
const avatarFailed = ref(false)
const titleFailed = ref(false)
watch(() => [guild.value.id, guild.value.icon], () => { avatarFailed.value = false })
watch(() => [guild.value.id, guild.value.titleId], () => { titleFailed.value = false })
</script>

<style scoped>
.account-guild{min-width:0;margin:8px 0 6px;padding:7px 9px;border:1px solid #e4dfce;border-radius:10px;background:linear-gradient(110deg,#edf7ff,#f7fbfe);color:#19375c}
.guild-header{display:flex;align-items:center;gap:8px;width:fit-content;max-width:100%;margin:0 auto}.guild-identity{min-width:0;flex:0 1 auto}.guild-name-row{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:3px}.guild-name{font-size:12px;line-height:20px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;max-width:100%;cursor:default}.guild-id{font-size:10px;line-height:15px;color:#6b8297;overflow-wrap:anywhere}.guild-snapshot{margin-left:8px;color:#8395a4}
.guild-avatar{position:relative;flex:none;width:36px;height:36px;display:grid;place-items:center}.guild-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.guild-avatar-bg{mask-size:contain;mask-position:center;mask-repeat:no-repeat}.guild-avatar-fallback{font-size:18px;color:#a48b61;background:#f5efde;border-radius:10px;padding:2px 7px}.guild-level{position:relative;display:inline-grid;place-items:center;flex:none;width:18px;height:21px;color:#a26718;font-size:10px}.guild-level img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.guild-level b{position:relative}.guild-title{width:72px;height:22px;object-fit:contain}
.guild-title-text{font-size:10px;padding:1px 5px;border-radius:4px;background:#efe5fa;color:#76569d}
.guild-avatar img{inset:auto;left:50%;top:50%;transform:translate(-50%,-50%)}.guild-avatar-bg{mask-mode:alpha}.guild-avatar-mask-check{visibility:hidden}
.guild-title-badge{position:relative;display:inline-grid;place-items:center;width:100px;height:38px;flex:none}.guild-title-badge img{position:absolute;width:100%;height:100%;object-fit:contain}.guild-title-badge>span{position:relative;margin-left:18%;max-width:78%;white-space:nowrap;font-size:10px;font-weight:600;line-height:16px}
.guild-stats{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:5px 8px;margin-top:5px;font-variant-numeric:tabular-nums}.guild-stats>span{display:inline-flex;align-items:center;gap:4px;font-size:11px;line-height:18px;min-width:0;overflow-wrap:anywhere;cursor:default}.guild-stats img{width:17px;height:17px;object-fit:contain;flex:none}.guild-stats small{font-size:10px;color:#708698}.guild-race{margin-left:auto}.guild-race b{font-weight:600}
.guild-empty{display:flex;align-items:center;gap:6px;color:#708698;font-size:11px;line-height:20px}.guild-empty-mark{font-size:10px;color:#9a8567;border:1px solid #dbc9ae;border-radius:5px;padding:0 3px;line-height:15px}
</style>
