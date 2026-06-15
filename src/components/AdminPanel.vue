<template>
  <div class="admin-panel">
    <!-- 权限检查 -->
    <div v-if="!hasAdminPanelAccess" class="admin-panel-unauthorized">
      <h2>访问被拒绝</h2>
      <p>您没有权限访问管理面板</p>
      <p>当前用户角色: {{ user?.role || '未定义' }}</p>
      <p>需要: admin 角色或 admin_panel 权限</p>
    </div>

    <div v-else>
      <div class="admin-header">
        <h1>管理面板</h1>
        <p>系统管理和配置</p>
      </div>

      <a-tabs default-active-key="users" @change="onTabChange">
        <!-- 用户管理 -->
        <a-tab-pane key="users" v-if="hasModuleAccess('user_management')">
          <template #tab>
            <span>
              <UserOutlined />
              用户管理
            </span>
          </template>

          <UserManagement :token="token" />
        </a-tab-pane>

        <!-- VIP邀请关系 -->
        <a-tab-pane key="invites" v-if="hasModuleAccess('vip_invites')">
          <template #tab>
            <span>
              <TeamOutlined />
              VIP邀请关系
            </span>
          </template>

          <a-card>
            <custom-table
              :columns="inviteColumns"
              :data-source="inviteRelations"
              :loading="loading"
              row-key="id"
              :pagination="{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total: number) => `共 ${total} 条记录`,
              }"
            />
          </a-card>
        </a-tab-pane>

        <!-- 配额设置 -->
        <a-tab-pane key="quota" v-if="hasModuleAccess('quota_settings')">
          <template #tab>
            <span>
              <ClockCircleOutlined />
              配额设置
            </span>
          </template>
          <QuotaSettings :user="user" :token="token" />
        </a-tab-pane>

        <!-- 权限设置 -->
        <a-tab-pane key="permissions" v-if="hasModuleAccess('permission_settings')">
          <template #tab>
            <span>
              <KeyOutlined />
              权限设置
            </span>
          </template>
          <PermissionSettings :token="token" />
        </a-tab-pane>

        <!-- 充值设置 -->
        <a-tab-pane key="recharge" v-if="hasModuleAccess('recharge_packages')">
          <template #tab>
            <span>
              <DollarOutlined />
              充值设置
            </span>
          </template>

          <a-card>
            <div class="recharge-config-section">
              <div class="config-header">
                <h3>充值配置管理</h3>
                <a-button type="primary" @click="handleEditConfig">
                  <SettingOutlined />
                  编辑配置
                </a-button>
              </div>

              <div v-if="rechargeConfig" class="config-display">
                <div class="config-item">
                  <label>产品名称：</label>
                  <span>{{ rechargeConfig.name }}</span>
                </div>
                <div class="config-item">
                  <label>单价：</label>
                  <span>¥{{ rechargeConfig.unit_price }}</span>
                </div>
                <div class="config-item">
                  <label>赠送比例：</label>
                  <span>{{ (rechargeConfig.bonus_rate * 100).toFixed(1) }}%</span>
                </div>
                <div class="config-item">
                  <label>最小数量：</label>
                  <span>{{ rechargeConfig.min_quantity }}</span>
                </div>
                <div class="config-item">
                  <label>最大数量：</label>
                  <span>{{ rechargeConfig.max_quantity }}</span>
                </div>
                <div class="config-item">
                  <label>启用状态：</label>
                  <a-tag :color="rechargeConfig.enabled ? 'green' : 'red'">
                    {{ rechargeConfig.enabled ? '已启用' : '已禁用' }}
                  </a-tag>
                </div>
              </div>
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 充值套餐 -->
        <a-tab-pane key="packages" v-if="hasModuleAccess('recharge_packages')">
          <template #tab>
            <span>
              <GiftOutlined />
              充值套餐
            </span>
          </template>

          <RechargePackageManagement :token="token" />
        </a-tab-pane>

        <!-- 抽奖系统 -->
        <a-tab-pane key="lottery" v-if="hasModuleAccess('lottery_system')">
          <template #tab>
            <span>
              <TrophyOutlined />
              抽奖系统
            </span>
          </template>

          <LotteryManagement :token="token" />
        </a-tab-pane>

        <!-- 卡密系统 -->
        <a-tab-pane key="card-key" v-if="hasModuleAccess('recharge_packages')">
          <template #tab>
            <span>
              <KeyOutlined />
              卡密系统
            </span>
          </template>
          <CardKeyManagement :token="token" />
        </a-tab-pane>

        <!-- 邀请设置 -->
        <a-tab-pane key="invite-settings" v-if="hasModuleAccess('invite_settings')">
          <template #tab>
            <span>
              <GiftOutlined />
              邀请设置
            </span>
          </template>

          <a-card title="邀请奖励设置">
            <a-form
              :model="inviteSettingsForm"
              layout="vertical"
              style="max-width: 400px"
              @finish="handleUpdateInviteSettings"
            >
              <a-form-item
                name="invite_reward_points"
                label="邀请注册奖励点数"
                :rules="[
                  { required: true, message: '请输入邀请奖励点数' },
                  { type: 'number', min: 0, message: '奖励点数不能为负数' },
                ]"
              >
                <a-input-number
                  placeholder="请输入邀请奖励点数"
                  style="width: 100%"
                  :min="0"
                  :precision="0"
                  v-model:value="inviteSettingsForm.invite_reward_points"
                />
              </a-form-item>

              <a-form-item>
                <a-button
                  type="primary"
                  html-type="submit"
                  :loading="inviteSettingsLoading"
                  style="width: 100%"
                >
                  保存设置
                </a-button>
              </a-form-item>
            </a-form>

            <div
              v-if="inviteSettings"
              style="margin-top: 20px; padding: 16px; background-color: #f5f5f5; border-radius: 6px"
            >
              <h4>当前设置</h4>
              <p>
                邀请注册奖励：<strong>{{ inviteSettings.invite_reward_points }}</strong> 点数
              </p>
              <p style="font-size: 12px; color: #666">
                最后更新时间：{{ new Date(inviteSettings.updated_at).toLocaleString() }}
              </p>
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 支付设置 -->
        <a-tab-pane key="payment-settings" v-if="hasModuleAccess('payment_settings')">
          <template #tab>
            <span>
              <DollarOutlined />
              支付设置
            </span>
          </template>
          <AdminPaymentSettings :token="token" />
        </a-tab-pane>

        <!-- 修改密码 -->
        <a-tab-pane key="change-password">
          <template #tab>
            <span>
              <SettingOutlined />
              修改密码
            </span>
          </template>

          <a-card title="修改管理员密码">
            <a-form
              :model="passwordForm"
              layout="vertical"
              style="max-width: 400px"
              @finish="handleChangePassword"
            >
              <a-form-item
                name="oldPassword"
                label="当前密码"
                :rules="[
                  { required: true, message: '请输入当前密码' },
                  { min: 6, message: '密码至少6位' },
                ]"
              >
                <a-input-password
                  placeholder="请输入当前密码"
                  v-model:value="passwordForm.oldPassword"
                />
              </a-form-item>

              <a-form-item
                name="newPassword"
                label="新密码"
                :rules="[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6位' },
                ]"
              >
                <a-input-password
                  placeholder="请输入新密码"
                  v-model:value="passwordForm.newPassword"
                />
              </a-form-item>

              <a-form-item
                name="confirmPassword"
                label="确认新密码"
                :rules="[
                  { required: true, message: '请确认新密码' },
                  { validator: validateConfirmPassword },
                ]"
              >
                <a-input-password
                  placeholder="请再次输入新密码"
                  v-model:value="passwordForm.confirmPassword"
                />
              </a-form-item>

              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="passwordLoading">
                  修改密码
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-tab-pane>

        <!-- 批量筛选用户 -->
        <a-tab-pane key="batch-filter" v-if="hasModuleAccess('batch_filter_users')">
          <template #tab>
            <span>
              <TeamOutlined />
              批量筛选用户
            </span>
          </template>

          <div>
            <a-card title="批量筛选用户" style="margin-bottom: 16px">
              <a-form layout="vertical">
                <a-form-item label="用户列表（用逗号分隔）">
                  <a-textarea
                    placeholder="请输入用户名，用逗号分隔，例如：用户1,用户2,用户3"
                    :rows="4"
                    v-model:value="batchFilterUsers"
                  />
                </a-form-item>
                <a-form-item>
                  <a-space>
                    <a-button type="primary" @click="handleBatchFilter"> 筛选用户 </a-button>
                    <a-button @click="clearBatchFilter"> 清空 </a-button>
                  </a-space>
                </a-form-item>
              </a-form>

              <div style="margin-top: 16px">
                <p>筛选条件：用户名在列表中 且 (点数 > 0 或 有未过期的游戏角色)</p>
                <p style="color: #666; font-size: 14px">
                  找到 {{ filteredBatchUsers?.length || 0 }} 个符合条件的用户
                </p>
              </div>
            </a-card>

            <a-card v-if="(filteredBatchUsers?.length || 0) > 0" title="筛选结果">
              <template #extra>
                <a-space>
                  <a-button type="primary" @click="handleBatchAddPoints"> 批量加点数 </a-button>
                  <a-button danger @click="handleBatchSubtractPoints"> 批量扣点数 </a-button>
                </a-space>
              </template>

              <custom-table
                :columns="batchFilterUserColumns"
                :data-source="filteredBatchUsers"
                row-key="id"
                :pagination="{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total: number) => `共 ${total} 条记录`,
                }"
              />
            </a-card>
          </div>
        </a-tab-pane>

        <!-- 公告管理 -->
        <a-tab-pane key="announcements" v-if="hasModuleAccess('announcements')">
          <template #tab>
            <span>
              <NotificationOutlined />
              公告管理
            </span>
          </template>

          <div>
            <a-card title="公告管理">
              <template #extra>
                <a-button type="primary" @click="handleCreateAnnouncement">
                  <PlusOutlined />
                  添加公告
                </a-button>
              </template>

              <custom-table
                :columns="announcementColumns"
                :data-source="announcements"
                row-key="id"
                :pagination="{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total: number) => `共 ${total} 条记录`,
                }"
              />
            </a-card>
          </div>
        </a-tab-pane>

        <!-- 客服配置 -->
        <a-tab-pane key="customer-service" v-if="hasModuleAccess('customer_service')">
          <template #tab>
            <span>
              <SettingOutlined />
              客服配置
            </span>
          </template>
          <CustomerServiceSettings />
        </a-tab-pane>

        <!-- 充值统计 -->
        <a-tab-pane key="recharge-statistics" v-if="hasModuleAccess('recharge_records')">
          <template #tab>
            <span>
              <DollarOutlined />
              充值统计
            </span>
          </template>
          <RechargeStatistics />
        </a-tab-pane>

        <!-- 订单查用户 -->
        <a-tab-pane key="order-user-lookup" v-if="hasModuleAccess('order_user_search')">
          <template #tab>
            <span>
              <SearchOutlined />
              订单查用户
            </span>
          </template>
          <OrderUserLookup :token="token" />
        </a-tab-pane>

        <!-- 其他配置 -->
        <a-tab-pane key="other-settings" v-if="hasModuleAccess('group_chat_qr')">
          <template #tab>
            <span>
              <SettingOutlined />
              其他配置
            </span>
          </template>
          <OtherSettings />
        </a-tab-pane>

        <!-- 过期账号管理 -->
        <a-tab-pane key="expired-accounts" v-if="hasModuleAccess('expired_accounts')">
          <template #tab>
            <span>
              <DeleteOutlined />
              过期账号管理
            </span>
          </template>

          <!-- 过期账号清理 -->
          <a-card title="过期账号清理" style="margin-bottom: 16px;">
            <div class="expired-accounts-section">
              <div class="filter-section">
                <a-space>
                  <span>过期天数:</span>
                  <a-input-number
                    v-model:value="expiredDays"
                    :min="1"
                    :max="365"
                    style="width: 120px"
                  />
                  <span>天</span>
                  <a-button type="primary" @click="loadExpiredAccounts" :loading="expiredAccountsLoading">
                    <SearchOutlined />
                    查询过期账号
                  </a-button>
                  <a-button
                    type="primary"
                    danger
                    @click="handleBatchDeleteExpiredAccounts"
                    :disabled="selectedExpiredAccountIds.length === 0"
                    :loading="deleteExpiredAccountsLoading"
                  >
                    <DeleteOutlined />
                    批量删除选中 ({{ selectedExpiredAccountIds.length }})
                  </a-button>
                  <a-button
                    danger
                    @click="handleDeleteAllExpiredAccounts"
                    :disabled="expiredAccounts.length === 0"
                    :loading="deleteAllExpiredAccountsLoading"
                  >
                    <DeleteOutlined />
                    全部删除 ({{ expiredAccounts.length }})
                  </a-button>
                </a-space>
              </div>

              <div class="accounts-info" style="margin: 16px 0;">
                <a-alert
                  :message="`共查询到 ${expiredAccounts.length} 个过期超过 ${expiredDays} 天的账号`"
                  type="info"
                  show-icon
                />
              </div>

              <custom-table
                :columns="expiredAccountColumns"
                :data-source="expiredAccounts"
                :loading="expiredAccountsLoading"
                row-key="id"
                :row-selection="{
                  selectedRowKeys: selectedExpiredAccountIds,
                  onChange: onSelectExpiredAccountChange,
                }"
                :pagination="{
                  current: expiredAccountsCurrentPage,
                  pageSize: expiredAccountsPageSize,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total: number) => `共 ${total} 条记录`,
                  onChange: (page: number, pageSize: number) => {
                    expiredAccountsCurrentPage = page
                    expiredAccountsPageSize = pageSize
                  },
                  onShowSizeChange: (current: number, size: number) => {
                    expiredAccountsCurrentPage = 1
                    expiredAccountsPageSize = size
                  },
                }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'expire_time'">
                    <span :style="{ color: '#ff4d4f' }">
                      {{ formatDate(record.expire_time) }}
                    </span>
                  </template>
                  <template v-else-if="column.key === 'expired_days'">
                    <a-tag color="red">{{ record.expired_days }} 天</a-tag>
                  </template>
                  <template v-else-if="column.key === 'platform'">
                    <a-tag :color="getPlatformColor(record.platform)">
                      {{ getPlatformName(record.platform) }}
                    </a-tag>
                  </template>
                </template>
              </custom-table>
            </div>
          </a-card>

          <!-- 未续费账号清理 -->
          <a-card title="未续费账号清理">
            <div class="never-renewed-accounts-section">
              <div class="filter-section">
                <a-space>
                  <span>创建超过:</span>
                  <a-input-number
                    v-model:value="neverRenewedDays"
                    :min="1"
                    :max="365"
                    style="width: 120px"
                  />
                  <span>天且从未续费</span>
                  <a-button type="primary" @click="loadNeverRenewedAccounts" :loading="neverRenewedAccountsLoading">
                    <SearchOutlined />
                    查询未续费账号
                  </a-button>
                  <a-button
                    type="primary"
                    danger
                    @click="handleBatchDeleteNeverRenewedAccounts"
                    :disabled="selectedNeverRenewedAccountIds.length === 0"
                    :loading="deleteNeverRenewedAccountsLoading"
                  >
                    <DeleteOutlined />
                    批量删除选中 ({{ selectedNeverRenewedAccountIds.length }})
                  </a-button>
                  <a-button
                    danger
                    @click="handleDeleteAllNeverRenewedAccounts"
                    :disabled="neverRenewedAccounts.length === 0"
                    :loading="deleteAllNeverRenewedAccountsLoading"
                  >
                    <DeleteOutlined />
                    全部删除 ({{ neverRenewedAccounts.length }})
                  </a-button>
                </a-space>
              </div>

              <div class="accounts-info" style="margin: 16px 0;">
                <a-alert
                  :message="`共查询到 ${neverRenewedAccounts.length} 个创建超过 ${neverRenewedDays} 天且从未续费的账号 (expire_time = null)`"
                  type="warning"
                  show-icon
                />
              </div>

              <custom-table
                :columns="neverRenewedAccountColumns"
                :data-source="neverRenewedAccounts"
                :loading="neverRenewedAccountsLoading"
                row-key="id"
                :row-selection="{
                  selectedRowKeys: selectedNeverRenewedAccountIds,
                  onChange: onSelectNeverRenewedAccountChange,
                }"
                :pagination="{
                  current: neverRenewedAccountsCurrentPage,
                  pageSize: neverRenewedAccountsPageSize,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total: number) => `共 ${total} 条记录`,
                  onChange: (page: number, pageSize: number) => {
                    neverRenewedAccountsCurrentPage = page
                    neverRenewedAccountsPageSize = pageSize
                  },
                  onShowSizeChange: (current: number, size: number) => {
                    neverRenewedAccountsCurrentPage = 1
                    neverRenewedAccountsPageSize = size
                  },
                }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'created_days'">
                    <a-tag color="orange">{{ record.created_days }} 天</a-tag>
                  </template>
                  <template v-else-if="column.key === 'platform'">
                    <a-tag :color="getPlatformColor(record.platform)">
                      {{ getPlatformName(record.platform) }}
                    </a-tag>
                  </template>
                </template>
              </custom-table>
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 脚本服务器管理 -->
        <a-tab-pane key="script-servers" v-if="isAdminRole">
          <template #tab>
            <span>
              <CloudServerOutlined />
              脚本服务器
            </span>
          </template>

          <a-card>
            <template #title>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>脚本服务器管理</span>
                <a-space>
                  <a-button type="primary" @click="showAddServerModal">
                    <PlusOutlined />
                    添加服务器
                  </a-button>
                  <a-button @click="showImportServerModal">
                    <UploadOutlined />
                    导入配置
                  </a-button>
                  <a-button @click="exportServers">
                    <DownloadOutlined />
                    导出配置
                  </a-button>
                </a-space>
              </div>
            </template>

            <custom-table
              :columns="serverColumns"
              :data-source="scriptServers"
              :loading="loadingServers"
              row-key="id"
              :pagination="{
                current: serverCurrentPage,
                pageSize: serverPageSize,
                pageSizeOptions: ['10', '20', '50', '100'],
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total: number) => `共 ${total} 条记录`,
                onChange: (page: number, pageSize: number) => {
                  serverCurrentPage = page
                  serverPageSize = pageSize
                },
                onShowSizeChange: (current: number, size: number) => {
                  serverCurrentPage = 1
                  serverPageSize = size
                },
              }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="record.status === 'active' ? 'green' : 'red'">
                    {{ record.status === 'active' ? '活跃' : '停用' }}
                  </a-tag>
                </template>
                <template v-if="column.key === 'usage'">
                  <a-progress
                    :percent="Math.round((record.currentAccounts / record.maxAccounts) * 100)"
                    :status="record.currentAccounts >= record.maxAccounts ? 'exception' : 'normal'"
                  />
                  <div style="margin-top: 4px; font-size: 12px; color: #666;">
                    {{ record.currentAccounts }} / {{ record.maxAccounts }}
                  </div>
                </template>
                <template v-if="column.key === 'action'">
                  <a-space>
                    <a-button type="link" size="small" @click="showEditServerModal(record)">
                      <EditOutlined />
                      编辑
                    </a-button>
                    <a-popconfirm
                      title="确定要删除该服务器吗？"
                      ok-text="确定"
                      cancel-text="取消"
                      @confirm="deleteServer(record.id)"
                    >
                      <a-button type="link" danger size="small">
                        <DeleteOutlined />
                        删除
                      </a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </custom-table>
          </a-card>
        </a-tab-pane>

        <!-- 游戏账号迁移 -->
        <a-tab-pane key="account-migration" v-if="hasModuleAccess('account_migration')">
          <template #tab>
            <span>
              <SwapOutlined />
              账号迁移
            </span>
          </template>

          <a-card title="游戏账号迁移">
            <div class="migration-section">
              <!-- 第一步：搜索游戏账号 -->
              <div class="search-section" style="margin-bottom: 24px;">
                <h3>步骤 1: 搜索游戏账号</h3>
                <a-space style="margin-top: 12px;">
                  <a-input
                    v-model:value="migrationGameUsername"
                    placeholder="请输入游戏账号用户名"
                    style="width: 300px"
                    @pressEnter="searchGameAccount"
                  />
                  <a-button type="primary" @click="searchGameAccount" :loading="searchingGameAccount">
                    <SearchOutlined />
                    搜索
                  </a-button>
                </a-space>
              </div>

              <!-- 显示当前游戏账号所属用户信息 -->
              <div v-if="currentGameAccountInfo && currentGameAccountInfo.accounts?.length > 0" style="margin-bottom: 24px;">
                <a-alert
                  :message="`找到 ${currentGameAccountInfo.totalCount} 个角色`"
                  :description="`游戏账号 ${migrationGameUsername} 在不同大区/服务器有多个角色`"
                  type="info"
                  show-icon
                  style="margin-bottom: 16px;"
                />

                <!-- 遍历显示所有角色 -->
                <div v-for="(accountInfo, index) in currentGameAccountInfo.accounts" :key="accountInfo.gameAccount.id" style="margin-bottom: 16px;">
                  <a-card size="small" :title="`角色 ${index + 1}`">
                    <a-descriptions :column="2" bordered>
                      <a-descriptions-item label="游戏账号">{{ accountInfo.gameAccount.username }}</a-descriptions-item>
                      <a-descriptions-item label="昵称">{{ accountInfo.gameAccount.nickname }}</a-descriptions-item>
                      <a-descriptions-item label="服务器">{{ accountInfo.gameAccount.server_name || '-' }}</a-descriptions-item>
                      <a-descriptions-item label="平台">
                        <a-tag :color="getPlatformColor(accountInfo.gameAccount.platform)">
                          {{ getPlatformName(accountInfo.gameAccount.platform) }}
                        </a-tag>
                      </a-descriptions-item>
                      <a-descriptions-item label="所属用户">{{ accountInfo.currentUser.username }}</a-descriptions-item>
                      <a-descriptions-item label="用户邮箱">{{ accountInfo.currentUser.email }}</a-descriptions-item>
                      <a-descriptions-item label="用户点数">{{ accountInfo.currentUser.points }}</a-descriptions-item>
                      <a-descriptions-item label="槽位">{{ accountInfo.gameAccount.slot_id }}</a-descriptions-item>
                      <a-descriptions-item label="到期时间" :span="2">
                        {{ accountInfo.gameAccount.expire_time ? formatDate(accountInfo.gameAccount.expire_time) : '无配额' }}
                      </a-descriptions-item>
                    </a-descriptions>

                    <a-button
                      type="primary"
                      style="margin-top: 16px;"
                      @click="openMigrationModal(accountInfo)"
                    >
                      <SwapOutlined />
                      迁移此角色
                    </a-button>
                  </a-card>
                </div>
              </div>
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 管理员操作日志 -->
        <a-tab-pane key="operation-logs" v-if="hasModuleAccess('operation_logs')">
          <template #tab>
            <span>
              <ClockCircleOutlined />
              管理员操作日志
            </span>
          </template>

          <a-card>
            <a-button 
              type="primary" 
              @click="() => fetchOperationLogs()"
              :loading="operationLogsLoading"
              style="margin-bottom: 16px"
            >
              刷新日志
            </a-button>
            <custom-table
              :columns="operationLogColumns"
              :data-source="operationLogs"
              :loading="operationLogsLoading"
              row-key="id"
              :pagination="{
                current: operationLogsPagination.page,
                pageSize: operationLogsPagination.pageSize,
                total: operationLogsPagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
                onChange: handleOperationLogsPageChange,
              }"
            />
          </a-card>
        </a-tab-pane>

        <!-- 游戏账号统计 -->
        <a-tab-pane key="game-accounts-stats" v-if="hasModuleAccess('game_accounts_stats')">
          <template #tab>
            <span>
              <BarChartOutlined />
              游戏账号统计
            </span>
          </template>

          <a-card>
            <a-button 
              type="primary" 
              @click="fetchGameAccountsStats"
              :loading="gameAccountsStatsLoading"
              style="margin-bottom: 16px"
            >
              刷新统计
            </a-button>

            <div v-if="gameAccountsStats" style="margin-top: 16px">
              <h3>账号概览</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px">
                <a-card size="small">
                  <div style="text-align: center">
                    <div style="font-size: 24px; font-weight: bold; color: #1890ff">
                      {{ gameAccountsStats.summary?.total || 0 }}
                    </div>
                    <div style="margin-top: 8px">总账号数</div>
                  </div>
                </a-card>
                <a-card size="small">
                  <div style="text-align: center">
                    <div style="font-size: 24px; font-weight: bold; color: #52c41a">
                      {{ gameAccountsStats.summary?.active || 0 }}
                    </div>
                    <div style="margin-top: 8px">未过期账号</div>
                  </div>
                </a-card>
                <a-card size="small">
                  <div style="text-align: center">
                    <div style="font-size: 24px; font-weight: bold; color: #ff4d4f">
                      {{ gameAccountsStats.summary?.expired || 0 }}
                    </div>
                    <div style="margin-top: 8px">已过期账号</div>
                  </div>
                </a-card>
              </div>

              <h3>用户账号Top 10</h3>
              <custom-table
                :columns="topUsersColumns"
                :data-source="gameAccountsStats.topUsers || []"
                row-key="user_id"
                :pagination="false"
              />
            </div>

            <!-- 游戏账号详细列表 -->
            <div style="margin-top: 32px">
              <h3>游戏账号列表</h3>
              
              <!-- 筛选条件 -->
              <a-space style="margin-bottom: 16px" wrap>
                <a-input
                  v-model:value="gameAccountsFilter.username"
                  placeholder="搜索用户名"
                  style="width: 200px"
                  allow-clear
                />
                <a-input
                  v-model:value="gameAccountsFilter.script_account_id"
                  placeholder="搜索游戏账号ID"
                  style="width: 200px"
                  allow-clear
                />
                <a-input
                  v-model:value="gameAccountsFilter.server_name"
                  placeholder="搜索服务器名"
                  style="width: 200px"
                  allow-clear
                />
                <a-select
                  v-model:value="gameAccountsFilter.platform"
                  placeholder="选择平台"
                  style="width: 150px"
                  allow-clear
                >
                  <a-select-option :value="0">微信</a-select-option>
                  <a-select-option :value="1">支付宝</a-select-option>
                  <a-select-option :value="2">QQ</a-select-option>
                  <a-select-option :value="3">华为</a-select-option>
                </a-select>
                <a-select
                  v-model:value="gameAccountsFilter.is_online"
                  placeholder="在线状态"
                  style="width: 120px"
                  allow-clear
                >
                  <a-select-option :value="1">在线</a-select-option>
                  <a-select-option :value="0">离线</a-select-option>
                </a-select>
                <a-button type="primary" @click="() => fetchGameAccountsList()" :loading="gameAccountsListLoading">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button @click="resetGameAccountsFilter">
                  重置
                </a-button>
              </a-space>

              <custom-table
                :columns="gameAccountsColumns"
                :data-source="gameAccountsList"
                :loading="gameAccountsListLoading"
                row-key="id"
                :pagination="{
                  current: gameAccountsPagination.page,
                  pageSize: gameAccountsPagination.pageSize,
                  total: gameAccountsPagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条记录`,
                  onChange: handleGameAccountsPageChange,
                }"
              />
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 管理面板权限分配 -->
        <a-tab-pane key="admin-panel-permissions" v-if="hasModuleAccess('admin_panel_permissions')">
          <template #tab>
            <span>
              <SafetyOutlined />
              管理面板权限分配
            </span>
          </template>
          
          <AdminPanelPermissions :token="token" />
        </a-tab-pane>

        <!-- IP封锁管理 -->
        <a-tab-pane key="ip-lock-manage" v-if="hasModuleAccess('user_management')">
          <template #tab>
            <span>
              <StopOutlined />
              IP封锁管理
            </span>
          </template>

          <a-card>
            <!-- 工具栏 -->
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;">
              <a-button type="primary" @click="fetchLockedIPList" :loading="ipLockLoading">
                刷新列表
              </a-button>
              <a-space>
                <a-input
                  v-model:value="ipLookupInput"
                  placeholder="输入 IP 查询状态"
                  style="width: 220px"
                  @pressEnter="lookupIPStatus"
                />
                <a-button @click="lookupIPStatus" :loading="ipLookupLoading">查询</a-button>
              </a-space>
            </div>

            <!-- 单IP查询结果 -->
            <a-card
              v-if="ipLookupResult"
              size="small"
              :title="`IP 状态：${ipLookupResult.ip}`"
              style="margin-bottom: 16px; background: #fafafa;"
            >
              <a-descriptions :column="3" bordered size="small">
                <a-descriptions-item label="封锁状态">
                  <a-tag :color="ipLookupResult.locked ? 'red' : 'green'">
                    {{ ipLookupResult.locked ? '已封锁' : '正常' }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="剩余封锁时间">
                  {{ ipLookupResult.locked && ipLookupResult.lockTtlSec != null
                    ? formatLockTime(ipLookupResult.lockTtlSec)
                    : '-' }}
                </a-descriptions-item>
                <a-descriptions-item label="窗口失败次数">
                  {{ ipLookupResult.windowCount }} / 5
                </a-descriptions-item>
                <a-descriptions-item label="累计总失败次数">
                  {{ ipLookupResult.totalFails }}
                </a-descriptions-item>
                <a-descriptions-item label="下次封锁时长">
                  {{ formatLockTime(ipLookupResult.nextLockSec) }}
                </a-descriptions-item>
                <a-descriptions-item label="操作">
                  <a-popconfirm
                    v-if="ipLookupResult.locked"
                    title="确认解封此 IP？"
                    @confirm="unlockIPAddress(ipLookupResult!.ip, 'lookup')"
                  >
                    <a-button type="primary" danger size="small" :loading="unlockingIP === ipLookupResult.ip">
                      手动解封
                    </a-button>
                  </a-popconfirm>
                  <span v-else style="color: #52c41a;">无需解封</span>
                </a-descriptions-item>
              </a-descriptions>
            </a-card>

            <!-- 当前封锁列表 -->
            <div>
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                当前封锁中的 IP（共 {{ lockedIPList.length }} 个）
              </div>
              <custom-table
                :columns="ipLockColumns"
                :data-source="lockedIPList"
                :loading="ipLockLoading"
                row-key="ip"
                :pagination="false"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'locked'">
                    <a-tag color="red">已封锁</a-tag>
                  </template>
                  <template v-if="column.key === 'lockTtlSec'">
                    {{ record.lockTtlSec != null ? formatLockTime(record.lockTtlSec) : '-' }}
                  </template>
                  <template v-if="column.key === 'nextLockSec'">
                    {{ formatLockTime(record.nextLockSec) }}
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-popconfirm
                      title="确认解封此 IP？"
                      @confirm="unlockIPAddress(record.ip, 'list')"
                    >
                      <a-button
                        type="primary"
                        danger
                        size="small"
                        :loading="unlockingIP === record.ip"
                      >
                        解封
                      </a-button>
                    </a-popconfirm>
                  </template>
                </template>
              </custom-table>
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 其他配置 -->
      </a-tabs>

      <!-- 各种模态框 -->

      <!-- 游戏账号迁移Modal -->
      <a-modal
        :title="`迁移角色：${selectedAccountForMigration?.gameAccount?.nickname || selectedAccountForMigration?.gameAccount?.username || ''}`"
        v-model:open="migrationModalOpen"
        @ok="confirmMigration"
        @cancel="() => { migrationModalOpen = false; targetUserInfo = null; selectedAccountForMigration = null }"
        width="800px"
        :confirm-loading="migrating"
      >
        <!-- 显示当前要迁移的角色信息 -->
        <a-card v-if="selectedAccountForMigration" size="small" title="当前角色信息" style="margin-bottom: 16px;">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="游戏账号">{{ selectedAccountForMigration.gameAccount.username }}</a-descriptions-item>
            <a-descriptions-item label="昵称">{{ selectedAccountForMigration.gameAccount.nickname }}</a-descriptions-item>
            <a-descriptions-item label="服务器">{{ selectedAccountForMigration.gameAccount.server_name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="平台">
              <a-tag :color="getPlatformColor(selectedAccountForMigration.gameAccount.platform)">
                {{ getPlatformName(selectedAccountForMigration.gameAccount.platform) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="当前所属用户">{{ selectedAccountForMigration.currentUser.username }}</a-descriptions-item>
            <a-descriptions-item label="槽位">{{ selectedAccountForMigration.gameAccount.slot_id }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-divider>选择目标用户</a-divider>

        <div style="margin-bottom: 16px;">
          <a-space>
            <a-input
              v-model:value="targetUsername"
              placeholder="请输入目标用户名"
              style="width: 300px"
              @pressEnter="searchTargetUser"
            />
            <a-button type="primary" @click="searchTargetUser" :loading="searchingTargetUser">
              <SearchOutlined />
              查询
            </a-button>
          </a-space>
        </div>

        <div v-if="targetUserInfo" style="margin-top: 16px;">
          <a-card size="small" title="目标用户信息" style="margin-bottom: 16px;">
            <a-descriptions :column="2" bordered>
              <a-descriptions-item label="用户名">{{ targetUserInfo.user.username }}</a-descriptions-item>
              <a-descriptions-item label="邮箱">{{ targetUserInfo.user.email }}</a-descriptions-item>
              <a-descriptions-item label="点数">{{ targetUserInfo.user.points }}</a-descriptions-item>
              <a-descriptions-item label="角色">{{ targetUserInfo.user.role }}</a-descriptions-item>
            </a-descriptions>
          </a-card>

          <a-card size="small" :title="`现有游戏账号 (${targetUserInfo.gameAccountCount}个)`">
            <a-table
              :columns="targetUserGameAccountColumns"
              :data-source="targetUserInfo.gameAccounts"
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'platform'">
                  <a-tag :color="getPlatformColor(record.platform)">
                    {{ getPlatformName(record.platform) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'expire_time'">
                  <span>{{ record.expire_time ? formatDate(record.expire_time) : '无配额' }}</span>
                </template>
              </template>
            </a-table>
          </a-card>

          <a-alert
            message="提示"
            description="确认迁移后，系统将自动为该游戏账号分配一个可用的槽位。"
            type="info"
            show-icon
            style="margin-top: 16px;"
          />
        </div>
      </a-modal>

      <!-- 脚本服务器添加/编辑Modal -->
      <a-modal
        :title="serverModalMode === 'add' ? '添加脚本服务器' : '编辑脚本服务器'"
        v-model:open="serverModalOpen"
        @ok="handleServerSubmit"
        @cancel="() => { serverModalOpen = false; resetServerForm() }"
        width="600px"
        :confirm-loading="serverSubmitting"
      >
        <a-form
          ref="serverFormRef"
          :model="serverForm"
          layout="vertical"
          @finish="submitServer"
        >
          <a-form-item
            name="id"
            label="服务器ID"
            :rules="[{ required: true, message: '请输入服务器ID' }]"
          >
            <a-input
              v-model:value="serverForm.id"
              placeholder="例如: server1"
              :disabled="serverModalMode === 'edit'"
            />
          </a-form-item>

          <a-form-item
            name="name"
            label="服务器名称"
            :rules="[{ required: true, message: '请输入服务器名称' }]"
          >
            <a-input
              v-model:value="serverForm.name"
              placeholder="例如: 脚本服务器1"
            />
          </a-form-item>

          <a-form-item
            name="ip"
            label="IP地址"
            :rules="[{ required: true, message: '请输入IP地址' }]"
          >
            <a-input
              v-model:value="serverForm.ip"
              placeholder="例如: 192.168.1.100"
            />
          </a-form-item>

          <a-form-item
            name="port"
            label="端口"
            :rules="[
              { required: true, message: '请输入端口' },
              { type: 'number', min: 1, max: 65535, message: '端口必须在1-65535之间' }
            ]"
          >
            <a-input-number
              v-model:value="serverForm.port"
              placeholder="例如: 3000"
              style="width: 100%"
              :min="1"
              :max="65535"
            />
          </a-form-item>

          <a-form-item
            name="maxAccounts"
            label="最大账号数"
            :rules="[
              { required: true, message: '请输入最大账号数' },
              { type: 'number', min: 0, message: '最大账号数不能为负数' }
            ]"
          >
            <a-input-number
              v-model:value="serverForm.maxAccounts"
              placeholder="例如: 5000"
              style="width: 100%"
              :min="0"
            />
          </a-form-item>

          <a-form-item
            name="currentAccounts"
            label="当前账号数"
            :rules="[
              { required: true, message: '请输入当前账号数' },
              { type: 'number', min: 0, message: '当前账号数不能为负数' }
            ]"
          >
            <a-input-number
              v-model:value="serverForm.currentAccounts"
              placeholder="例如: 0"
              style="width: 100%"
              :min="0"
            />
          </a-form-item>

          <a-form-item
            name="status"
            label="状态"
            :rules="[{ required: true, message: '请选择状态' }]"
          >
            <a-select v-model:value="serverForm.status" placeholder="请选择状态">
              <a-select-option value="active">活跃</a-select-option>
              <a-select-option value="inactive">停用</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 导入服务器配置Modal -->
      <a-modal
        title="导入脚本服务器配置"
        v-model:open="importServerModalOpen"
        @ok="handleImportServers"
        @cancel="() => { importServerModalOpen = false; importServerText = '' }"
        width="800px"
        :confirm-loading="importing"
      >
        <a-alert
          message="导入说明"
          description="请粘贴JSON格式的服务器配置数组。如果服务器ID已存在，将更新该服务器信息；否则创建新服务器。"
          type="info"
          show-icon
          style="margin-bottom: 16px;"
        />

        <a-form-item label="JSON配置">
          <a-textarea
            v-model:value="importServerText"
            placeholder='[{"id":"server1","name":"脚本服务器1","ip":"127.0.0.1","port":3000,"maxAccounts":5000,"currentAccounts":0,"status":"active"}]'
            :rows="15"
            style="font-family: monospace;"
          />
        </a-form-item>

        <a-button
          type="dashed"
          @click="loadCurrentJsonFile"
          style="margin-top: 8px;"
        >
          <UploadOutlined />
          从当前 script-servers.json 加载
        </a-button>
      </a-modal>

      <!-- 批量点数操作Modal -->
      <a-modal
        :title="batchOperationType === 'add' ? '批量加点数' : '批量扣点数'"
        v-model:open="batchPointsModalOpen"
        @ok="handleBatchPointsSubmit"
        @cancel="
          () => {
            batchPointsModalOpen = false
            batchPointsForm.points = 0
            batchPointsForm.reason = ''
          }
        "
        :confirm-loading="batchPointsLoading"
        width="600px"
      >
        <div style="margin-bottom: 16px">
          <p>
            将对以下 <strong>{{ filteredBatchUsers?.length || 0 }}</strong> 个用户执行{{
              batchOperationType === 'add' ? '加点数' : '扣点数'
            }}操作：
          </p>
          <div
            style="
              max-height: 200px;
              overflow: auto;
              background: #f5f5f5;
              padding: 8px;
              border-radius: 4px;
            "
          >
            <div v-for="user in filteredBatchUsers" :key="user.id" style="margin-bottom: 4px">
              {{ user.username }} (当前点数: {{ user.points }})
            </div>
          </div>
        </div>

        <a-form
          ref="batchPointsFormRef"
          :model="batchPointsForm"
          layout="vertical"
          @finish="executeBatchPointsOperation"
        >
          <a-form-item
            name="points"
            :label="batchOperationType === 'add' ? '加点数量' : '扣点数量'"
            :rules="[
              { required: true, message: '请输入点数' },
              { type: 'number', min: 1, message: '点数必须大于0' },
            ]"
          >
            <a-input-number
              :min="1"
              style="width: 100%"
              placeholder="请输入点数"
              v-model:value="batchPointsForm.points"
            />
          </a-form-item>

          <a-form-item
            name="reason"
            :label="batchOperationType === 'add' ? '加点原因' : '扣点原因'"
            :rules="[{ required: true, message: '请输入操作原因' }]"
          >
            <a-textarea
              :rows="3"
              :placeholder="
                batchOperationType === 'add'
                  ? '请输入加点原因，将记录到用户交易历史中'
                  : '请输入扣点原因，将记录到用户交易历史中'
              "
              v-model:value="batchPointsForm.reason"
            />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 提现Modal -->
      <a-modal
        title="处理提现"
        v-model:open="withdrawModalOpen"
        @ok="confirmWithdraw"
        @cancel="
          () => {
            withdrawModalOpen = false
            withdrawForm.amount = 0
            withdrawForm.subAmount = 0
          }
        "
        width="480px"
      >
        <div style="margin-bottom: 16px">
          <p><strong>用户：</strong>{{ selectedUser?.username }}</p>
          <p>
            <strong>本人可提现：</strong>¥{{
              (parseFloat(selectedUser?.available_commission?.toString() || '0') || 0).toFixed(2)
            }}
          </p>
          <p v-if="selectedUserIsSecondLevel">
            <strong>旗下三级代理可提现汇总：</strong>¥{{
              (parseFloat(selectedUser?.sub_agents_available?.toString() || '0') || 0).toFixed(2)
            }}
          </p>
        </div>

        <a-form
          ref="withdrawFormRef"
          :model="withdrawForm"
          layout="vertical"
          @finish="confirmWithdraw"
        >
          <a-form-item
            name="amount"
            label="本人提现金额（二级代理自身）"
            :rules="[
              { validator: validateWithdrawAmount },
            ]"
          >
            <a-input-number
              :min="0"
              :max="parseFloat(selectedUser?.available_commission?.toString() || '0') || 0"
              :step="0.01"
              :precision="2"
              style="width: 100%"
              placeholder="0 表示不提现本人部分"
              v-model:value="withdrawForm.amount"
            />
          </a-form-item>

          <a-form-item
            v-if="selectedUserIsSecondLevel"
            name="subAmount"
            label="三级代理汇总提现金额（结清后管理员与二级代理清账）"
            :rules="[
              { validator: validateSubWithdrawAmount },
            ]"
          >
            <a-input-number
              :min="0"
              :max="parseFloat(selectedUser?.sub_agents_available?.toString() || '0') || 0"
              :step="0.01"
              :precision="2"
              style="width: 100%"
              placeholder="0 表示不结清三级代理部分"
              v-model:value="withdrawForm.subAmount"
            />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 充值配置编辑Modal -->
      <a-modal
        title="编辑充值配置"
        v-model:open="configModalOpen"
        @ok="updateRechargeConfig"
        @cancel="() => (configModalOpen = false)"
        width="600px"
      >
        <a-form
          ref="configFormRef"
          :model="configForm"
          layout="vertical"
          @finish="updateRechargeConfig"
        >
          <a-form-item
            name="name"
            label="产品名称"
            :rules="[{ required: true, message: '请输入产品名称' }]"
          >
            <a-input placeholder="例如：月卡" v-model:value="configForm.name" />
          </a-form-item>

          <a-form-item
            name="unit_price"
            label="单价（元）"
            :rules="[{ required: true, message: '请输入单价' }]"
          >
            <a-input-number
              :min="0.01"
              :step="0.01"
              :precision="2"
              style="width: 100%"
              placeholder="例如：25.00"
              v-model:value="configForm.unit_price"
            />
          </a-form-item>

          <a-form-item
            name="bonus_rate"
            label="赠送比例"
            :rules="[{ required: true, message: '请输入赠送比例' }]"
          >
            <a-input-number
              :min="0"
              :max="1"
              :step="0.01"
              :precision="2"
              style="width: 100%"
              placeholder="例如：0.1 表示10%赠送"
              v-model:value="configForm.bonus_rate"
            />
          </a-form-item>

          <a-form-item
            name="min_quantity"
            label="最小购买数量"
            :rules="[{ required: true, message: '请输入最小数量' }]"
          >
            <a-input-number
              :min="1"
              style="width: 100%"
              placeholder="例如：1"
              v-model:value="configForm.min_quantity"
            />
          </a-form-item>

          <a-form-item
            name="max_quantity"
            label="最大购买数量"
            :rules="[{ required: true, message: '请输入最大数量' }]"
          >
            <a-input-number
              :min="1"
              style="width: 100%"
              placeholder="例如：99"
              v-model:value="configForm.max_quantity"
            />
          </a-form-item>

          <a-form-item name="enabled" label="启用状态">
            <a-switch v-model:checked="configForm.enabled" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 公告编辑Modal -->
      <a-modal
        :title="editingAnnouncement ? '编辑公告' : '添加公告'"
        v-model:open="announcementModalOpen"
        @ok="handleSaveAnnouncement"
        @cancel="
          () => {
            announcementModalOpen = false
            editingAnnouncement = null
          }
        "
        :confirm-loading="announcementLoading"
        width="800px"
        :style="{ top: '20px' }"
      >
        <a-form
          ref="announcementFormRef"
          :model="announcementForm"
          layout="vertical"
          @finish="handleSaveAnnouncement"
        >
          <a-form-item
            name="title"
            label="公告标题"
            :rules="[
              { required: true, message: '请输入公告标题' },
              { max: 100, message: '标题不能超过100个字符' },
            ]"
          >
            <a-input placeholder="请输入公告标题" v-model:value="announcementForm.title" />
          </a-form-item>

          <a-form-item
            name="content"
            label="公告内容"
            :rules="[{ required: true, message: '请输入公告内容' }]"
          >
            <div class="border border-solid border-gray rounded-1">
              <div class="tiptap-toolbar flex items-center p-1" style="gap: 8px; flex-wrap: wrap">
                <a-button
                  size="small"
                  @click="announcementEditor?.chain().focus().undo().run()"
                  :disabled="!announcementEditor?.can().undo()"
                >
                  撤销
                </a-button>
                <a-button
                  size="small"
                  @click="announcementEditor?.chain().focus().redo().run()"
                  :disabled="!announcementEditor?.can().redo()"
                >
                  重做
                </a-button>
                <a-button
                  size="small"
                  :type="announcementEditor?.isActive('bold') ? 'primary' : 'default'"
                  @click="announcementEditor?.chain().focus().toggleBold().run()"
                >
                  B
                </a-button>
                <a-button
                  size="small"
                  :type="announcementEditor?.isActive('italic') ? 'primary' : 'default'"
                  @click="announcementEditor?.chain().focus().toggleItalic().run()"
                >
                  I
                </a-button>
                <a-button
                  size="small"
                  :type="announcementEditor?.isActive('underline') ? 'primary' : 'default'"
                  @click="announcementEditor?.chain().focus().toggleUnderline().run()"
                >
                  U
                </a-button>

                <a-button
                  size="small"
                  :type="
                    announcementEditor?.isActive('heading', { level: 1 }) ? 'primary' : 'default'
                  "
                  @click="announcementEditor?.chain().focus().toggleHeading({ level: 1 }).run()"
                >
                  H1
                </a-button>
                <a-button
                  size="small"
                  :type="
                    announcementEditor?.isActive('heading', { level: 2 }) ? 'primary' : 'default'
                  "
                  @click="announcementEditor?.chain().focus().toggleHeading({ level: 2 }).run()"
                >
                  H2
                </a-button>
                <a-button
                  size="small"
                  :type="
                    announcementEditor?.isActive('heading', { level: 3 }) ? 'primary' : 'default'
                  "
                  @click="announcementEditor?.chain().focus().toggleHeading({ level: 3 }).run()"
                >
                  H3
                </a-button>

                <div style="display: inline-flex; align-items: center; gap: 6px">
                  <span style="font-size: 12px; color: #666">颜色</span>
                  <input
                    type="color"
                    @input="
                      (e: any) => announcementEditor?.chain().focus().setColor(e.target.value).run()
                    "
                  />
                  <a-button
                    size="small"
                    @click="announcementEditor?.chain().focus().unsetColor().run()"
                    >清除颜色</a-button
                  >
                </div>
              </div>

              <EditorContent :editor="announcementEditor" class="tiptap-editor" />
            </div>
          </a-form-item>

          <a-form-item
            name="display_duration"
            label="显示时长（秒）"
            :rules="[
              { required: true, message: '请输入显示时长' },
              { type: 'number', min: 1, message: '显示时长至少为1秒' },
            ]"
          >
            <a-input-number
              v-model:value="announcementForm.display_duration"
              :min="1"
              :max="60"
              :precision="0"
              style="width: 100%"
              placeholder="请输入公告显示时长"
            />
            <div style="font-size: 12px; color: #666; margin-top: 4px">
              公告将在用户界面显示指定的秒数
            </div>
          </a-form-item>

          <a-form-item name="enabled" label="启用状态">
            <a-switch
              v-model:checked="announcementForm.enabled"
              checked-children="启用"
              un-checked-children="禁用"
              :checkedValue="1"
              :unCheckedValue="0"
            />
          </a-form-item>
        </a-form>
      </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, h, resolveComponent } from 'vue'
import {
  UserOutlined,
  TeamOutlined,
  KeyOutlined,
  SettingOutlined,
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
  SearchOutlined,
  SwapOutlined,
  CloudServerOutlined,
  UploadOutlined,
  DownloadOutlined,
  SafetyOutlined,
  BarChartOutlined,
  StopOutlined,
} from '@ant-design/icons-vue'
import { message, Button, Space, Popconfirm, Modal } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import QuotaSettings from './QuotaSettings.vue'
import PermissionSettings from './PermissionSettings.vue'
import AdminPaymentSettings from './AdminPaymentSettings.vue'
import RechargePackageManagement from './admin/RechargePackageManagement.vue'
import LotteryManagement from './admin/LotteryManagement.vue'
import CardKeyManagement from './admin/CardKeyManagement.vue'
import CustomerServiceSettings from './CustomerServiceSettings.vue'
import RechargeStatistics from './RechargeStatistics.vue'
import OtherSettings from './OtherSettings.vue'
import UserManagement from './UserManagement.vue'
import AdminPanelPermissions from './AdminPanelPermissions.vue'
import CustomTable from './CustomTable.vue'
import OrderUserLookup from './OrderUserLookup.vue'
import axios from '../utils/axios'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import type { Editor } from '@tiptap/core'

interface InviteRelation {
  id: number
  username: string
  email: string
  role: string
  points: number
  invited_users: any[]
  invited_by: any | null
  inviter_name?: string
  invite_count?: number
  month_new_count?: number
  month_new_recharge_count?: number
  created_at: string
  total_recharge_amount?: number | string
  available_commission?: number | string
  withdrawn_commission?: number | string
  total_commission?: number | string
  sub_agents_available?: number | null  // 旗下三级代理总可提现（仅二级代理行有值）
}

interface RechargeConfig {
  id: number
  name: string
  unit_price: number
  bonus_rate: number
  min_quantity: number
  max_quantity: number
  enabled: number
}

interface Announcement {
  id: number
  title: string
  content: string
  enabled: number
  display_duration: number // 公告显示时间（秒）
  created_at: string
  updated_at: string
}

interface Props {
  token: string
  user: any
  onLogout?: () => void
}

const props = defineProps<Props>()

const inviteRelations = ref<InviteRelation[]>([])
const rechargeConfig = ref<RechargeConfig | null>(null)
const announcements = ref<Announcement[]>([])
const inviteSettings = ref<any>(null)
const loading = ref(false)

// Modal控制状态
const configModalOpen = ref(false)
const withdrawModalOpen = ref(false)
const batchPointsModalOpen = ref(false)
const announcementModalOpen = ref(false)

// 表单ref
const configFormRef = ref<FormInstance>()
const announcementFormRef = ref<FormInstance>()
const batchPointsFormRef = ref<FormInstance>()
const withdrawFormRef = ref<FormInstance>()

// 编辑状态
const editingAnnouncement = ref<Announcement | null>(null)
const selectedUser = ref<InviteRelation | null>(null)

// 操作类型
const batchOperationType = ref<'add' | 'subtract'>('add')

// 批量筛选相关
const batchFilterUsers = ref<string>('')
const filteredBatchUsers = ref<any[]>([])

// 批量筛选用户表格列定义
const batchFilterUserColumns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    width: 100,
  },
  {
    title: '点数',
    dataIndex: 'points',
    key: 'points',
    width: 120,
    customRender: ({ text }: any) => parseFloat(text).toFixed(2),
  },
  {
    title: '邀请码',
    dataIndex: 'invite_code',
    key: 'invite_code',
    width: 120,
  },
  {
    title: '总邀请数',
    dataIndex: 'total_invites',
    key: 'total_invites',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
]

// 各种loading状态
const passwordLoading = ref(false)
const inviteSettingsLoading = ref(false)
const batchPointsLoading = ref(false)
const announcementLoading = ref(false)

// 过期账号管理相关
const expiredDays = ref(7) // 默认查询过期7天以上的账号
const expiredAccounts = ref<any[]>([])
const expiredAccountsLoading = ref(false)
const deleteExpiredAccountsLoading = ref(false)
const deleteAllExpiredAccountsLoading = ref(false) // 全部删除的loading状态
const selectedExpiredAccountIds = ref<number[]>([])
const expiredAccountsPageSize = ref(20) // 过期账号表格每页显示数量
const expiredAccountsCurrentPage = ref(1) // 过期账号表格当前页

// 管理面板权限相关
const adminPanelPermissions = ref<Record<string, boolean>>({})
const isAdminRole = ref(false)

// 检查是否有管理面板访问权限
const hasAdminPanelAccess = computed(() => {
  // admin 角色始终有权限
  if (props.user?.role === 'admin') {
    return true
  }
  // 检查其他角色是否有 admin_panel 权限
  return props.user?.permissions?.admin_panel === true
})

// 未续费账号管理相关
const neverRenewedDays = ref(30) // 默认查询创建超过30天未续费的账号
const neverRenewedAccounts = ref<any[]>([])
const neverRenewedAccountsLoading = ref(false)
const deleteNeverRenewedAccountsLoading = ref(false)
const deleteAllNeverRenewedAccountsLoading = ref(false)
const selectedNeverRenewedAccountIds = ref<number[]>([])
const neverRenewedAccountsPageSize = ref(20)
const neverRenewedAccountsCurrentPage = ref(1)

// 游戏账号迁移相关
const migrationGameUsername = ref('') // 搜索的游戏账号用户名
const currentGameAccountInfo = ref<any>(null) // 当前游戏账号信息（包含多个角色）
const selectedAccountForMigration = ref<any>(null) // 当前选中要迁移的角色
const searchingGameAccount = ref(false) // 搜索游戏账号loading
const migrationModalOpen = ref(false) // 迁移弹窗
const targetUsername = ref('') // 目标用户名
const targetUserInfo = ref<any>(null) // 目标用户信息
const searchingTargetUser = ref(false) // 搜索目标用户loading
const migrating = ref(false) // 迁移中loading

// 脚本服务器管理相关
const scriptServers = ref<any[]>([]) // 服务器列表
const loadingServers = ref(false) // 加载服务器列表loading
const serverModalOpen = ref(false) // 服务器添加/编辑弹窗
const serverModalMode = ref<'add' | 'edit'>('add') // 弹窗模式
const serverSubmitting = ref(false) // 提交中loading
const importServerModalOpen = ref(false) // 导入弹窗
const importServerText = ref('') // 导入的JSON文本
const importing = ref(false) // 导入中loading
const serverFormRef = ref<FormInstance>()
const serverPageSize = ref(50) // 服务器表格每页显示数量
const serverCurrentPage = ref(1) // 服务器表格当前页

// 服务器表单数据
const serverForm = ref({
  id: '',
  name: '',
  ip: '',
  port: 3000,
  maxAccounts: 5000,
  currentAccounts: 0,
  status: 'active' as 'active' | 'inactive'
})

// 管理员操作日志相关
const operationLogs = ref<any[]>([])
const operationLogsLoading = ref(false)
const operationLogsPagination = ref({ page: 1, pageSize: 20, total: 0 })

// ─── IP 封锁管理 ───────────────────────────────────────────────────────────────
interface IPLockStatus {
  ip: string
  locked: boolean
  lockTtlSec: number | null
  windowCount: number
  totalFails: number
  nextLockSec: number
}
const lockedIPList = ref<IPLockStatus[]>([])
const ipLockLoading = ref(false)
const ipLookupInput = ref('')
const ipLookupLoading = ref(false)
const ipLookupResult = ref<IPLockStatus | null>(null)
const unlockingIP = ref('')

const ipLockColumns = [
  { title: 'IP 地址', dataIndex: 'ip', key: 'ip' },
  { title: '封锁状态', dataIndex: 'locked', key: 'locked', width: 90 },
  { title: '剩余封锁时间', dataIndex: 'lockTtlSec', key: 'lockTtlSec', width: 130 },
  { title: '窗口失败次数', dataIndex: 'windowCount', key: 'windowCount', width: 120 },
  { title: '累计总失败', dataIndex: 'totalFails', key: 'totalFails', width: 110 },
  { title: '下次封锁时长', dataIndex: 'nextLockSec', key: 'nextLockSec', width: 120 },
  { title: '操作', key: 'action', width: 90 },
]

function formatLockTime(sec: number): string {
  if (sec < 60) return `${sec}秒`
  if (sec < 3600) return `${Math.round(sec / 60)}分钟`
  return `${(sec / 3600).toFixed(1)}小时`
}

const fetchLockedIPList = async () => {
  ipLockLoading.value = true
  try {
    const response = await axios.get('/api/admin/login-lock/list', {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    if (response.data.success) {
      lockedIPList.value = response.data.data || []
    } else {
      message.error(response.data.message || '获取封锁IP列表失败')
    }
  } catch (error) {
    console.error('获取封锁IP列表失败:', error)
    message.error('获取封锁IP列表失败')
  } finally {
    ipLockLoading.value = false
  }
}

const lookupIPStatus = async () => {
  const ip = ipLookupInput.value.trim()
  if (!ip) { message.warning('请输入 IP 地址'); return }
  ipLookupLoading.value = true
  try {
    const response = await axios.get('/api/admin/login-lock/status', {
      params: { ip },
      headers: { Authorization: `Bearer ${props.token}` }
    })
    if (response.data.success) {
      ipLookupResult.value = response.data.data
    } else {
      message.error(response.data.message || '查询失败')
    }
  } catch (error) {
    console.error('查询IP状态失败:', error)
    message.error('查询失败')
  } finally {
    ipLookupLoading.value = false
  }
}

const unlockIPAddress = async (ip: string, source: 'list' | 'lookup') => {
  unlockingIP.value = ip
  try {
    const response = await axios.post('/api/admin/login-lock/unlock',
      { ip },
      { headers: { Authorization: `Bearer ${props.token}` } }
    )
    if (response.data.success) {
      message.success(`IP ${ip} 已成功解封`)
      // 刷新列表
      await fetchLockedIPList()
      // 如果是查询结果里解封，同步更新查询结果
      if (source === 'lookup' && ipLookupResult.value?.ip === ip) {
        await lookupIPStatus()
      }
    } else {
      message.error(response.data.message || '解封失败')
    }
  } catch (error) {
    console.error('解封IP失败:', error)
    message.error('解封失败')
  } finally {
    unlockingIP.value = ''
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// 游戏账号统计相关
const gameAccountsStats = ref<any>(null)
const gameAccountsStatsLoading = ref(false)

// 游戏账号列表相关
const gameAccountsList = ref<any[]>([])
const gameAccountsListLoading = ref(false)
const gameAccountsPagination = ref({ page: 1, pageSize: 20, total: 0 })
const gameAccountsFilter = ref({
  username: '',
  script_account_id: '',
  server_name: '',
  platform: undefined as number | undefined,
  is_online: undefined as number | undefined,
})

// 管理员操作日志表格列定义
const operationLogColumns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '管理员',
    dataIndex: 'admin_username',
    key: 'admin_username',
  },
  {
    title: '操作类型',
    dataIndex: 'operation_type',
    key: 'operation_type',
    customRender: ({ text }: any) => {
      const typeMap: any = {
        'add_points': { text: '加点', color: 'green' },
        'deduct_points': { text: '扣点', color: 'red' },
        'add_lottery_tickets': { text: '加抽奖', color: 'blue' },
        'deduct_lottery_tickets': { text: '扣抽奖', color: 'orange' },
        'batch_add_points': { text: '批量加点', color: 'purple' }
      }
      const info = typeMap[text] || { text: text, color: 'default' }
      return h(resolveComponent('a-tag'), { color: info.color }, () => info.text)
    },
  },
  {
    title: '目标用户',
    dataIndex: 'target_username',
    key: 'target_username',
    customRender: ({ text }: any) => text || '-',
  },
  {
    title: '操作数值',
    dataIndex: 'operation_value',
    key: 'operation_value',
  },
  {
    title: '原因',
    dataIndex: 'reason',
    key: 'reason',
    ellipsis: true,
  },
  {
    title: '操作时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: any) => new Date(text).toLocaleString(),
  },
]

// 游戏账号统计Top用户表格列定义
const topUsersColumns = [
  {
    title: '用户ID',
    dataIndex: 'user_id',
    key: 'user_id',
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '总账号数',
    dataIndex: 'total_accounts',
    key: 'total_accounts',
    sorter: (a: any, b: any) => a.total_accounts - b.total_accounts,
  },
  {
    title: '未过期',
    dataIndex: 'active_accounts',
    key: 'active_accounts',
    customRender: ({ text }: any) => h(resolveComponent('a-tag'), { color: 'green' }, () => text),
  },
  {
    title: '已过期',
    dataIndex: 'expired_accounts',
    key: 'expired_accounts',
    customRender: ({ text }: any) => h(resolveComponent('a-tag'), { color: 'red' }, () => text),
  },
]

// 游戏账号列表表格列定义
const gameAccountsColumns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 120,
  },
  {
    title: '游戏账号ID',
    dataIndex: 'script_account_id',
    key: 'script_account_id',
    width: 150,
  },
  {
    title: '服务器名',
    dataIndex: 'server_name',
    key: 'server_name',
    width: 120,
  },
  {
    title: '平台',
    dataIndex: 'platform',
    key: 'platform',
    width: 100,
    customRender: ({ text }: any) => {
      return h(resolveComponent('a-tag'), { color: getPlatformColor(text) }, () => getPlatformName(text))
    },
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    key: 'nickname',
    width: 120,
  },
  {
    title: '脚本服务器IP',
    dataIndex: 'script_server_ip',
    key: 'script_server_ip',
    width: 140,
  },
  {
    title: '在线状态',
    dataIndex: 'is_online',
    key: 'is_online',
    width: 100,
    customRender: ({ text }: any) => {
      const isOnline = text === 1
      return h(resolveComponent('a-tag'), { color: isOnline ? 'green' : 'default' }, () => isOnline ? '在线' : '离线')
    },
  },
  {
    title: '到期时间',
    dataIndex: 'expire_time',
    key: 'expire_time',
    width: 180,
    customRender: ({ text }: any) => text ? formatDate(text) : '-',
  },
]

// 服务器表格列定义
const serverColumns = [
  {
    title: '服务器ID',
    dataIndex: 'id',
    key: 'id',
    width: 120,
  },
  {
    title: '服务器名称',
    dataIndex: 'name',
    key: 'name',
    width: 150,
  },
  {
    title: 'IP地址',
    dataIndex: 'ip',
    key: 'ip',
    width: 150,
  },
  {
    title: '端口',
    dataIndex: 'port',
    key: 'port',
    width: 80,
  },
  {
    title: '使用情况',
    key: 'usage',
    width: 200,
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    customRender: ({ text }: { text: string }) => {
      return text ? formatDate(text) : '-'
    }
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right' as const,
  },
]

// 密码表单状态
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 密码修改表单数据
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 邀请设置状态
const inviteRewardPoints = ref<number>(0)

// 邀请设置表单数据
const inviteSettingsForm = ref({
  invite_reward_points: 0,
})

// 表单数据状态
// 批量积分操作表单数据
const batchPointsForm = ref({
  points: 0,
  reason: '',
})

// 提现表单数据
const withdrawForm = ref({
  amount: 0,
  subAmount: 0,
})

// 当前提现弹窗用户是否是二级代理
const selectedUserIsSecondLevel = computed(() =>
  ['vip1', 'vip2'].includes(selectedUser.value?.role || '')
)

// 表单对象
const configForm = ref({
  name: '',
  unit_price: 0,
  bonus_rate: 0,
  min_quantity: 1,
  max_quantity: 99,
  enabled: 1,
})

const announcementForm = ref({
  title: '',
  content: '',
  enabled: 1,
  display_duration: 5, // 默认5秒
})

const announcementEditor = useEditor({
  extensions: [StarterKit, Underline, TextStyle, Color],
  content: announcementForm.value.content || '',
  onUpdate: ({ editor }: { editor: Editor }) => {
    announcementForm.value.content = editor.getHTML()
  },
})

watch(announcementModalOpen, (open) => {
  if (open && announcementEditor.value) {
    announcementEditor.value.commands.setContent(announcementForm.value.content || '', {
      emitUpdate: false,
    })
  }
})

onBeforeUnmount(() => {
  announcementEditor.value?.destroy()
})

// 邀请关系表格列
const inviteColumns = computed(() => [
  {
    title: '用户',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    customRender: ({ text }: { text: string }) => {
      // 根据角色类型设置颜色
      let color = 'default'
      if (text === 'admin') color = 'red'
      else if (text === 'vip') color = 'gold'
      else if (text === 'user') color = 'blue'
      else if (text.toLowerCase().includes('vip')) color = 'purple'
      else color = 'green'

      return h(resolveComponent('a-tag'), { color: color }, text)
    },
  },
  {
    title: '邀请人',
    dataIndex: 'inviter_name',
    key: 'inviter_name',
    customRender: ({ text }: { text: string | null }) => text || '-',
  },
  {
    title: '已邀请人数',
    dataIndex: 'invite_count',
    key: 'invite_count',
    customRender: ({ text }: { text: number }) => `${text || 0} 人`,
  },
  {
    title: '当月拉新',
    dataIndex: 'month_new_count',
    key: 'month_new_count',
    customRender: ({ text }: { text: number }) => `${text || 0} 人`,
  },
  {
    title: '当月首充',
    dataIndex: 'month_new_recharge_count',
    key: 'month_new_recharge_count',
    customRender: ({ text }: { text: number }) => `${text || 0} 人`,
  },
  {
    title: '邀请用户充值',
    dataIndex: 'total_recharge_amount',
    key: 'total_recharge_amount',
    customRender: ({ text }: { text: string | number }) =>
      `¥${(parseFloat(text?.toString() || '0') || 0).toFixed(2)}`,
  },
  {
    title: '总提成',
    dataIndex: 'total_commission',
    key: 'total_commission',
    customRender: ({ text }: { text: string | number }) =>
      `¥${(parseFloat(text?.toString() || '0') || 0).toFixed(2)}`,
  },
  {
    title: '可提现',
    dataIndex: 'available_commission',
    key: 'available_commission',
    customRender: ({ text }: { text: string | number }) => {
      const numAmount = parseFloat(text?.toString() || '0') || 0
      return h(
        'span',
        {
          style: { color: numAmount > 0 ? '#52c41a' : '#999' },
        },
        `¥${numAmount.toFixed(2)}`,
      )
    },
  },
  {
    title: '已提现',
    dataIndex: 'withdrawn_commission',
    key: 'withdrawn_commission',
    customRender: ({ text }: { text: string | number }) =>
      `¥${(parseFloat(text?.toString() || '0') || 0).toFixed(2)}`,
  },
  {
    title: '三级代理可提现',
    dataIndex: 'sub_agents_available',
    key: 'sub_agents_available',
    customRender: ({ text, record }: { text: number | null; record: InviteRelation }) => {
      // agent3 行显示 -，二级代理行显示汇总金额
      if (text === null || text === undefined) return h('span', { style: { color: '#ccc' } }, '-')
      const num = parseFloat(text?.toString() || '0') || 0
      return h('span', { style: { color: num > 0 ? '#52c41a' : '#999' } }, `¥${num.toFixed(2)}`)
    },
  },
  {
    title: '注册时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
  {
    title: '操作',
    key: 'action',
    customRender: ({ record }: { record: InviteRelation }) => {
      const isSecondLevel = ['vip1', 'vip2'].includes(record.role)
      const selfAvailable = parseFloat(record.available_commission?.toString() || '0') || 0
      const subAvailable = parseFloat(record.sub_agents_available?.toString() || '0') || 0
      const canWithdraw = selfAvailable > 0 || (isSecondLevel && subAvailable > 0)
      return h(
        Button,
        {
          size: 'small',
          type: 'primary',
          onClick: () => handleWithdraw(record),
          disabled: !canWithdraw,
        },
        '提现',
      )
    },
  },
])

// 公告表格列
const announcementColumns = computed(() => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: '内容预览',
    dataIndex: 'content',
    key: 'content',
    customRender: ({ text }: { text: string }) => {
      // 移除HTML标签并截取前50个字符
      const plainText = text.replace(/<[^>]*>/g, '')
      return plainText.length > 50 ? `${plainText.substring(0, 50)}...` : plainText
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
    title: '显示时长',
    dataIndex: 'display_duration',
    key: 'display_duration',
    customRender: ({ text }: { text: number }) => `${text || 5} 秒`,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
  {
    title: '更新时间',
    dataIndex: 'updated_at',
    key: 'updated_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
  {
    title: '操作',
    key: 'action',
    customRender: ({ record }: { record: Announcement }) => {
      return h(Space, {}, [
        h(
          Button,
          {
            size: 'small',
            onClick: () => handleEditAnnouncement(record),
          },
          [h(EditOutlined), '编辑'],
        ),
        h(
          Popconfirm,
          {
            title: '确定删除这个公告吗？',
            onConfirm: () => handleDeleteAnnouncement(record.id),
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

// 过期账号表格列
const expiredAccountColumns = computed(() => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    key: 'nickname',
  },
  {
    title: '平台',
    dataIndex: 'platform',
    key: 'platform',
    width: 100,
  },
  {
    title: '服务器',
    dataIndex: 'server_name',
    key: 'server_name',
  },
  {
    title: '过期时间',
    dataIndex: 'expire_time',
    key: 'expire_time',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
  {
    title: '过期天数',
    dataIndex: 'expired_days',
    key: 'expired_days',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
])

// 未续费账号表格列
const neverRenewedAccountColumns = computed(() => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    key: 'nickname',
  },
  {
    title: '平台',
    dataIndex: 'platform',
    key: 'platform',
    width: 100,
  },
  {
    title: '服务器',
    dataIndex: 'server_name',
    key: 'server_name',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString(),
  },
  {
    title: '创建天数',
    dataIndex: 'created_days',
    key: 'created_days',
    width: 100,
    customRender: ({ text }: { text: number }) => `${text} 天`,
  },
])

// 目标用户游戏账号表格列
const targetUserGameAccountColumns = computed(() => [
  {
    title: '游戏账号',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    key: 'nickname',
  },
  {
    title: '平台',
    dataIndex: 'platform',
    key: 'platform',
  },
  {
    title: '大区',
    dataIndex: 'server_name',
    key: 'server_name',
  },
  {
    title: '槽位',
    dataIndex: 'slot_id',
    key: 'slot_id',
    width: 80,
  },
  {
    title: '过期时间',
    dataIndex: 'expire_time',
    key: 'expire_time',
  },
])

// 获取邀请关系
const fetchInviteRelations = async () => {
  const inviteResponse = await axios.get('/api/admin/vip-invites')
  const commissionResponse = await axios.get('/api/commission/admin/stats')

  const inviteData = inviteResponse.data
  let relations = inviteData.data || []

  const commissionData = commissionResponse.data
  const commissionStats = commissionData.data || []

  relations = relations.map((relation: InviteRelation) => {
    const commissionStat = commissionStats.find((stat: any) => stat.user_id === relation.id)
    if (commissionStat) {
      return {
        ...relation,
        total_recharge_amount: commissionStat.total_recharge_amount || 0,
        available_commission: commissionStat.available_commission || 0,
        withdrawn_commission: commissionStat.withdrawn_commission || 0,
        total_commission: commissionStat.total_commission || 0,
      }
    }
    return relation
  })

  inviteRelations.value = relations
}

// 处理提现
const handleWithdraw = (user: InviteRelation) => {
  selectedUser.value = user
  withdrawModalOpen.value = true
}

// 标签页切换
const onTabChange = (key: string) => {
  switch (key) {
    case 'invites':
      fetchInviteRelations()
      break
    case 'script-servers':
      loadScriptServers()
      break
    case 'announcements':
      fetchAnnouncements()
      break
    case 'recharge':
      fetchRechargeConfig()
      break
    case 'invite-settings':
      fetchInviteSettings()
      break
    case 'operation-logs':
      fetchOperationLogs()
      break
    case 'ip-lock-manage':
      fetchLockedIPList()
      break
    case 'game-accounts-stats':
      fetchGameAccountsStats()
      fetchGameAccountsList()
      break
  }
}

// 获取充值配置
const fetchRechargeConfig = async () => {
  try {
    const response = await fetch('/api/admin/recharge-config', {
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      rechargeConfig.value = data.config
      if (data.config) {
        configForm.value = {
          name: data.config.name || '',
          unit_price: data.config.unit_price || 0,
          bonus_rate: data.config.bonus_rate || 0,
          min_quantity: data.config.min_quantity || 1,
          max_quantity: data.config.max_quantity || 99,
          enabled: data.config.enabled || false,
        }
      }
    }
  } catch {
    message.error('获取充值配置失败')
  }
}

// 获取邀请设置
const fetchInviteSettings = async () => {
  try {
    const response = await fetch('/api/admin/invite-settings', {
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      inviteSettings.value = data.data
      inviteRewardPoints.value = data.data.invite_reward_points
      inviteSettingsForm.value.invite_reward_points = data.data.invite_reward_points
    }
  } catch {
    message.error('获取邀请设置失败')
  }
}

// 获取公告列表
const fetchAnnouncements = async () => {
  try {
    const response = await fetch('/api/admin/announcements', {
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      announcements.value = data.data?.announcements || []
    } else {
      message.error('获取公告列表失败')
    }
  } catch (error) {
    console.error('获取公告列表失败:', error)
    message.error('获取公告列表失败')
  }
}

// 更新邀请设置
const handleUpdateInviteSettings = async () => {
  inviteSettingsLoading.value = true
  try {
    const response = await fetch('/api/admin/invite-settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invite_reward_points: inviteSettingsForm.value.invite_reward_points,
      }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      message.success('邀请设置更新成功')
      fetchInviteSettings() // 重新获取设置
    } else {
      message.error(data.message || '邀请设置更新失败')
    }
  } catch (error) {
    console.error('更新邀请设置失败:', error)
    message.error('更新邀请设置失败')
  } finally {
    inviteSettingsLoading.value = false
  }
}

// 密码确认验证
const validateConfirmPassword = (_: any, value: string) => {
  if (!value || passwordForm.value.newPassword === value) {
    return Promise.resolve()
  }
  return Promise.reject(new Error('两次输入的密码不一致'))
}

// 修改管理员密码
const handleChangePassword = async () => {
  passwordLoading.value = true
  try {
    const response = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPassword: passwordForm.value.oldPassword,
        newPassword: passwordForm.value.newPassword,
      }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      message.success('密码修改成功')
      // 重置表单
      oldPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      passwordForm.value.oldPassword = ''
      passwordForm.value.newPassword = ''
      passwordForm.value.confirmPassword = ''
    } else {
      message.error(data.message || '密码修改失败')
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    message.error('修改密码失败')
  } finally {
    passwordLoading.value = false
  }
}

// 批量筛选用户
const handleBatchFilter = async () => {
  if (!batchFilterUsers.value.trim()) {
    filteredBatchUsers.value = []
    return
  }

  try {
    const usernames = batchFilterUsers.value
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name)

    // 调用后端API进行筛选，包括检查游戏角色到期时间
    const response = await fetch('/api/admin/batch-filter-users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: usernames,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        const filteredUsers = Array.isArray(data.users) ? data.users : []
        filteredBatchUsers.value = filteredUsers
        if (data.message) {
          message.success(data.message)
        }
      } else {
        message.error(data.message || '筛选用户失败')
        filteredBatchUsers.value = []
      }
    } else {
      message.error('筛选用户失败')
      filteredBatchUsers.value = []
    }
  } catch {
    filteredBatchUsers.value = []
  }
}

// 清空批量筛选
const clearBatchFilter = () => {
  batchFilterUsers.value = ''
  filteredBatchUsers.value = []
}

// 批量加点数
const handleBatchAddPoints = () => {
  batchOperationType.value = 'add'
  batchPointsModalOpen.value = true
}

// 批量扣点数
const handleBatchSubtractPoints = () => {
  batchOperationType.value = 'subtract'
  batchPointsModalOpen.value = true
}

// 创建公告
const handleCreateAnnouncement = () => {
  editingAnnouncement.value = null
  announcementForm.value = {
    title: '',
    content: '',
    enabled: 1,
    display_duration: 5,
  }
  announcementModalOpen.value = true
}

// 编辑公告
const handleEditAnnouncement = (announcement: Announcement) => {
  editingAnnouncement.value = announcement
  announcementForm.value = {
    title: announcement.title,
    content: announcement.content,
    enabled: announcement.enabled,
    display_duration: announcement.display_duration || 5,
  }
  announcementModalOpen.value = true
}

// 删除公告
const handleDeleteAnnouncement = async (id: number) => {
  try {
    const response = await fetch(`/api/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.ok) {
      message.success('公告删除成功')
      fetchAnnouncements()
    } else {
      message.error('删除失败')
    }
  } catch {
    message.error('网络错误')
  }
}

