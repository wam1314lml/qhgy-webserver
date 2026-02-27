<template>
  <div class="game-config-page">
    <!-- 导航栏 -->
    <a-affix :offset-top="0" class="z-20">
      <TopNavBar
        title="游戏配置"
        :showBackButton="true"
        :showBalance="false"
        @back="$router.push('/')"
      >
        <template #right-prefix>
          <a-button @click="onSave" class="save-button" :disabled="loading" type="primary">
            保存
          </a-button>
        </template>
      </TopNavBar>
    </a-affix>

    <!-- 配置容器 -->
    <div class="config-container">
      <!-- 标签页导航 -->
      <a-affix :offset-top="56">
        <div class="tabs-container bg-white pt-2!">
          <a-tabs v-model:activeKey="activeTab">
            <a-tab-pane v-for="tab in tabs" :key="tab" :tab="tab"></a-tab-pane>
          </a-tabs>
        </div>
      </a-affix>

      <!-- 配置内容 -->
      <div class="config-main">
        <!-- 加载状态 -->
        <div
          v-if="loading"
          class="loading-container"
          @touchmove.stop.prevent
          @mousewheel.stop.prevent
        >
          <a-spin size="large">
            <template #indicator>
              <div class="loading-indicator">
                <div class="loading-spinner"></div>
              </div>
            </template>
          </a-spin>
        </div>

        <!-- 配置表单 -->
        <Form
          ref="formRef"
          :model="config"
          :rules="formRules"
          layout="horizontal"
          :label-col="{ span: 8 }"
          :wrapper-col="{ span: 16 }"
        >
          <!-- 基础设置 -->
          <div v-if="activeTab === '基础'" class="config-section">
            <Divider orientation="left">基础设置</Divider>

            <CustomFormItem
              label="道具日志"
              name="basic.hasSeparation"
              tooltip="是否开启道具奖励消耗详情(开启后日志量激增)"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="重连间隔"
              name="reconnectInterval"
              :tooltip="'重连间隔 默认为 5 分钟'"
            >
              <CustomInputNumber
                :value="Math.round(config.reconnectInterval / 60000)"
                @change="
                  (value: number) =>
                    (config.reconnectInterval = (typeof value === 'number' ? value : 5) * 60000)
                "
                :min="1"
                :step="1"
                suffix="分钟"
                class="w-42! sm:w-48!"
              >
                <template #addonAfter>分钟</template>
              </CustomInputNumber>
            </CustomFormItem>
            <Divider orientation="left">任务配置</Divider>

            <CustomFormItem label="每日任务" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="每周任务" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="主线任务" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="主线剧情" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="花坊悬赏" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <Divider orientation="left">邮件配置</Divider>
            <CustomFormItem label="自动领取" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="删除已读" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <Divider orientation="left">福利配置</Divider>
            <CustomFormItem
              label="双倍金币"
              name="basic.hasSeparation"
              tooltip="每4小时自动看视频领取双倍金币福利"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="领取宝箱"
              name="basic.hasSeparation"
              tooltip="每隔一段时间, 自动领取福利宝箱"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="分享奖励"
              name="basic.hasSeparation"
              tooltip="自动领取花艺分享、新花分享、升级分享奖励"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <Divider orientation="left">签到配置</Divider>
            <CustomFormItem label="自动签到" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="自动补签" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <Divider orientation="left">珍珠配置</Divider>
            <CustomFormItem label="收获珍珠" name="basic.hasSeparation" tooltip="自动收获珍珠">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="免费珍珠" name="basic.hasSeparation" tooltip="看视频领免费珍珠">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="雇佣劳工" name="basic.hasSeparation" tooltip="自动雇佣劳工">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="雇佣来源" name="basic.hasSeparation">
              <Radio.Group v-model:value="config.homeland.drainStaminaStealMode">
                <Space direction="vertical">
                  <Radio :value="0">好友 </Radio>
                  <Radio :value="1">世界 </Radio>
                  <Radio :value="2">仇人 </Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              label="雇佣券上限"
              name="basic.hasSeparation"
              tooltip="当日最大可以使用的雇佣券数量, 为0则不进行限制。"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="开启防身"
              name="basic.hasSeparation"
              tooltip="开启或关闭防身，开启后别人雇佣自己会消耗防身符"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="买雇佣书"
              name="basic.hasSeparation"
              tooltip="雇佣书不足时自动购买"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="元宝上限"
              name="basic.hasSeparation"
              tooltip="购买雇佣书消耗最大元宝"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">商城购买</Divider>
            <CustomFormItem
              label="视频礼包"
              name="basic.hasSeparation"
              tooltip="自动观看视频领取礼包商城免费礼包"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="材料商店"
              name="basic.hasSeparation"
              tooltip="自动买光材料商店所有耗材，自动刷新"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="金币上限"
              name="basic.hasSeparation"
              tooltip="材料商店花费金币上限，0则不限制"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="VIP商店"
              name="basic.hasSeparation"
              tooltip="自动购买VIP商店物品"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>
          <!-- 种植设置 -->
          <div v-if="activeTab === '种植'" class="config-section">
            <Divider orientation="left">培育配置</Divider>
            <CustomFormItem
              label="自动培育"
              name="basic.hasSeparation"
              tooltip="自动培育可培育花种"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="视频加速" name="basic.hasSeparation" tooltip="视频加速培育">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="元宝加速" name="basic.hasSeparation" tooltip="元宝加速培育">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="元宝购买"
              name="basic.hasSeparation"
              tooltip="材料不足使用元宝购买"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="鲜花升级"
              name="basic.hasSeparation"
              tooltip="花费金币自动进行鲜花升级"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="目标等级"
              name="basic.hasSeparation"
              tooltip="鲜花升级到目标等级"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">水滴配置</Divider>
            <CustomFormItem label="水车水滴" name="basic.hasSeparation" tooltip="自动领取水车水滴">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="限时水滴" name="basic.hasSeparation" tooltip="自动领取限时水滴">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="水滴阈值"
              name="basic.hasSeparation"
              tooltip="水滴少于此值才开始领取，0则不限制"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">种花配置</Divider>
            <CustomFormItem
              label="解锁土地"
              name="basic.hasSeparation"
              tooltip="花费金币自动解锁可解锁的土地"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动种花"
              name="basic.hasSeparation"
              tooltip="自动完成土地收获，浇水，加速，种植"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="视频加速"
              name="basic.hasSeparation"
              tooltip="是否开启看视频加速"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="使用加速"
              name="basic.hasSeparation"
              tooltip="是否开启加速券加速"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="保留水滴"
              name="basic.hasSeparation"
              tooltip="保留多少水滴不用于浇花"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem label="任务优先" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="任务日志"
              name="basic.hasSeparation"
              tooltip="是否显示种植任务日志"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="种植模式"
              name="homeland.drainStaminaStealMode"
              tooltip="选择种植模式，只能启用一种模式。需要保持种植整洁的玩家请自行清空所有土地"
            >
              <Radio.Group v-model:value="config.homeland.drainStaminaStealMode">
                <Space direction="vertical">
                  <Radio :value="0">指定品质 </Radio>
                  <Radio :value="1">指定种类 </Radio>
                  <Radio :value="2">指定花朵 </Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              label="选择数量"
              name="homeland.exclusiveMode"
              tooltip="选择要种植几种花，库存少的优先种植。"
            >
              <Select
                v-model:value="config.homeland.exclusiveMode"
                class="w-42! sm:w-48!"
                @change="
                  () => {
                    config.homeland.xianYuStealTimeRange = []
                  }
                "
              >
                <Select.Option :value="0">1</Select.Option>
                <Select.Option :value="1">2</Select.Option>
                <Select.Option :value="2">4</Select.Option>
                <Select.Option :value="2">8</Select.Option>
                <Select.Option :value="3">16</Select.Option>
              </Select>
            </CustomFormItem>
            <CustomFormItem
              label="限制花朵等级"
              name="basic.hasSeparation"
              tooltip="限制种植的最低花朵等级，0 则不限制"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">好友偷花</Divider>
            <CustomFormItem label="自动偷花" name="basic.hasSeparation" tooltip="默认不会偷取花灵">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="品质限定"
              name="challenge.common.towerSkills"
              tooltip="只偷取指定品质的花朵"
            >
              <CustomSelect
                v-model:value="config.challenge.common.towerSkills"
                mode="multiple"
                :options="[
                  { value: 1001, label: '蓝色' },
                  { value: 1011, label: '紫色' },
                  { value: 1012, label: '金色' },
                  { value: 1013, label: '红色' },
                  { value: 1014, label: '绿色' },
                ]"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              label="购买偷取次数"
              name="basic.hasSeparation"
              tooltip="花费好友币购买偷取次数"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">花艺上架</Divider>
            <CustomFormItem label="自动解锁花架" name="basic.hasSeparation" tooltip="自动解锁花架">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动领取金币"
              name="basic.hasSeparation"
              tooltip="自动领取花艺上架售卖所得金币"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="自动上架" name="basic.hasSeparation" tooltip="自动上架花艺">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="指定花艺"
              name="challenge.common.towerSkills"
              tooltip="指定花艺，优先选择有库存的上架，否则进行制作，如果花朵库存不足需要配合种植开启任务模式进行使用。"
            >
              <CustomSelect
                v-model:value="config.challenge.common.towerSkills"
                mode="multiple"
                :options="[
                  { value: 1001, label: '蓝色' },
                  { value: 1011, label: '紫色' },
                  { value: 1012, label: '金色' },
                  { value: 1013, label: '红色' },
                  { value: 1014, label: '绿色' },
                ]"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              label="上架数量"
              name="basic.hasSeparation"
              tooltip="每个花架上架多少花艺"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">花贸市场</Divider>
            <CustomFormItem label="自动参与" name="basic.hasSeparation" tooltip="自动参与花贸市场">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>
          <!-- 订单配置 -->
          <div v-if="activeTab === '订单'" class="config-section">
            <Divider orientation="left">居民订单</Divider>
            <CustomFormItem
              label="普通订单"
              name="basic.hasSeparation"
              tooltip="自动提交普通居民订单（不包括建材和绸缎订单）"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="普通订单上限"
              name="basic.hasSeparation"
              tooltip="普通居民订单单日最大完成次数"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="绸缎订单"
              name="basic.hasSeparation"
              tooltip="开启后会自动提交绸缎类订单"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="绸缎订单上限"
              name="basic.hasSeparation"
              tooltip="绸缎订单单日最大完成次数"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="建材订单"
              name="basic.hasSeparation"
              tooltip="开启后会自动提交建材类订单"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="建材订单上限"
              name="basic.hasSeparation"
              tooltip="建材订单单日最大完成次数"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="仅已培育"
              name="basic.hasSeparation"
              tooltip="仅提交已培育的花朵"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="品质限定"
              name="challenge.common.towerSkills"
              tooltip="仅提交指定品质的花朵到居民订单"
            >
              <CustomSelect
                v-model:value="config.challenge.common.towerSkills"
                mode="multiple"
                :options="[
                  { value: 1001, label: '蓝色' },
                  { value: 1011, label: '紫色' },
                  { value: 1012, label: '金色' },
                  { value: 1013, label: '红色' },
                  { value: 1014, label: '绿色' },
                ]"
                style="width: 100%"
              />
            </CustomFormItem>

            <Divider orientation="left">顾客订单</Divider>
            <CustomFormItem label="自动完成" name="basic.hasSeparation" tooltip="自动完成顾客订单">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动拒绝"
              name="basic.hasSeparation"
              tooltip="自动拒绝无法培育且库存不够的订单"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">宫廷订单</Divider>
            <CustomFormItem label="自动完成" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">组团订单</Divider>
            <CustomFormItem label="自动完成" name="basic.hasSeparation" tooltip="自动完成团单">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>
          <!-- 公会配置 -->
          <div v-if="activeTab === '公会'" class="config-section">
            <Divider orientation="left">公会种植</Divider>
            <CustomFormItem label="自动收获" name="basic.hasSeparation" tooltip="公会土地自动收获">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="自动种植" name="basic.hasSeparation" tooltip="公会土地自动种植">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="品质限定"
              name="challenge.common.towerSkills"
              tooltip="仅提交指定品质的花朵到居民订单"
            >
              <CustomSelect
                v-model:value="config.challenge.common.towerSkills"
                mode="multiple"
                :options="[
                  { value: 1001, label: '蓝色' },
                  { value: 1011, label: '紫色' },
                  { value: 1012, label: '金色' },
                  { value: 1013, label: '红色' },
                  { value: 1014, label: '绿色' },
                ]"
                style="width: 100%"
              />
            </CustomFormItem>

            <Divider orientation="left">公会建设</Divider>
            <CustomFormItem label="视频建设" name="basic.hasSeparation" tooltip="视频公会建设">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="金币建设" name="basic.hasSeparation" tooltip="金币公会建设">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="元宝建设" name="basic.hasSeparation" tooltip="元宝公会建设">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">公会分享</Divider>
            <CustomFormItem label="自动分享" name="basic.hasSeparation" tooltip="公会自动分享花">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="限定模式" name="basic.hasSeparation">
              <Radio.Group v-model:value="config.homeland.drainStaminaStealMode1">
                <Space direction="vertical">
                  <Radio :value="0">指定品质 </Radio>
                  <Radio :value="1">指定花朵 </Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              label="品质限定"
              name="basic.hasSeparation"
              tooltip="限定要分享到公会的花朵品质"
              v-if="config.homeland.drainStaminaStealMode1 === 0"
            >
              <CustomSelect
                v-model:value="config.challenge.common.towerSkills"
                mode="multiple"
                :options="[
                  { value: 1001, label: '蓝色' },
                  { value: 1011, label: '紫色' },
                  { value: 1012, label: '金色' },
                  { value: 1013, label: '红色' },
                  { value: 1014, label: '绿色' },
                ]"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              label="选择花朵"
              name="basic.hasSeparation"
              tooltip="选择要分享到公会的花朵，可多选，库存多的优先分享"
              v-if="config.homeland.drainStaminaStealMode1 === 1"
            >
              <CustomSelect
                v-model:value="config.challenge.common.towerSkills"
                mode="multiple"
                placeholder="请选择花朵"
                :options="[
                  { value: 1001, label: '蓝色' },
                  { value: 1011, label: '紫色' },
                  { value: 1012, label: '金色' },
                  { value: 1013, label: '红色' },
                  { value: 1014, label: '绿色' },
                ]"
                style="width: 100%"
              />
            </CustomFormItem>

            <Divider orientation="left">公会摸花</Divider>
            <CustomFormItem
              label="自动摸花"
              name="basic.hasSeparation"
              tooltip="自动摸取别人分享的花"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">公会摸花</Divider>
            <CustomFormItem
              label="领取任务"
              name="basic.hasSeparation"
              tooltip="自动领取，完成公会竞赛任务"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>

          <!-- 任务设置 -->
          <div v-if="activeTab === '任务'" class="config-section">
            <Divider orientation="left">随机事件</Divider>
            <CustomFormItem
              label="道具日志"
              name="basic.hasSeparation"
              tooltip="是否开启道具奖励消耗详情(开启后日志量激增)"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">喂猫撸猫</Divider>
            <CustomFormItem label="总开关" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="自动召回" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="自动购买猫粮" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="自动喂猫" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="自动撸猫" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>
          <!-- 活动设置 -->
          <div v-if="activeTab === '活动'" class="config-section">
            <Divider orientation="left">莳花纪闻</Divider>
            <CustomFormItem
              label="自动完成"
              name="basic.hasSeparation"
              tooltip="是否开启道具奖励消耗详情(开启后日志量激增)"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="元宝刷新"
              name="basic.hasSeparation"
              tooltip="是否开启道具奖励消耗详情(开启后日志量激增)"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="完成次数"
              name="basic.hasSeparation"
              tooltip="是否开启道具奖励消耗详情(开启后日志量激增)"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">丰仓鱼干</Divider>
            <CustomFormItem label="自动参与" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="显示结果" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="失败重启" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">鱼乐无穷</Divider>
            <CustomFormItem label="自动参与" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动领取体力"
              name="basic.hasSeparation"
              tooltip="自动领取每日任务完成后的体力奖励"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="游戏倍速"
              name="homeland.exclusiveMode"
              tooltip="选择游戏倍速，倍速越高消耗体力越多"
            >
              <Select
                v-model:value="config.homeland.exclusiveMode"
                class="w-42! sm:w-48!"
                @change="
                  () => {
                    config.homeland.xianYuStealTimeRange = []
                  }
                "
              >
                <Select.Option :value="0">1倍速</Select.Option>
                <Select.Option :value="1">4倍速</Select.Option>
                <Select.Option :value="2">8倍速</Select.Option>
                <Select.Option :value="3">16倍速</Select.Option>
              </Select>
            </CustomFormItem>
            <CustomFormItem label="显示结果" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="失败重启" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">奇妙泡泡</Divider>
            <CustomFormItem label="自动参与" name="basic.hasSeparation">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>

          <!-- 福地设置 -->
          <div v-if="activeTab === '福地'" class="config-section">
            <Divider orientation="left">福地设置</Divider>

            <CustomFormItem
              label="启用福地"
              name="homeland.enabled"
              tooltip="福地偷桃分为独家模式和普通模式，不设置独家模式既为普通模式。普通模式可以自由设置几个时间段，每个时间段偷不同的物品，普通模式建议4桃4瓶（人多的区建议其中一段改成4桃3瓶，人再多就3段都4桃3瓶），时间22-1 10-15 18-19三段，普通模式也可以刷玉，但是是傻瓜式刷玉，体力到15点以下就不会偷桃了！！"
            >
              <Switch v-model:checked="config.homeland.enabled" />
            </CustomFormItem>

            <CustomFormItem
              label="独家模式"
              name="homeland.exclusiveMode"
              tooltip="独家模式需要用仙玉，背包低于3000玉就不会刷新了。针对一些要求高的用户，设置了独家模式就不用管时间段了，什么都内置好了，是经过几个月测试得出的精准数据"
            >
              <Select
                v-model:value="config.homeland.exclusiveMode"
                class="w-42! sm:w-48!"
                @change="
                  () => {
                    config.homeland.xianYuStealTimeRange = []
                  }
                "
              >
                <Select.Option :value="0">不启用</Select.Option>
                <Select.Option :value="1">一夜偷完45桃</Select.Option>
                <Select.Option :value="2">一夜偷完45桃45瓶</Select.Option>
                <Select.Option :value="3">2段偷完45桃</Select.Option>
                <Select.Option :value="4">2段偷完45桃45瓶</Select.Option>
                <Select.Option :value="5">一夜偷完5桃</Select.Option>
              </Select>
            </CustomFormItem>

            <CustomFormItem
              label="自动收货"
              name="homeland.autoHarvest"
              tooltip="开启后自动收取物品"
            >
              <Switch v-model:checked="config.homeland.autoHarvest" />
            </CustomFormItem>

            <!-- <CustomFormItem
              label="偷干体力"
              name="homeland.drainStaminaSteal"
              tooltip="不开启，体力偷到15点虚弱了就不偷了，开启后，虚弱后会偷123级桃，直到体力枯竭"
            >
              <Switch v-model:checked="config.homeland.drainStaminaSteal" />
            </CustomFormItem> -->

            <CustomFormItem label="虚弱后操作" name="homeland.drainStaminaStealMode">
              <Radio.Group v-model:value="config.homeland.drainStaminaStealMode">
                <Space direction="vertical">
                  <Radio :value="0"
                    >偷低级桃到枯竭
                    <Tooltip
                      placement="top"
                      title="勾选后，虚弱了会偷123级桃到枯竭"
                      :trigger="tooltipTrigger"
                    >
                      <QuestionCircleOutlined class="tooltip-icon" />
                    </Tooltip>
                  </Radio>
                  <Radio :value="1"
                    >按原有设置继续偷
                    <Tooltip
                      placement="top"
                      title="勾选后，虚弱了会按原有的设置，比如设置了4桃4瓶，那么就会按这个设置继续偷"
                      :trigger="tooltipTrigger"
                    >
                      <QuestionCircleOutlined class="tooltip-icon" /> </Tooltip
                  ></Radio>
                  <Radio :value="2"
                    >不偷
                    <Tooltip
                      placement="top"
                      title="勾选后，虚弱了就停止工作了不会偷东西了"
                      :trigger="tooltipTrigger"
                    >
                      <QuestionCircleOutlined class="tooltip-icon" />
                    </Tooltip>
                  </Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              label="傻瓜式刷玉"
              name="homeland.xianYuSteal"
              tooltip="每隔30秒用玉刷新一次自己福地"
            >
              <Switch
                v-model:checked="config.homeland.xianYuSteal"
                :disabled="config.homeland.exclusiveMode !== 0"
              />
            </CustomFormItem>

            <template v-if="config.homeland.xianYuSteal">
              <CustomFormItem
                label="使用位置数量"
                tooltip="如果设置3，那么将使用3个位置进行刷新,如果有3个位置都有正在偷的资源就不会在刷新了"
              >
                <CustomInputNumber
                  v-model:value="config.homeland.xianYuAlreadyStealNum"
                  :min="0"
                  :max="6"
                  :disabled="config.homeland.exclusiveMode > 0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>

              <CustomFormItem
                label="刷玉时间"
                name="homeland.xianYuStealTimeRange"
                tooltip="请选择仙玉刷新的小时段(可多选),建议选择1-6点,22-23点"
              >
                <Select
                  v-model:value="config.homeland.xianYuStealTimeRange"
                  mode="multiple"
                  placeholder="请选择"
                  :options="hourOptions"
                  class="w-full"
                  :disabled="config.homeland.exclusiveMode > 0"
                  :max-tag-count="5"
                  :max-tag-placeholder="(omittedValues: any[]) => `+${omittedValues.length}...`"
                />
              </CustomFormItem>

              <CustomFormItem
                label="脸黑保护"
                name="homeland.xianYuNum"
                tooltip="背包仙玉小于该值时禁用仙玉刷新"
              >
                <CustomInputNumber
                  v-model:value="config.homeland.xianYuNum"
                  :min="0"
                  :disabled="config.homeland.exclusiveMode !== 0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <div v-if="config.homeland.exclusiveMode > 0" class="exclusive-mode-description">
              <div v-if="config.homeland.exclusiveMode === 1" class="mode-detail">
                <strong>一夜偷完45桃:</strong>
                22点开始，偷到体力剩余15点停止偷桃，大致早上8点能偷完，消耗3000-5000仙玉
              </div>
              <div v-if="config.homeland.exclusiveMode === 2" class="mode-detail">
                <strong>一夜偷完45桃45瓶:</strong>
                22点开始，偷到体力剩余15点停止偷桃，大致早上8点能偷完，消耗2000-4000仙玉
              </div>
              <div v-if="config.homeland.exclusiveMode === 3" class="mode-detail">
                <strong>2段偷完45桃:</strong>
                第一段时间为22点到01点，第二段时间为早上10点开始，偷到体力剩余15点停止偷桃，大致15-16点能偷完，消耗3000-3500玉
              </div>
              <div v-if="config.homeland.exclusiveMode === 4" class="mode-detail">
                <strong>2段偷完45桃45瓶:</strong>
                第一段时间为22点到03点，第二段时间为早上10点开始，偷到体力剩余15点停止偷桃，大致15-16点能偷完，消耗2000-2500玉
              </div>
              <div v-if="config.homeland.exclusiveMode === 5" class="mode-detail">
                <strong>一夜偷完5桃:</strong>
                22点开始，偷到体力剩余15点停止偷桃，大致早上10点能偷完，消耗20000玉左右
              </div>
            </div>

            <div v-if="config.homeland.exclusiveMode > 0" class="exclusive-mode-notice">
              启用独家模式后，时间段规则将被锁定，无法手动调整
            </div>

            <!-- 通用偷桃设置按钮 -->
            <div class="preset-button-container mb-4">
              <a-button
                type="primary"
                :disabled="config.homeland.exclusiveMode > 0"
                @click="showPresetConfirm"
              >
                通用偷桃设置
              </a-button>
            </div>

            <template v-if="config.homeland.enabled">
              <Divider orientation="left">时间段规则</Divider>

              <div
                v-for="(timeRule, timeIndex) in config.homeland.homelandRulesByTime"
                :key="timeIndex"
                :class="['time-rule-section', { disabled: config.homeland.exclusiveMode > 0 }]"
              >
                <div class="time-rule-header">
                  <h4>时间段 {{ timeIndex + 1 }}</h4>
                  <a-button
                    v-if="config.homeland.homelandRulesByTime.length > 1"
                    type="primary"
                    danger
                    size="small"
                    @click="removeTimeRule(timeIndex)"
                  >
                    删除
                  </a-button>
                </div>

                <div class="time-range-config">
                  <div class="time-input-group">
                    <label>开始时间</label>
                    <TimePicker
                      :value="timeStringToDayjs(timeRule.startTime)"
                      @change="(time) => updateTimeRule(timeIndex, 'startTime', time)"
                      format="HH:mm"
                      placeholder="选择时间"
                      class="w-full"
                      inputReadOnly
                    />
                  </div>
                  <div class="time-input-group">
                    <label>结束时间</label>
                    <TimePicker
                      :value="timeStringToDayjs(timeRule.endTime)"
                      @change="(time) => updateTimeRule(timeIndex, 'endTime', time)"
                      format="HH:mm"
                      placeholder="选择时间"
                      class="w-full"
                      inputReadOnly
                    />
                  </div>
                </div>

                <div class="steal-rules">
                  <h5>偷桃规则</h5>
                  <div
                    v-for="(rule, ruleIndex) in timeRule.rules"
                    :key="ruleIndex"
                    class="steal-rule-item"
                  >
                    <div class="rule-checkbox">
                      <Checkbox v-model:checked="rule.isCheck">
                        {{ rule.description }}
                      </Checkbox>
                    </div>
                    <div class="rule-level">
                      <label>最低等级</label>
                      <CustomInputNumber
                        :min="1"
                        :max="10"
                        v-model:value="rule.minItemLv"
                        :controls="true"
                        style="width: 100%"
                        size="small"
                        class="w-42! sm:w-48!"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <a-button type="dashed" class="mb-6" @click="addTimeRule"> + 添加时间段 </a-button>
            </template>
          </div>

          <!-- 洞天设置 -->
          <div v-if="activeTab === '洞天'" class="config-section">
            <Divider orientation="left">聚灵设置</Divider>

            <CustomFormItem
              label="启用聚灵"
              name="cave.gatherEnergy.enabled"
              tooltip="启用后能开阵就直接开24小时的阵，启用不启用都不影响入阵"
            >
              <Switch v-model:checked="config.cave.gatherEnergy.enabled" />
            </CustomFormItem>

            <CustomFormItem
              label="自动入阵"
              name="cave.gatherEnergy.robPos"
              tooltip="先判断设置的聚灵阈值为多少，如果是600点，那么，10：00-21：30这个时间段里，进入大于600点且结束时间<当天21点、或>隔天10点<隔天21点的阵，如果到了10：30还没入阵，那么就不判断聚灵阈值了，只判断结束时间，直到入阵。
