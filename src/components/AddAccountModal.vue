<template>
  <a-modal
    :open="isOpen"
    :title="'添加游戏账号'"
    :footer="null"
    :width="700"
    :mask-closable="false"
    centered
    @cancel="handleClose"
    class="add-account-modal-antd"
  >
    <div class="modal-content">
      <!-- 步骤指示器 -->
      <a-steps :current="currentStepIndex" class="custom-steps" size="small">
        <a-step v-for="step in steps" :key="step.key" :title="step.title" />
      </a-steps>

      <!-- 步骤内容 -->
      <div class="step-content">
        <!-- 选择渠道 -->
        <div v-if="currentStep === 'channel'" class="step-panel">
          <h4>选择游戏渠道</h4>
          <a-radio-group v-model:value="selectedChannel" class="channel-options">
            <!-- 暂时隐藏账号密码和支付宝入口；抖音保留展示但不可选择。 -->
            <a-radio :value="2" disabled class="channel-option is-disabled" title="抖音暂未开放">
              <div class="channel-content">
                <div class="channel-icon-wrapper channel-icon-douyin">
                  <img src="/icons/douyin.svg" alt="抖音" class="channel-icon" />
                  <span class="official-badge">官方</span>
                </div>
              </div>
            </a-radio>
            <a-radio :value="3" class="channel-option">
              <div class="channel-content">
                <div class="channel-icon-wrapper">
                  <img src="/icons/wechat.svg" alt="微信" class="channel-icon" />
                </div>
              </div>
            </a-radio>
          </a-radio-group>
        </div>

        <!-- 登录 -->
        <div v-if="currentStep === 'login'" class="step-panel">
          <h4>登录游戏账号</h4>

          <!-- 抖音扫码登录界面 -->
          <div v-if="selectedChannel === 2" class="alipay-login">
            <div v-if="isDouyinQrLoading" class="scan-qrcode-loading">
              <p class="scan-qrcode-loading-text">正在获取二维码...</p>
              <div
                class="scan-qrcode-progress"
                role="progressbar"
                :aria-valuenow="douyinQrProgress"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="scan-qrcode-progress-bar"
                  :style="{ width: `${douyinQrProgress}%` }"
                ></div>
              </div>
            </div>
            <div v-else-if="!douyinQrB64" class="qrcode-placeholder">
              <p>点击"获取二维码"开始抖音扫码登录</p>
            </div>
            <div v-else class="qrcode-container">
              <h5>请使用抖音扫描二维码，无法通过相册截图扫码</h5>
              <div class="qrcode-display">
                <div class="qrcode-wrapper">
                  <div class="qrcode-content">
                    <img
                      :src="`data:image/png;base64,${douyinQrB64}`"
                      alt="抖音二维码"
                      style="width: 200px; height: 200px; border-radius: 8px"
                    />
                    <p class="qrcode-status-text">
                      <span v-if="douyinScanStatus === 'waiting'">⏳ 等待扫码中...</span>
                      <span v-else-if="douyinScanStatus === 'scanned'"
                        >✅ 已扫码，请在手机上确认</span
                      >
                      <span v-else-if="douyinScanStatus === 'finalizing'"
                        >⏳ 已确认，正在换取登录态...</span
                      >
                      <span v-else-if="douyinScanStatus === 'confirmed'">🎉 扫码成功！</span>
                      <span v-else-if="douyinScanStatus === 'expired'" style="color: #ff4d4f"
                        >⚠️ 二维码已过期，请重新获取</span
                      >
                      <span v-else-if="douyinScanStatus === 'error'" style="color: #ff4d4f"
                        >❌ 扫码失败，请重试</span
                      >
                    </p>
                    <!-- 短信验证码 -->
                    <div
                      v-if="douyinScanStatus === 'verify_sms'"
                      class="sms-verify-box"
                      style="margin-top: 12px"
                    >
                      <p style="color: #faad14">{{ douyinSmsMsg || '请输入短信验证码' }}</p>
                      <div style="display: flex; gap: 8px; margin-top: 8px">
                        <a-input
                          v-model:value="douyinSmsCode"
                          placeholder="短信验证码"
                          maxlength="6"
                          style="flex: 1"
                        />
                        <a-button :loading="douyinSmsSubmitting" @click="handleDouyinSmsVerify"
                          >提交</a-button
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="qrcode-status">
                <p v-if="isDouyinPolling" style="color: #1890ff">请在2分钟内完成扫码...</p>
                <p v-else-if="douyinLoginDone" style="color: #52c41a">✅ 扫码登录成功！</p>
              </div>
            </div>
          </div>

          <!-- 支付宝扫码登录界面 -->
          <div v-else-if="selectedChannel === 1" class="alipay-login">
            <div v-if="isAlipayQrLoading" class="scan-qrcode-loading">
              <p class="scan-qrcode-loading-text">正在获取二维码...</p>
              <div
                class="scan-qrcode-progress"
                role="progressbar"
                :aria-valuenow="alipayQrProgress"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="scan-qrcode-progress-bar"
                  :style="{ width: `${alipayQrProgress}%` }"
                ></div>
              </div>
            </div>
            <div v-else-if="!qrcodeUrl" class="qrcode-placeholder">
              <p>点击"获取二维码"开始支付宝扫码登录</p>
            </div>
            <div v-else class="qrcode-container">
              <h5>请使用支付宝扫描二维码</h5>
              <div class="qrcode-display">
                <div class="qrcode-wrapper">
                  <div v-if="qrcodeImage" class="qrcode-content">
                    <!-- 使用Ant Design的QRCode组件 -->
                    <a-qrcode :value="qrcodeImage" :size="200" />
                    <p class="qrcode-status-text">
                      {{ isPolling ? '⏳ 等待扫码中...' : '📱 请使用支付宝扫描二维码' }}
                    </p>
                  </div>
                  <div v-else class="qrcode-loading">二维码加载中...</div>
                </div>
              </div>

              <div class="qrcode-status">
                <p v-if="isPolling" style="color: #1890ff">请在2分钟内完成扫码...</p>
                <p v-else-if="alipayLoginData" style="color: #52c41a">✅ 扫码登录成功！</p>
                <p v-else style="color: #faad14">📱 请使用支付宝扫描上方二维码</p>
              </div>
            </div>
          </div>

          <!-- 微信扫码登录界面 -->
          <div v-else-if="selectedChannel === 3" class="alipay-login">
            <div v-if="isWxQrLoading" class="scan-qrcode-loading">
              <p class="scan-qrcode-loading-text">正在获取微信二维码...</p>
            </div>
            <div v-else-if="!wxQrcodeImage" class="qrcode-placeholder">
              <p>点击"获取二维码"开始微信扫码登录</p>
            </div>
            <div v-else class="qrcode-container">
              <h5>请使用微信扫描二维码并在手机上确认</h5>
              <div class="qrcode-display">
                <div class="qrcode-wrapper">
                  <div class="qrcode-content">
                    <img
                      :src="wxQrcodeImage"
                      alt="微信登录二维码"
                      style="width: 200px; height: 200px; border-radius: 8px"
                    />
                    <p class="qrcode-status-text">
                      <span v-if="wxScanStatus === 'pending'">⏳ 等待微信扫码...</span>
                      <span v-else-if="wxScanStatus === 'scanned'"
                        >✅ 已扫码，正在获取角色信息...</span
                      >
                      <span v-else-if="wxScanStatus === 'completed'">🎉 扫码成功！</span>
                      <span v-else-if="wxScanStatus === 'expired'" style="color: #ff4d4f"
                        >⚠️ 二维码已过期，请重新获取</span
                      >
                      <span v-else-if="wxScanStatus === 'error'" style="color: #ff4d4f"
                        >❌ 扫码失败，请重试</span
                      >
                    </p>
                  </div>
                </div>
              </div>

              <div class="qrcode-status">
                <p v-if="isWxPolling" style="color: #1890ff">请在5分钟内完成扫码...</p>
                <p v-else-if="wxLoginData" style="color: #52c41a">✅ 已取得角色区服，请继续</p>
              </div>
            </div>
          </div>

          <!-- 账号密码登录界面 -->
          <div v-else class="password-login">
            <a-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              layout="vertical"
              class="login-form mt-5"
            >
              <a-form-item label="游戏账号" name="username" class="form-group">
                <a-input
                  v-model:value.trim="loginForm.username"
                  placeholder="请输入游戏账号"
                  class="form-input"
                  size="large"
                />
              </a-form-item>
              <a-form-item label="游戏密码" name="password" class="form-group">
                <a-input-password
                  v-model:value.trim="loginForm.password"
                  placeholder="请输入游戏密码"
                  class="form-input"
                  size="large"
                />
              </a-form-item>
            </a-form>
          </div>
        </div>

        <!-- 选择区服 -->
        <div v-if="currentStep === 'server'" class="step-panel">
          <a-form
            ref="serverFormRef"
            :model="serverForm"
            :rules="serverRules"
            layout="vertical"
            class="server-form"
          >
            <a-form-item label="游戏区服" name="server" class="form-group">
              <a-select
                v-model:value="serverForm.server"
                placeholder="请选择游戏区服"
                size="large"
                class="form-input"
                :loading="!Array.isArray(serverList) || serverList.length === 0"
                :filter-option="filterServerOption"
                @change="handleServerChange"
              >
                <a-select-option
                  v-for="(server, index) in serverList"
                  :key="index"
                  :value="server.serverId"
                  :label="`${server.serverName} ${server.roleName || ''} (ID: ${server.serverId})`"
                >
                  <div class="server-option">
                    <span class="server-name text-4!">{{ server.serverName }}</span>
                    <span v-if="server.roleName" style="margin-left: 10px; color: #52c41a">
                      {{ server.roleName }}
                    </span>
                  </div>
                </a-select-option>
              </a-select>
            </a-form-item>
            <div v-if="!Array.isArray(serverList) || serverList.length === 0" class="no-servers">
              <p>暂无可用服务器</p>
              <p class="server-hint">请检查游戏账号信息是否正确</p>
            </div>
          </a-form>

          <div v-if="selectedChannel !== 3" class="script-server-info">
            <p>自动为您分配最优的服务器</p>
            <div v-if="selectedScriptServer" class="selected-server">
              <span>已选择: {{ selectedScriptServer.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="modal-actions">
        <a-button
          v-if="currentStep !== 'channel'"
          class="btn btn-secondary"
          @click="handlePreviousStep"
          :disabled="loading"
          size="large"
        >
          上一步
        </a-button>

        <!-- 简单的测试按钮 -->
        <!-- <a-button
            @click="simpleTestButton"
            style="
              padding: 12px 24px;
              background-color: #ef4444;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              margin-right: 10px;
            "
          >
            简单测试
          </a-button> -->

        <a-button
          @click="handleMainButton"
          :disabled="
            loading ||
            isDouyinQrLoading ||
            isAlipayQrLoading ||
            isWxQrLoading ||
            (isPolling && !alipayLoginData) ||
            (isWxPolling && !wxLoginData) ||
            (isDouyinPolling && !douyinLoginDone)
          "
          type="primary"
          size="large"
        >
          {{
            currentStep === 'login' && selectedChannel === 2 && isDouyinQrLoading
              ? '正在获取二维码...'
              : currentStep === 'login' && selectedChannel === 1 && isAlipayQrLoading
                ? '正在获取二维码...'
                : loading
                  ? '处理中...'
                  : currentStep === 'server'
                    ? '确认绑定'
                    : currentStep === 'login' && selectedChannel === 1
                      ? qrcodeUrl
                        ? alipayLoginData
                          ? '进入服务器选择'
                          : isPolling
                            ? '等待扫码中...'
                            : '重新扫码'
                        : '获取二维码'
                      : currentStep === 'login' && selectedChannel === 2
                        ? douyinQrB64
                          ? douyinLoginDone
                            ? '进入服务器选择'
                            : isDouyinPolling
                              ? '等待扫码中...'
                              : '重新扫码'
                          : '获取二维码'
                        : currentStep === 'login' && selectedChannel === 3
                          ? wxQrcodeImage
                            ? wxLoginData
                              ? '进入服务器选择'
                              : isWxPolling
                                ? '等待扫码中...'
                                : '重新扫码'
                            : '获取二维码'
                          : '下一步'
          }}
        </a-button>
      </div>
    </div>
  </a-modal>

  <a-modal
    v-model:open="loginProgressVisible"
    title="正在登录"
    :footer="null"
    :closable="false"
    :mask-closable="false"
    centered
    width="420px"
    class="login-progress-modal-wrap"
  >
    <div class="login-progress-modal">
      <p class="login-progress-message">{{ loginProgressMessage }}</p>
      <a-progress
        :percent="loginProgressPercent"
        :status="loginProgressStatus"
        :stroke-color="loginProgressStatus === 'success' ? '#52c41a' : undefined"
      />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import axios from '../utils/axios'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'

// 支付宝登录数据接口（新接口）
interface AlipayLoginData {
  userId: string
  uid: string
  authCode: string
  ctoken?: string
  pcwebToken?: string
  alipayRealUserId?: string // 支付宝真实ID，用于生成稳定的parent_id
  servers?: Array<{ serverId: string; serverName: string }>
}

// MD5哈希函数 (使用简单的MD5实现，返回24位哈希)
const generateMD5Hash = (input: string): string => {
  // 简单的MD5实现
  function md5(input: string): string {
    function rotateLeft(value: number, amount: number): number {
      return (value << amount) | (value >>> (32 - amount))
    }

    function addUnsigned(x: number, y: number): number {
      const lsw = (x & 0xffff) + (y & 0xffff)
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
      return (msw << 16) | (lsw & 0xffff)
    }

    function F(x: number, y: number, z: number): number {
      return (x & y) | (~x & z)
    }
    function G(x: number, y: number, z: number): number {
      return (x & z) | (y & ~z)
    }
    function H(x: number, y: number, z: number): number {
      return x ^ y ^ z
    }
    function I(x: number, y: number, z: number): number {
      return y ^ (x | ~z)
    }

    function FF(
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number,
    ): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac))
      return addUnsigned(rotateLeft(a, s), b)
    }

    function GG(
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number,
    ): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac))
      return addUnsigned(rotateLeft(a, s), b)
    }

    function HH(
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number,
    ): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac))
      return addUnsigned(rotateLeft(a, s), b)
    }

    function II(
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      ac: number,
    ): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac))
      return addUnsigned(rotateLeft(a, s), b)
    }

    function convertToWordArray(input: string): number[] {
      const lMessageLength = input.length
      const lNumberOfWords_temp1 = lMessageLength + 8
      const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64
      const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16
      const lWordArray: number[] = []
      let lBytePosition = 0
      let lByteCount = 0
      let lWordCount = 0

      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4
        lBytePosition = (lByteCount % 4) * 8
        lWordArray[lWordCount] =
          lWordArray[lWordCount] | (input.charCodeAt(lByteCount) << lBytePosition)
        lByteCount++
      }

      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29

      return lWordArray
    }

    function wordToHex(lValue: number): string {
      let wordToHexValue = ''
      let wordToHexValue_temp = ''
      let lByte: number
      let lCount: number

      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255
        wordToHexValue_temp = '0' + lByte.toString(16)
        wordToHexValue =
          wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2)
      }

      return wordToHexValue
    }

    const x = convertToWordArray(input)
    let a = 0x67452301
    let b = 0xefcdab89
    let c = 0x98badcfe
    let d = 0x10325476

    for (let k = 0; k < x.length; k += 16) {
      const AA = a
      const BB = b
      const CC = c
      const DD = d
      a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478)
      d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756)
      c = FF(c, d, a, b, x[k + 2], 17, 0x242070db)
      b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee)
      a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf)
      d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a)
      c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613)
      b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501)
      a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8)
      d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af)
      c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1)
      b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be)
      a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122)
      d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193)
      c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e)
      b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821)
      a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562)
      d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340)
      c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51)
      b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa)
      a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d)
      d = GG(d, a, b, c, x[k + 10], 9, 0x2441453)
      c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681)
      b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8)
      a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6)
      d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6)
      c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87)
      b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed)
      a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905)
      d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8)
      c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9)
      b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a)
      a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942)
      d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681)
      c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122)
      b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c)
      a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44)
      d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9)
      c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60)
      b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70)
      a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6)
      d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa)
      c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085)
      b = HH(b, c, d, a, x[k + 6], 23, 0x4881d05)
      a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039)
      d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5)
      c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8)
      b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665)
      a = II(a, b, c, d, x[k + 0], 6, 0xf4292244)
      d = II(d, a, b, c, x[k + 7], 10, 0x432aff97)
      c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7)
      b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039)
      a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3)
      d = II(d, a, b, c, x[k + 9], 10, 0x8f0ccc92)
      c = II(c, d, a, b, x[k + 6], 15, 0xffeff47d)
      b = II(b, c, d, a, x[k + 3], 21, 0x85845dd1)
      a = II(a, b, c, d, x[k + 10], 6, 0x6fa87e4f)
      d = II(d, a, b, c, x[k + 1], 10, 0xfe2ce6e0)
      c = II(c, d, a, b, x[k + 8], 15, 0xa3014314)
      b = II(b, c, d, a, x[k + 15], 21, 0x4e0811a1)
      a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82)
      d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235)
      c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb)
      b = II(b, c, d, a, x[k + 13], 21, 0xeb86d391)
      a = addUnsigned(a, AA)
      b = addUnsigned(b, BB)
      c = addUnsigned(c, CC)
      d = addUnsigned(d, DD)
    }

    const temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
    return temp.toLowerCase()
  }

  // 生成32位MD5，然后缩短到24位
  const fullMd5 = md5(input)
  // 取前24位字符
  return fullMd5.substring(0, 24)
}