// ==================== 过期账号管理 ====================

// 加载过期账号列表
const loadExpiredAccounts = async () => {
  expiredAccountsLoading.value = true
  try {
    const response = await axios.get('/api/admin/expired-accounts', {
      params: { days: expiredDays.value },
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      // 计算过期天数
      const accounts = response.data.data.accounts.map((account: any) => {
        const expireTime = new Date(account.expire_time)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - expireTime.getTime()) / (1000 * 60 * 60 * 24))
        return {
          ...account,
          expired_days: diffDays,
        }
      })
      expiredAccounts.value = accounts
      message.success(`查询成功,找到 ${accounts.length} 个过期账号`)
    } else {
      message.error(response.data.message || '查询失败')
    }
  } catch (error) {
    console.error('查询过期账号失败:', error)
    message.error('查询过期账号失败')
  } finally {
    expiredAccountsLoading.value = false
  }
}

// 处理选择过期账号
const onSelectExpiredAccountChange = (selectedRowKeys: number[]) => {
  selectedExpiredAccountIds.value = selectedRowKeys
}

// 批量删除过期账号
const handleBatchDeleteExpiredAccounts = async () => {
  if (selectedExpiredAccountIds.value.length === 0) {
    message.warning('请先选择要删除的账号')
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: h('div', [
      h('p', `确定要删除选中的 ${selectedExpiredAccountIds.value.length} 个过期账号吗？`),
      h('p', { style: { color: '#ff4d4f', marginTop: '8px' } }, '此操作不可恢复！'),
    ]),
    okText: '确定删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      deleteExpiredAccountsLoading.value = true
      try {
        const response = await axios.post(
          '/api/admin/expired-accounts/batch-delete',
          {
            accountIds: selectedExpiredAccountIds.value,
          },
          {
            headers: {
              Authorization: `Bearer ${props.token}`,
            },
          },
        )

        if (response.data.success) {
          message.success(response.data.message || '删除成功')
          // 清空选中项
          selectedExpiredAccountIds.value = []
          // 重新加载列表
          loadExpiredAccounts()
        } else {
          message.error(response.data.message || '删除失败')
        }
      } catch (error) {
        console.error('批量删除过期账号失败:', error)
        message.error('批量删除失败')
      } finally {
        deleteExpiredAccountsLoading.value = false
      }
    },
  })
}

