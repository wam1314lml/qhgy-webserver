<script lang="ts" setup>
const { email, username, password } = defineProps<{
  email: string
  username: string
  password: string
}>()
</script>

<template>
  <div class="register-success-content">
    <div class="rounded overflow-hidden border border-solid border-gray-2">
      <div class="item-row">
        <div class="label">邮箱</div>
        <div class="value">{{ email }}</div>
      </div>
      <div class="item-row">
        <div class="label">账号</div>
        <div class="value">{{ username }}</div>
      </div>
      <div class="item-row">
        <div class="label">密码</div>
        <div class="value">{{ password }}</div>
      </div>
    </div>
    <div class="text-red font-800 my-5 text-center">请截图保存，若遗忘账号密码将无法找回。</div>
  </div>
</template>

<style lang="scss">
.register-success-content {
  margin: 12px 0;
  .item-row {
    display: flex;
    &:last-child {
      .label,
      .value {
        border-bottom: none;
      }
    }
  }
  .label,
  .value {
    border-bottom: 1px solid #eee;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .label {
    width: 80px;
    background-color: #fafafa;
    border-right: 1px solid #eee;
  }
  .value {
    flex: 1;
  }
}
</style>