interface ScriptServer {
  id: string
  name: string
  ip: string
  port: number
  maxAccounts: number
  currentAccounts: number
  status: string
}

interface ServerInfo {
  serverId: string
  serverName: string
  roleName?: string
  roleUpdatedAt?: number
}

interface WxLoginData {
  flowId: string
  servers: ServerInfo[]
  nickname?: string
}

interface Props {
  isOpen: boolean
  token: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  success: []
}>()

const currentStep = ref<'channel' | 'login' | 'server'>('channel')

// 步骤定义
const steps = [
  { title: '选择渠道', key: 'channel' },
  { title: '登录', key: 'login' },
  { title: '选择区服', key: 'server' },
  // { title: '绑定账号', key: 'bind' }
]

// 计算当前步骤索引
const currentStepIndex = computed(() => {
  return steps.findIndex((step) => step.key === currentStep.value)
})

// 表单引用和数据
const loginFormRef = ref<FormInstance>()
const loginForm = ref({
  username: '',
  password: '',
})

const serverFormRef = ref<FormInstance>()
const serverForm = ref({
  server: undefined as string | undefined,
})

// 表单验证规则
const loginRules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入游戏用户名', trigger: 'blur' },
    { min: 1, max: 50, message: '用户名长度应在1-50字符之间', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入游戏密码', trigger: 'blur' },
    { min: 1, max: 100, message: '密码长度应在1-100字符之间', trigger: 'blur' },
  ],
}