// 全部删除过期账号
const handleDeleteAllExpiredAccounts = async () => {
  if (expiredAccounts.value.length === 0) {
    message.warning('没有过期账号可删除')
    return
  }

  Modal.confirm({
    title: '确认全部删除',
    content: h('div', [
      h('p', { style: { fontSize: '16px', fontWeight: 'bold' } }, `确定要删除全部 ${expiredAccounts.value.length} 个过期账号吗？`),
      h('p', { style: { color: '#ff4d4f', marginTop: '8px' } }, '⚠️ 此操作将删除所有查询到的过期账号！'),
      h('p', { style: { color: '#ff4d4f' } }, '此操作不可恢复！'),
    ]),
    okText: '确定删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      deleteAllExpiredAccountsLoading.value = true
      try {
        // 获取所有过期账号的ID
        const allAccountIds = expiredAccounts.value.map((account: any) => account.id)

        const response = await axios.post(
          '/api/admin/expired-accounts/batch-delete',
          {
            accountIds: allAccountIds,
          },
          {
            headers: {
              Authorization: `Bearer ${props.token}`,
            },
          },
        )

        if (response.data.success) {
          message.success(response.data.message || '全部删除成功')
          // 清空选中项和列表
          selectedExpiredAccountIds.value = []
          expiredAccounts.value = []
        } else {
          message.error(response.data.message || '删除失败')
        }
      } catch (error) {
        console.error('全部删除过期账号失败:', error)
        message.error('全部删除失败')
      } finally {
        deleteAllExpiredAccountsLoading.value = false
      }
    },
  })
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 获取平台名称
const getPlatformName = (platform: number): string => {
  const platformMap: Record<number, string> = {
    0: '微信',
    1: '支付宝',
    2: 'QQ',
    3: '华为',
  }
  return platformMap[platform] || '未知'
}