21：30-22点这个时间段里，进入大于600点且结束时间>隔天10点<隔天21点的阵，如果到21：40还没入阵，那么就不判断聚灵阈值了，加入结束时间>隔天10点<隔天21：30的阵"
            >
              <Switch v-model:checked="config.cave.gatherEnergy.robPos" />
            </CustomFormItem>

            <CustomFormItem
              label="聚灵阈值"
              name="cave.gatherEnergy.threshold"
              tooltip="抢占的最低能量值"
            >
              <CustomInputNumber
                v-model:value="config.cave.gatherEnergy.threshold"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <!-- <CustomFormItem
              label="入阵最低时间"
              name="cave.gatherEnergy.minJoinTime"
              tooltip="可填范围为1-27小时 最低入阵时间"
            >
              <CustomInputNumber
                v-model:value="config.cave.gatherEnergy.minJoinTime"
                :min="1"
                :max="27"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem> -->

            <CustomFormItem
              label="能量优先"
              tooltip="设置了能量优先，全天都按照设置的聚灵阈值判断，如果是600点，那么，进入大于600点且结束时间<当天21：30、或>隔天10点<隔天“随便入阵设置时间”的阵。在设置的随便进入阵时间到达后，如果还没入阵，那么就不判断聚灵阈值。加入结束时间>隔天10点<隔天“随便入阵设置时间”的阵"
            >
              <Switch v-model:checked="config.cave.gatherEnergy.energyFirst" />
            </CustomFormItem>

            <CustomFormItem
              v-if="config.cave.gatherEnergy.energyFirst"
              label="随便入阵时间"
              name="cave.gatherEnergy.randomJoinMinute"
              tooltip="如设置了21:55分，那么21:55分开始就会随便入阵了，设置了58分，那么58分开始就会随便入阵"
            >
              <TimePicker
                :value="randomJoinTimeValue"
                @change="handleRandomJoinTimeChange"
                format="HH:mm"
                :disabled-hours="disabledHoursForRandomJoin"
                :disabled-minutes="disabledMinutesForRandomJoin"
                :hide-disabled-options="true"
                :show-now="false"
                inputReadOnly
                class="w-42! sm:w-48!"
                placeholder="选择时间"
              />
            </CustomFormItem>

            <Divider orientation="left">道途设置</Divider>

            <CustomFormItem
              label="道途开启"
              name="cave.profession.enabled"
              tooltip="先挑战20次,再进行速战"
            >
              <Switch v-model:checked="config.cave.profession.enabled" />
            </CustomFormItem>

            <template v-if="config.cave.profession.enabled && config.basic.hasSeparation">
              <CustomFormItem
                label="分身"
                name="cave.profession.index"
                tooltip="打道途时使用的分身"
              >
                <Radio.Group v-model:value="config.cave.profession.index" button-style="solid">
                  <Radio.Button
                    v-for="option in bodyOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <CustomFormItem
                label="神通预设"
                name="cave.profession.magicSwitchIndex"
                tooltip="打道途时使用的神通预设"
              >
                <Radio.Group
                  v-model:value="config.cave.profession.magicSwitchIndex"
                  button-style="solid"
                >
                  <Radio.Button
                    v-for="option in magicOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <CustomFormItem
                label="精怪阵容"
                name="cave.profession.spiritIndex"
                tooltip="打道途时使用的精怪阵容"
              >
                <Radio.Group
                  v-model:value="config.cave.profession.spiritIndex"
                  button-style="solid"
                >
                  <Radio.Button
                    v-for="option in spiritOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>
            </template>
            <Divider orientation="left">瑶池仙踪</Divider>

            <CustomFormItem label="启用瑶池仙踪" tooltip="启用后会派遣仙友">
              <Switch v-model:checked="config.cave.DestinyFight.enabled" />
            </CustomFormItem>

            <CustomFormItem label="使用聚灵瓶">
              <Switch v-model:checked="config.cave.DestinyFight.useItem" />
            </CustomFormItem>

            <CustomFormItem
              label="防挨揍"
              name="config.cave.DestinyFight.specifyTime"
              tooltip="打开后，在设置的时间内会派遣魅力值最低的三个仙友"
            >
              <Switch v-model:checked="config.cave.DestinyFight.specifyTime" />
              <div v-if="config.cave.DestinyFight.specifyTime" class="mt-3">
                <div class="flex items-center gap-3">
                  <div class="flex flex-col">
                    <a-time-picker
                      :value="config.cave.DestinyFight.specifyTimeSetting?.split('-')[0] || '23:30'"
                      format="HH:mm"
                      valueFormat="HH:mm"
                      inputReadOnly
                      hideDisabledOptions
                      :disabled-time="
                        () => ({
                          disabledHours: () => Array.from({ length: 23 }, (_, i) => i),
                          disabledMinutes: (hour: number) => {
                            if (hour === 23) {
                              return [...Array.from({ length: 30 }, (_, i) => i), 56, 57, 58, 59]
                            }
                            return [56, 57, 58, 59]
                          },
                        })
                      "
                      @change="
                        (time: any) => {
                          const endTime =
                            config.cave.DestinyFight.specifyTimeSetting?.split('-')[1] || '23:59'
                          const newTimeRange = time + '-' + endTime
                          // 使用时间校验方法验证新的时间范围
                          config.cave.DestinyFight.specifyTimeSetting =
                            validateTimeRange(newTimeRange)
                        }
                      "
                    />
                  </div>
                  <span class="text-gray-400">至</span>
                  <div class="flex flex-col">
                    <a-time-picker
                      :value="config.cave.DestinyFight.specifyTimeSetting?.split('-')[1] || '23:59'"
                      format="HH:mm"
                      valueFormat="HH:mm"
                      disabled
                    />
                  </div>
                </div>
              </div>
            </CustomFormItem>

            <CustomFormItem
              v-if="config.cave.DestinyFight.specifyTime"
              label="派遣2次数槽位1次"
              name="config.cave.DestinyFight.specifyDispatchOnEightHour"
              tooltip="打开后，能派遣2次的槽位会按设置时间派遣出去1次，是按最高魅力值仙友正序派遣"
            >
              <Switch v-model:checked="config.cave.DestinyFight.specifyDispatchOnEightHour" />
            </CustomFormItem>

            <CustomFormItem
              v-if="
                config.cave.DestinyFight.specifyTime &&
                config.cave.DestinyFight.specifyDispatchOnEightHour
              "
              label="设置时间"
              name="config.cave.DestinyFight.setEightHourTIme"
            >
              <a-time-picker
                :value="config.cave.DestinyFight.setEightHourTIme || '08:30'"
                format="HH:mm"
                valueFormat="HH:mm"
                inputReadOnly
                hideDisabledOptions
                :disabled-time="getDisabledTimeForSetTime"
                @change="
                  (time: any) => {
                    config.cave.DestinyFight.setEightHourTIme = time || '08:30'
                  }
                "
              />
            </CustomFormItem>

            <CustomFormItem
              label="启用瑶池挑战"
              name="config.cave.DestinyFight.challengeEnabled"
              tooltip="启用后会找比自己总积分低的仙友打"
            >
              <Switch v-model:checked="config.cave.DestinyFight.challengeEnabled" />
            </CustomFormItem>

            <CustomFormItem
              v-if="config.cave.DestinyFight.challengeEnabled"
              label="挑战只打守卫"
              name="config.cave.DestinyFight.challengeOnlyGuards"
            >
              <Switch
                v-model:checked="config.cave.DestinyFight.challengeOnlyGuards"
                @change="handleChallengeOnlyGuardsChange"
              />
            </CustomFormItem>

            <Divider orientation="left">背包物品使用</Divider>

            <CustomFormItem label="使用净瓶水" name="cave.bag.useJingPingShui">
              <Switch v-model:checked="config.cave.bag.useJingPingShui" />
            </CustomFormItem>

            <CustomFormItem label="使用灵芝" name="cave.bag.useLingzhi">
              <Switch v-model:checked="config.cave.bag.useLingzhi" />
            </CustomFormItem>

            <Divider orientation="left">宗门设置</Divider>

            <CustomFormItem label="自动训练" name="cave.pupil.enabled" tooltip="自动训练, 出师">
              <Switch v-model:checked="config.cave.pupil.enabled" />
            </CustomFormItem>

            <CustomFormItem
              label="自动妖盟结伴"
              name="cave.pupil.pushStudentToUnion"
              tooltip="自动丢弃弟子至妖盟"
            >
              <Switch v-model:checked="config.cave.pupil.pushStudentToUnion" />
            </CustomFormItem>

            <CustomFormItem
              label="丢弃品质"
              name="cave.pupil.quality"
              tooltip="小于此品质的弟子将被丢弃"
            >
              <CustomSelect
                v-model:value="config.cave.pupil.quality"
                :options="pupilQualityOptions"
                placeholder="请选择丢弃品质"
                style="width: 100%"
              />
            </CustomFormItem>

            <CustomFormItem
              label="领悟保留配置"
              name="cave.pupil.battleList"
              tooltip="设置需要保留的弟子领悟技能，可选择多个技能"
            >
              <CustomSelect
                v-model:value="config.cave.pupil.battleList"
                mode="multiple"
                :options="pupilTypeOptions"
                placeholder="请选择保留的领悟属性"
                style="width: 100%"
              />
            </CustomFormItem>

            <CustomFormItem
              label="特质保留配置"
              name="cave.pupil.fateList"
              tooltip="设置需要保留的弟子特质，可以为每个技能属性设置数值阈值"
            >
              <a-button type="primary" @click="openFateModal">配置属性阈值</a-button>
            </CustomFormItem>

            <!-- 在这里 -->

            <Divider orientation="left">仙居</Divider>

            <CustomFormItem label="仙居收菜" name="basic.specific.YardEnabled">
              <Switch v-model:checked="config.basic.specific.YardEnabled" />
            </CustomFormItem>

            <CustomFormItem
              label="仙居炼丹"
              name="basic.specific.YardLianDanEnabled"
              tooltip="设置后会自动炼丹并且领取"
            >
              <Switch v-model:checked="config.basic.specific.YardLianDanEnabled" />
            </CustomFormItem>

            <CustomFormItem
              label="仙居协助产桃、点赞"
              tooltip="启后会协助整个妖盟的人产出桃子、点赞，默认去给给你点赞的人回赞"
            >
              <Switch v-model:checked="config.cave.Yard.YardHelpPeach" />
            </CustomFormItem>

            <CustomFormItem
              label="仙居出售"
              tooltip="开启后会出售化外灵池产出的物品，只有老板娘高价收购时才会出售"
            >
              <Switch v-model:checked="config.cave.Yard.YardSellCrop" />
            </CustomFormItem>

            <Divider orientation="left">仙途寻宝</Divider>

            <CustomFormItem
              label="仙途寻宝"
              name="basic.specific.XianTuTreasureEnabled"
              tooltip="开启后，只要弟子出现，就会做出最优选择。有藏宝图就会去挖宝，挖完了能领取了就会领取"
            >
              <Switch v-model:checked="config.basic.specific.XianTuTreasureEnabled" />
            </CustomFormItem>
          </div>

          <!-- 妖盟设置 -->
          <div v-if="activeTab === '妖盟'" class="config-section">
            <Divider orientation="left">砍价设置</Divider>

            <CustomFormItem
              label="砍价人数偏移"
              name="union.unionBargainNum"
              tooltip="如果设置了值为3，例如妖盟58人砍价人数到达55就可以购买,如果设置0，那么妖盟人数全部砍完才会购买"
            >
              <CustomInputNumber
                v-model:value="config.union.unionBargainNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <CustomFormItem
              label="砍价价格偏移"
              name="union.unionBargainPrice"
              tooltip="低于此价格就会购买，默认为 0"
            >
              <CustomInputNumber
                v-model:value="config.union.unionBargainPrice"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">悬赏设置</Divider>

            <CustomFormItem
              label="启用悬赏任务"
              name="union.UnionBounty.enabled"
              tooltip="启用:自动做妖盟悬赏押镖和镇压任务"
            >
              <Switch v-model:checked="config.union.UnionBounty.enabled" />
            </CustomFormItem>

            <CustomFormItem label="启用掠夺镖车" name="union.UnionBounty.UnionBountyRob_enabled">
              <Switch v-model:checked="config.union.UnionBounty.UnionBountyRob_enabled" />
            </CustomFormItem>

            <CustomFormItem
              label="使用仙玉挑战"
              name="union.UnionBounty.UnionBountyRobUseXianYu"
              tooltip="妖盟悬赏掠夺镖车 只挑战战力低于自己的玩家，挑战的玩家奖励最低值为112，最高值为160。个人贡献拥有小于8000才会花玉挑战，花到需要100仙玉时停止，不启用则只用免费挑战,未勾选,用完刷新次数之前只找160的挑战 用完三次刷新次数后 降低要求挑战112-160的"
            >
              <Switch v-model:checked="config.union.UnionBounty.UnionBountyRobUseXianYu" />
            </CustomFormItem>

            <Divider orientation="left">妖邪挑战设置</Divider>

            <CustomFormItem label="开启妖邪挑战">
              <Switch v-model:checked="config.union.unionboss.enabled" />
            </CustomFormItem>

            <template v-if="config.union.unionboss.enabled">
              <!-- 妖邪挑战分身 -->
              <template v-if="config.basic.hasSeparation">
                <CustomFormItem label="分身">
                  <Radio.Group v-model:value="config.union.unionboss.index" button-style="solid">
                    <Radio.Button
                      v-for="option in bodyOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Radio.Button>
                  </Radio.Group>
                </CustomFormItem>

                <!-- 神通预设 -->
                <CustomFormItem label="神通预设" tooltip="选择异兽入侵使用的神通预设">
                  <Radio.Group
                    v-model:value="config.union.unionboss.magicSwitchIndex"
                    button-style="solid"
                  >
                    <Radio.Button
                      v-for="option in magicOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Radio.Button>
                  </Radio.Group>
                </CustomFormItem>

                <!-- 精怪阵容 -->
                <CustomFormItem label="精怪阵容" tooltip="选择异兽入侵使用的精怪阵容">
                  <Radio.Group
                    v-model:value="config.union.unionboss.spiritIndex"
                    button-style="solid"
                  >
                    <Radio.Button
                      v-for="option in spiritOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Radio.Button>
                  </Radio.Group>
                </CustomFormItem>
              </template>
            </template>

            <Divider orientation="left">镇魔</Divider>

            <CustomFormItem
              label="挑战boss"
              name="activity.townDemon.enabled"
              tooltip="打开后，会按设置的分身精怪神通挑战3次boss"
            >
              <Switch v-model:checked="config.activity.townDemon.enabled" />
            </CustomFormItem>

            <template v-if="config.activity.townDemon.enabled">
              <template v-if="config.basic.hasSeparation">
                <CustomFormItem label="分身">
                  <Radio.Group v-model:value="config.activity.townDemon.index" button-style="solid">
                    <Radio.Button
                      v-for="option in bodyOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Radio.Button>
                  </Radio.Group>
                </CustomFormItem>

                <CustomFormItem label="神通预设">
                  <Radio.Group
                    v-model:value="config.activity.townDemon.magicSwitchIndex"
                    button-style="solid"
                  >
                    <Radio.Button
                      v-for="option in magicOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Radio.Button>
                  </Radio.Group>
                </CustomFormItem>

                <CustomFormItem label="精怪阵容">
                  <Radio.Group
                    v-model:value="config.activity.townDemon.spiritIndex"
                    button-style="solid"
                  >
                    <Radio.Button
                      v-for="option in spiritOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Radio.Button>
                  </Radio.Group>
                </CustomFormItem>
              </template>

              <CustomFormItem
                label="袭击"
                name="activity.townDemon.pillageEnabled"
                tooltip="打开后，会按设置打低于自己妖力百分比的玩家，随机挑选妖盟"
              >
                <Switch v-model:checked="config.activity.townDemon.pillageEnabled" />
              </CustomFormItem>

              <CustomFormItem
                v-if="config.activity.townDemon.pillageEnabled"
                label="战力低于自身"
                name="activity.townDemon.pillageFightValuePercent"
              >
                <Select
                  v-model:value="config.activity.townDemon.pillageFightValuePercent"
                  class="w-42! sm:w-48!"
                >
                  <Select.Option :value="1">1%</Select.Option>
                  <Select.Option :value="5">5%</Select.Option>
                  <Select.Option :value="10">10%</Select.Option>
                  <Select.Option :value="20">20%</Select.Option>
                  <Select.Option :value="30">30%</Select.Option>
                </Select>
              </CustomFormItem>
            </template>

            <Divider orientation="left">妖盟对决</Divider>

            <CustomFormItem
              label="妖盟对决"
              name="activity.unionDuel.enabled"
              tooltip="打开后，会按设置打低于自己妖力百分比的玩家"
            >
              <Switch v-model:checked="config.activity.unionDuel.enabled" />
            </CustomFormItem>

            <CustomFormItem
              v-if="config.activity.unionDuel.enabled"
              label="战力低于自身"
              name="activity.unionDuel.duelValuePercent"
            >
              <Select
                v-model:value="config.activity.unionDuel.duelValuePercent"
                class="w-42! sm:w-48!"
              >
                <Select.Option :value="1">1%</Select.Option>
                <Select.Option :value="5">5%</Select.Option>
                <Select.Option :value="10">10%</Select.Option>
                <Select.Option :value="20">20%</Select.Option>
                <Select.Option :value="30">30%</Select.Option>
              </Select>
            </CustomFormItem>

            <template v-if="config.activity.unionDuel.enabled && config.basic.hasSeparation">
              <CustomFormItem
                label="分身"
                name="activity.unionDuel.index"
                tooltip="打妖盟对决时使用的分身"
              >
                <Radio.Group v-model:value="config.activity.unionDuel.index" button-style="solid">
                  <Radio.Button
                    v-for="option in bodyOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <!-- <CustomFormItem
                label="神通预设"
                name="activity.unionDuel.magicSwitchIndex"
                tooltip="打妖盟对决时使用的神通预设"
              >
                <Radio.Group
                  v-model:value="config.activity.unionDuel.magicSwitchIndex"
                  button-style="solid"
                >
                  <Radio.Button
                    v-for="option in magicOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <CustomFormItem
                label="精怪阵容"
                name="activity.unionDuel.spiritIndex"
                tooltip="打妖盟对决时使用的精怪阵容"
              >
                <Radio.Group
                  v-model:value="config.activity.unionDuel.spiritIndex"
                  button-style="solid"
                >
                  <Radio.Button
                    v-for="option in spiritOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem> -->
            </template>
          </div>

          <!-- 挑战设置 -->
          <div v-if="activeTab === '挑战'" class="config-section">
            <Divider orientation="left">通用挑战</Divider>

            <CustomFormItem label="冒险推图" name="challenge.common.stage" tooltip="冒险推图开关">
              <Switch v-model:checked="config.challenge.common.stage" />
            </CustomFormItem>

            <CustomFormItem
              label="六道秘境"
              name="challenge.common.secretTower"
              tooltip="六道秘境开关"
            >
              <Switch v-model:checked="config.challenge.common.secretTower" />
            </CustomFormItem>

            <CustomFormItem label="镇妖塔" name="challenge.common.tower" tooltip="镇妖塔开关">
              <Switch v-model:checked="config.challenge.common.tower" />
            </CustomFormItem>

            <!--CustomFormItem
              label="自动设置塔技能"
              name="challenge.common.AutoSetTowerSkill"
              tooltip="自动设置最优BUFF 最终增伤、最终减伤、强化灵兽、攻击"
            >
              <Switch :checked="true" disabled />
            </CustomFormItem-->

            <CustomFormItem
              label="镇妖塔技能"
              name="challenge.common.towerSkills"
              tooltip="选择镇妖塔技能，最多可选择5个"
            >
              <CustomSelect
                v-model:value="config.challenge.common.towerSkills"
                mode="multiple"
                :options="towerSkillOptions"
                placeholder="请选择技能"
                style="width: 100%"
                :max-tag-count="5"
                @change="handleTowerSkillsChange"
              />
            </CustomFormItem>

            <CustomFormItem
              label="期望层数"
              name="challenge.common.towerWishFloor"
              tooltip="如果设置了2010，那么就是打到201层的第10关，不会把第10关打过去"
            >
              <CustomInputNumber
                v-model:value="config.challenge.common.towerWishFloor"
                :min="1"
                :max="9999"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <CustomFormItem
              label="推图次数"
              name="challenge.common.num"
              tooltip="设置了100次，每次辅助顶号都会再打100次"
            >
              <CustomInputNumber
                v-model:value="config.challenge.common.num"
                :min="1"
                :max="999"
                class="w-42! sm:w-48!"
              />
              <a-alert message="推荐设置次数：30，推一次图需要5秒" type="warning" class="mt-2" />
            </CustomFormItem>

            <!--
            拥有分身开启时：显示
            且
            (config.challenge.common.stage ||
            config.challenge.common.secretTower ||
            config.challenge.common.tower)
             -->
            <template
              v-if="
                config.basic.hasSeparation &&
                (config.challenge.common.stage ||
                  config.challenge.common.secretTower ||
                  config.challenge.common.tower)
              "
            >
              <CustomFormItem
                label="推图分身"
                name="challenge.common.challengeIndex"
                tooltip="推图用该分身推图"
              >
                <Radio.Group
                  v-model:value="config.challenge.common.challengeIndex"
                  button-style="solid"
                >
                  <Radio.Button
                    v-for="option in bodyOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <CustomFormItem
                label="推图神通预设"
                name="challenge.common.magicSwitchIndex"
                tooltip="推图用该神通预设推图"
              >
                <Radio.Group
                  v-model:value="config.challenge.common.magicSwitchIndex"
                  button-style="solid"
                >
                  <Radio.Button
                    v-for="option in magicOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <CustomFormItem
                label="推图精怪阵容"
                name="challenge.common.spiritIndex"
                tooltip="推图用该精怪阵容推图"
              >
                <Radio.Group
                  v-model:value="config.challenge.common.spiritIndex"
                  button-style="solid"
                >
                  <Radio.Button
                    v-for="option in spiritOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>
            </template>

            <CustomFormItem
              label="挑战成功重置"
              name="challenge.common.challengeSuccessReset"
              tooltip="挑战成功冒险、六道秘境、镇妖塔后重置推图次数"
            >
              <Switch v-model:checked="config.challenge.common.challengeSuccessReset" />
            </CustomFormItem>

            <CustomFormItem
              label="显示挑战结果"
              name="challenge.common.showResult"
              tooltip="显示挑战结果 防焦虑"
            >
              <Switch v-model:checked="config.challenge.common.showResult" />
            </CustomFormItem>

            <Divider orientation="left">斗法设置</Divider>

            <CustomFormItem
              label="启用斗法"
              name="challenge.fight.enabled"
              tooltip="开启斗法挑战，会挑战本页面最高积分且战力比自己低的玩家"
            >
              <Switch v-model:checked="config.challenge.fight.enabled" />
            </CustomFormItem>

            <CustomFormItem
              label="只打机器人"
              name="challenge.fight.robotOnly"
              tooltip="只打第一个人机"
            >
              <Switch v-model:checked="config.challenge.fight.robotOnly" />
            </CustomFormItem>

            <CustomFormItem
              label="斗法券阈值"
              name="challenge.fight.ticket"
              tooltip="斗法券大于设置的值才会斗法"
            >
              <CustomInputNumber
                v-model:value="config.challenge.fight.ticket"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <CustomFormItem
              label="追杀关键词"
              name="challenge.fight.chaseWord"
              tooltip="输入关键词，可模糊搜索，例如输入飞飞，那么带有飞飞字样的人都随机挑战，可多个关键词，用,隔开（注意！！是小逗号）"
            >
              <Input
                v-model:value="config.challenge.fight.chaseWord"
                placeholder="输入追杀关键词"
              />
            </CustomFormItem>

            <CustomFormItem
              label="追杀刷新次数"
              name="challenge.fight.refreshNum"
              tooltip="每次刷新需要100灵石，低于10W则不刷新，直接挑战。到刷新次数后还没有找到追杀的人，那么就会挑战最高积分且战力比自己低的玩家"
            >
              <CustomInputNumber
                v-model:value="config.challenge.fight.refreshNum"
                :min="0"
                :max="50"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <CustomFormItem
              label="安全关键词"
              name="challenge.fight.safeWord"
              tooltip="输入关键词，可模糊搜索，例如输入飞飞，那么带有飞飞字样的人都都不打，可多个关键词，用,隔开（注意！！是小逗号）"
            >
              <Input v-model:value="config.challenge.fight.safeWord" placeholder="输入安全关键词" />
            </CustomFormItem>

            <CustomFormItem
              v-if="config.basic.hasSeparation && config.challenge.fight.enabled"
              label="斗法分身"
              name="challenge.fight.fightIndex"
              tooltip="斗法时使用此分身"
            >
              <Radio.Group v-model:value="config.challenge.fight.fightIndex" button-style="solid">
                <Radio.Button
                  v-for="option in bodyOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </Radio.Button>
              </Radio.Group>
            </CustomFormItem>

            <Divider orientation="left">群英榜设置</Divider>

            <CustomFormItem
              label="只打人机"
              name="challenge.herorank.RobotOnly"
              tooltip="开启后，每天随机挑战、周一冲榜。这两个设置就只会打人机了"
            >
              <Switch v-model:checked="config.challenge.herorank.RobotOnly" />
            </CustomFormItem>

            <CustomFormItem
              label="每天随机挑战"
              name="challenge.herorank.enabled"
              tooltip="启动后打不过的玩家也会一直打，若想只打人机请勾选只打人机选项，不启动也不影响下面的周一冲榜和购买体力时间。"
            >
              <Switch v-model:checked="config.challenge.herorank.enabled" />
            </CustomFormItem>

            <CustomFormItem
              v-if="config.challenge.herorank.enabled"
              label="打群英时间"
              name="challenge.herorank.HeroRankDays"
            >
              <Checkbox.Group v-model:value="config.challenge.herorank.HeroRankDays">
                <Checkbox
                  v-for="option in weekDayOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </Checkbox>
              </Checkbox.Group>
            </CustomFormItem>

            <CustomFormItem
              label="周一冲榜"
              name="challenge.herorank.EnableDayOne"
              tooltip="周一 00:05分冲击群英榜,请保证拥有足够的体力，若想只打人机请勾选只打人机选项。上面的“每天随机挑战”没开启也不影响此功能的开关。"
            >
              <Switch v-model:checked="config.challenge.herorank.EnableDayOne" />
            </CustomFormItem>

            <CustomFormItem
              label="购买体力时间"
              tooltip="每日21点之后会购买体力，周一是0点就买。上面的“每天随机挑战”“周一冲榜”没开启也不影响此功能的开关"
            >
              <Checkbox.Group v-model:value="config.challenge.herorank.BuyEnergy">
                <Checkbox
                  v-for="option in weekDayOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </Checkbox>
              </Checkbox.Group>
            </CustomFormItem>

            <Divider orientation="left">其他挑战</Divider>

            <CustomFormItem label="异兽入侵" tooltip="开启异兽入侵">
              <Switch
                :checked="config.challenge.invade?.enabled || false"
                @change="updateChallengeOption('invade', 'enabled', $event)"
              />
            </CustomFormItem>

            <!-- 分身开关 -->
            <div v-if="config.challenge.invade?.enabled && config.basic.hasSeparation">
              <CustomFormItem label="异兽入侵分身" tooltip="开启后使用分身进行异兽入侵">
                <Radio.Group v-model:value="config.challenge.invade.index" button-style="solid">
                  <Radio.Button
                    v-for="option in bodyOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <!-- 神通预设 -->
              <CustomFormItem label="神通预设" tooltip="选择异兽入侵使用的神通预设">
                <Radio.Group :value="config.challenge.invade.magicSwitchIndex" button-style="solid">
                  <Radio.Button
                    v-for="option in magicOptions"
                    :key="option.value"
                    :value="option.value"
                    @click="updateChallengeOption('invade', 'magicSwitchIndex', option.value)"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>

              <!-- 精怪阵容 -->
              <CustomFormItem label="精怪阵容" tooltip="选择异兽入侵使用的精怪阵容">
                <Radio.Group :value="config.challenge.invade.spiritIndex" button-style="solid">
                  <Radio.Button
                    v-for="option in spiritOptions"
                    :key="option.value"
                    :value="option.value"
                    @click="updateChallengeOption('invade', 'spiritIndex', option.value)"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>
            </div>

            <CustomFormItem
              label="征战诸天"
              tooltip="开启后打本页面战力比自己低的玩家，都比自己高就随便打"
            >
              <Switch
                :checked="config.challenge.skywar?.enabled || false"
                @change="updateChallengeOption('skywar', 'enabled', $event)"
              />
            </CustomFormItem>

            <div v-if="config.challenge.skywar?.enabled">
              <CustomFormItem label="征战诸天分身">
                <Radio.Group :value="config.challenge.skywar?.index || 0" button-style="solid">
                  <Radio.Button
                    v-for="option in bodyOptions"
                    :key="option.value"
                    :value="option.value"
                    @click="updateChallengeOption('skywar', 'index', option.value)"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>
            </div>

            <CustomFormItem label="星宿试炼">
              <Switch
                :checked="config.challenge.starTrial?.enabled || false"
                @change="updateChallengeOption('starTrial', 'enabled', $event)"
              />
            </CustomFormItem>

            <CustomFormItem label="挑战妖王" tooltip="开启后自动扫荡妖王，会先点赞再扫荡">
              <Switch
                :checked="config.challenge.wildBoss?.enabled || false"
                @change="updateChallengeOption('wildBoss', 'enabled', $event)"
              />
            </CustomFormItem>

            <CustomFormItem
              label="元辰试炼领奖"
              tooltip="没开放此功能的服务器勿开启，开启了会不推图！开启后，会领取每日送的牌子和奖励"
            >
              <Switch v-model:checked="config.challenge.caveTrial.enabled" />
            </CustomFormItem>

            <CustomFormItem
              label="元辰试炼挑战"
              tooltip="没开放此功能的服务器勿开启，开启了会不推图！开启后，有牌子就会挑战"
            >
              <Switch v-model:checked="config.challenge.caveTrial.challengeEnabled" />
            </CustomFormItem>

            <CustomFormItem
              v-if="config.challenge.caveTrial.challengeEnabled"
              label="打指定层"
              name="challenge.caveTrial.targetSpecificFloor"
              tooltip="此开关适用于低氪玩家，打不过高层的，开启后就只会挑战设置的那一层，若命符星级不够则不会挑战"
            >
              <Switch v-model:checked="config.challenge.caveTrial.targetSpecificFloor" />
            </CustomFormItem>

            <CustomFormItem
              v-if="
                config.challenge.caveTrial.challengeEnabled &&
                config.challenge.caveTrial.targetSpecificFloor
              "
              label="指定层数"
              name="challenge.caveTrial.targetFloorNumber"
            >
              <CustomInputNumber
                v-model:value="config.challenge.caveTrial.targetFloorNumber"
                :min="1"
                :max="999"
                placeholder="输入层数"
              />
            </CustomFormItem>

            <template
              v-if="config.challenge.caveTrial.challengeEnabled && config.basic.hasSeparation"
            >
              <CustomFormItem label="元辰试炼分身">
                <Radio.Group v-model:value="config.challenge.caveTrial.index" button-style="solid">
                  <Radio.Button
                    v-for="option in bodyOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </Radio.Button>
                </Radio.Group>
              </CustomFormItem>
            </template>
          </div>

          <!-- 购物设置 -->
          <div v-if="activeTab === '购物'" class="config-section">
            <ShoppingComponent v-model:value="config.mall" />
          </div>
        </Form>
      </div>
    </div>

    <!-- 特质保留配置弹窗 -->
    <Modal
      v-model:open="fateModalVisible"
      title="属性阈值保留配置"
      :width="600"
      @ok="saveFateConfig"
      @cancel="fateModalVisible = false"
      okText="确定"
      cancelText="取消"
    >
      <div class="mb-4 text-gray-600">
        请为需要保留的属性设置数值阈值。例如输入10，则代表有弟子该属性大于或等于10%时则保留
      </div>

      <Form layout="horizontal" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
        <Form.Item label="最终增伤">
          <div class="flex items-center gap-2">
            <span class="mr-2">阈值：</span>
            <CustomInputNumber
              v-model:value="fateThresholds[1017]"
              :min="0"
              :max="10"
              :step="0.1"
              :precision="1"
              class="flex-1"
            />
            <span class="ml-2">%</span>
          </div>
        </Form.Item>

        <Form.Item label="最终减伤">
          <div class="flex items-center gap-2">
            <span class="mr-2">阈值：</span>
            <CustomInputNumber
              v-model:value="fateThresholds[1018]"
              :min="0"
              :max="10"
              :step="0.1"
              :precision="1"
              class="flex-1"
            />
            <span class="ml-2">%</span>
          </div>
        </Form.Item>

        <Form.Item label="强化治疗">
          <div class="flex items-center gap-2">
            <span class="mr-2">阈值：</span>
            <CustomInputNumber
              v-model:value="fateThresholds[1021]"
              :min="0"
              :max="10"
              :step="0.1"
              :precision="1"
              class="flex-1"
            />
            <span class="ml-2">%</span>
          </div>
        </Form.Item>

        <Form.Item label="弱化治疗">
          <div class="flex items-center gap-2">
            <span class="mr-2">阈值：</span>
            <CustomInputNumber
              v-model:value="fateThresholds[1022]"
              :min="0"
              :max="10"
              :step="0.1"
              :precision="1"
              class="flex-1"
            />
            <span class="ml-2">%</span>
          </div>
        </Form.Item>

        <Form.Item label="强化灵兽">
          <div class="flex items-center gap-2">
            <span class="mr-2">阈值：</span>
            <CustomInputNumber
              v-model:value="fateThresholds[1023]"
              :min="0"
              :max="10"
              :step="0.1"
              :precision="1"
              class="flex-1"
            />
            <span class="ml-2">%</span>
          </div>
        </Form.Item>

        <Form.Item label="弱化灵兽">
          <div class="flex items-center gap-2">
            <span class="mr-2">阈值：</span>
            <CustomInputNumber
              v-model:value="fateThresholds[1024]"
              :min="0"
              :max="10"
              :step="0.1"
              :precision="1"
              class="flex-1"
            />
            <span class="ml-2">%</span>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import {
  Form,
  Input,
  Switch,
  Divider,
  Tag,
  message,
  Select,
  Checkbox,
  Radio,
  Space,
  Modal,
  TimePicker,
  Tooltip,
} from 'ant-design-vue'
import axios from '../utils/axios'
import ShoppingComponent from '../components/ShoppingComponent.vue'
import TopNavBar from '../components/TopNavBar.vue'
import CustomFormItem from '../components/CustomFormItem.vue'
import CustomSelect from '../components/CustomSelect.vue'
import CustomInputNumber from '../components/CustomInputNumber.vue'
import { createDefaultGameConfig } from './game-config/defaultConfig'
import {
  MoveCityKeywords,
  attributeMap,
  bodyOptions,
  createDefaultBodyAttributes,
  defaultFateThresholds,
  hourOptions,
  magicOptions,
  petNames,
  pupilQualityOptions,
  pupilTypeOptions,
  qualityOptions,
  spiritOptions,
  talentAttributeOptions,
  talentQualityOptions,
  talentSkillOptions,
  tabs,
  towerSkillOptions,
  weekDayOptions,
  xianyuActivityOptions,
} from './game-config/options'
import {
  deepMerge,
  disabledHoursForRandomJoin,
  disabledMinutesForRandomJoin,
  getDisabledTime,
  getDisabledTimeForSetTime,
  timeStringToDayjs,
  validateTimeRange,
} from './game-config/utils'
import type { BodyAttributes, GameConfig } from './game-config/types'