const serverRules: Record<string, Rule[]> = {
  server: [{ required: true, message: '请选择游戏区服', trigger: 'change' }],
}

// 保持向后兼容的引用
const username = computed({
  get: () => loginForm.value.username,
  set: (value: string) => {
    loginForm.value.username = value
  },
})
const password = computed({
  get: () => loginForm.value.password,
  set: (value: string) => {
    loginForm.value.password = value
  },
})
const selectedChannel = ref<number>(3)
const selectedServer = ref<ServerInfo | null>(null)
const serverList = ref<ServerInfo[]>([])
const loading = ref(false)
const loginProgressVisible = ref(false)
const loginProgressPercent = ref(0)
const loginProgressStatus = ref<'active' | 'success' | 'exception'>('active')
const loginProgressMessage = ref('正在验证账号密码，请稍候...')
let loginProgressTimer: ReturnType<typeof setInterval> | null = null
const scriptServers = ref<ScriptServer[]>([])
const selectedScriptServer = ref<ScriptServer | null>(null)
const uid = ref<string>('')
const gameToken = ref<string>('')
const nickname = ref<string>('')

// 支付宝扫码相关状态
const qrcodeUrl = ref<string>('')
const qrcodeImage = ref<string>('')
const isPolling = ref(false)
const alipayLoginData = ref<AlipayLoginData | null>(null)
const isAlipayQrLoading = ref(false)
const alipayQrProgress = ref(0)
let alipayQrProgressTimer: ReturnType<typeof setInterval> | null = null
let alipayQrRevealTimer: ReturnType<typeof setTimeout> | null = null
let alipayQrLoadingStartedAt = 0
const QR_MIN_LOADING_MS = 1400

// 微信扫码只在浏览器保存后端签发的短期 flowId；敏感登录凭据始终留在服务端。
const wxFlowId = ref<string>('')
const wxQrcodeImage = ref<string>('')
const wxScanStatus = ref<'pending' | 'scanned' | 'completed' | 'expired' | 'error' | ''>('')
const isWxQrLoading = ref(false)
const isWxPolling = ref(false)
const wxLoginData = ref<WxLoginData | null>(null)
let wxPollTimer: ReturnType<typeof setInterval> | null = null
let wxPollInFlight = false
let wxPollErrors = 0
let wxPollDeadlineAt = 0
const WX_POLL_WINDOW_MS = 5 * 60 * 1000
const WX_POLL_REQUEST_TIMEOUT_MS = 50 * 1000