// 获取平台颜色
const getPlatformColor = (platform: number): string => {
  const colorMap: Record<number, string> = {
    0: 'green',
    1: 'blue',
    2: 'purple',
    3: 'orange',
  }
  return colorMap[platform] || 'default'
}

// ==================== 未续费账号管理功能 ====================

// 加载未续费账号
const loadNeverRenewedAccounts = async () => {
  neverRenewedAccountsLoading.value = true
  try {
    const response = await axios.get('/api/admin/never-renewed-accounts', {
      params: { days: neverRenewedDays.value },
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      // 计算创建天数
      const accounts = response.data.data.accounts.map((account: any) => {
        const createdTime = new Date(account.created_at)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - createdTime.getTime()) / (1000 * 60 * 60 * 24))
        return {
          ...account,
          created_days: diffDays,
        }
      })
      neverRenewedAccounts.value = accounts
      message.success(`查询成功,找到 ${accounts.length} 个未续费账号`)
    } else {
      message.error(response.data.message || '查询失败')
    }
  } catch (error) {
    console.error('查询未续费账号失败:', error)
    message.error('查询未续费账号失败')
  } finally {
    neverRenewedAccountsLoading.value = false
  }
}

// 处理选择未续费账号
const onSelectNeverRenewedAccountChange = (selectedRowKeys: number[]) => {
  selectedNeverRenewedAccountIds.value = selectedRowKeys
}