// 路由相关
const route = useRoute()
const router = useRouter()

// 从路由参数获取数据
const accountId = computed(() => Number(route.params.accountId))

const loading = ref(false)
const activeTab = ref('基础')
const configLoaded = ref(true)
const formRef = ref()

// 特质保留配置弹窗
const fateModalVisible = ref(false)
const fateThresholds = reactive({ ...defaultFateThresholds })

// 随便入阵时间相关
const randomJoinTimeValue = computed(() => {
  if (!config.value.cave.gatherEnergy.randomJoinMinute) return undefined
  // 解析时间字符串 "HH:mm" 格式
  const timeStr = config.value.cave.gatherEnergy.randomJoinMinute
  const [hour, minute] = timeStr.split(':').map(Number)
  return dayjs().hour(hour).minute(minute).second(0)
})

const handleRandomJoinTimeChange = (time: any) => {
  if (time) {
    // 保存为 "HH:mm" 格式的字符串
    config.value.cave.gatherEnergy.randomJoinMinute = time.format('HH:mm')
  }
}

// 处理打幻境开关变化
const handleHuanjingChange = (checked: boolean | string | number) => {
  const isChecked = typeof checked === 'string' ? checked === 'true' : Boolean(checked)

  if (isChecked) {
    // 如果是打开，弹出警告对话框
    Modal.confirm({
      title: '注意！！！',
      content: '挑战失败后有极小的概率会吞牌子，慎用（官方问题，手打也是一样的）',
      okText: '确定',
      cancelText: '取消',
      onOk() {
        // 点击确定才真正开启
        config.value.activity.xiyou.enableSecretChallenge = true
      },
      onCancel() {
        // 点击取消，不改变状态（保持关闭）
        config.value.activity.xiyou.enableSecretChallenge = false
      },
    })
  } else {
    // 如果是关闭，直接关闭
    config.value.activity.xiyou.enableSecretChallenge = false
  }
}