// 抖音扫码相关状态
const douyinSid = ref<string>('')
const douyinQrB64 = ref<string>('')
const isDouyinQrLoading = ref(false)
const douyinQrProgress = ref(0)
const douyinScanStatus = ref<string>('')
const douyinSmsMsg = ref<string>('')
const douyinSmsCode = ref<string>('')
const douyinSmsSubmitting = ref(false)
const isDouyinPolling = ref(false)
const douyinLoginDone = ref(false)
const douyinDyToken = ref<string>('') // 续期后的 dyToken
const douyinServers = ref<any[]>([]) // 扫码后拿到的服务器列表
const douyinUid = ref<string>('') // 抖音稳定 uid
let douyinPollTimer: ReturnType<typeof setInterval> | null = null
let douyinBindingInProgress = false // 防重：确保 handleDouyinAfterScan 只触发一次
let douyinQrProgressTimer: ReturnType<typeof setInterval> | null = null
let douyinQrRevealTimer: ReturnType<typeof setTimeout> | null = null
let douyinQrLoadingStartedAt = 0

// 获取服务器列表
const fetchScriptServers = async () => {
  try {
    console.log('🔍 开始获取服务器列表...')
    const response = await axios.get('/api/game-accounts/script-servers')

    console.log('📡 服务器响应:', response.data)

    if (response.data.success) {
      scriptServers.value = response.data.data
      // 自动选择第一个可用的服务器
      if (response.data.data.length > 0) {
        selectedScriptServer.value = response.data.data[0]
        console.log('✅ 已选择服务器:', response.data.data[0])
      } else {
        console.warn('⚠️ 没有可用的服务器')
        message.warning('没有可用的服务器，请联系管理员')
      }
    } else {
      console.error('❌ 获取服务器失败:', response.data.message)
      message.error('获取服务器失败: ' + response.data.message)
    }
  } catch (error: any) {
    console.error('❌ 获取服务器失败:', error)
    if (error.response?.status === 401) {
      message.error('认证失败，请重新登录')
    } else if (error.response?.status === 500) {
      message.error('服务器内部错误，请稍后重试')
    } else {
      message.error('网络错误，请检查网络连接')
    }
  }
}

const handleNextStep = async () => {
  switch (currentStep.value) {
    case 'channel':
      if (selectedChannel.value === 3) {
        currentStep.value = 'login'
      } else {
        message.warning('当前仅支持微信渠道，请选择微信')
        return
      }
      break
    case 'login':
      // 如果是支付宝渠道，使用扫码登录
      if (selectedChannel.value === 1) {
        // 如果已经有支付宝登录数据，直接跳转到下一步
        if (alipayLoginData.value) {
          console.log('🎉 支付宝已登录，直接跳转到服务器选择')
          currentStep.value = 'server'
          return
        }
        await handleLogin()
      } else if (selectedChannel.value === 2) {
        // 抖音渠道
        if (douyinLoginDone.value) {
          currentStep.value = 'server'
          return
        }
        await handleLogin()
      } else if (selectedChannel.value === 3) {
        // 微信扫码完成后可进入角色区服选择。
        if (wxLoginData.value) {
          currentStep.value = 'server'
          return
        }
        await handleLogin()
      } else {
        try {
          await loginFormRef.value?.validateFields()
          await handleLogin()
        } catch (error) {
          console.log('表单验证失败:', error)
          // 验证失败时不继续执行，Ant Design Vue会自动显示错误信息
          return
        }
      }
      break
    case 'server':
      try {
        await serverFormRef.value?.validateFields()
        if (!selectedServer.value) {
          message.error('请选择游戏区服')
          return
        }
        if (selectedChannel.value !== 3 && !selectedScriptServer.value) {
          message.error('请等待服务器加载完成')
          return
        }
        // 支付宝(1)、抖音(2)和微信(3)扫码登录不需要检查uid和gameToken，其他渠道需要
        if (
          selectedChannel.value !== 1 &&
          selectedChannel.value !== 2 &&
          selectedChannel.value !== 3 &&
          (!uid.value || !gameToken.value)
        ) {
          message.error('游戏账号信息不完整，请重新登录')
          return
        }
        // 直接进行绑定
        await handleBind()
      } catch (error) {
        console.log('服务器选择验证失败:', error)
        // 验证失败时不继续执行，Ant Design Vue会自动显示错误信息
        return
      }
      break
    default:
      console.error('未知的步骤:', currentStep.value)
      break
  }
}

const clearLoginProgressTimer = () => {
  if (loginProgressTimer) {
    clearInterval(loginProgressTimer)
    loginProgressTimer = null
  }
}

const resetLoginProgress = () => {
  clearLoginProgressTimer()
  loginProgressVisible.value = false
  loginProgressPercent.value = 0
  loginProgressStatus.value = 'active'
  loginProgressMessage.value = '正在验证账号密码，请稍候...'
}

const startLoginProgress = () => {
  loginProgressVisible.value = true
  loginProgressPercent.value = 0
  loginProgressStatus.value = 'active'
  loginProgressMessage.value = '正在验证账号密码，请稍候...'
  clearLoginProgressTimer()
  loginProgressTimer = setInterval(() => {
    if (loginProgressPercent.value < 90) {
      const step = loginProgressPercent.value < 60 ? 8 : 3
      loginProgressPercent.value = Math.min(90, loginProgressPercent.value + step)
    }
  }, 200)
}

const finishLoginProgressSuccess = async () => {
  clearLoginProgressTimer()
  loginProgressPercent.value = 100
  loginProgressStatus.value = 'success'
  loginProgressMessage.value = '登录成功'
  await new Promise((resolve) => setTimeout(resolve, 600))
  loginProgressVisible.value = false
}

const finishLoginProgressError = async (errorMessage: string) => {
  clearLoginProgressTimer()
  loginProgressStatus.value = 'exception'
  loginProgressMessage.value = errorMessage
  await new Promise((resolve) => setTimeout(resolve, 1200))
  resetLoginProgress()
}