// 批量删除未续费账号
const handleBatchDeleteNeverRenewedAccounts = async () => {
  if (selectedNeverRenewedAccountIds.value.length === 0) {
    message.warning('请先选择要删除的账号')
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: h('div', [
      h('p', `确定要删除选中的 ${selectedNeverRenewedAccountIds.value.length} 个未续费账号吗？`),
      h('p', { style: { color: '#ff4d4f', marginTop: '8px' } }, '此操作不可恢复！'),
    ]),
    okText: '确定删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      deleteNeverRenewedAccountsLoading.value = true
      try {
        const response = await axios.post(
          '/api/admin/never-renewed-accounts/batch-delete',
          {
            accountIds: selectedNeverRenewedAccountIds.value,
          },
          {
            headers: {
              Authorization: `Bearer ${props.token}`,
            },
          },
        )

        if (response.data.success) {
          message.success(response.data.message || '删除成功')
          // 清空选中项
          selectedNeverRenewedAccountIds.value = []
          // 重新加载列表
          loadNeverRenewedAccounts()
        } else {
          message.error(response.data.message || '删除失败')
        }
      } catch (error) {
        console.error('批量删除未续费账号失败:', error)
        message.error('批量删除失败')
      } finally {
        deleteNeverRenewedAccountsLoading.value = false
      }
    },
  })
}