// 处理启用技能预设开关变化
const handleSkillPresetChange = (checked: boolean | string | number) => {
  const isChecked = typeof checked === 'string' ? checked === 'true' : Boolean(checked)

  if (isChecked) {
    // 如果是打开，弹出警告对话框
    Modal.confirm({
      title: '启用技能预设',
      content:
        '启用后，打关卡boss、幻境时，会三个预设技能都打一遍过去，注意！！！必须自己先设置好三套预设技能！！！！不启用则只用当前技能打boss',
      okText: '确定',
      cancelText: '取消',
      onOk() {
        // 点击确定才真正开启
        config.value.activity.xiyou.switchPreviewSkill = true
      },
      onCancel() {
        // 点击取消，不改变状态（保持关闭）
        config.value.activity.xiyou.switchPreviewSkill = false
      },
    })
  } else {
    // 如果是关闭，直接关闭
    config.value.activity.xiyou.switchPreviewSkill = false
  }
}

// 处理强制上线时间段开关变化
// const handleForceOnlineChange = (checked: boolean | string | number) => {
//   const isChecked = typeof checked === 'string' ? checked === 'true' : Boolean(checked)

//   if (isChecked) {
//     // 如果是打开，弹出警告对话框
//     Modal.confirm({
//       title: h('div', { style: { color: 'red', fontWeight: 'bold' } }, '注意！！！'),
//       content:
//         '开启此功能后，选择的时间点内，辅助会无视重连间隔，但凡检测到被顶号，或者其他异常原因断线，就会直接上线，确保一些活动的关键时间点顺利运行',
//       okText: '确定',
//       cancelText: '取消',
//       onOk() {
//         // 点击确定才真正开启
//         config.value.basic.forceOnlineEnabled = true
//         // 默认选中23:50-00:00
//         if (
//           !config.value.basic.forceOnlineTimeRanges ||
//           config.value.basic.forceOnlineTimeRanges.length === 0
//         ) {
//           config.value.basic.forceOnlineTimeRanges = ['23:50-00:00']
//         }
//       },
//       onCancel() {
//         // 点击取消，不改变状态（保持关闭）
//         config.value.basic.forceOnlineEnabled = false
//       },
//     })
//   } else {
//     // 如果是关闭，直接关闭
//     config.value.basic.forceOnlineEnabled = false
//   }
// }