const handleLogin = async () => {
  // 如果是支付宝渠道，使用扫码登录
  if (selectedChannel.value === 1) {
    await handleAlipayLogin()
    return
  }
  // 抖音渠道
  if (selectedChannel.value === 2) {
    await handleDouyinLogin()
    return
  }

  // 微信渠道使用服务端状态化扫码流程。
  if (selectedChannel.value === 3) {
    await handleWxLogin()
    return
  }

  // 其他渠道使用账号密码登录
  loading.value = true
  startLoginProgress()
  try {
    const response = await axios.post('/api/game-accounts/login', {
      username: username.value,
      password: password.value.trim(),
      platform: selectedChannel.value, // 传递 platform 参数
    })

    if (response.data.success) {
      const { server_list, uid: uidFromResponse, token: gameTokenFromResponse } = response.data.data
      console.log('🔍 登录响应数据:', response.data.data)
      console.log('📋 服务器列表:', server_list)
      console.log('🆔 UID:', uidFromResponse)
      console.log('🎫 游戏Token:', gameTokenFromResponse)

      // 新的数据结构：server_list.servers
      if (server_list && server_list.servers && Array.isArray(server_list.servers)) {
        serverList.value = server_list.servers
      } else {
        console.error('❌ server_list.servers 不是数组:', server_list)
        const errorText = '服务器获取失败'
        await finishLoginProgressError(errorText)
        message.error(errorText)
        serverList.value = []
        return
      }

      uid.value = uidFromResponse || ''
      gameToken.value = gameTokenFromResponse || ''
      nickname.value = response.data.data.nickname || ''
      await finishLoginProgressSuccess()
      currentStep.value = 'server'
    } else {
      const errorText = response.data.message || '登录失败'
      await finishLoginProgressError(errorText)
      message.error(errorText)
    }
  } catch {
    const errorText = '登录失败，请稍后重试'
    await finishLoginProgressError(errorText)
    message.error(errorText)
  } finally {
    loading.value = false
  }
}

// 支付宝扫码登录（新接口：alipay_get_qrcode2）
const clearAlipayQrLoadingTimers = () => {
  if (alipayQrProgressTimer) {
    clearInterval(alipayQrProgressTimer)
    alipayQrProgressTimer = null
  }
  if (alipayQrRevealTimer) {
    clearTimeout(alipayQrRevealTimer)
    alipayQrRevealTimer = null
  }
}

const startAlipayQrLoading = () => {
  clearAlipayQrLoadingTimers()
  isAlipayQrLoading.value = true
  alipayQrProgress.value = 0
  alipayQrLoadingStartedAt = Date.now()
  alipayQrProgressTimer = setInterval(() => {
    const step = alipayQrProgress.value < 70 ? 8 : 3
    alipayQrProgress.value = Math.min(92, alipayQrProgress.value + step)
  }, 140)
}

const finishAlipayQrLoading = (onReveal?: () => void) => {
  const elapsed = Date.now() - alipayQrLoadingStartedAt
  const waitTime = Math.max(0, QR_MIN_LOADING_MS - elapsed)

  if (alipayQrRevealTimer) clearTimeout(alipayQrRevealTimer)
  alipayQrRevealTimer = setTimeout(() => {
    if (alipayQrProgressTimer) {
      clearInterval(alipayQrProgressTimer)
      alipayQrProgressTimer = null
    }
    alipayQrProgress.value = 100

    alipayQrRevealTimer = setTimeout(() => {
      onReveal?.()
      isAlipayQrLoading.value = false
      alipayQrProgress.value = 0
      alipayQrRevealTimer = null
    }, 280)
  }, waitTime)
}

const resetAlipayQrLoading = () => {
  clearAlipayQrLoadingTimers()
  isAlipayQrLoading.value = false
  alipayQrProgress.value = 0
}

const handleAlipayLogin = async () => {
  startAlipayQrLoading()
  loading.value = true
  try {
    const qrcodeResponse = await axios.post('/api/game-accounts/alipay_get_qrcode2', {})

    if (qrcodeResponse.data.success) {
      const { qrcodeUrl: qrUrl } = qrcodeResponse.data.data
      finishAlipayQrLoading(() => {
        qrcodeUrl.value = qrUrl
        qrcodeImage.value = qrUrl
      })

      message.success('二维码生成成功，请使用支付宝扫码')

      // 开始短轮询
      startAlipayPolling()
    } else {
      resetAlipayQrLoading()
      message.error(qrcodeResponse.data.message || '获取二维码失败')
    }
  } catch (error: any) {
    resetAlipayQrLoading()
    console.error('获取二维码失败:', error)
    message.error(error.response?.data?.message || '获取二维码失败')
  } finally {
    loading.value = false
  }
}

// 开始支付宝短轮询（新接口：alipay/add2_poll，每2秒一次）
const startAlipayPolling = () => {
  isPolling.value = true
  alipayLoginData.value = null

  // 清理旧定时器
  if ((window as any)._alipayPollTimer) {
    clearInterval((window as any)._alipayPollTimer)
  }

  let pollCount = 0
  const MAX_POLLS = 60 // 最多轮询60次 = 2分钟

  const doPoll = async () => {
    try {
      pollCount++
      const response = await axios.get('/api/game-accounts/alipay/add2_poll', { timeout: 5000 })
      const { code, data } = response.data

      if (code === 'COMPLETED' && data) {
        // 扫码成功
        clearInterval((window as any)._alipayPollTimer)
        isPolling.value = false

        alipayLoginData.value = {
          userId: data.alipayRealUserId || '',
          uid: data.alipayRealUserId || '',
          authCode: data.authCode || '',
          ctoken: data.ctoken,
          pcwebToken: data.pcwebToken,
          alipayRealUserId: data.alipayRealUserId,
          servers: data.servers || [],
        }

        // 设置服务器列表
        if (data.servers && Array.isArray(data.servers) && data.servers.length > 0) {
          serverList.value = data.servers.map((s: any) => ({
            serverId: String(s.serverId),
            serverName: s.serverName,
          }))
          console.log(`✅ 已加载 ${serverList.value.length} 个服务器`)
          message.success(`扫码成功，加载了${serverList.value.length}个服务器！`)
        } else {
          serverList.value = []
          message.success('支付宝扫码登录成功！')
        }

        if (!selectedScriptServer.value) {
          await fetchScriptServers()
        }

        console.log('🎉 支付宝登录成功:', alipayLoginData.value)
        setTimeout(() => {
          currentStep.value = 'server'
        }, 500)
      } else if (code === 'EXPIRED' || code === 'NOT_FOUND' || code === 'CANCELLED') {
        clearInterval((window as any)._alipayPollTimer)
        isPolling.value = false
        const msg = response.data?.message || '二维码已过期，请重新获取'
        message.error(msg)
        qrcodeUrl.value = ''
        qrcodeImage.value = ''
      } else if (pollCount >= MAX_POLLS) {
        clearInterval((window as any)._alipayPollTimer)
        isPolling.value = false
        message.error('扫码超时，请重新获取二维码')
        qrcodeUrl.value = ''
        qrcodeImage.value = ''
      }
      // code === 'PENDING' 继续等待
    } catch (error: any) {
      const errCode = error.response?.data?.code
      const errMsg = error.response?.data?.message
      if (errCode === 'EXPIRED' || errCode === 'NOT_FOUND') {
        // 二维码过期或会话不存在，停止轮询
        clearInterval((window as any)._alipayPollTimer)
        isPolling.value = false
        message.error(errMsg || '二维码已过期，请重新获取')
        qrcodeUrl.value = ''
        qrcodeImage.value = ''
      } else {
        // 其他网络错误不中断轮询，继续等待
        console.error('轮询失败:', error)
      }
    }
  }

  ;(window as any)._alipayPollTimer = setInterval(doPoll, 2000)
}

// ===================== 抖音扫码登录 =====================