// 全部删除未续费账号
const handleDeleteAllNeverRenewedAccounts = async () => {
  if (neverRenewedAccounts.value.length === 0) {
    message.warning('没有未续费账号可删除')
    return
  }

  Modal.confirm({
    title: '确认全部删除',
    content: h('div', [
      h('p', { style: { fontSize: '16px', fontWeight: 'bold' } }, `确定要删除全部 ${neverRenewedAccounts.value.length} 个未续费账号吗？`),
      h('p', { style: { color: '#ff4d4f', marginTop: '8px' } }, '⚠️ 此操作将删除所有查询到的未续费账号！'),
      h('p', { style: { color: '#ff4d4f' } }, '此操作不可恢复！'),
    ]),
    okText: '确定删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      deleteAllNeverRenewedAccountsLoading.value = true
      try {
        // 获取所有未续费账号的ID
        const allAccountIds = neverRenewedAccounts.value.map((account: any) => account.id)

        const response = await axios.post(
          '/api/admin/never-renewed-accounts/batch-delete',
          {
            accountIds: allAccountIds,
          },
          {
            headers: {
              Authorization: `Bearer ${props.token}`,
            },
          },
        )

        if (response.data.success) {
          message.success(response.data.message || '全部删除成功')
          // 清空选中项和列表
          selectedNeverRenewedAccountIds.value = []
          neverRenewedAccounts.value = []
        } else {
          message.error(response.data.message || '删除失败')
        }
      } catch (error) {
        console.error('全部删除未续费账号失败:', error)
        message.error('全部删除失败')
      } finally {
        deleteAllNeverRenewedAccountsLoading.value = false
      }
    },
  })
}