// 处理挑战只打守卫开关变化
const handleChallengeOnlyGuardsChange = (checked: boolean | string | number) => {
  const isChecked = typeof checked === 'string' ? checked === 'true' : Boolean(checked)

  if (isChecked) {
    // 如果是打开，弹出警告对话框
    Modal.confirm({
      title: h('div', { style: { color: 'red', fontWeight: 'bold' } }, '注意！！！'),
      content:
        '开启此功能后，会把包括2次免费和所有的仙玉刷新用完，只打人机，如果刷新次数都用完了还有挑战次数，那么就不会打了，需要手动操作',
      okText: '确定',
      cancelText: '取消',
      onOk() {
        // 点击确定才真正开启
        config.value.cave.DestinyFight.challengeOnlyGuards = true
      },
      onCancel() {
        // 点击取消，不改变状态（保持关闭）
        config.value.cave.DestinyFight.challengeOnlyGuards = false
      },
    })
  } else {
    // 如果是关闭，直接关闭
    config.value.cave.DestinyFight.challengeOnlyGuards = false
  }
}
// 处理迁城开关变化
const handleMoveCityEnabledChange = (checked: boolean | string | number) => {
  const isChecked = typeof checked === 'string' ? checked === 'true' : Boolean(checked)

  if (isChecked) {
    // 如果是打开，弹出警告对话框
    Modal.confirm({
      title: h('div', { style: { color: 'red', fontWeight: 'bold' } }, '注意！！！'),
      content:
        '开启此功能后，10：00-19：00会根据战略指挥管理标记的高战、低战、随便，这三个词语进行迁城，追求完美请手动，此功能只是给实在没空的用户用的',
      okText: '确定',
      cancelText: '取消',
      onOk() {
        // 点击确定才真正开启
        config.value.activity.WarSeason.MoveCityEnabled = true
      },
      onCancel() {
        console.log('test, cancel')
        // 点击取消，不改变状态（保持关闭）
        config.value.activity.WarSeason.MoveCityEnabled = false
      },
    })
  } else {
    // 如果是关闭，直接关闭
    config.value.activity.WarSeason.MoveCityEnabled = false
  }
}
// 处理攻城开关变化
const handleAttackCityEnabledChange = (checked: boolean | string | number) => {
  const isChecked = typeof checked === 'string' ? checked === 'true' : Boolean(checked)

  if (isChecked) {
    // 如果是打开，弹出警告对话框
    Modal.confirm({
      title: h('div', { style: { color: 'red', fontWeight: 'bold' } }, '注意！！！'),
      content:
        '开启此功能后，19：00-22：00，若所在城池有可攻打的城池，那么就会派遣所有分身去攻打，死了也会用免费复活起来继续攻打，若同时在攻打多个城池，那么只会1个1个城池攻打，直到第一个城池拿下后才会攻打第二个城池，追求完美请手动，此功能只是给实在没空的用户用的',
      okText: '确定',
      cancelText: '取消',
      onOk() {
        // 点击确定才真正开启
        config.value.activity.WarSeason.AttackCityEnabled = true
      },
      onCancel() {
        console.log('test, cancel')
        // 点击取消，不改变状态（保持关闭）
        config.value.activity.WarSeason.AttackCityEnabled = false
      },
    })
  } else {
    // 如果是关闭，直接关闭
    config.value.activity.WarSeason.AttackCityEnabled = false
  }
}