const clearDouyinQrLoadingTimers = () => {
  if (douyinQrProgressTimer) {
    clearInterval(douyinQrProgressTimer)
    douyinQrProgressTimer = null
  }
  if (douyinQrRevealTimer) {
    clearTimeout(douyinQrRevealTimer)
    douyinQrRevealTimer = null
  }
}

const startDouyinQrLoading = () => {
  clearDouyinQrLoadingTimers()
  isDouyinQrLoading.value = true
  douyinQrProgress.value = 0
  douyinQrLoadingStartedAt = Date.now()
  douyinQrProgressTimer = setInterval(() => {
    const step = douyinQrProgress.value < 70 ? 8 : 3
    douyinQrProgress.value = Math.min(92, douyinQrProgress.value + step)
  }, 140)
}

const finishDouyinQrLoading = (qrB64?: string) => {
  const elapsed = Date.now() - douyinQrLoadingStartedAt
  const waitTime = Math.max(0, QR_MIN_LOADING_MS - elapsed)

  if (douyinQrRevealTimer) clearTimeout(douyinQrRevealTimer)
  douyinQrRevealTimer = setTimeout(() => {
    if (douyinQrProgressTimer) {
      clearInterval(douyinQrProgressTimer)
      douyinQrProgressTimer = null
    }
    douyinQrProgress.value = 100

    douyinQrRevealTimer = setTimeout(() => {
      if (qrB64) douyinQrB64.value = qrB64
      isDouyinQrLoading.value = false
      douyinQrProgress.value = 0
      douyinQrRevealTimer = null
    }, 280)
  }, waitTime)
}

const resetDouyinQrLoading = () => {
  clearDouyinQrLoadingTimers()
  isDouyinQrLoading.value = false
  douyinQrProgress.value = 0
}

// 停止抖音轮询
const stopDouyinPoll = () => {
  if (douyinPollTimer) {
    clearInterval(douyinPollTimer)
    douyinPollTimer = null
  }
  isDouyinPolling.value = false
  douyinBindingInProgress = false
}

// 发起抖音登录（获取二维码）
const handleDouyinLogin = async () => {
  stopDouyinPoll()
  douyinQrB64.value = ''
  douyinScanStatus.value = 'waiting'
  douyinLoginDone.value = false
  douyinSmsCode.value = ''
  douyinSmsMsg.value = ''
  startDouyinQrLoading()
  loading.value = true
  try {
    const res = await axios.post('/api/douyin/scan/start', { force: true })
    if (!res.data.ok) {
      resetDouyinQrLoading()
      message.error(res.data.err || '获取抖音二维码失败')
      return
    }
    douyinSid.value = res.data.sid || ''
    startDouyinPoll()
  } catch (err: any) {
    resetDouyinQrLoading()
    message.error(err.response?.data?.err || '连接抖音扫码服务失败')
  } finally {
    loading.value = false
  }
}

// 轮询抖音扫码状态
const startDouyinPoll = () => {
  isDouyinPolling.value = true
  douyinPollTimer = setInterval(async () => {
    if (!douyinSid.value) return
    try {
      const res = await axios.get('/api/douyin/scan/poll', { params: { sid: douyinSid.value } })
      const d = res.data
      if (d.qr_png_b64) {
        if (isDouyinQrLoading.value && !douyinQrB64.value) {
          finishDouyinQrLoading(d.qr_png_b64)
        } else {
          douyinQrB64.value = d.qr_png_b64
        }
      }
      douyinScanStatus.value = d.scan_status || ''

      if (d.scan_status === 'verify_sms') {
        douyinSmsMsg.value = d.msg || '请输入短信验证码'
      } else if (d.scan_status === 'confirmed' && d.game_ok) {
        // 扫码成功，调 /bind 取服务器列表（防重：确保只触发一次）
        if (douyinBindingInProgress) return
        douyinBindingInProgress = true
        stopDouyinPoll()
        await handleDouyinAfterScan(d)
      } else if (d.scan_status === 'expired' || d.scan_status === 'error') {
        stopDouyinPoll()
        message.warning(d.scan_err || '二维码已过期，请重新获取')
      }
    } catch (err: any) {
      console.error('[douyinPoll] 轮询失败:', err.message)
    }
  }, 2000)
}

// 扫码确认后：取服务器列表
const handleDouyinAfterScan = async (scanResult: any) => {
  loading.value = true
  try {
    // game_token/game_open_id/game_content 只有约5分钟有效期，不再传递
    // 只传永久有效的 code/anonymousCode/sessionid
    const resp = await axios.post('/api/douyin/scan/bind', {
      dy_code: scanResult.dy_code || scanResult.code || '',
      dy_anonymous_code: scanResult.dy_anonymous_code || scanResult.anonymousCode || '',
      dy_is_login: scanResult.dy_is_login ?? scanResult.isLogin ?? true,
      sessionid: scanResult.sessionid || '',
      douyin_uid: scanResult.douyin_uid || scanResult.game_open_id || '',
    })
    if (!resp.data.ok) {
      message.error(resp.data.err || '获取服务器列表失败')
      return
    }
    douyinDyToken.value = resp.data.dyToken
    douyinServers.value = resp.data.servers || []
    douyinUid.value = resp.data.douyin_uid || scanResult.douyin_uid || ''
    douyinLoginDone.value = true

    // 把抖音服务器列表推进 serverList 供选择
    serverList.value = douyinServers.value.map((s: any) => ({
      serverId: s.grpId || s.serverId,
      serverName: s.serverName || `s${s.grpId || s.serverId}区`,
    }))

    message.success('抖音扫码成功，请选择区服')
    setTimeout(() => {
      currentStep.value = 'server'
    }, 500)
  } catch (err: any) {
    message.error(err.response?.data?.err || '取服务器列表失败')
  } finally {
    loading.value = false
  }
}

// 提交短信验证码
const handleDouyinSmsVerify = async () => {
  if (!douyinSid.value || !douyinSmsCode.value.trim()) return
  douyinSmsSubmitting.value = true
  try {
    const res = await axios.post('/api/douyin/scan/verify', {
      sid: douyinSid.value,
      code: douyinSmsCode.value.trim(),
    })
    if (res.data.ok) {
      douyinSmsCode.value = ''
      message.success('验证码已提交，等待确认')
    } else {
      message.error(res.data.msg || '验证码提交失败')
    }
  } catch (err: any) {
    message.error('提交验证码失败')
  } finally {
    douyinSmsSubmitting.value = false
  }
}