// ==================== 游戏账号迁移功能 ====================

// 搜索游戏账号
const searchGameAccount = async () => {
  if (!migrationGameUsername.value.trim()) {
    message.warning('请输入游戏账号用户名')
    return
  }

  searchingGameAccount.value = true
  try {
    const response = await axios.get('/api/admin/game-account-search', {
      params: { gameUsername: migrationGameUsername.value.trim() },
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      currentGameAccountInfo.value = response.data.data
      message.success('查询成功')
    } else {
      currentGameAccountInfo.value = null
      message.error(response.data.message || '未找到该游戏账号')
    }
  } catch (error) {
    console.error('搜索游戏账号失败:', error)
    message.error('搜索失败')
    currentGameAccountInfo.value = null
  } finally {
    searchingGameAccount.value = false
  }
}

// 打开迁移弹窗
const openMigrationModal = (accountInfo: any) => {
  selectedAccountForMigration.value = accountInfo
  targetUsername.value = ''
  targetUserInfo.value = null
  migrationModalOpen.value = true
}

// 搜索目标用户
const searchTargetUser = async () => {
  if (!targetUsername.value.trim()) {
    message.warning('请输入目标用户名')
    return
  }

  searchingTargetUser.value = true
  try {
    const response = await axios.get('/api/admin/target-user-info', {
      params: { username: targetUsername.value.trim() },
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      targetUserInfo.value = response.data.data
      message.success('查询成功')
    } else {
      targetUserInfo.value = null
      message.error(response.data.message || '未找到该用户')
    }
  } catch (error) {
    console.error('搜索目标用户失败:', error)
    message.error('搜索失败')
    targetUserInfo.value = null
  } finally {
    searchingTargetUser.value = false
  }
}

// 确认迁移
const confirmMigration = async () => {
  if (!targetUserInfo.value) {
    message.warning('请先查询目标用户')
    return
  }

  if (!selectedAccountForMigration.value) {
    message.error('请先选择要迁移的角色')
    return
  }

  // 检查是否迁移到同一个用户
  if (selectedAccountForMigration.value.currentUser.id === targetUserInfo.value.user.id) {
    message.warning('目标用户与当前用户相同，无需迁移')
    return
  }

  Modal.confirm({
    title: '确认迁移',
    content: h('div', [
      h('p', `确定要将游戏角色 "${selectedAccountForMigration.value.gameAccount.nickname || selectedAccountForMigration.value.gameAccount.username}" 迁移到用户 "${targetUserInfo.value.user.username}" 吗？`),
      h('p', { style: { fontSize: '12px', color: '#666', marginTop: '4px' } }, `游戏账号: ${selectedAccountForMigration.value.gameAccount.username}`),
      h('p', { style: { fontSize: '12px', color: '#666' } }, `服务器: ${selectedAccountForMigration.value.gameAccount.server_name || '-'}`),
      h('p', { style: { color: '#ff4d4f', marginTop: '8px' } }, '⚠️ 此操作不可撤销！'),
    ]),
    okText: '确定迁移',
    cancelText: '取消',
    okType: 'primary',
    onOk: async () => {
      migrating.value = true
      try {
        const response = await axios.post(
          '/api/admin/migrate-game-account',
          {
            gameAccountId: selectedAccountForMigration.value.gameAccount.id,
            targetUserId: targetUserInfo.value.user.id,
          },
          {
            headers: {
              Authorization: `Bearer ${props.token}`,
            },
          },
        )

        if (response.data.success) {
          message.success(response.data.message || '迁移成功')
          migrationModalOpen.value = false
          // 重置状态
          currentGameAccountInfo.value = null
          selectedAccountForMigration.value = null
          targetUserInfo.value = null
          migrationGameUsername.value = ''
          targetUsername.value = ''
        } else {
          message.error(response.data.message || '迁移失败')
        }
      } catch (error) {
        console.error('迁移游戏账号失败:', error)
        message.error('迁移失败')
      } finally {
        migrating.value = false
      }
    },
  })
}

// ==================== 管理员操作日志方法 ====================

// 获取管理员操作日志
const fetchOperationLogs = async (page = 1, pageSize = 20) => {
  operationLogsLoading.value = true
  try {
    const response = await axios.get('/api/admin/operation-logs', {
      params: { page, pageSize },
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      operationLogs.value = response.data.data.logs || []
      operationLogsPagination.value = {
        page: response.data.data.page,
        pageSize: response.data.data.pageSize,
        total: response.data.data.total,
      }
    } else {
      message.error(response.data.message || '获取操作日志失败')
    }
  } catch (error) {
    console.error('获取操作日志失败:', error)
    message.error('获取操作日志失败')
  } finally {
    operationLogsLoading.value = false
  }
}

// 处理分页变化
const handleOperationLogsPageChange = (page: number, pageSize: number) => {
  fetchOperationLogs(page, pageSize)
}

// ==================== 游戏账号统计方法 ====================

// 获取游戏账号统计
const fetchGameAccountsStats = async () => {
  gameAccountsStatsLoading.value = true
  try {
    const response = await axios.get('/api/admin/game-accounts-stats', {
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      gameAccountsStats.value = response.data.data || null
    } else {
      message.error(response.data.message || '获取游戏账号统计失败')
    }
  } catch (error) {
    console.error('获取游戏账号统计失败:', error)
    message.error('获取游戏账号统计失败')
  } finally {
    gameAccountsStatsLoading.value = false
  }
}

// 获取游戏账号列表
const fetchGameAccountsList = async (page?: number, pageSize?: number) => {
  gameAccountsListLoading.value = true
  try {
    const params: any = {
      page: page || gameAccountsPagination.value.page,
      pageSize: pageSize || gameAccountsPagination.value.pageSize,
    }

    // 添加筛选条件
    if (gameAccountsFilter.value.username) {
      params.username = gameAccountsFilter.value.username
    }
    if (gameAccountsFilter.value.script_account_id) {
      params.script_account_id = gameAccountsFilter.value.script_account_id
    }
    if (gameAccountsFilter.value.server_name) {
      params.server_name = gameAccountsFilter.value.server_name
    }
    if (gameAccountsFilter.value.platform !== undefined) {
      params.platform = gameAccountsFilter.value.platform
    }
    if (gameAccountsFilter.value.is_online !== undefined) {
      params.is_online = gameAccountsFilter.value.is_online
    }

    const response = await axios.get('/api/admin/game-accounts-list', {
      params,
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      gameAccountsList.value = response.data.data || []
      gameAccountsPagination.value.total = response.data.total || 0
      gameAccountsPagination.value.page = response.data.page || 1
      gameAccountsPagination.value.pageSize = response.data.pageSize || 20
    } else {
      message.error(response.data.message || '获取游戏账号列表失败')
    }
  } catch (error) {
    console.error('获取游戏账号列表失败:', error)
    message.error('获取游戏账号列表失败')
  } finally {
    gameAccountsListLoading.value = false
  }
}

// 重置游戏账号筛选条件
const resetGameAccountsFilter = () => {
  gameAccountsFilter.value = {
    username: '',
    script_account_id: '',
    server_name: '',
    platform: undefined,
    is_online: undefined,
  }
  gameAccountsPagination.value.page = 1
  fetchGameAccountsList(1, gameAccountsPagination.value.pageSize)
}

// 处理游戏账号分页变化
const handleGameAccountsPageChange = (page: number, pageSize: number) => {
  gameAccountsPagination.value.page = page
  gameAccountsPagination.value.pageSize = pageSize
  fetchGameAccountsList(page, pageSize)
}

// ==================== 脚本服务器管理方法 ====================

// 加载服务器列表
const loadScriptServers = async () => {
  loadingServers.value = true
  try {
    const response = await axios.get('/api/admin/script-servers', {
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      scriptServers.value = response.data.data
    } else {
      message.error(response.data.message || '加载服务器列表失败')
    }
  } catch (error) {
    console.error('加载服务器列表失败:', error)
    message.error('加载服务器列表失败')
  } finally {
    loadingServers.value = false
  }
}

// 显示添加服务器弹窗
const showAddServerModal = () => {
  serverModalMode.value = 'add'
  resetServerForm()
  serverModalOpen.value = true
}

// 显示编辑服务器弹窗
const showEditServerModal = (server: any) => {
  serverModalMode.value = 'edit'
  serverForm.value = {
    id: server.id,
    name: server.name,
    ip: server.ip,
    port: server.port,
    maxAccounts: server.maxAccounts,
    currentAccounts: server.currentAccounts,
    status: server.status,
  }
  serverModalOpen.value = true
}

// 重置服务器表单
const resetServerForm = () => {
  serverForm.value = {
    id: '',
    name: '',
    ip: '',
    port: 3000,
    maxAccounts: 5000,
    currentAccounts: 0,
    status: 'active',
  }
}

// 提交服务器表单
const handleServerSubmit = async () => {
  try {
    await serverFormRef.value?.validate()
    submitServer()
  } catch (error) {
    console.log('表单校验失败:', error)
  }
}

// 提交服务器
const submitServer = async () => {
  serverSubmitting.value = true
  try {
    const url = serverModalMode.value === 'add'
      ? '/api/admin/script-servers'
      : `/api/admin/script-servers/${serverForm.value.id}`

    const method = serverModalMode.value === 'add' ? 'post' : 'put'

    const response = await axios({
      method,
      url,
      data: serverForm.value,
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      message.success(response.data.message || `${serverModalMode.value === 'add' ? '添加' : '更新'}成功`)
      serverModalOpen.value = false
      resetServerForm()
      loadScriptServers() // 重新加载列表
    } else {
      message.error(response.data.message || `${serverModalMode.value === 'add' ? '添加' : '更新'}失败`)
    }
  } catch (error) {
    console.error('提交服务器失败:', error)
    message.error(`${serverModalMode.value === 'add' ? '添加' : '更新'}失败`)
  } finally {
    serverSubmitting.value = false
  }
}

// 删除服务器
const deleteServer = async (serverId: string) => {
  try {
    const response = await axios.delete(`/api/admin/script-servers/${serverId}`, {
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      message.success(response.data.message || '删除成功')
      loadScriptServers() // 重新加载列表
    } else {
      message.error(response.data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除服务器失败:', error)
    message.error('删除失败')
  }
}

// 显示导入弹窗
const showImportServerModal = () => {
  importServerText.value = ''
  importServerModalOpen.value = true
}

// 从当前JSON文件加载
const loadCurrentJsonFile = async () => {
  try {
    // 读取当前的script-servers.json文件内容
    const currentServers = scriptServers.value
    if (currentServers && currentServers.length > 0) {
      // 移除数据库字段，保持与JSON格式一致
      const exportData = currentServers.map((server: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { created_at, updated_at, ...rest } = server
        return rest
      })
      importServerText.value = JSON.stringify(exportData, null, 2)
      message.success('已加载当前数据库配置')
    } else {
      message.warning('当前没有服务器配置')
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    message.error('加载配置失败')
  }
}

// 导入服务器配置
const handleImportServers = async () => {
  if (!importServerText.value.trim()) {
    message.warning('请输入JSON配置')
    return
  }

  try {
    const servers = JSON.parse(importServerText.value)

    if (!Array.isArray(servers)) {
      message.error('配置格式错误，必须是数组')
      return
    }

    importing.value = true
    const response = await axios.post(
      '/api/admin/script-servers/import',
      { servers },
      {
        headers: {
          Authorization: `Bearer ${props.token}`,
        },
      }
    )

    if (response.data.success) {
      const { success, failed, errors } = response.data.data
      if (failed > 0) {
        Modal.warning({
          title: '导入完成（部分失败）',
          content: h('div', [
            h('p', `成功: ${success}个，失败: ${failed}个`),
            h('div', { style: { marginTop: '8px', maxHeight: '200px', overflow: 'auto' } },
              errors.map((err: string) => h('p', { style: { color: '#ff4d4f', margin: '4px 0' } }, err))
            ),
          ]),
        })
      } else {
        message.success(`导入成功: ${success}个服务器`)
      }
      importServerModalOpen.value = false
      importServerText.value = ''
      loadScriptServers() // 重新加载列表
    } else {
      message.error(response.data.message || '导入失败')
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      message.error('JSON格式错误，请检查配置')
    } else {
      console.error('导入服务器配置失败:', error)
      message.error('导入失败')
    }
  } finally {
    importing.value = false
  }
}

// 导出服务器配置
const exportServers = async () => {
  try {
    const response = await axios.get('/api/admin/script-servers/export', {
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (response.data.success) {
      const servers = response.data.data
      const jsonStr = JSON.stringify(servers, null, 2)

      // 创建下载链接
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `script-servers-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      message.success('导出成功')
    } else {
      message.error(response.data.message || '导出失败')
    }
  } catch (error) {
    console.error('导出服务器配置失败:', error)
    message.error('导出失败')
  }
}

// 处理批量点数提交，包含表单校验
const handleBatchPointsSubmit = async () => {
  try {
    await batchPointsFormRef.value?.validate()
    executeBatchPointsOperation()
  } catch (error) {
    console.log('表单校验失败:', error)
  }
}

// 执行批量点数操作
const executeBatchPointsOperation = async () => {
  if (!filteredBatchUsers.value || filteredBatchUsers.value.length === 0) {
    message.error('没有符合条件的用户')
    return
  }

  batchPointsLoading.value = true
  try {
    const operation = batchOperationType.value === 'add' ? 'add' : 'subtract'

    // 批量处理用户点数
    const promises = filteredBatchUsers.value.map((user: any) =>
      fetch('/api/admin/batch-points', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${props.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          points: batchPointsForm.value.points,
          operation: operation,
          reason: batchPointsForm.value.reason,
        }),
      }),
    )

    const responses = await Promise.all(promises)
    const results = await Promise.all(responses.map((res: any) => res.json()))

    const successCount = results.filter((result: any) => result.success).length
    const failCount = results.length - successCount

    if (successCount > 0) {
      message.success(
        `成功处理 ${successCount} 个用户${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
      )
      batchPointsModalOpen.value = false
      batchPointsForm.value.points = 0
      batchPointsForm.value.reason = ''
    } else {
      message.error('批量操作失败')
    }
  } catch (error) {
    console.error('批量点数操作失败:', error)
    message.error('批量点数操作失败')
  } finally {
    batchPointsLoading.value = false
  }
}

// 提现金额验证（本人部分）
const validateWithdrawAmount = (_: any, value: number) => {
  const availableAmount =
    parseFloat(selectedUser.value?.available_commission?.toString() || '0') || 0
  if (value && value > availableAmount) {
    return Promise.reject(new Error('提现金额不能超过可提现金额'))
  }
  if (value && value < 0) {
    return Promise.reject(new Error('提现金额不能为负数'))
  }
  return Promise.resolve()
}

// 三级代理汇总提现金额验证
const validateSubWithdrawAmount = (_: any, value: number) => {
  const subAvailable =
    parseFloat(selectedUser.value?.sub_agents_available?.toString() || '0') || 0
  if (value && value > subAvailable) {
    return Promise.reject(new Error('金额不能超过旗下三级代理总可提现金额'))
  }
  if (value && value < 0) {
    return Promise.reject(new Error('金额不能为负数'))
  }
  return Promise.resolve()
}

// 确认提现
const confirmWithdraw = async () => {
  if (!selectedUser.value) return

  const selfAmount = withdrawForm.value.amount || 0
  const subAmount = withdrawForm.value.subAmount || 0

  if (selfAmount <= 0 && subAmount <= 0) {
    message.warning('请至少填写一项提现金额')
    return
  }

  try {
    let successCount = 0

    // 1. 本人提现
    if (selfAmount > 0) {
      const response = await fetch('/api/commission/admin/withdraw', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${props.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.value.id,
          amount: selfAmount,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        message.error(`本人提现失败：${errorData.message || '未知错误'}`)
        return
      }
      successCount++
    }

    // 2. 三级代理汇总结清（调用 agent 提现接口的管理员版：直接操作该二级代理旗下汇总）
    if (subAmount > 0 && selectedUserIsSecondLevel.value) {
      const response = await fetch('/api/admin/sub-agents-withdraw', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${props.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentAgentId: selectedUser.value.id,
          amount: subAmount,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        message.error(`三级代理结清失败：${errorData.message || '未知错误'}`)
        return
      }
      successCount++
    }

    message.success('提现处理成功')
    withdrawModalOpen.value = false
    withdrawForm.value.amount = 0
    withdrawForm.value.subAmount = 0
    fetchInviteRelations()
  } catch {
    message.error('提现处理失败')
  }
}

// 处理编辑充值配置
const handleEditConfig = () => {
  // 确保表单数据已正确初始化
  if (rechargeConfig.value) {
    configForm.value = {
      name: rechargeConfig.value.name || '',
      unit_price: rechargeConfig.value.unit_price || 0,
      bonus_rate: rechargeConfig.value.bonus_rate || 0,
      min_quantity: rechargeConfig.value.min_quantity || 1,
      max_quantity: rechargeConfig.value.max_quantity || 99,
      enabled: rechargeConfig.value.enabled !== undefined ? rechargeConfig.value.enabled : 1,
    }
  }

  // 清除之前的表单校验状态
  setTimeout(() => {
    configFormRef.value?.clearValidate()
  }, 0)

  configModalOpen.value = true
}

// 更新充值配置
const updateRechargeConfig = async () => {
  try {
    // 先执行表单校验
    await configFormRef.value?.validateFields()

    const response = await fetch('/api/admin/recharge-config', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configForm.value),
    })

    if (response.ok) {
      message.success('充值配置更新成功')
      configModalOpen.value = false
      fetchRechargeConfig()
    } else {
      message.error('更新失败')
    }
  } catch (error: any) {
    // 如果是校验错误，不显示网络错误提示
    if (error?.errorFields) {
      message.error('请检查表单输入')
    } else {
      message.error('网络错误')
    }
  }
}

// 保存公告
const handleSaveAnnouncement = async () => {
  announcementLoading.value = true
  try {
    const url = editingAnnouncement.value
      ? `/api/admin/announcements/${editingAnnouncement.value.id}`
      : '/api/admin/announcements'

    const method = editingAnnouncement.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcementForm.value),
    })

    if (response.ok) {
      message.success(editingAnnouncement.value ? '公告更新成功' : '公告创建成功')
      announcementModalOpen.value = false
      fetchAnnouncements()
      editingAnnouncement.value = null
      // 重置表单
      announcementForm.value = {
        title: '',
        content: '',
        enabled: 1,
        display_duration: 5,
      }
    } else {
      const errorData = await response.json()
      message.error(errorData.message || '保存失败')
    }
  } finally {
    announcementLoading.value = false
  }
}

// ==================== 管理面板权限初始化 ====================

/**
 * 获取当前用户的管理面板权限
 */
const fetchAdminPanelPermissions = async () => {
  try {
    const response = await axios.get('/api/admin/my-admin-panel-permissions', {
      headers: { Authorization: `Bearer ${props.token}` },
    })

    if (response.data.success) {
      const { isAdmin, permissions } = response.data.data
      isAdminRole.value = isAdmin
      adminPanelPermissions.value = permissions
    }
  } catch (error) {
    console.error('获取管理面板权限失败:', error)
  }
}

/**
 * 检查是否有某个模块的访问权限
 * @param moduleKey 模块key
 * @returns boolean
 */
const hasModuleAccess = (moduleKey: string): boolean => {
  // admin 角色默认拥有所有权限
  if (isAdminRole.value) {
    return true
  }
  // 检查权限配置
  return adminPanelPermissions.value[moduleKey] === true
}

onMounted(() => {
  // 初始化权限
  fetchAdminPanelPermissions()
  
  // 不再预加载数据，改为在切换标签页时按需加载
  // 这样可以避免非admin用户因为权限问题导致数据加载失败
})
</script>

<style lang="scss">
@import './AdminPanel.css';
</style>