// 分身属性选择状态
const bodyAttributes = reactive(createDefaultBodyAttributes()) as BodyAttributes

// 表单验证规则
const formRules = {
  reconnectInterval: [{ required: true, message: '请输入重连间隔' }],
  nickName: [{ required: true, message: '请输入角色昵称' }],
}

const config = ref<GameConfig>(createDefaultGameConfig())

// 移除了移动端检测和侧边栏滑动相关方法

// 打开特质保留配置弹窗
const openFateModal = () => {
  // 从config中读取当前配置
  if (config.value.cave.pupil.fateList && config.value.cave.pupil.fateList.length > 0) {
    config.value.cave.pupil.fateList.forEach((item: any) => {
      if (fateThresholds[item.type as keyof typeof fateThresholds] !== undefined) {
        fateThresholds[item.type as keyof typeof fateThresholds] = item.value
      }
    })
  }
  fateModalVisible.value = true
}

// 保存特质保留配置
const saveFateConfig = () => {
  config.value.cave.pupil.fateList = [
    { type: 1017, value: fateThresholds[1017] },
    { type: 1018, value: fateThresholds[1018] },
    { type: 1021, value: fateThresholds[1021] },
    { type: 1022, value: fateThresholds[1022] },
    { type: 1023, value: fateThresholds[1023] },
    { type: 1024, value: fateThresholds[1024] },
  ]
  fateModalVisible.value = false
}