const normalizeWxQrcodeImage = (raw: unknown) => {
  const value = String(raw || '').trim()
  if (!value || value.startsWith('data:image/') || /^https?:\/\//i.test(value)) return value
  return `data:image/jpeg;base64,${value}`
}

const normalizeWxServer = (raw: any): ServerInfo | null => {
  const serverId = String(raw?.serverId ?? raw?.id ?? '').trim()
  if (!serverId) return null
  return {
    serverId,
    // 奇幻果园的角色列表没有权威区服名称，统一按协议服 ID 组合。
    serverName: `s${serverId}区`,
    roleName: String(raw?.roleName ?? '').trim(),
    roleUpdatedAt: Number(raw?.roleUpdatedAt || 0),
  }
}

const stopWxPolling = () => {
  if (wxPollTimer) {
    clearInterval(wxPollTimer)
    wxPollTimer = null
  }
  isWxPolling.value = false
  wxPollInFlight = false
  wxPollDeadlineAt = 0
}

const clearWxState = () => {
  stopWxPolling()
  wxFlowId.value = ''
  wxQrcodeImage.value = ''
  wxScanStatus.value = ''
  wxLoginData.value = null
  wxPollErrors = 0
}

const cancelWxFlow = async () => {
  const flowId = wxFlowId.value
  stopWxPolling()
  if (!flowId) return
  try {
    await axios.post('/api/game-accounts/wx/cancel', { flow_id: flowId })
  } catch {
    // 关闭弹窗和重新扫码时取消失败不影响本地清理，服务端会按 TTL 回收。
  }
}

const finishWxLogin = async (data: any) => {
  const rawServers = Array.isArray(data?.servers)
    ? data.servers
    : Array.isArray(data?.server_list?.servers)
      ? data.server_list.servers
      : []
  const servers = rawServers
    .map(normalizeWxServer)
    .filter((server: ServerInfo | null): server is ServerInfo => server !== null)

  if (servers.length === 0) {
    stopWxPolling()
    wxScanStatus.value = 'error'
    message.warning('微信登录成功，但该账号没有可绑定的角色区服')
    return
  }

  stopWxPolling()
  wxScanStatus.value = 'completed'
  serverList.value = servers
  selectedServer.value = null
  serverForm.value.server = undefined
  wxLoginData.value = {
    flowId: wxFlowId.value,
    servers,
    nickname: String(data?.nickname ?? data?.server_list?.nickname ?? '').trim(),
  }

  message.success(`微信扫码成功，已加载 ${servers.length} 个角色区服`)
  currentStep.value = 'server'
}

const expireWxPolling = () => {
  stopWxPolling()
  wxScanStatus.value = 'expired'
  message.warning('微信二维码已超时，请重新获取')
}

const pollWxLogin = async () => {
  if (!wxFlowId.value || wxPollInFlight || !isWxPolling.value) return
  const remainingMs = wxPollDeadlineAt - Date.now()
  if (remainingMs <= 0) {
    expireWxPolling()
    return
  }

  wxPollInFlight = true
  const pollingFlowId = wxFlowId.value
  try {
    const response = await axios.get('/api/game-accounts/wx/poll', {
      params: { flow_id: pollingFlowId },
      // wxcode-go 单次 poll 最长约 35 秒；同时不允许请求越过本轮 5 分钟截止时间。
      timeout: Math.max(1, Math.min(WX_POLL_REQUEST_TIMEOUT_MS, remainingMs)),
    })
    // 用户取消或重新生成二维码后，丢弃旧 flow 的迟到响应。
    if (pollingFlowId !== wxFlowId.value || !isWxPolling.value) return
    const body = response.data || {}
    const data = body.data || {}
    const status = String(
      data.status ?? body.status ?? (typeof body.code === 'string' ? body.code : ''),
    ).toUpperCase()
    wxPollErrors = 0

    const responseServers = Array.isArray(data.servers) ? data.servers : data.server_list?.servers
    const hasServers = Array.isArray(responseServers) && responseServers.length > 0
    const isReady = status === 'COMPLETED' || status === 'SUCCESS'
    if (isReady || (!status && hasServers)) {
      await finishWxLogin(data)
    } else if (['SCANNED', 'AUTHORIZED', 'PROCESSING', 'FINALIZING'].includes(status)) {
      wxScanStatus.value = 'scanned'
    } else if (['EXPIRED', 'CANCELLED', 'NOT_FOUND'].includes(status)) {
      stopWxPolling()
      wxScanStatus.value = 'expired'
      message.warning(body.message || body.msg || '微信二维码已过期，请重新获取')
    } else if (body.success === false && !['PENDING', 'WAITING', ''].includes(status)) {
      stopWxPolling()
      wxScanStatus.value = 'error'
      message.error(body.message || body.msg || '微信扫码登录失败')
    } else if (Date.now() >= wxPollDeadlineAt) {
      expireWxPolling()
    } else {
      wxScanStatus.value = 'pending'
    }
  } catch (error: any) {
    if (pollingFlowId !== wxFlowId.value || !isWxPolling.value) return
    if (Date.now() >= wxPollDeadlineAt) {
      expireWxPolling()
      return
    }
    wxPollErrors += 1
    if (wxPollErrors >= 3) {
      stopWxPolling()
      wxScanStatus.value = 'error'
      message.error(error.response?.data?.message || '微信扫码状态查询失败，请重试')
    }
  } finally {
    if (pollingFlowId === wxFlowId.value) wxPollInFlight = false
  }
}

const startWxPolling = () => {
  stopWxPolling()
  wxPollErrors = 0
  wxPollDeadlineAt = Date.now() + WX_POLL_WINDOW_MS
  isWxPolling.value = true
  wxScanStatus.value = 'pending'
  void pollWxLogin()
  wxPollTimer = setInterval(() => void pollWxLogin(), 2000)
}

const handleWxLogin = async () => {
  if (wxFlowId.value) await cancelWxFlow()
  clearWxState()
  isWxQrLoading.value = true
  try {
    const response = await axios.post('/api/game-accounts/wx/qrcode', {})
    const body = response.data || {}
    const data = body.data || {}
    const flowId = String(data.flow_id ?? data.flowId ?? '').trim()
    const qrcodeImage = normalizeWxQrcodeImage(
      data.image_base64 ?? data.qrcodeImage ?? data.qrcode_image ?? data.qrcode,
    )
    const success = body.success === true || body.code === 200
    if (!success || !flowId || !qrcodeImage) {
      throw new Error(body.message || body.msg || '微信二维码响应不完整')
    }

    wxFlowId.value = flowId
    wxQrcodeImage.value = qrcodeImage
    message.success('微信二维码已生成，请扫码确认')
    startWxPolling()
  } catch (error: any) {
    clearWxState()
    wxScanStatus.value = 'error'
    message.error(error.response?.data?.message || error.message || '获取微信二维码失败')
  } finally {
    isWxQrLoading.value = false
  }
}

const handleBind = async () => {
  console.log('  - gameToken:', gameToken.value ? '已设置' : '未设置')
  console.log('  - selectedChannel:', selectedChannel.value)
  console.log('  - alipayLoginData:', alipayLoginData.value)

  if (!selectedServer.value) {
    message.error('请选择游戏区服')
    return
  }
  if (selectedChannel.value !== 3 && !selectedScriptServer.value) {
    message.error('服务器未加载完成')
    return
  }
  // 支付宝(1)、抖音(2)和微信(3)扫码登录不需要检查uid和gameToken，其他渠道需要
  if (
    selectedChannel.value !== 1 &&
    selectedChannel.value !== 2 &&
    selectedChannel.value !== 3 &&
    (!uid.value || !gameToken.value)
  ) {
    message.error('游戏账号信息不完整，请重新登录')
    return
  }

  loading.value = true
  try {
    // 抖音扫码登录绑定流程
    if (selectedChannel.value === 2 && douyinLoginDone.value) {
      console.log('🎮 使用抖音扫码登录绑定流程')
      const bindPayload = {
        dyToken: douyinDyToken.value,
        server_id: selectedServer.value.serverId ?? selectedServer.value.grpId,
        server_name:
          selectedServer.value.serverName ||
          `s${selectedServer.value.serverId ?? selectedServer.value.grpId}区`,
        douyin_uid: douyinUid.value,
        nickname: douyinUid.value ? `DY_${douyinUid.value}` : '抖音用户',
      }
      console.log('📦 抖音绑定请求数据:', bindPayload)
      const resp = await axios.post('/api/douyin/scan/bind_confirm', bindPayload)
      if (resp.data.ok) {
        message.success('抖音账号绑定成功！')
        resetForm()
        emit('success')
        emit('close')
      } else {
        message.error(resp.data.err || '抖音绑定失败')
      }
      loading.value = false
      return
    }

    // 检查是否是支付宝扫码登录
    if (selectedChannel.value === 1 && alipayLoginData.value) {
      console.log('🎮 使用支付宝扫码登录绑定流程')

      // 生成 parent_id：支付宝真实ID+服务器ID 的MD5哈希
      const alipayRealId = alipayLoginData.value.alipayRealUserId || alipayLoginData.value.uid
      const parentIdInput = `${alipayRealId}${selectedServer.value.serverId}`
      const parentId = generateMD5Hash(parentIdInput)

      console.log('🔑 支付宝绑定 parent_id:', parentId, '  input:', parentIdInput)

      const bindPayload = {
        authCode: alipayLoginData.value.authCode,
        serverId: selectedServer.value.serverId,
        serverName: selectedServer.value.serverName,
        parent_id: parentId,
        alipayRealUserId: alipayRealId,
        ctoken: alipayLoginData.value.ctoken,
        pcwebToken: alipayLoginData.value.pcwebToken,
      }

      console.log('📦 支付宝绑定请求数据(alipay_bind2):', bindPayload)

      const response = await axios.post('/api/game-accounts/alipay_bind2', bindPayload)

      if (response.data.success) {
        message.success('支付宝账号绑定成功！')
        resetForm()
        emit('success')
        emit('close')
      } else {
        message.error(response.data.message || '支付宝绑定失败')
      }
    } else if (selectedChannel.value === 3) {
      if (!wxLoginData.value || !wxFlowId.value) {
        message.error('微信扫码状态已失效，请重新扫码')
        return
      }

      // flow_id 是网页后端生成的短期句柄；前端不接触游戏 token、OpenID 或脚本 bind_token。
      const response = await axios.post('/api/game-accounts/bind_wx', {
        flow_id: wxFlowId.value,
        server_id: selectedServer.value.serverId,
      })

      if (response.data.success || response.data.code === 200) {
        message.success('微信账号绑定成功！')
        resetForm()
        emit('success')
        emit('close')
      } else {
        message.error(response.data.message || response.data.msg || '微信绑定失败')
      }
    } else {
      // 普通账号密码绑定流程
      const parentIdInput = `${username.value}${password.value.trim()}${selectedServer.value.serverId}`
      const parentId = generateMD5Hash(parentIdInput)

      const bindPayload = {
        username: username.value,
        password: password.value.trim(),
        server_id: selectedServer.value.serverId,
        server_name: selectedServer.value.serverName,
        platform: selectedChannel.value,
        uid: uid.value,
        token: gameToken.value,
        parent_id: parentId,
        nickname: nickname.value,
      }

      const response = await axios.post('/api/game-accounts/bind', bindPayload)

      if (response.data.success) {
        message.success('游戏账号绑定成功！')
        resetForm()
        emit('success')
        emit('close')
      } else {
        message.error(response.data.message || '绑定失败')
      }
    }
  } catch (error: any) {
    const errorBody = error.response?.data
    message.error(errorBody?.message || errorBody?.msg || '绑定失败，请重试')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  resetLoginProgress()
  currentStep.value = 'channel'
  loginForm.value = {
    username: '',
    password: '',
  }
  serverForm.value = {
    server: undefined,
  }
  loginFormRef.value?.resetFields()
  serverFormRef.value?.resetFields()
  selectedChannel.value = 3
  selectedServer.value = null
  serverList.value = []
  selectedScriptServer.value = null
  uid.value = ''
  gameToken.value = ''
  nickname.value = ''

  // 清理支付宝相关状态
  resetAlipayQrLoading()
  qrcodeUrl.value = ''
  qrcodeImage.value = ''
  isPolling.value = false
  alipayLoginData.value = null
  // 清理支付宝轮询定时器
  if ((window as any)._alipayPollTimer) {
    clearInterval((window as any)._alipayPollTimer)
    ;(window as any)._alipayPollTimer = null
  }

  // 清理微信扫码状态（服务端流程由成功绑定、显式取消或 TTL 回收）。
  clearWxState()
  isWxQrLoading.value = false

  // 清理抖音相关状态
  stopDouyinPoll()
  resetDouyinQrLoading()
  douyinSid.value = ''
  douyinQrB64.value = ''
  douyinScanStatus.value = ''
  douyinSmsCode.value = ''
  douyinSmsMsg.value = ''
  isDouyinPolling.value = false
  douyinLoginDone.value = false
  douyinDyToken.value = ''
  douyinServers.value = []
  douyinUid.value = ''
}

// 处理服务器选择变化
const handleServerChange = (serverId: string) => {
  console.log('服务器选择变化:', serverId)
  const server = serverList.value.find((s) => s.serverId === serverId)
  if (server) {
    selectedServer.value = server
    console.log('已选择服务器:', server)
  }
}

// 服务器选项搜索过滤
const filterServerOption = (input: string, option: any) => {
  const serverName = option.label || ''
  return serverName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const handleClose = () => {
  void cancelWxFlow()
  resetForm()
  emit('close')
}

const handlePreviousStep = () => {
  if (currentStep.value === 'login') {
    if (selectedChannel.value === 3) {
      void cancelWxFlow()
      clearWxState()
    }
    currentStep.value = 'channel'
  } else if (currentStep.value === 'server') currentStep.value = 'login'
}

const handleMainButton = () => {
  console.log('🔘 按钮被点击！')
  console.log('🔍 当前步骤:', currentStep.value)
  console.log('🚀 准备调用 handleNextStep')
  handleNextStep()
}

// 监听isOpen变化
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      fetchScriptServers()
      // 当前仅开放微信，新打开弹窗时保持默认选中微信。
      selectedChannel.value = 3
    }
  },
)

onBeforeUnmount(() => {
  void cancelWxFlow()
  stopWxPolling()
})
</script>

<style scoped>
@import './AddAccountModal.css';
</style>

<style>
/* 非 scoped 样式确保选中态生效 */
.add-account-modal-antd .ant-radio-wrapper-checked .channel-content {
  border-color: #1890ff !important;
  background: #e6f7ff !important;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2) !important;
}

.add-account-modal-antd .ant-radio-wrapper-checked .channel-icon {
  transform: scale(1.1);
}

.add-account-modal-antd .ant-radio-wrapper-checked .channel-icon-app {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%) !important;
  transform: scale(1.05);
}

.account-password-text {
  color: white;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.add-account-modal-antd .ant-radio-wrapper-checked .app-text {
  color: white !important;
}
</style>