// 获取配置
const fetchConfig = async () => {
  if (!accountId.value) {
    console.error('缺少必要参数:', { accountId: accountId.value })
    return
  }

  loading.value = true
  try {
    console.log('🔄 开始获取配置，accountId:', accountId.value)
    const response = await axios.get(`/api/game-accounts/${accountId.value}/setting`)
    console.log('🔄 获取配置=====:', response.data.data)

    if (response.status === 200) {
      if (response.data && !response.data['未找到账号']) {
        // 使用深度合并确保所有默认字段都存在
        const mergedConfig = deepMerge(config.value, response.data.data)
        // 数据检查
        const specifyTimeSetting = mergedConfig.cave?.DestinyFight?.specifyTimeSetting
        if (specifyTimeSetting) {
          // 使用独立的时间校验方法
          mergedConfig.cave.DestinyFight.specifyTimeSetting = validateTimeRange(specifyTimeSetting)
        }

        // 数据检查 - WarSeason RepeatBossTimeRange
        const repeatBossTimeRange = mergedConfig.activity?.WarSeason?.RepeatBossTimeRange
        if (repeatBossTimeRange) {
          // 使用独立的时间校验方法
          mergedConfig.activity.WarSeason.RepeatBossTimeRange =
            validateTimeRange(repeatBossTimeRange)
        }

        // 数据检查 - WarSeason ManorTimeRange
        const manorTimeRange = mergedConfig.activity?.WarSeason?.ManorTimeRange
        if (manorTimeRange) {
          mergedConfig.activity.WarSeason.ManorTimeRange = '22:00-07:00'
          // console.log('🔄 数据检查:', mergedConfig.activity.WarSeason.ManorTimeRange)
          // // 强制将开始时间设置为22:00，保持结束时间不变
          // const endTime = manorTimeRange.split('-')[1] || '07:00'
          // const fixedTimeRange = '22:00-' + endTime
          // // 使用独立的时间校验方法
          // mergedConfig.activity.WarSeason.ManorTimeRange = validateTimeRange(
          //   fixedTimeRange,
          //   '22:00-07:00',
          // )
        }
        // 数据检查 - DreamFreeSpeedUpTime
        const DreamFreeSpeedUpTime = mergedConfig.basic.specific.DreamFreeSpeedUpTime
        if (DreamFreeSpeedUpTime) {
          // 使用独立的时间校验方法
          mergedConfig.basic.specific.DreamFreeSpeedUpTime = validateTimeRange(
            DreamFreeSpeedUpTime,
            '07:00-23:59'
          )
        }

        // 数据检查 - composeBall useItemMaxNum
        const useItemMaxNum = mergedConfig.activity?.composeBall?.useItemMaxNum
        if (useItemMaxNum !== undefined && useItemMaxNum > 3) {
          mergedConfig.activity.composeBall.useItemMaxNum = 3
        }

        // 数据兼容性处理 - composeBall useItemTimeHour (数字格式转字符串格式)
        const useItemTimeHour = mergedConfig.activity?.composeBall?.useItemTimeHour
        if (typeof useItemTimeHour === 'number') {
          mergedConfig.activity.composeBall.useItemTimeHour = `${String(useItemTimeHour).padStart(
            2,
            '0'
          )}:00`
        }

        config.value = mergedConfig

        // 配置加载后同步到bodyAttributes
        syncConfigToBodyAttributes()
        configLoaded.value = true
        console.log('✅ 配置加载成功')
      } else {
        console.log('⚠️ 未找到账号配置，使用默认配置')
        configLoaded.value = true

        // 使用 Modal 弹窗提示错误
        Modal.error({
          title: '获取配置失败',
          content: '正在更新辅助服务器，请稍等10分钟再进行设置',
          okText: '返回上一页',
          centered: true,
          onOk() {
            router.push('/')
          },
        })
      }
    }
  } catch (error) {
    console.error('获取配置失败:', error)
    configLoaded.value = true

    // 使用 Modal 弹窗提示错误
    Modal.error({
      title: '获取配置失败',
      content: '正在更新辅助服务器，请稍等10分钟再进行设置',
      okText: '返回上一页',
      centered: true,
      onOk() {
        router.push('/')
      },
    })
  } finally {
    loading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  loading.value = true
  try {
    // 保存前同步bodyAttributes到config
    syncBodyAttributesToConfig()

    console.log('🔄 开始保存配置:', {
      accountId: accountId.value,
      configSize: JSON.stringify(config.value).length,
    })

    const response = await axios.put(`/api/game-accounts/${accountId.value}/setting`, config.value)

    console.log('📨 服务器响应:', response.data)

    if (response.data.success) {
      message.success('配置保存成功！')
      message.warning('请注意：保存配置后，需要先停止再启动才能生效。')
    } else {
      console.error('❌ 保存失败 - 服务器返回:', response.data)
      message.error(response.data.message || '保存失败')
    }
  } finally {
    loading.value = false
  }
}

// 保存按钮点击
const onSave = async () => {
  try {
    await formRef.value?.validate()
    await saveConfig()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 砍树相关方法
const toggleChopTreePrimaryAttribute = (attrId: number) => {
  const currentAttrs = config.value.chopTree.main[0].primaryAttribute
  const newAttrs = currentAttrs.includes(attrId)
    ? currentAttrs.filter((id: number) => id !== attrId)
    : [...currentAttrs, attrId]

  config.value.chopTree.main[0].primaryAttribute = newAttrs
}

const toggleChopTreeSecondaryAttribute = (attrId: number) => {
  const currentAttrs = config.value.chopTree.main[0].secondaryAttribute
  const newAttrs = currentAttrs.includes(attrId)
    ? currentAttrs.filter((id: number) => id !== attrId)
    : [...currentAttrs, attrId]

  config.value.chopTree.main[0].secondaryAttribute = newAttrs
}

const toggleTalentPrimaryAttribute = (attrId: number) => {
  // 确保数据结构存在
  if (!config.value.talent.main[0]) {
    config.value.talent.main[0] = { primaryAttribute: [], secondaryAttribute: [] }
  }
  if (!config.value.talent.main[0].primaryAttribute) {
    config.value.talent.main[0].primaryAttribute = []
  }

  const currentAttrs = config.value.talent.main[0].primaryAttribute
  const newAttrs = currentAttrs.includes(attrId)
    ? currentAttrs.filter((id: number) => id !== attrId)
    : [...currentAttrs, attrId]

  config.value.talent.main[0].primaryAttribute = newAttrs
}

const toggleTalentSecondaryAttribute = (attrId: number) => {
  // 确保数据结构存在
  if (!config.value.talent.main[0]) {
    config.value.talent.main[0] = { primaryAttribute: [], secondaryAttribute: [] }
  }
  if (!config.value.talent.main[0].secondaryAttribute) {
    config.value.talent.main[0].secondaryAttribute = []
  }

  const currentAttrs = config.value.talent.main[0].secondaryAttribute
  const newAttrs = currentAttrs.includes(attrId)
    ? currentAttrs.filter((id: number) => id !== attrId)
    : [...currentAttrs, attrId]

  config.value.talent.main[0].secondaryAttribute = newAttrs
}

const toggleAttribute = (bodyKey: string, attrType: string, attrId: number) => {
  const currentAttrs = (bodyAttributes[bodyKey] as any)[attrType] as number[]
  const newAttrs = currentAttrs.includes(attrId)
    ? currentAttrs.filter((id: number) => id !== attrId)
    : [...currentAttrs, attrId]

  ;(bodyAttributes[bodyKey] as any)[attrType] = newAttrs
}

const getBodyName = (bodyKey: string) => {
  const names: Record<string, string> = { yuanti: '元体', yangshen: '阳神', yinshen: '阴身' }
  return names[bodyKey] || bodyKey
}

// 福地相关方法
const removeTimeRule = (timeIndex: number) => {
  const newRules = config.value.homeland.homelandRulesByTime.filter(
    (_, index) => index !== timeIndex
  )
  config.value.homeland.homelandRulesByTime = newRules
}

const updateTimeRule = (timeIndex: number, field: string, time: any) => {
  const newRules = [...config.value.homeland.homelandRulesByTime]
  if (newRules[timeIndex]) {
    // 将 dayjs 对象转换为 HH:mm 格式的字符串
    const timeValue = time ? time.format('HH:mm') : '00:00'
    ;(newRules[timeIndex] as any)[field] = timeValue
    config.value.homeland.homelandRulesByTime = newRules
  }
}

const addTimeRule = () => {
  const defaultRules = [
    { ItemId: 100004, minItemLv: 3, isCheck: true, description: '仙桃' },
    { ItemId: 100025, minItemLv: 5, isCheck: false, description: '净瓶水' },
    { ItemId: 100000, minItemLv: 5, isCheck: false, description: '仙玉' },
    { ItemId: 100003, minItemLv: 5, isCheck: false, description: '灵石' },
    { ItemId: 100029, minItemLv: 5, isCheck: false, description: '琉璃珠' },
    { ItemId: 100044, minItemLv: 5, isCheck: false, description: '天衍令' },
    { ItemId: 100047, minItemLv: 5, isCheck: false, description: '昆仑铁' },
  ]

  const newTimeRule = {
    startTime: '00:00',
    endTime: '23:59',
    rules: defaultRules,
  }

  config.value.homeland.homelandRulesByTime = [
    ...config.value.homeland.homelandRulesByTime,
    newTimeRule,
  ]
}

// 通用偷桃设置
const showPresetConfirm = () => {
  Modal.confirm({
    title: () => h('div', { style: { color: 'red', fontWeight: 'bold' } }, '注意！！！'),
    content: '点击确认将读取通用偷桃设置，适用于半老区，老区跟新区请自行微调偷取的桃瓶等级',
    okText: '确认',
    cancelText: '取消',
    centered: true,
    onOk() {
      loadPresetStealSettings()
    },
  })
}

const loadPresetStealSettings = () => {
  // 时间段1：22:00-01:00 偷取4桃3瓶
  const timeRule1 = {
    startTime: '22:00',
    endTime: '01:00',
    rules: [
      { ItemId: 100004, minItemLv: 4, isCheck: true, description: '仙桃' },
      { ItemId: 100025, minItemLv: 3, isCheck: true, description: '净瓶水' },
      { ItemId: 100000, minItemLv: 5, isCheck: false, description: '仙玉' },
      { ItemId: 100003, minItemLv: 5, isCheck: false, description: '灵石' },
      { ItemId: 100029, minItemLv: 5, isCheck: false, description: '琉璃珠' },
      { ItemId: 100044, minItemLv: 5, isCheck: false, description: '天衍令' },
      { ItemId: 100047, minItemLv: 5, isCheck: false, description: '昆仑铁' },
    ],
  }

  // 时间段2：10:00-14:30 偷取4桃3瓶
  const timeRule2 = {
    startTime: '10:00',
    endTime: '14:30',
    rules: [
      { ItemId: 100004, minItemLv: 4, isCheck: true, description: '仙桃' },
      { ItemId: 100025, minItemLv: 3, isCheck: true, description: '净瓶水' },
      { ItemId: 100000, minItemLv: 5, isCheck: false, description: '仙玉' },
      { ItemId: 100003, minItemLv: 5, isCheck: false, description: '灵石' },
      { ItemId: 100029, minItemLv: 5, isCheck: false, description: '琉璃珠' },
      { ItemId: 100044, minItemLv: 5, isCheck: false, description: '天衍令' },
      { ItemId: 100047, minItemLv: 5, isCheck: false, description: '昆仑铁' },
    ],
  }

  // 时间段3：18:00-21:55 偷取3桃
  const timeRule3 = {
    startTime: '18:00',
    endTime: '21:55',
    rules: [
      { ItemId: 100004, minItemLv: 3, isCheck: true, description: '仙桃' },
      { ItemId: 100025, minItemLv: 5, isCheck: false, description: '净瓶水' },
      { ItemId: 100000, minItemLv: 5, isCheck: false, description: '仙玉' },
      { ItemId: 100003, minItemLv: 5, isCheck: false, description: '灵石' },
      { ItemId: 100029, minItemLv: 5, isCheck: false, description: '琉璃珠' },
      { ItemId: 100044, minItemLv: 5, isCheck: false, description: '天衍令' },
      { ItemId: 100047, minItemLv: 5, isCheck: false, description: '昆仑铁' },
    ],
  }

  config.value.homeland.homelandRulesByTime = [timeRule1, timeRule2, timeRule3]

  message.success('通用偷桃设置已加载')
}

// 灵脉相关方法
const getTalentCondition = (index: number) => {
  if (!config.value.talent.separation.condition[index]) {
    config.value.talent.separation.condition[index] = {
      attribute: [],
      skillId: [],
      priority: index,
    }
  }
  return config.value.talent.separation.condition[index]
}

const toggleTalentAttribute = (conditionIndex: number, attrId: number) => {
  const condition = getTalentCondition(conditionIndex)
  const currentAttrs = condition.attribute
  const newAttrs = currentAttrs.includes(attrId)
    ? currentAttrs.filter((id) => id !== attrId)
    : [...currentAttrs, attrId]

  condition.attribute = newAttrs
}

const toggleTalentSkill = (conditionIndex: number, skillId: number) => {
  const condition = getTalentCondition(conditionIndex)
  const currentSkills = condition.skillId
  const newSkills = currentSkills.includes(skillId)
    ? currentSkills.filter((id) => id !== skillId)
    : [...currentSkills, skillId]

  condition.skillId = newSkills
}

// 挑战相关方法

const handleTowerSkillsChange = (selectedSkills: number[]) => {
  if (selectedSkills.length > 5) {
    // 如果选择超过5个，只保留最后选择的5个
    config.value.challenge.common.towerSkills = selectedSkills.slice(-5)
    message.warning('最多只能选择5个技能')
  }
}

const updateChallengeOption = (challengeType: string, field: string, eventOrValue: Event | any) => {
  const value =
    eventOrValue instanceof Event ? (eventOrValue.target as HTMLInputElement).checked : eventOrValue

  if (!(config.value.challenge as any)[challengeType]) {
    ;(config.value.challenge as any)[challengeType] = {}
  }

  ;(config.value.challenge as any)[challengeType][field] = value
}

// 同步bodyAttributes到config
const syncBodyAttributesToConfig = () => {
  // 同步到新版本格式：Conditions
  config.value.chopTree.separation.Conditions = [
    {
      primaryAttribute: bodyAttributes.yuanti.main,
      secondaryAttribute: bodyAttributes.yuanti.sub,
    },
    {
      primaryAttribute: bodyAttributes.yangshen.main,
      secondaryAttribute: bodyAttributes.yangshen.sub,
    },
    {
      primaryAttribute: bodyAttributes.yinshen.main,
      secondaryAttribute: bodyAttributes.yinshen.sub,
    },
  ]
}

// 同步config到bodyAttributes
const syncConfigToBodyAttributes = () => {
  // 读取新版本格式：Conditions
  if (
    config.value.chopTree?.separation?.Conditions &&
    config.value.chopTree.separation.Conditions.length >= 3
  ) {
    const conditions = config.value.chopTree.separation.Conditions

    bodyAttributes.yuanti.main = conditions[0]?.primaryAttribute || []
    bodyAttributes.yuanti.sub = conditions[0]?.secondaryAttribute || []

    bodyAttributes.yangshen.main = conditions[1]?.primaryAttribute || []
    bodyAttributes.yangshen.sub = conditions[1]?.secondaryAttribute || []

    bodyAttributes.yinshen.main = conditions[2]?.primaryAttribute || []
    bodyAttributes.yinshen.sub = conditions[2]?.secondaryAttribute || []
  }
}

// 监听bodyAttributes变化并同步到config
watch(
  bodyAttributes,
  () => {
    syncBodyAttributesToConfig()
  },
  { deep: true }
)

onMounted(() => {
  if (accountId.value) {
    fetchConfig()
  } else {
    message.error('缺少必要参数')
  }
  Modal.info({
    title: '配置修改流程',
    content: h('div', {
      innerHTML: `操作步骤： 停止程序 → 修改配置 → 保存配置 → 启动程序<br/><br/>修改后务必点击"保存"按钮`,
    }),
    centered: true,
    okText: '我知道了',
  })
})

onUnmounted(() => {
  // 清理工作
})
</script>

<style lang="scss" scoped>
.ant-tabs {
  :deep(.ant-tabs-tab + .ant-tabs-tab) {
    margin: 0 0 0 18px;
  }
}
.game-config-page {
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
}

.config-container {
  flex: 1;
  background: white;
  overflow-y: auto;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.tabs-container {
  padding: 0 20px;
}

.config-main {
  padding: 0 20px 0 20px;
}

.config-section {
  width: 100%;
}

.wish-pets-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.coming-soon {
  text-align: center;
  color: #999;
  font-size: 16px;
  padding: 60px 0;
}

/* 配置项样式 */
.config-item {
  margin-bottom: 16px;
}

.level-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.attribute-selector {
  margin-bottom: 16px;
}

.attribute-group {
  margin-bottom: 12px;
}

.attribute-label {
  font-weight: 500;
  color: #262626;
  margin-bottom: 8px;
  display: block;
}

.attribute-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attribute-tag {
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.attribute-tag.selected {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.attribute-tag:hover {
  border-color: #40a9ff;
}

/* 时间段规则样式 */
.time-rule-section {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fafafa;
}

.time-rule-section.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.time-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.time-rule-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.time-range-config {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.time-input-group {
  flex: 1;
}

.time-input-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #262626;
}

.time-input-group :deep(.ant-picker) {
  width: 100% !important;
}

.steal-rules {
  margin-top: 16px;
}

.steal-rules h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.steal-rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.steal-rule-item:last-child {
  border-bottom: none;
}

.rule-checkbox {
  flex: 1;
}

.rule-level {
  width: 120px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-level label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.exclusive-mode-notice {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  color: #d46b08;
  font-size: 14px;
}

.preset-button-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.exclusive-mode-description {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  color: #0369a1;
  font-size: 14px;
}

.mode-detail {
  margin-bottom: 8px;
}

.mode-detail:last-child {
  margin-bottom: 0;
}

.mode-detail strong {
  color: #0c4a6e;
}

/* Loading 样式 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  left: 0;
  top: 55px;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.8);
}

.loading-indicator {
  display: inline-block;
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
}

.loading-spinner {
  width: 100%;
  height: 100%;
  border: 3px solid #f0f0f0;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: loading-spin 1s linear infinite;
}

@keyframes loading-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .config-container {
    max-width: 100%;
  }

  .tabs-container {
    padding: 0 16px;
  }

  .config-main {
    padding: 0 16px 16 16px;
  }

  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}
</style>
