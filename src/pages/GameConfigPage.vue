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
          <Space>
            <a-button
              :loading="importConfigLoading"
              :disabled="loading"
              @click="openImportConfigModal"
            >
              导入
            </a-button>
            <a-button
              @click="onSave"
              class="save-button"
              :disabled="loading || importConfigLoading"
              type="primary"
            >
              保存
            </a-button>
          </Space>
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
              label="礼仪分监控"
              name="basic.reputation.enabled"
              tooltip="每10分钟检查礼仪分，低于阈值时自动停止所有任务"
            >
              <Switch v-model:checked="config.basic.reputation.enabled" />
            </CustomFormItem>
            <CustomFormItem
              label="礼仪分阈值"
              name="basic.reputation.threshold"
              tooltip="礼仪分低于此值时停止所有任务"
              v-if="config.basic.reputation.enabled"
            >
              <custom-input-number
                v-model:value="config.basic.reputation.threshold"
                :min="0"
                :max="100"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="道具日志"
              name="basic.debug"
              tooltip="开启后显示背包道具的增加和消耗详情"
            >
              <Switch v-model:checked="config.basic.debug" />
            </CustomFormItem>
            <CustomFormItem
              label="重连间隔"
              name="basic.reconnectInterval"
              tooltip="自动顶号间隔，建议设置为 5 分钟"
            >
              <CustomInputNumber
                :value="Math.round(config.basic.reconnectInterval / 60000)"
                @change="
                  (value: number) =>
                    (config.basic.reconnectInterval =
                      (typeof value === 'number' ? value : 5) * 60000)
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

            <CustomFormItem
              label="每日任务"
              name="basic.task.daily"
              tooltip="自动领取每日任务完成奖励，阶段宝箱奖励"
            >
              <Switch v-model:checked="config.basic.task.daily" />
            </CustomFormItem>

            <CustomFormItem
              label="每周任务"
              name="basic.task.weekly"
              tooltip="自动领取每周任务完成奖励"
            >
              <Switch v-model:checked="config.basic.task.weekly" />
            </CustomFormItem>

            <CustomFormItem
              label="主线任务"
              name="basic.task.main"
              tooltip="自动领取主线任务完成奖励"
            >
              <Switch v-model:checked="config.basic.task.main" />
            </CustomFormItem>
            <CustomFormItem label="主线剧情" name="basic.task.story" tooltip="自动解锁主线剧情">
              <Switch v-model:checked="config.basic.task.story" />
            </CustomFormItem>
            <CustomFormItem
              label="花坊悬赏"
              name="basic.task.achieve"
              tooltip="自动领取花坊悬赏完成奖励"
            >
              <Switch v-model:checked="config.basic.task.achieve" />
            </CustomFormItem>
            <Divider orientation="left">邮件配置</Divider>
            <CustomFormItem label="自动领取" name="basic.mail" tooltip="自动领取邮件奖励">
              <Switch v-model:checked="config.basic.mail" />
            </CustomFormItem>

            <Divider orientation="left">福利配置</Divider>
            <CustomFormItem
              label="双倍金币"
              name="basic.benefit.buff"
              tooltip="每4小时自动看视频领取双倍金币福利"
            >
              <Switch v-model:checked="config.basic.benefit.buff" />
            </CustomFormItem>
            <CustomFormItem
              label="福利宝箱"
              name="basic.benefit.box"
              tooltip="每1小时自动开启福利宝箱"
            >
              <Switch v-model:checked="config.basic.benefit.box" />
            </CustomFormItem>
            <CustomFormItem
              label="分享奖励"
              name="basic.benefit.shareRwd"
              tooltip="当制作了新果艺、培育了新水果或升级时自动分享，领取分享奖励"
            >
              <Switch v-model:checked="config.basic.benefit.shareRwd" />
            </CustomFormItem>
            <CustomFormItem
              label="防骗宝箱"
              name="basic.benefit.antiScamBox"
              tooltip="每天自动签到并领取防骗宝箱奖励"
            >
              <Switch v-model:checked="config.basic.benefit.antiScamBox" />
            </CustomFormItem>

            <Divider orientation="left">每日祈愿</Divider>
            <CustomFormItem label="自动祈愿" name="basic.sign.daily">
              <Switch v-model:checked="config.basic.sign.daily" />
            </CustomFormItem>
            <CustomFormItem label="自动补签" name="basic.sign.patch">
              <Switch v-model:checked="config.basic.sign.patch" />
            </CustomFormItem>
            <Divider orientation="left">珍珠配置</Divider>

            <CustomFormItem
              label="免费珍珠"
              name="basic.pearl.freePearl"
              tooltip="自动看视频领取免费珍珠"
            >
              <Switch v-model:checked="config.basic.pearl.freePearl" />
            </CustomFormItem>
            <CustomFormItem label="雇佣劳工" name="basic.pearl.autoHire" tooltip="自动雇佣劳工">
              <Switch v-model:checked="config.basic.pearl.autoHire" />
            </CustomFormItem>

            <CustomFormItem
              label="等级限制"
              name="basic.pearl.maxHireLevel"
              tooltip="只雇佣等级<=此值的用户，0表示不限制"
              v-if="config.basic.pearl.autoHire"
            >
              <CustomInputNumber
                v-model:value="config.basic.pearl.maxHireLevel"
                :min="0"
                :max="100"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="雇佣券上限"
              name="basic.pearl.maxHireTicketUsage"
              tooltip="当日最大可以使用的雇佣券数量, 比如设置10张，则今天用了10张后就不会再用了。为0则不限制，看不懂的请无脑填0。"
              v-if="config.basic.pearl.autoHire"
            >
              <CustomInputNumber
                v-model:value="config.basic.pearl.maxHireTicketUsage"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem label="自动开珍珠" name="basic.pearl.autoPearlDraw">
              <Switch v-model:checked="config.basic.pearl.autoPearlDraw" />
            </CustomFormItem>
            <CustomFormItem
              label="开启防身"
              name="basic.pearl.protectEnabled"
              tooltip="开启后别人雇佣自己会消耗防身符"
            >
              <Switch v-model:checked="config.basic.pearl.protectEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="买雇佣书"
              name="basic.pearl.autoBuyHireTicket"
              tooltip="雇佣书不足时自动购买"
            >
              <Switch
                :checked="config.basic.pearl.autoBuyHireTicket"
                @change="
                  (enabled: boolean) =>
                    handleDiamondCostSwitchChange('basic.pearl.autoBuyHireTicket', enabled)
                "
              />
            </CustomFormItem>
            <CustomFormItem
              label="勾玉上限"
              name="basic.pearl.maxSpendDmd"
              tooltip="购买雇佣书消耗最大勾玉"
              v-if="config.basic.pearl.autoBuyHireTicket"
            >
              <CustomInputNumber
                v-model:value="config.basic.pearl.maxSpendDmd"
                :min="0"
                :step="25"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">商城购买</Divider>
            <CustomFormItem
              label="视频礼包"
              name="basic.shop.videoFreeGift"
              tooltip="自动观看视频领取礼包商城免费礼包"
            >
              <Switch v-model:checked="config.basic.shop.videoFreeGift" />
            </CustomFormItem>
            <CustomFormItem
              label="材料商店"
              name="basic.shop.cultivateShop.autoBuy"
              tooltip="自动买光材料商店所有耗材，自动刷新"
            >
              <Switch v-model:checked="config.basic.shop.cultivateShop.autoBuy" />
            </CustomFormItem>
            <CustomFormItem
              label="金币上限"
              name="basic.shop.cultivateShop.maxSpendGold"
              tooltip="材料商店花费金币上限，0则不限制"
              v-if="config.basic.shop.cultivateShop.autoBuy"
            >
              <CustomInputNumber
                v-model:value="config.basic.shop.cultivateShop.maxSpendGold"
                :min="0"
                :step="100000"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">百果园</Divider>
            <CustomFormItem
              label="百果园"
              name="basic.shop.floralShop.enabled"
              tooltip="开启后自动领取已完成的百果园悬赏，并按设置兑换水果或赏味拍档"
            >
              <Switch v-model:checked="config.basic.shop.floralShop.enabled" />
            </CustomFormItem>
            <template v-if="config.basic.shop.floralShop.enabled">
              <CustomFormItem
                label="领取悬赏"
                name="basic.shop.floralShop.claimTasks"
                tooltip="自动领取所有已经达成的百果园悬赏奖励"
              >
                <Switch v-model:checked="config.basic.shop.floralShop.claimTasks" />
              </CustomFormItem>
              <CustomFormItem
                label="兑换商品"
                name="basic.shop.floralShop.itemIds"
                tooltip="选择要用百果券兑换的水果或赏味拍档，已经兑换过的商品自动跳过"
              >
                <a-select
                  v-model:value="config.basic.shop.floralShop.itemIds"
                  mode="multiple"
                  :options="floralShopAllOptions"
                  placeholder="请选择要兑换的商品"
                  allow-clear
                  class="w-72! sm:w-96!"
                  :max-tag-count="5"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">随机事件</Divider>
            <CustomFormItem label="自动处理" name="basic.randomEvent" tooltip="自动处理随机事件">
              <Switch v-model:checked="config.basic.randomEvent" />
            </CustomFormItem>

            <Divider orientation="left">喂猫撸猫</Divider>
            <CustomFormItem label="总开关" name="basic.feedCat.enabled">
              <Switch v-model:checked="config.basic.feedCat.enabled" />
            </CustomFormItem>

            <template v-if="config.basic.feedCat.enabled">
              <CustomFormItem label="自动召回" name="basic.feedCat.autoRecall">
                <Switch v-model:checked="config.basic.feedCat.autoRecall" />
              </CustomFormItem>
              <CustomFormItem label="自动购买猫粮" name="basic.feedCat.autoBuyFood">
                <Switch v-model:checked="config.basic.feedCat.autoBuyFood" />
              </CustomFormItem>
              <CustomFormItem label="自动喂猫" name="basic.feedCat.autoFeed" tooltip="保持猫粮盆满">
                <Switch v-model:checked="config.basic.feedCat.autoFeed" />
              </CustomFormItem>
              <CustomFormItem label="自动撸猫" name="basic.feedCat.autoStroke">
                <Switch v-model:checked="config.basic.feedCat.autoStroke" />
              </CustomFormItem>
            </template>
          </div>
          <!-- 种植设置 -->
          <div v-if="activeTab === '种植'" class="config-section">
            <Divider orientation="left">培育配置</Divider>
            <CustomFormItem
              label="自动培育"
              name="plant.cultivate.enabled"
              tooltip="自动培育可培育花种"
            >
              <Switch
                v-model:checked="config.plant.cultivate.enabled"
                @change="handleCultivateEnabledChange"
              />
            </CustomFormItem>
            <CustomFormItem
              label="自动收获"
              name="plant.cultivate.autoHarvestEnabled"
              tooltip="开启后培育完成后会自动收获"
              v-if="config.plant.cultivate.enabled"
            >
              <Switch v-model:checked="config.plant.cultivate.autoHarvestEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="视频加速"
              name="plant.cultivate.videoSpeedUp"
              tooltip="自动观看视频加速培育正在培育的花种，培育时间减半"
            >
              <Switch v-model:checked="config.plant.cultivate.videoSpeedUp" />
            </CustomFormItem>

            <CustomFormItem
              label="水果升级"
              name="plant.cultivate.upgradeEnabled"
              tooltip="自动花费金币进行水果升级"
            >
              <Switch v-model:checked="config.plant.cultivate.upgradeEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="指定品质"
              name="plant.cultivate.upgradeQualityEnabled"
              tooltip="开启后就只会升级指定颜色的花到指定等级了"
              v-if="config.plant.cultivate.upgradeEnabled"
            >
              <Switch v-model:checked="config.plant.cultivate.upgradeQualityEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="选择品质"
              name="plant.cultivate.upgradeQualities"
              tooltip="选择要升级的水果品质，可多选"
              v-if="
                config.plant.cultivate.upgradeEnabled &&
                config.plant.cultivate.upgradeQualityEnabled
              "
            >
              <CustomSelect
                v-model:value="config.plant.cultivate.upgradeQualities"
                mode="multiple"
                :options="flowerQualityOptions"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              label="目标等级"
              name="plant.cultivate.tagetLevel"
              tooltip="水果升级到目标等级"
              v-if="config.plant.cultivate.upgradeEnabled"
            >
              <CustomInputNumber
                v-model:value="config.plant.cultivate.tagetLevel"
                :min="1"
                :max="20"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">水滴配置</Divider>
            <CustomFormItem
              label="水车水滴"
              name="plant.water.enabled"
              tooltip="3分钟领取一次水滴，这样才能最大化暴击，所以领取会略慢。"
            >
              <Switch v-model:checked="config.plant.water.enabled" />
            </CustomFormItem>
            <template v-if="config.plant.water.enabled">
              <CustomFormItem
                label="限时水滴"
                name="plant.water.timedEnabled"
                tooltip="自动领取限时水滴"
              >
                <Switch v-model:checked="config.plant.water.timedEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="水滴阈值"
                name="plant.water.minWaterThreshold"
                tooltip="若设置100，你的水滴低于100点才会领取，0代表不限制，设置0才会及时领水哦，不理解的建议无脑设置0"
              >
                <CustomInputNumber
                  v-model:value="config.plant.water.minWaterThreshold"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="无视阈值直接领"
                name="plant.water.forceCollectEnabled"
                tooltip="会根据设置好的时间段，到时间点后就无视水滴阈值且每次领水不等待3分钟直接领取"
              >
                <Switch v-model:checked="config.plant.water.forceCollectEnabled" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.water.forceCollectEnabled"
                label="领取时间"
                name="plant.water.forceCollectTime"
                tooltip="到该时间点后将无视水滴阈值并直接领取，时只能设置 16-23"
              >
                <Space>
                  <Select v-model:value="forceCollectHour" class="w-24!">
                    <Select.Option v-for="h in forceCollectHourOptions" :key="h" :value="h">
                      {{ h }}时
                    </Select.Option>
                  </Select>
                  <Select v-model:value="forceCollectMinute" class="w-24!">
                    <Select.Option v-for="m in forceCollectMinuteOptions" :key="m" :value="m">
                      {{ String(m).padStart(2, '0') }}分
                    </Select.Option>
                  </Select>
                </Space>
              </CustomFormItem>
            </template>

            <Divider orientation="left">种花配置</Divider>
            <CustomFormItem
              label="解锁土地"
              name="plant.flower.autoUnlockLand"
              tooltip="自动花费金币解锁可解锁的土地"
            >
              <Switch v-model:checked="config.plant.flower.autoUnlockLand" />
            </CustomFormItem>
            <CustomFormItem
              label="自动收获"
              name="plant.flower.harvestEnabled"
              tooltip="自动完成土地收获"
            >
              <Switch v-model:checked="config.plant.flower.harvestEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="自动种植"
              name="plant.flower.plantEnabled"
              tooltip="自动完成土地浇水，加速，种植"
            >
              <Switch v-model:checked="config.plant.flower.plantEnabled" />
            </CustomFormItem>
            <template v-if="config.plant.flower.plantEnabled">
              <CustomFormItem
                label="视频加速"
                name="plant.flower.videoSpeedUp"
                tooltip="自动观看视频加速收获，当所有土地种了花且可加速才会使用，避免浪费视频加速次数"
              >
                <Switch v-model:checked="config.plant.flower.videoSpeedUp" />
              </CustomFormItem>
              <CustomFormItem
                label="使用加速"
                name="plant.flower.useSpeedUpTicket"
                tooltip="使用加速券加速收获"
              >
                <Switch v-model:checked="config.plant.flower.useSpeedUpTicket" />
              </CustomFormItem>
              <CustomFormItem
                label="使用场景"
                name="plant.flower.speedUpTicketScenes"
                v-if="config.plant.flower.useSpeedUpTicket"
              >
                <Checkbox.Group v-model:value="config.plant.flower.speedUpTicketScenes">
                  <Space direction="vertical">
                    <Checkbox value="normal">普通种花</Checkbox>
                    <Checkbox value="elves">种植果灵</Checkbox>
                  </Space>
                </Checkbox.Group>
              </CustomFormItem>
              <CustomFormItem
                label="加速模式"
                name="plant.flower.speedUpTicketMode"
                v-if="config.plant.flower.useSpeedUpTicket"
              >
                <Radio.Group v-model:value="config.plant.flower.speedUpTicketMode">
                  <Space direction="vertical">
                    <Radio value="dailyLimit">每天使用多少张加速卡</Radio>
                    <Radio value="remainingMinutes">收获时间大于多少分钟使用</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="加速上限"
                name="plant.flower.speedUpTicketMax"
                tooltip="若设置100，则今日使用到100张就不使用了"
                v-if="
                  config.plant.flower.useSpeedUpTicket &&
                  config.plant.flower.speedUpTicketMode === 'dailyLimit'
                "
              >
                <CustomInputNumber
                  v-model:value="config.plant.flower.speedUpTicketMax"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="大于多少分钟"
                name="plant.flower.speedUpTicketMinMinutes"
                tooltip="仅当剩余成熟时间严格大于该分钟数时才会使用加速卡"
                v-if="
                  config.plant.flower.useSpeedUpTicket &&
                  config.plant.flower.speedUpTicketMode === 'remainingMinutes'
                "
              >
                <CustomInputNumber
                  v-model:value="config.plant.flower.speedUpTicketMinMinutes"
                  :min="0"
                  :max="99"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="保留加速卡"
                name="plant.flower.speedUpTicketReserve"
                tooltip="当加速卡库存小于等于该值时不使用加速卡"
                v-if="
                  config.plant.flower.useSpeedUpTicket &&
                  config.plant.flower.speedUpTicketMode === 'remainingMinutes'
                "
              >
                <CustomInputNumber
                  v-model:value="config.plant.flower.speedUpTicketReserve"
                  :min="0"
                  :max="99999"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="保留水滴"
                name="plant.flower.waterThreshold"
                tooltip="保留多少水滴不用于浇花"
              >
                <CustomInputNumber
                  v-model:value="config.plant.flower.waterThreshold"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="严格模式"
                name="plant.flower.strictLayout"
                tooltip="严格按照单花占地数量种植，地块不足时等待满足条件再种，美观但效率较低，效率低体现在做任务方面，如居民订单，顾客订单之类的。生效的模式：指定品质-指定水果-指定库存"
              >
                <Switch v-model:checked="config.plant.flower.strictLayout" />
              </CustomFormItem>
              <CustomFormItem
                label="单花占地数量"
                name="plant.flower.landGroupSize"
                tooltip="指一种花占几块地，可实现土地规整，若选择了指定种类，则单花占地数量不生效，跟着设置了多少种进行种植"
                v-if="config.plant.flower.strictLayout"
              >
                <Radio.Group v-model:value="config.plant.flower.landGroupSize">
                  <Space>
                    <Radio
                      v-for="option in landGroupSizeOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="分组浇水"
                name="plant.flower.groupWaterEnabled"
                tooltip="为了保持美观，4个1组，满4个水滴浇一组，若保留水滴设置了5，那么就是满9个水滴才会浇一组"
              >
                <Switch v-model:checked="config.plant.flower.groupWaterEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="任务优先"
                name="plant.flower.taskMode"
                tooltip="开启后：如果订单里缺花，系统会先种订单需要的花；发现有空地时，会直接插队用来种这些花；花种完以后，会自动恢复到原来设置的模式（指定品质 / 指定种类 / 指定水果）"
              >
                <Switch v-model:checked="config.plant.flower.taskMode" />
              </CustomFormItem>
              <CustomFormItem
                label="任务日志"
                name="plant.flower.taskLogEnabled"
                tooltip="是否显示种植任务队列日志"
                v-if="config.plant.flower.taskMode"
              >
                <Switch v-model:checked="config.plant.flower.taskLogEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="任务优先级"
                name="plant.flower.taskPriorityConfig"
                tooltip="配置订单任务的优先级，数字越小优先级越高，0是不做此任务（公会竞赛最低为1，不能设置0），可以几个任务设置一样的数字，就会一起做这几个任务。有些玩家说居民订单不做，果艺不做，莳花不做，都跟您设置的数字有关，数字最大就会把任务排到最后，让您产生不做的错觉"
                v-if="config.plant.flower.taskMode"
              >
                <div class="w-full max-w-[420px] flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm">顾客订单</span>
                    <CustomInputNumber
                      v-model:value="config.plant.flower.taskPriorityConfig['顾客订单']"
                      :min="0"
                      :max="10"
                      class="w-24!"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm">居民订单</span>
                    <CustomInputNumber
                      v-model:value="config.plant.flower.taskPriorityConfig['居民订单']"
                      :min="0"
                      :max="10"
                      class="w-24!"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm">果艺售卖</span>
                    <CustomInputNumber
                      v-model:value="config.plant.flower.taskPriorityConfig['花艺售卖']"
                      :min="0"
                      :max="10"
                      class="w-24!"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm">莳花纪闻</span>
                    <CustomInputNumber
                      v-model:value="config.plant.flower.taskPriorityConfig['莳花纪闻']"
                      :min="0"
                      :max="10"
                      class="w-24!"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm">宫廷订单</span>
                    <CustomInputNumber
                      v-model:value="config.plant.flower.taskPriorityConfig['宫廷订单']"
                      :min="0"
                      :max="10"
                      class="w-24!"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm">公会竞赛</span>
                    <CustomInputNumber
                      v-model:value="config.plant.flower.taskPriorityConfig['公会竞赛']"
                      :min="1"
                      :max="10"
                      class="w-24!"
                    />
                  </div>
                </div>
              </CustomFormItem>
              <CustomFormItem
                label="种植模式"
                name="plant.flower.plantingMode"
                tooltip="选择种植模式，只能启用一种模式。需要保持种植整洁的玩家请自行清空所有土地"
              >
                <Radio.Group v-model:value="config.plant.flower.plantingMode">
                  <Space direction="vertical">
                    <Radio value="quality">指定品质 </Radio>
                    <Radio value="count">指定种类 </Radio>
                    <Radio value="specific">指定水果 </Radio>
                    <Radio value="lowStock">库存模式 </Radio>
                    <Radio value="freeStyle">64块地模式 </Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <!-- 指定品质模式 -->
              <CustomFormItem
                label="选择品质"
                name="plant.flower.qualities"
                tooltip="选择要种植的水果品质，可多选，库存少的优先种植。"
                v-if="config.plant.flower.plantingMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.plant.flower.qualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.flower.qualityExcludeEnabled"
                tooltip="设置了排除的水果就算库存0也不会种"
                v-if="config.plant.flower.plantingMode === 'quality'"
              >
                <Switch v-model:checked="config.plant.flower.qualityExcludeEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.flower.qualityExcludeFlowerIds"
                v-if="
                  config.plant.flower.plantingMode === 'quality' &&
                  config.plant.flower.qualityExcludeEnabled
                "
              >
                <CustomSelect
                  v-model:value="config.plant.flower.qualityExcludeFlowerIds"
                  mode="multiple"
                  allow-empty
                  placeholder="请选择排除水果"
                  :options="getFlowerPickerOptions(config.plant.flower.qualityExcludeFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <!-- 指定种类模式 -->
              <CustomFormItem
                label="选择数量"
                name="plant.flower.flowerCount"
                tooltip="选择要种植几种花，库存少的优先种植。"
                v-if="config.plant.flower.plantingMode === 'count'"
              >
                <CustomSelect
                  v-model:value="config.plant.flower.flowerCount"
                  :options="flowerCountOptions"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.flower.countExcludeEnabled"
                tooltip="设置了排除的水果就算库存0也不会种"
                v-if="config.plant.flower.plantingMode === 'count'"
              >
                <Switch v-model:checked="config.plant.flower.countExcludeEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.flower.countExcludeFlowerIds"
                v-if="
                  config.plant.flower.plantingMode === 'count' &&
                  config.plant.flower.countExcludeEnabled
                "
              >
                <CustomSelect
                  v-model:value="config.plant.flower.countExcludeFlowerIds"
                  mode="multiple"
                  allow-empty
                  placeholder="请选择排除水果"
                  :options="getFlowerPickerOptions(config.plant.flower.countExcludeFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <!-- 指定水果模式 -->
              <CustomFormItem
                label="选择水果"
                name="plant.flower.specificFlowerIds"
                tooltip="选择要种植的水果，可多选，库存少的优先种植。"
                v-if="config.plant.flower.plantingMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.flower.specificFlowerIds"
                  mode="multiple"
                  placeholder="请选择水果"
                  :options="getFlowerPickerOptions(config.plant.flower.specificFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
              <!-- 库存模式 -->
              <CustomFormItem
                label="最低库存"
                name="plant.flower.lowStockThreshold"
                tooltip="比如设置了500，那么就种植库存不足500的花，无视限制水果等级，所有花库存都有500了就不会种植了，适合小号存水。"
                v-if="config.plant.flower.plantingMode === 'lowStock'"
              >
                <CustomInputNumber
                  v-model:value="config.plant.flower.lowStockThreshold"
                  :min="1"
                  :max="999999"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.flower.lowStockExcludeEnabled"
                tooltip="设置了排除的水果就算库存0也不会种"
                v-if="config.plant.flower.plantingMode === 'lowStock'"
              >
                <Switch v-model:checked="config.plant.flower.lowStockExcludeEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.flower.lowStockExcludeFlowerIds"
                v-if="
                  config.plant.flower.plantingMode === 'lowStock' &&
                  config.plant.flower.lowStockExcludeEnabled
                "
              >
                <CustomSelect
                  v-model:value="config.plant.flower.lowStockExcludeFlowerIds"
                  mode="multiple"
                  allow-empty
                  placeholder="请选择排除水果"
                  :options="getFlowerPickerOptions(config.plant.flower.lowStockExcludeFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <!-- 64块地模式 -->
              <CustomFormItem
                label="设置每块土地"
                name="plant.flower.freeStyleList"
                tooltip="这个模式可以设置每块土地种什么花，无视限制水果等级，所有任务做完才会进入这个种植模式。设置好后需要点保存才生效哦"
                v-if="config.plant.flower.plantingMode === 'freeStyle'"
              >
                <a-button type="primary" @click="openFreeStylePage"> 设置每块土地 </a-button>
              </CustomFormItem>
              <CustomFormItem
                label="限制水果等级"
                name="plant.flower.minFlowerLevel"
                tooltip="限制种植的最低水果等级，0则不限制，此项的设置只针对补库存，做订单和公会竞赛之类的不受此设置影响"
                v-if="!['lowStock', 'freeStyle'].includes(config.plant.flower.plantingMode)"
              >
                <CustomInputNumber
                  v-model:value="config.plant.flower.minFlowerLevel"
                  :min="0"
                  :max="21"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">好友偷花</Divider>
            <CustomFormItem
              label="自动偷花"
              name="plant.friendSteal.enabled"
              tooltip="默认不会偷取果灵，但在好友种植果灵时会偷取水果，需要在偷花模式里设置排除水果，排除果灵主花"
            >
              <Switch v-model:checked="config.plant.friendSteal.enabled" />
            </CustomFormItem>
            <template v-if="config.plant.friendSteal.enabled">
              <CustomFormItem
                label="不摸果灵"
                tooltip="若好友地块中某水果是果灵书册的副花品种、且该好友同时种了对应主花，则判定为果灵副花并跳过不偷，需偷果灵请把偷取果灵开关打开即可"
              >
                <Switch :checked="true" disabled class="locked-on-switch" />
              </CustomFormItem>
              <CustomFormItem
                label="偷取果灵"
                name="plant.friendSteal.stealElves"
                tooltip="开启后偷取有果灵的地块，关闭则跳过有果灵的地块"
              >
                <Switch v-model:checked="config.plant.friendSteal.stealElves" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.friendSteal.stealElves"
                label="只偷指定好友"
                name="plant.friendSteal.onlyStealSpecifiedFriends"
                tooltip="开启后，去设置的好友的地里就只会偷取果灵，就算设置的好友的地里有普通花，每天没偷完4次果灵之前也不会偷取"
              >
                <Switch v-model:checked="config.plant.friendSteal.onlyStealSpecifiedFriends" />
              </CustomFormItem>
              <CustomFormItem
                v-if="
                  config.plant.friendSteal.stealElves &&
                  config.plant.friendSteal.onlyStealSpecifiedFriends
                "
                label="好友名字"
                name="plant.friendSteal.specifiedFriendNames"
                tooltip="可填多个好友名字，回车隔开，例：s1047.曼冬,s1047.酷暑"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.specifiedFriendNames"
                  mode="tags"
                  placeholder="例如：s1047.曼冬,s1047.酷暑"
                  :token-separators="[',', '，']"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.friendSteal.stealElves"
                label="只偷指定果灵"
                name="plant.friendSteal.onlyStealSpecifiedElves"
                tooltip="开启后只偷选中的果灵种类"
              >
                <Switch v-model:checked="config.plant.friendSteal.onlyStealSpecifiedElves" />
              </CustomFormItem>
              <CustomFormItem
                v-if="
                  config.plant.friendSteal.stealElves &&
                  config.plant.friendSteal.onlyStealSpecifiedElves
                "
                label="指定果灵"
                name="plant.friendSteal.specifiedElvesIds"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.specifiedElvesIds"
                  mode="multiple"
                  placeholder="请选择果灵"
                  :options="elfOptions"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="偷花模式"
                name="plant.friendSteal.stealMode"
                tooltip="排除已有种子：选择此项就会不偷自己可以种的水果，只偷不能种的"
              >
                <Radio.Group v-model:value="config.plant.friendSteal.stealMode">
                  <Space>
                    <Radio value="quality">指定品质 </Radio>
                    <Radio value="specific">指定水果 </Radio>
                    <Radio value="exclude">排除水果 </Radio>
                    <Radio value="excludeCultivating">排除已有种子</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="指定品质"
                name="plant.friendSteal.stealQualities"
                tooltip="只偷取指定品质的水果"
                v-if="config.plant.friendSteal.stealMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.stealQualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="指定水果"
                name="plant.friendSteal.stealFlowerIds"
                tooltip="只偷取指定的水果"
                v-if="config.plant.friendSteal.stealMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.stealFlowerIds"
                  mode="multiple"
                  placeholder="请选择水果"
                  :options="getFlowerPickerOptions(config.plant.friendSteal.stealFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.friendSteal.excludeFlowerIds"
                tooltip="不偷取指定的水果，不想影响好友种植果灵的话，建议把所有果灵主花设置上，排除掉"
                v-if="config.plant.friendSteal.stealMode === 'exclude'"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.excludeFlowerIds"
                  mode="multiple"
                  placeholder="请选择要排除的水果"
                  :options="getFlowerPickerOptions(config.plant.friendSteal.excludeFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="购买偷取次数"
                name="plant.friendSteal.buyStealEnabled"
                tooltip="花费好友币购买偷取次数"
              >
                <Switch v-model:checked="config.plant.friendSteal.buyStealEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="购买次数"
                name="plant.friendSteal.buyStealCount"
                tooltip="每个好友购买多少次偷取次数"
                v-if="config.plant.friendSteal.buyStealEnabled"
              >
                <CustomInputNumber
                  v-model:value="config.plant.friendSteal.buyStealCount"
                  :min="1"
                  :max="99"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="禁止偷花时段"
                name="plant.friendSteal.noStealEnabled"
                tooltip="开启后，在设置的时间段内不执行偷花，建议半夜别偷"
              >
                <Switch v-model:checked="config.plant.friendSteal.noStealEnabled" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.friendSteal.noStealEnabled"
                label="禁止时段"
                name="plant.friendSteal.noStealStart"
                tooltip="格式 HH:mm，前面时间需小于后面时间时为白天段；前大于后为跨午夜夜间段（推荐 22:00 至 07:00）"
              >
                <Space align="center">
                  <Input
                    v-model:value="config.plant.friendSteal.noStealStart"
                    placeholder="开始时间"
                    style="width: 100px"
                    maxlength="5"
                  />
                  <span class="text-gray-400">至</span>
                  <Input
                    v-model:value="config.plant.friendSteal.noStealEnd"
                    placeholder="结束时间"
                    style="width: 100px"
                    maxlength="5"
                  />
                </Space>
              </CustomFormItem>
              <CustomFormItem
                label="晚上用完剩余次数"
                name="plant.friendSteal.lateNightConsumeEnabled"
                tooltip="23:00 后忽略所有偷花筛选条件（品质、指定水果、排除水果等），直接偷任何普通花耗光免费次数，不自动购买；注意：避开果灵土地此配置仍然生效"
              >
                <Switch v-model:checked="config.plant.friendSteal.lateNightConsumeEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="排除好友"
                name="plant.friendSteal.excludeFriendsEnabled"
                tooltip="开启后，就不会再偷设置的好友地里的任意水果，若在偷取果灵里设置了好友A，又在排除好友里设置了好友A，也是不会去偷好友A的"
              >
                <Switch v-model:checked="config.plant.friendSteal.excludeFriendsEnabled" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.friendSteal.excludeFriendsEnabled"
                label="好友名字"
                name="plant.friendSteal.excludedFriendNames"
                tooltip="可填多个好友名字，回车隔开，例：s1047.曼冬,s1047.酷暑"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.excludedFriendNames"
                  mode="tags"
                  placeholder="例如：s1047.曼冬,s1047.酷暑"
                  :token-separators="[',', '，']"
                  style="width: 100%"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">果灵</Divider>
            <CustomFormItem
              label="自动种果灵"
              name="plant.elves.enabled"
              tooltip="优先种植指定果灵，否则选择当期双倍加成果灵种植（8朵主花+其余辅花），需要打开种植系统自动收获和自动种植，每日果灵达到收获上限后恢复到原有种植模式"
            >
              <Switch v-model:checked="config.plant.elves.enabled" />
            </CustomFormItem>
            <CustomFormItem
              label="指定果灵"
              name="plant.elves.selectedElvesIds"
              v-if="config.plant.elves.enabled"
            >
              <CustomSelect
                v-model:value="config.plant.elves.selectedElvesIds"
                mode="multiple"
                placeholder="请选择果灵"
                :options="elfOptions"
                show-search
                option-filter-prop="label"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.plant.elves.enabled"
              label="延迟收获"
              name="plant.elves.delayedHarvestEnabled"
              tooltip="浇水/加速后等待指定分钟数再收获，让果灵在地里待一会儿供好友偷取"
            >
              <Switch v-model:checked="config.plant.elves.delayedHarvestEnabled" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.plant.elves.enabled && config.plant.elves.delayedHarvestEnabled"
              label="延迟时间（分）"
              name="plant.elves.delayedHarvestMinutes"
            >
              <CustomInputNumber
                v-model:value="config.plant.elves.delayedHarvestMinutes"
                :min="10"
                :max="999"
                :step="1"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem label="自动申请协助" name="plant.elves.requestAid">
              <Switch v-model:checked="config.plant.elves.requestAid" />
            </CustomFormItem>
            <CustomFormItem
              label="自动领取协助加成"
              name="plant.elves.recvAid"
              tooltip="当协助人数达到5人时自动领取协助加成"
            >
              <Switch v-model:checked="config.plant.elves.recvAid" />
            </CustomFormItem>
            <CustomFormItem
              label="自动协助好友"
              name="plant.elves.helpFrd"
              tooltip="只协助3次，协助完3次完成协助任务后就不会协助了，因官方限制问题。不能一直协助"
            >
              <Switch v-model:checked="config.plant.elves.helpFrd" />
            </CustomFormItem>
            <CustomFormItem
              label="自动派遣果灵"
              name="plant.elves.dispatch"
              tooltip="自动将背包中的果灵派遣到空闲位置"
            >
              <Switch v-model:checked="config.plant.elves.dispatch" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.plant.elves.dispatch"
              label="派遣模式"
              name="plant.elves.dispatchMode"
              tooltip="先双倍后普通：优先派遣双倍果灵，无双倍果灵时派遣普通果灵；只派遣双倍：无双倍果灵时跳过派遣"
            >
              <Radio.Group v-model:value="config.plant.elves.dispatchMode">
                <Space direction="vertical">
                  <Radio value="doubleFirst">先双倍后普通</Radio>
                  <Radio value="doubleOnly">只派遣双倍</Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              v-if="config.plant.elves.dispatch"
              label="派遣数量"
              name="plant.elves.dispatchCount"
              tooltip="每个槽位每次派遣几个果灵（1-12）"
            >
              <CustomInputNumber
                v-model:value="config.plant.elves.dispatchCount"
                :min="1"
                :max="12"
              />
            </CustomFormItem>
            <CustomFormItem
              label="自动加速派遣"
              name="plant.elves.speedUpDispatch"
              tooltip="花费勾玉加速派遣中的果灵"
            >
              <Switch
                :checked="config.plant.elves.speedUpDispatch"
                @change="
                  (checked) => handleDiamondCostSwitchChange('plant.elves.speedUpDispatch', checked)
                "
              />
            </CustomFormItem>
            <CustomFormItem
              label="自动领取派遣奖励"
              name="plant.elves.recvDispatch"
              tooltip="派遣完成后自动领取星辰币奖励"
            >
              <Switch v-model:checked="config.plant.elves.recvDispatch" />
            </CustomFormItem>

            <Divider orientation="left">果灵密令</Divider>
            <CustomFormItem
              label="等级奖励"
              name="plant.elves.recvPass"
              tooltip="自动领取果灵密令等级奖励，不会做针对性做果灵密令任务哦，日常做其他任务会有顺带做到果灵密令的部分任务，做完了就会顺便领取"
            >
              <Switch v-model:checked="config.plant.elves.recvPass" />
            </CustomFormItem>
            <CustomFormItem
              label="任务奖励"
              name="plant.elves.recvPassTask"
              tooltip="自动领取果灵密令任务奖励，不会做针对性做果灵密令任务哦，日常做其他任务会有顺带做到果灵密令的部分任务，做完了就会顺便领取"
            >
              <Switch v-model:checked="config.plant.elves.recvPassTask" />
            </CustomFormItem>

            <Divider orientation="left">水果密令</Divider>
            <CustomFormItem
              label="等级奖励"
              name="plant.elves.recvFlowerPass"
              tooltip="自动领取水果密令等级奖励"
            >
              <Switch v-model:checked="config.plant.elves.recvFlowerPass" />
            </CustomFormItem>
            <CustomFormItem
              label="任务奖励"
              name="plant.elves.recvFlowerPassTask"
              tooltip="自动领取水果密令任务奖励"
            >
              <Switch v-model:checked="config.plant.elves.recvFlowerPassTask" />
            </CustomFormItem>

            <Divider orientation="left">果艺上架</Divider>
            <CustomFormItem
              label="自动解锁花架"
              name="plant.artSell.autoUnlockStand"
              tooltip="自动解锁花架"
            >
              <Switch v-model:checked="config.plant.artSell.autoUnlockStand" />
            </CustomFormItem>

            <CustomFormItem
              label="自动上架"
              name="plant.artSell.autoSellArt"
              tooltip="自动上架果艺，自动领取金币收益"
            >
              <Switch v-model:checked="config.plant.artSell.autoSellArt" />
            </CustomFormItem>
            <template v-if="config.plant.artSell.autoSellArt">
              <CustomFormItem label="上架模式" name="plant.artSell.artSellMode">
                <Radio.Group v-model:value="config.plant.artSell.artSellMode">
                  <Space direction="vertical">
                    <Radio value="vase">指定花瓶</Radio>
                    <Radio value="full">指定果艺</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="指定花瓶"
                name="plant.artSell.specifiedArts"
                tooltip="指定花瓶，优先选择有库存的上架，否则进行制作，如果水果库存不足需要配合种植开启任务优先进行使用。"
                v-if="config.plant.artSell.artSellMode === 'vase'"
              >
                <CustomSelect
                  v-model:value="config.plant.artSell.specifiedArts"
                  mode="multiple"
                  :options="flowerArtOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                class="form-item--stack-mobile"
                label="指定果艺"
                name="plant.artSell.specifiedArtsFull"
                tooltip="指定果艺，优先选择有库存的上架，否则进行制作，如果水果库存不足需要配合种植开启任务优先进行使用。"
                v-if="config.plant.artSell.artSellMode === 'full'"
              >
                <CustomSelect
                  v-model:value="config.plant.artSell.specifiedArtsFull"
                  mode="multiple"
                  wide
                  placeholder="请选择果艺"
                  :options="
                    getSpecifiedArtsFullPickerOptions(config.plant.artSell.specifiedArtsFull)
                  "
                />
              </CustomFormItem>
              <CustomFormItem
                label="上架数量"
                name="plant.artSell.flowerArtPerRack"
                tooltip="每个花架上架多少果艺"
              >
                <CustomInputNumber
                  v-model:value="config.plant.artSell.flowerArtPerRack"
                  :min="0"
                  :max="12"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="果艺4分钟下架"
                name="plant.artSell.rackAutoRefresh"
                tooltip="上架后4分钟能下架了马上下架，适合做一些任务"
              >
                <Switch v-model:checked="config.plant.artSell.rackAutoRefresh" />
              </CustomFormItem>
              <CustomFormItem
                label="库存优先"
                name="plant.artSell.stockFirst"
                tooltip="开启后会优先上架已有的果艺(从多到少排序)，全部没有后才会再根据上架模式上架设置的果艺"
              >
                <Switch v-model:checked="config.plant.artSell.stockFirst" />
              </CustomFormItem>
            </template>
            <CustomFormItem
              label="果艺经验"
              name="plant.artSell.recvArtCreateRwd"
              tooltip="自动领取果艺制作经验"
            >
              <Switch v-model:checked="config.plant.artSell.recvArtCreateRwd" />
            </CustomFormItem>
            <CustomFormItem
              label="图鉴奖励"
              name="plant.artSell.recvCollectRwd"
              tooltip="自动领取水果收藏，花瓶收藏，果艺收藏奖励"
            >
              <Switch v-model:checked="config.plant.artSell.recvCollectRwd" />
            </CustomFormItem>
            <CustomFormItem
              label="果艺首做"
              name="plant.artSell.artFirstMake"
              tooltip="自动制作所有未首次制作过的果艺，制作效率和任务优先级里的果艺售卖优先级挂钩"
            >
              <Switch v-model:checked="config.plant.artSell.artFirstMake" />
            </CustomFormItem>

            <Divider orientation="left">花贸市场</Divider>
            <CustomFormItem
              label="解锁货架"
              name="plant.market.autoUnlockShelf"
              tooltip="自动花费勾玉解锁花贸市场货架"
            >
              <Switch v-model:checked="config.plant.market.autoUnlockShelf" />
            </CustomFormItem>
            <CustomFormItem
              label="自动上架"
              name="plant.market.putEnabled"
              tooltip="自动领取花贸市场收益并上架水果，注意上架会消耗勾玉，请谨慎开启！"
            >
              <Switch v-model:checked="config.plant.market.putEnabled" />
            </CustomFormItem>
            <template v-if="config.plant.market.putEnabled">
              <CustomFormItem label="上架策略" name="plant.market.putMode">
                <Radio.Group v-model:value="config.plant.market.putMode">
                  <Space>
                    <Radio value="inventory">库存最多</Radio>
                    <Radio value="specific">指定水果</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="选择水果"
                name="plant.market.specificFlowerIds"
                tooltip="选择要上架的水果，可多选，库存多的优先上架"
                v-if="config.plant.market.putMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.market.specificFlowerIds"
                  mode="multiple"
                  placeholder="请选择水果"
                  :options="getFlowerPickerOptions(config.plant.market.specificFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem label="上架价格" name="plant.market.priceIndex">
                <Radio.Group v-model:value="config.plant.market.priceIndex">
                  <Space>
                    <Radio :value="0">最低</Radio>
                    <Radio :value="1">中等</Radio>
                    <Radio :value="2">最高</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem label="上架数量" name="plant.market.maxSell">
                <CustomInputNumber
                  v-model:value="config.plant.market.maxSell"
                  :min="1"
                  :max="25"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="上架密码"
                name="plant.market.putFlowerPassword"
                tooltip="保护自己上架的水果，防止被他人购买（4位数字）"
              >
                <Input.Password
                  v-model:value="config.plant.market.putFlowerPassword"
                  placeholder="请输入上架密码"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="购买上架次数"
                name="plant.market.autoBuyPutCount"
                tooltip="当免费上架次数用完时，自动花费勾玉购买上架次数"
              >
                <Switch
                  :checked="config.plant.market.autoBuyPutCount"
                  @change="handleDiamondCostSwitchChange('plant.market.autoBuyPutCount', $event)"
                />
              </CustomFormItem>
              <CustomFormItem
                label="购买次数"
                name="plant.market.buyPutCount"
                tooltip="购买多少上架次数"
                v-if="config.plant.market.autoBuyPutCount"
              >
                <CustomInputNumber
                  v-model:value="config.plant.market.buyPutCount"
                  :min="1"
                  :max="99"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>
            <CustomFormItem
              label="好友摊位扫货"
              name="plant.market.autoBuyFromFriend"
              tooltip="自动购买好友货架的水果"
            >
              <Switch v-model:checked="config.plant.market.autoBuyFromFriend" />
            </CustomFormItem>
            <template v-if="config.plant.market.autoBuyFromFriend">
              <CustomFormItem label="扫货策略" name="plant.market.buyMode">
                <Radio.Group v-model:value="config.plant.market.buyMode">
                  <Space direction="vertical">
                    <Radio value="all">全部</Radio>
                    <Radio value="specific">指定水果</Radio>
                    <Radio value="quality">指定品质</Radio>
                    <Radio value="exclude">排除水果</Radio>
                    <Radio value="friend">指定好友</Radio>
                    <Radio value="excludeFriend">排除好友</Radio>
                    <Radio value="uncultivated">只扫没有的种子</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                v-if="
                  config.plant.market.buyMode === 'friend' ||
                  config.plant.market.buyMode === 'excludeFriend'
                "
                label="好友名字"
                name="plant.market.buyFriendNames"
                tooltip="可填多个好友名字，回车隔开，例：s1047.曼冬,s1047.酷暑"
              >
                <CustomSelect
                  v-model:value="config.plant.market.buyFriendNames"
                  mode="tags"
                  placeholder="例如：s1047.曼冬"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="指定水果"
                name="plant.market.buySpecificFlowerIds"
                tooltip="选择要从好友处购买的水果，可多选"
                v-if="config.plant.market.buyMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.market.buySpecificFlowerIds"
                  mode="multiple"
                  placeholder="请选择水果"
                  :options="getFlowerPickerOptions(config.plant.market.buySpecificFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="指定品质"
                name="plant.market.buyQualities"
                tooltip="选择要从好友处购买的水果品质，可多选"
                v-if="config.plant.market.buyMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.plant.market.buyQualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  placeholder="请选择品质"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="排除水果"
                name="plant.market.excludeFlowerIds"
                tooltip="选择不要购买的水果，可多选"
                v-if="config.plant.market.buyMode === 'exclude'"
              >
                <CustomSelect
                  v-model:value="config.plant.market.excludeFlowerIds"
                  mode="multiple"
                  placeholder="请选择不要购买的水果"
                  :options="getFlowerPickerOptions(config.plant.market.excludeFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="最小上架时长"
                name="plant.market.minPutTimeDiff"
                tooltip="只购买上架时间超过此时长的水果，0表示不限制。单位：秒"
              >
                <CustomInputNumber
                  v-model:value="config.plant.market.minPutTimeDiff"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>
          </div>
          <!-- 订单配置 -->
          <div v-if="activeTab === '订单'" class="config-section">
            <Divider orientation="left">居民订单</Divider>
            <CustomFormItem
              label="居民订单"
              name="order.resident.normalEnabled"
              tooltip="自动提交居民订单，不包括建材和绸缎订单，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.order.resident.normalEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="居民订单上限"
              name="order.resident.normalMaxNum"
              tooltip="居民订单单日最大完成次数"
              v-if="config.order.resident.normalEnabled"
            >
              <CustomInputNumber
                v-model:value="config.order.resident.normalMaxNum"
                :min="0"
                :max="1200"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="绸缎订单"
              name="order.resident.satinEnabled"
              tooltip="自动提交绸缎订单，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.order.resident.satinEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="绸缎订单上限"
              name="order.resident.satinMaxNum"
              tooltip="绸缎订单单日最大完成次数"
              v-if="config.order.resident.satinEnabled"
            >
              <CustomInputNumber
                v-model:value="config.order.resident.satinMaxNum"
                :min="0"
                :max="120"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="建材订单"
              name="order.resident.decorateEnabled"
              tooltip="自动提交建材订单，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.order.resident.decorateEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="建材订单上限"
              name="order.resident.decorateMaxNum"
              tooltip="建材订单单日最大完成次数"
              v-if="config.order.resident.decorateEnabled"
            >
              <CustomInputNumber
                v-model:value="config.order.resident.decorateMaxNum"
                :min="0"
                :max="120"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="自定义订单时间"
              name="order.resident.timedEnabled"
              tooltip="开启后，居民、绸缎和建材订单仅在设置的每日时段内执行；支持跨午夜，开始与结束相同则视为全天"
            >
              <Switch v-model:checked="config.order.resident.timedEnabled" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.order.resident.timedEnabled"
              label="设置时间"
              name="order.resident.startTime"
              tooltip="每日允许执行居民、绸缎和建材订单的开始与结束时间"
            >
              <Space align="center" wrap>
                <Select v-model:value="residentOrderStartHour" class="w-24!">
                  <Select.Option
                    v-for="h in residentOrderHourOptions"
                    :key="`start-${h}`"
                    :value="h"
                  >
                    {{ h }}时
                  </Select.Option>
                </Select>
                <Select v-model:value="residentOrderStartMinute" class="w-24!">
                  <Select.Option
                    v-for="m in residentOrderMinuteOptions"
                    :key="`start-${m}`"
                    :value="m"
                  >
                    {{ String(m).padStart(2, '0') }}分
                  </Select.Option>
                </Select>
                <span class="text-gray-400">至</span>
                <Select v-model:value="residentOrderEndHour" class="w-24!">
                  <Select.Option v-for="h in residentOrderHourOptions" :key="`end-${h}`" :value="h">
                    {{ h }}时
                  </Select.Option>
                </Select>
                <Select v-model:value="residentOrderEndMinute" class="w-24!">
                  <Select.Option
                    v-for="m in residentOrderMinuteOptions"
                    :key="`end-${m}`"
                    :value="m"
                  >
                    {{ String(m).padStart(2, '0') }}分
                  </Select.Option>
                </Select>
              </Space>
            </CustomFormItem>
            <!-- <CustomFormItem
             label="仅已培育"
             name="basic.hasSeparation"
              tooltip="仅提交已培育的水果"
           >
             <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem> -->
            <CustomFormItem
              label="品质限定"
              name="order.resident.qualities"
              tooltip="仅提交指定品质的水果到居民订单"
              v-if="
                config.order.resident.normalEnabled ||
                config.order.resident.satinEnabled ||
                config.order.resident.decorateEnabled
              "
            >
              <CustomSelect
                v-model:value="config.order.resident.qualities"
                mode="multiple"
                :options="flowerQualityOptions"
                style="width: 100%"
              />
            </CustomFormItem>

            <Divider orientation="left">顾客订单</Divider>
            <CustomFormItem
              label="自动完成"
              name="order.customer.enabled"
              tooltip="自动完成顾客订单"
            >
              <Switch v-model:checked="config.order.customer.enabled" />
            </CustomFormItem>
            <CustomFormItem
              label="果园币数量"
              name="order.customer.floralCoinEnabled"
              tooltip="开启后会按设置达到果园币的数量才接，否则都拒绝，若设置3个果园币可能会导致顾客订单偏少，谨慎设置"
              v-if="config.order.customer.enabled"
            >
              <Switch
                :checked="config.order.customer.floralCoinEnabled"
                @change="handleCustomerFloralCoinEnabledChange"
              />
            </CustomFormItem>
            <CustomFormItem
              label="果园币"
              name="order.customer.floralCoinCount"
              v-if="config.order.customer.enabled && config.order.customer.floralCoinEnabled"
            >
              <Radio.Group
                v-model:value="config.order.customer.floralCoinCount"
                button-style="solid"
              >
                <Radio.Button :value="1">1</Radio.Button>
                <Radio.Button :value="2">2</Radio.Button>
                <Radio.Button :value="3">3</Radio.Button>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              label="自动拒绝"
              name="order.customer.rejectEnabled"
              tooltip="自动拒绝无法培育且库存不足的订单"
              v-if="config.order.customer.enabled"
            >
              <Switch v-model:checked="config.order.customer.rejectEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="顾客订单上限"
              name="order.customer.customerMaxNum"
              tooltip="今日累计完成顾客订单达到此数量后停止完成，且不再为顾客订单种植花卉（1-9999）"
              v-if="config.order.customer.enabled"
            >
              <CustomInputNumber
                v-model:value="config.order.customer.customerMaxNum"
                :min="1"
                :max="9999"
              />
            </CustomFormItem>

            <Divider orientation="left">宫廷订单</Divider>
            <CustomFormItem label="自动完成" name="order.palace.enabled">
              <Switch v-model:checked="config.order.palace.enabled" />
            </CustomFormItem>
            <CustomFormItem
              label="品质限定"
              name="order.palace.qualities"
              tooltip="仅接受指定品质的宫廷订单，不符合时自动免费刷新一次（每天限1次），刷新后仍不符合则跳过"
              v-if="config.order.palace.enabled"
            >
              <CustomSelect
                v-model:value="config.order.palace.qualities"
                mode="multiple"
                :options="flowerQualityOptions"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              label="不论品质"
              name="order.palace.ignoreQuality"
              tooltip="开启后，若没有用户设置的品质，且没有免费刷新了，则会无视品质做完这个宫廷订单"
              v-if="config.order.palace.enabled"
            >
              <Switch v-model:checked="palaceIgnoreQuality" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.order.palace.enabled"
              label="持续勾玉刷新"
              name="order.palace.diamondRefresh"
              tooltip="开启后，品质不符合时先使用免费刷新；免费次数耗尽后继续消耗勾玉刷新，直到出现已选品质"
            >
              <Switch
                :checked="palaceDiamondRefresh"
                @change="
                  (checked) => handleDiamondCostSwitchChange('order.palace.diamondRefresh', checked)
                "
                checked-children="已开启"
                un-checked-children="已关闭"
              />
            </CustomFormItem>
            <Alert
              v-if="config.order.palace.enabled && config.order.palace.diamondRefresh"
              type="warning"
              show-icon
              message="已开启持续勾玉刷新"
              description="免费刷新次数耗尽后仍会持续消耗勾玉，直到刷出符合品质限定的宫廷订单；开启后将自动关闭“不论品质”。"
              class="mb-6"
            />

            <Divider orientation="left">组团订单</Divider>
            <CustomFormItem label="自动完成" name="order.team.enabled" tooltip="自动完成团单">
              <Switch v-model:checked="config.order.team.enabled" />
            </CustomFormItem>
            <template v-if="config.order.team.enabled">
              <CustomFormItem label="再来一单" name="order.team.oneMore" tooltip="花费勾玉再来一单">
                <Switch
                  :checked="config.order.team.oneMore"
                  @change="
                    (checked) => handleDiamondCostSwitchChange('order.team.oneMore', checked)
                  "
                />
              </CustomFormItem>
              <CustomFormItem
                label="仅已培育"
                name="order.team.submitOnlyCultivatedFlowers"
                tooltip="仅提交已培育的水果"
              >
                <Switch v-model:checked="config.order.team.submitOnlyCultivatedFlowers" />
              </CustomFormItem>
              <CustomFormItem
                label="保留库存"
                name="order.team.reserveStock"
                tooltip="每种花提交团单后至少保留的库存；库存不足以同时支付订单消耗并满足保留数量时将刷新订单，填0则不额外保留"
              >
                <CustomInputNumber
                  v-model:value="config.order.team.reserveStock"
                  :min="0"
                  :max="9999999"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="团单模式"
                name="order.team.teamMode"
                tooltip="品质限定：只提交指定品质的水果；排除水果：碰到排除的水果就刷新，其余水果均可提交"
              >
                <Radio.Group v-model:value="config.order.team.teamMode">
                  <Space>
                    <Radio value="quality">品质限定</Radio>
                    <Radio value="exclude">排除水果</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <!-- 品质限定模式 -->
              <CustomFormItem
                label="选择品质"
                name="order.team.qualities"
                tooltip="仅提交指定品质的水果到团单"
                v-if="config.order.team.teamMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.order.team.qualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <!-- 排除水果模式 -->
              <CustomFormItem
                label="排除水果"
                name="order.team.excludeFlowerIds"
                tooltip="请选择排除的水果，团单碰到排除的水果就会跳过（刷新）"
                v-if="config.order.team.teamMode === 'exclude'"
              >
                <CustomSelect
                  v-model:value="config.order.team.excludeFlowerIds"
                  mode="multiple"
                  placeholder="请选择排除的水果"
                  :options="getFlowerPickerOptions(config.order.team.excludeFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
            </template>
          </div>
          <!-- 公会配置 -->
          <div v-if="activeTab === '公会'" class="config-section">
            <Divider orientation="left">公会土地</Divider>
            <CustomFormItem label="自动收获" name="union.land.harvest">
              <Switch v-model:checked="config.union.land.harvest" />
            </CustomFormItem>
            <CustomFormItem
              label="自动种植"
              name="union.land.autoPlant"
              tooltip="自动种植空闲土地，自动将不符合限定条件的已种土地替换为目标水果"
            >
              <Switch v-model:checked="config.union.land.autoPlant" />
            </CustomFormItem>
            <template v-if="config.union.land.autoPlant">
              <CustomFormItem
                label="种植策略"
                name="union.land.plantMode"
                tooltip="三种模式均为低等级优先"
              >
                <Radio.Group v-model:value="config.union.land.plantMode">
                  <Space direction="vertical">
                    <Radio value="quality">指定品质</Radio>
                    <Radio value="specific">指定水果</Radio>
                    <Radio value="lowStock">库存模式</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="指定品质"
                name="union.land.flowers"
                tooltip="留空则不限制品质"
                v-if="config.union.land.plantMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.union.land.flowers"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="指定水果"
                name="union.land.specificFlowerIds"
                tooltip="会种植指定的水果"
                v-if="config.union.land.plantMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.union.land.specificFlowerIds"
                  mode="multiple"
                  placeholder="请选择水果"
                  :options="getFlowerPickerOptions(config.union.land.specificFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="最低库存"
                name="union.land.lowStockThreshold"
                tooltip="比如设置了500，那么就种植库存不足500的花，无视限制水果等级，所有花库存都有500了就不会种植了，请注意设置"
                v-if="config.union.land.plantMode === 'lowStock'"
              >
                <CustomInputNumber
                  v-model:value="config.union.land.lowStockThreshold"
                  :min="1"
                  :max="9999999"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="最高等级限制"
                name="union.land.maxFlowerLevel"
                tooltip="水果等级高于该值的不种，0表示不限制，比如设置了13，就会种植低于13级且为你所有花里最低等级的花"
                v-if="config.union.land.plantMode === 'quality'"
              >
                <CustomInputNumber
                  v-model:value="config.union.land.maxFlowerLevel"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">公会建设</Divider>
            <CustomFormItem
              label="视频建设"
              name="union.build.free"
              tooltip="自动观看视频进行公会建设"
            >
              <Switch v-model:checked="config.union.build.free" />
            </CustomFormItem>
            <CustomFormItem
              label="金币建设"
              name="union.build.gld"
              tooltip="自动花费金币进行公会建设"
            >
              <Switch v-model:checked="config.union.build.gld" />
            </CustomFormItem>
            <CustomFormItem
              label="勾玉建设"
              name="union.build.dmd"
              tooltip="自动花费勾玉进行公会建设"
            >
              <Switch
                :checked="config.union.build.dmd"
                @change="(checked) => handleDiamondCostSwitchChange('union.build.dmd', checked)"
              />
            </CustomFormItem>

            <Divider orientation="left">公会分享</Divider>
            <CustomFormItem
              label="自动分享"
              name="union.flower.share"
              tooltip="自动分享花到公会分享栏"
            >
              <Switch v-model:checked="config.union.flower.share" />
            </CustomFormItem>
            <template v-if="config.union.flower.share">
              <CustomFormItem
                label="分享模式"
                name="union.flower.shareMode"
                tooltip="选择分享模式：品质模式或指定花模式"
              >
                <Radio.Group v-model:value="config.union.flower.shareMode">
                  <Space>
                    <Radio value="quality">指定品质</Radio>
                    <Radio value="specific">指定水果</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="品质限定"
                name="union.flower.shareQualities"
                tooltip="限定要分享到公会的水果品质"
                v-if="config.union.flower.shareMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.union.flower.shareQualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="指定水果"
                name="union.flower.shareFlowerIds"
                tooltip="选择要分享到公会的具体水果"
                v-if="config.union.flower.shareMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.union.flower.shareFlowerIds"
                  mode="multiple"
                  placeholder="选择要分享的水果"
                  :options="getFlowerPickerOptions(config.union.flower.shareFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">公会摸花</Divider>
            <CustomFormItem
              label="自动摸花"
              name="union.flower.take"
              tooltip="自动摸取别人分享的花"
            >
              <Switch v-model:checked="config.union.flower.take" />
            </CustomFormItem>
            <template v-if="config.union.flower.take">
              <CustomFormItem
                label="摸花模式"
                name="union.flower.takeMode"
                tooltip="选择摸花模式：品质模式或指定花模式"
              >
                <Radio.Group v-model:value="config.union.flower.takeMode">
                  <Space>
                    <Radio value="quality">指定品质</Radio>
                    <Radio value="specific">指定水果</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="品质限定"
                name="union.flower.takeQualities"
                tooltip="限定要从公会拿取的水果品质"
                v-if="config.union.flower.takeMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.union.flower.takeQualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="指定水果"
                name="union.flower.takeFlowerIds"
                tooltip="选择要从公会摸取的具体水果"
                v-if="config.union.flower.takeMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.union.flower.takeFlowerIds"
                  mode="multiple"
                  placeholder="选择要摸取的水果"
                  :options="getFlowerPickerOptions(config.union.flower.takeFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">公会竞赛</Divider>
            <div class="preset-button-container mb-4">
              <a-button type="primary" @click="openFmlRaceQuickSetup">快速设置</a-button>
            </div>
            <CustomFormItem
              label="自动完成"
              name="union.fmlRace.enabled"
              tooltip="自动领取，完成公会竞赛任务"
            >
              <Switch v-model:checked="config.union.fmlRace.enabled" />
            </CustomFormItem>
            <CustomFormItem
              label="自动启用模块"
              name="union.fmlRace.autoEnableModules"
              tooltip="根据任务类型自动启用相关模块，任务完成后自动恢复原始配置"
            >
              <Switch v-model:checked="config.union.fmlRace.autoEnableModules" />
            </CustomFormItem>
            <CustomFormItem
              label="种植任务用加速卡"
              name="union.fmlRace.useSpeedUpTicketInTask"
              tooltip="公会竞赛种植任务期间临时开启加速卡，忽略加速卡上限（任务结束后自动恢复原始配置）"
            >
              <Switch v-model:checked="config.union.fmlRace.useSpeedUpTicketInTask" />
            </CustomFormItem>
            <Divider orientation="left" :orientation-margin="0">接取规则</Divider>
            <p class="fml-race-rule-help">
              只接取最低分 ≤ 任务分数 ≤ 最高分的任务；未开启的类型不接取。
            </p>
            <CustomFormItem
              v-for="rule in fmlRaceAcceptRuleOptions"
              :key="rule.key"
              :label="rule.label"
              :name="`union.fmlRace.acceptRules.${rule.key}`"
              class="fml-race-accept-rule-item"
              :validate-status="getFmlRaceScoreRangeError(config.union.fmlRace.acceptRules[rule.key]) ? 'error' : undefined"
              :help="getFmlRaceScoreRangeError(config.union.fmlRace.acceptRules[rule.key]) || undefined"
            >
              <div class="fml-race-accept-rule-controls">
                <Switch v-model:checked="config.union.fmlRace.acceptRules[rule.key].enabled" />
                <label class="fml-race-score-field">
                  <span>最低分</span>
                <CustomInputNumber
                  v-model:value="config.union.fmlRace.acceptRules[rule.key].minScore"
                  :disabled="!config.union.fmlRace.acceptRules[rule.key].enabled"
                  :min="1"
                  :max="99"
                  :precision="0"
                  :aria-label="`${rule.label}最低分数`"
                  class="fml-race-rule-score"
                />
                </label>
                <span class="fml-race-range-separator" aria-hidden="true">—</span>
                <label class="fml-race-score-field">
                  <span>最高分</span>
                  <CustomInputNumber
                    v-model:value="config.union.fmlRace.acceptRules[rule.key].maxScore"
                    :disabled="!config.union.fmlRace.acceptRules[rule.key].enabled"
                    :min="1"
                    :max="99"
                    :precision="0"
                    :aria-label="`${rule.label}最高分数`"
                    class="fml-race-rule-score"
                  />
                </label>
              </div>
            </CustomFormItem>
            <CustomFormItem
              v-if="config.union.fmlRace.acceptRules.otherUpgrade.enabled"
              label="他人升级任务成员"
              name="union.fmlRace.acceptRules.otherUpgrade.memberMode"
            >
              <Radio.Group v-model:value="config.union.fmlRace.acceptRules.otherUpgrade.memberMode">
                <Space>
                  <Radio value="all">全部成员</Radio>
                  <Radio value="specified">指定成员</Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              v-if="showSpecifiedUpgradeMembers"
              label="指定成员名称"
              name="union.fmlRace.specifiedUpgradePlayers"
              tooltip="可填写多个成员名称，按回车添加下一个；只接这些成员升级的任务"
            >
              <CustomSelect
                v-model:value="config.union.fmlRace.specifiedUpgradePlayers"
                mode="tags"
                placeholder="输入成员名称后按回车"
                :token-separators="[',', '，']"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              v-if="showSpecifiedUpgradeMembers"
              label="公会玩家"
              tooltip="点一下读取公会所有玩家名字，支持输入名字搜索；选择名字后会自动添加到指定成员里"
            >
              <div class="w-full max-w-[480px] flex flex-col gap-2">
                <a-button
                  :loading="guildMembersLoading"
                  :disabled="guildMembersLoading"
                  @click="fetchGuildMemberNames"
                >
                  读取公会所有玩家名字
                </a-button>
                <Select
                  v-if="guildMemberOptions.length"
                  v-model:value="selectedGuildMember"
                  :options="guildMemberOptions"
                  placeholder="输入玩家名搜索，选择后自动添加"
                  show-search
                  allow-clear
                  :filter-option="filterGuildMemberOption"
                  @select="addSpecifiedUpgradePlayer"
                />
              </div>
            </CustomFormItem>
            <CustomFormItem
              label="完成已接任务"
              name="union.fmlRace.completeTakenTask"
              tooltip="开启后会完成已接取的任务，不判断优先级和分数；目标水果未培育或指定果艺无法制作时，会先输出事件再放弃。果艺缺少的水果已培育时，会安排补种。"
            >
              <Switch v-model:checked="config.union.fmlRace.completeTakenTask" />
              <p class="fml-race-taken-task-help">
                开启后会完成已接取的任务，不判断优先级和分数；未培育所需水果、无法完成时会放弃。
              </p>
            </CustomFormItem>
            <CustomFormItem
              label="避开有进度任务"
              name="union.fmlRace.avoidProgressTask"
              tooltip="开启后，只要任务已有进度（别人做了一半后放弃的任务），即使满足其他接取条件也不会接取。"
            >
              <Switch v-model:checked="config.union.fmlRace.avoidProgressTask" />
            </CustomFormItem>
            <CustomFormItem
              label="接指定水果"
              name="union.fmlRace.harvestTaskFlowerFilterEnabled"
              tooltip="开启后，只接指定水果的种植收获任务；仍须满足对应接取规则的开关、分数区间和任务优先级。"
            >
              <Switch v-model:checked="config.union.fmlRace.harvestTaskFlowerFilterEnabled" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.union.fmlRace.harvestTaskFlowerFilterEnabled"
              label="指定水果"
              name="union.fmlRace.harvestTaskFlowerIds"
            >
              <CustomSelect
                v-model:value="config.union.fmlRace.harvestTaskFlowerIds"
                mode="multiple"
                placeholder="请选择水果"
                :options="getFlowerPickerOptions(config.union.fmlRace.harvestTaskFlowerIds)"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              label="任务优先级"
              name="union.fmlRace.taskTypePriority"
              tooltip="设置每种任务类型的接取优先级。数字越小越优先；填 0 表示不接此类任务。优先级相同时分数高优先。"
            >
              <div class="w-full max-w-[420px] flex flex-col gap-2">
                <div
                  v-for="item in fmlRaceTaskTypes"
                  :key="item.key"
                  class="flex items-center justify-between gap-2"
                >
                  <span class="text-sm min-w-[100px]">{{ item.label }}</span>
                  <CustomInputNumber
                    v-model:value="config.union.fmlRace.taskTypePriority[item.key]"
                    :min="0"
                    :max="99"
                    class="w-20!"
                  />
                </div>
              </div>
            </CustomFormItem>
            <CustomFormItem
              label="自动升级任务"
              name="union.fmlRace.upgradeTask"
              tooltip="领取任务后花费勾玉自动升级。"
            >
              <Switch
                :checked="config.union.fmlRace.upgradeTask"
                @change="
                  (checked) => handleDiamondCostSwitchChange('union.fmlRace.upgradeTask', checked)
                "
              />
            </CustomFormItem>
            <CustomFormItem
              label="删除低分任务"
              name="union.fmlRace.deleteTask"
              tooltip="会长/副会长专属：自动删除低于指定分数的任务"
            >
              <Switch v-model:checked="config.union.fmlRace.deleteTask" />
            </CustomFormItem>
            <CustomFormItem
              label="删除分数上限"
              name="union.fmlRace.deleteTaskMaxScore"
              tooltip="低于此分数的未领取任务将被自动删除"
              v-if="config.union.fmlRace.deleteTask"
            >
              <CustomInputNumber
                v-model:value="config.union.fmlRace.deleteTaskMaxScore"
                :min="0"
                :max="60"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="保留原金"
              name="union.fmlRace.keepSystemUpgrade"
              tooltip="开启后会保留系统自动出的原金任务，不判断分数"
              v-if="config.union.fmlRace.deleteTask"
            >
              <Switch v-model:checked="config.union.fmlRace.keepSystemUpgrade" />
            </CustomFormItem>
            <CustomFormItem
              label="保留已升级"
              name="union.fmlRace.keepPlayerUpgrade"
              tooltip="开启后会保留玩家用勾玉升级过的任务，不判断分数"
              v-if="config.union.fmlRace.deleteTask"
            >
              <Switch v-model:checked="config.union.fmlRace.keepPlayerUpgrade" />
            </CustomFormItem>
            <CustomFormItem
              label="多少分钟无人认领删除"
              name="union.fmlRace.deleteUnclaimedTask"
              tooltip="会根据设置删除多少分钟内无人领取的任务，不判断分数。保留原金、保留已升级开启则这两种就不删除，删除其他的。"
              v-if="config.union.fmlRace.deleteTask"
            >
              <Switch v-model:checked="config.union.fmlRace.deleteUnclaimedTask" />
            </CustomFormItem>
            <CustomFormItem
              label="分钟"
              name="union.fmlRace.deleteUnclaimedMinutes"
              v-if="config.union.fmlRace.deleteTask && config.union.fmlRace.deleteUnclaimedTask"
            >
              <CustomInputNumber
                v-model:value="config.union.fmlRace.deleteUnclaimedMinutes"
                :min="1"
                :max="999"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="小号专属"
              name="union.fmlRace.smallAccountExclusiveEnabled"
              tooltip="本功能为小号专用，会消耗勾玉。新接取任务仍需满足上方四类接取规则，再按下方条件刷新或升级后放弃；开启“完成已接任务”时会优先完成当前任务，不按小号模式放弃。"
            >
              <Switch
                :checked="config.union.fmlRace.smallAccountExclusiveEnabled"
                @change="handleSmallAccountExclusiveChange"
              />
            </CustomFormItem>
            <template v-if="config.union.fmlRace.smallAccountExclusiveEnabled">
              <CustomFormItem
                label="勾玉升级任务"
                name="union.fmlRace.onlyDiamondUpgradeTask"
                tooltip="付费模式：仍需满足上方四类接取规则，再按升级最低积分及任务优先级判断；执行勾玉升级后放弃。可与勾玉刷新同时开启；开启“完成已接任务”时优先完成当前任务。"
              >
                <Switch
                  :checked="config.union.fmlRace.onlyDiamondUpgradeTask"
                  @change="
                    (checked) =>
                      handleDiamondCostSwitchChange('union.fmlRace.onlyDiamondUpgradeTask', checked)
                  "
                />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.union.fmlRace.onlyDiamondUpgradeTask"
                label="升级最低积分"
                name="union.fmlRace.minDiamondUpgradeScore"
                tooltip="只升级达到该分数且任务优先级大于等于1的任务，默认24，范围1-99。"
              >
                <CustomInputNumber
                  v-model:value="config.union.fmlRace.minDiamondUpgradeScore"
                  :min="1"
                  :max="99"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="勾玉刷新任务"
                name="union.fmlRace.diamondRefreshTask"
                tooltip="付费模式：仍需满足上方四类接取规则，再接取积分小于等于低分阈值的任务进行刷新，达到目标后放弃；同时开启勾玉升级且达到条件时才升级。开启“完成已接任务”时优先完成当前任务。"
              >
                <Switch
                  :checked="config.union.fmlRace.diamondRefreshTask"
                  @change="
                    (checked) =>
                      handleDiamondCostSwitchChange('union.fmlRace.diamondRefreshTask', checked)
                  "
                />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.union.fmlRace.diamondRefreshTask"
                label="接取低分阈值"
                name="union.fmlRace.diamondRefreshBelowScore"
                tooltip="仅接取积分小于等于该分数的未升级任务进行勾玉刷新，默认14，范围1-99。"
              >
                <CustomInputNumber
                  v-model:value="config.union.fmlRace.diamondRefreshBelowScore"
                  :min="1"
                  :max="99"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.union.fmlRace.diamondRefreshTask"
                label="刷新目标积分"
                name="union.fmlRace.diamondRefreshTargetScore"
                tooltip="刷新达到该分数后停止并放弃；若同时开启勾玉升级任务，只有达到独立升级最低分且优先级大于等于1时才升级。默认24，范围1-99。"
              >
                <CustomInputNumber
                  v-model:value="config.union.fmlRace.diamondRefreshTargetScore"
                  :min="1"
                  :max="99"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="种植收获细化"
                name="union.fmlRace.harvestUpgradeRefine"
                tooltip="仅约束勾玉升级条件：种植收获任务只有包含指定水果、达到升级最低积分且优先级大于等于1时才升级；不影响独立的刷新目标判断。"
              >
                <Switch v-model:checked="config.union.fmlRace.harvestUpgradeRefine" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.union.fmlRace.harvestUpgradeRefine"
                label="指定水果"
                name="union.fmlRace.harvestUpgradeFlowerIds"
                tooltip="未选择水果时，不会升级任何种植收获任务。"
              >
                <CustomSelect
                  v-model:value="config.union.fmlRace.harvestUpgradeFlowerIds"
                  mode="multiple"
                  show-search
                  option-filter-prop="label"
                  :options="getFlowerPickerOptions(config.union.fmlRace.harvestUpgradeFlowerIds)"
                  class="w-full sm:w-80"
                  placeholder="请选择指定水果"
                />
              </CustomFormItem>
              <CustomFormItem
                label="保留勾玉"
                name="union.fmlRace.diamondUpgradeReserve"
                tooltip="刷新和升级共用该保留值，任一步操作后勾玉低于此值都将停止；填0则不保留。"
              >
                <CustomInputNumber
                  v-model:value="config.union.fmlRace.diamondUpgradeReserve"
                  :min="0"
                  :max="9999999"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>
            <Divider orientation="left">公会竞赛积分兑换</Divider>
            <CustomFormItem
              label="自动领取"
              name="union.redPacket.enabled"
              tooltip="开启后会自动领取公会竞赛奖励，并且兑换材料，不想自动领取的勿开"
            >
              <Switch v-model:checked="config.union.redPacket.enabled" />
            </CustomFormItem>

            <Divider orientation="left">能量森林</Divider>
            <CustomFormItem label="自动收集能量" name="union.fmlForest.enabled">
              <Switch v-model:checked="config.union.fmlForest.enabled" />
            </CustomFormItem>
          </div>

          <!-- 活动设置：仅保留奇幻果园卡册奖励入口。 -->
          <div v-if="activeTab === '活动'" class="config-section">
            <Divider orientation="left">卡册活动</Divider>
            <CustomFormItem
              label="领取卡册任务奖励"
              name="activity.actCardCollect.enabledCardCollect"
              tooltip="领取已完成的卡册任务奖励和已达标的进度奖励，不自动开卡包。"
            >
              <Switch v-model:checked="config.activity.actCardCollect.enabledCardCollect" />
            </CustomFormItem>
          </div>
        </Form>
      </div>
    </div>

    <Modal
      :open="fmlRaceQuickSetupVisible"
      :title="fmlRaceQuickSetupTitle"
      :confirm-loading="fmlRaceQuickSetupSaving"
      okText="确认"
      cancelText="取消"
      centered
      :mask-closable="false"
      @ok="handleFmlRaceQuickSetupConfirm"
      @cancel="cancelFmlRaceQuickSetup"
    >
      <div v-if="fmlRaceQuickSetupStep === 1" class="fml-race-quick-setup">
        <p class="fml-race-rule-help">只接已开启且分数位于最低分至最高分之间的任务（含上下限）。</p>
        <div
          v-for="rule in fmlRaceAcceptRuleOptions"
          :key="rule.key"
          class="fml-race-quick-setup-field"
        >
          <span>{{ rule.label }}</span>
          <div class="fml-race-accept-rule-controls">
            <Switch v-model:checked="fmlRaceQuickSetupRules[rule.key].enabled" />
            <label class="fml-race-score-field">
              <span>最低分</span>
            <CustomInputNumber
              v-model:value="fmlRaceQuickSetupRules[rule.key].minScore"
              :disabled="!fmlRaceQuickSetupRules[rule.key].enabled"
              :min="1"
              :max="99"
              :precision="0"
              :aria-label="`${rule.label}最低分数`"
              class="fml-race-rule-score"
            />
            </label>
            <span class="fml-race-range-separator" aria-hidden="true">—</span>
            <label class="fml-race-score-field">
              <span>最高分</span>
              <CustomInputNumber
                v-model:value="fmlRaceQuickSetupRules[rule.key].maxScore"
                :disabled="!fmlRaceQuickSetupRules[rule.key].enabled"
                :min="1"
                :max="99"
                :precision="0"
                :aria-label="`${rule.label}最高分数`"
                class="fml-race-rule-score"
              />
            </label>
          </div>
        </div>
        <p v-if="validateFmlRaceScoreRanges(fmlRaceQuickSetupRules)" class="fml-race-range-error" role="alert">
          {{ validateFmlRaceScoreRanges(fmlRaceQuickSetupRules) }}
        </p>
        <template v-if="fmlRaceQuickSetupRules.otherUpgrade.enabled">
          <Radio.Group v-model:value="fmlRaceQuickSetupRules.otherUpgrade.memberMode">
            <Space>
              <Radio value="all">全部成员</Radio>
              <Radio value="specified">指定成员</Radio>
            </Space>
          </Radio.Group>
          <CustomSelect
            v-if="fmlRaceQuickSetupRules.otherUpgrade.memberMode === 'specified'"
            v-model:value="fmlRaceQuickSetupMembers"
            mode="tags"
            placeholder="输入成员名称后按回车"
            :token-separators="[',', '，']"
            style="width: 100%"
          />
        </template>
      </div>
      <div v-else class="fml-race-quick-setup">
        <div class="fml-race-quick-setup-question">是否使用勾玉升级</div>
        <Radio.Group v-model:value="fmlRaceQuickSetupUseDiamondUpgrade">
          <Space>
            <Radio :value="true">是</Radio>
            <Radio :value="false">否</Radio>
          </Space>
        </Radio.Group>
        <Alert type="warning" show-icon message="注意！开启此项会消耗勾玉" />
      </div>
    </Modal>

    <Modal
      v-model:open="importConfigModalVisible"
      title="导入配置"
      :confirm-loading="importConfigLoading"
      okText="确定"
      cancelText="取消"
      centered
      @ok="importConfigFromSelectedAccount"
    >
      <div class="import-config-modal">
        <p>从哪个账号复制配置过来？</p>
        <p class="import-config-warning">当前配置将被覆盖，操作不可撤销。</p>
        <Select
          v-model:value="importSourceAccountId"
          class="w-full"
          placeholder="请选择账号"
          :options="importAccountOptions"
          :loading="importAccountListLoading"
          show-search
          :filter-option="filterImportAccountOption"
        />
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Form,
  Input,
  Switch,
  Divider,
  Alert,
  message,
  Select,
  Radio,
  Checkbox,
  Space,
  Modal,
} from 'ant-design-vue'
import axios from '../utils/axios'
import TopNavBar from '../components/TopNavBar.vue'
import CustomFormItem from '../components/CustomFormItem.vue'
import CustomSelect from '../components/CustomSelect.vue'
import CustomInputNumber from '../components/CustomInputNumber.vue'
import { createDefaultGameConfig } from './game-config/defaultConfig'
import {
  defaultFmlRaceTaskTypePriority,
  elfOptions,
  flowerArtOptions,
  flowerCountOptions,
  flowerQualityOptions,
  getFlowerPickerOptions,
  getSpecifiedArtsFullPickerOptions,
  fmlRaceTaskTypes,
  landGroupSizeOptions,
  tabs,
} from './game-config/options'
import { floralShopAllOptions } from './game-config/shopItem6Options'
import { deepMerge } from './game-config/utils'
import {
  migrateLegacyFloralShopCatalog,
  migrateLegacyFmlRaceTaskPriority,
  normalizeGameConfigSelects,
} from './game-config/normalizeConfigSelects'
import type { GameConfig } from './game-config/types'
import {
  createDefaultFmlRaceAcceptRules,
  fmlRaceAcceptRuleOptions,
  normalizeFmlRaceAcceptRules,
  getFmlRaceScoreRangeError,
  validateFmlRaceScoreRanges,
} from './game-config/fmlRaceAcceptRules'

// 路由相关
const route = useRoute()
const router = useRouter()

// 从路由参数获取数据
const accountId = computed(() => Number(route.params.accountId))

const loading = ref(false)
const importConfigLoading = ref(false)
const importConfigModalVisible = ref(false)
const importAccountListLoading = ref(false)
const importSourceAccountId = ref<number | undefined>()
const importAccountOptions = ref<Array<{ value: number; label: string }>>([])
const guildMembersLoading = ref(false)
const guildMemberOptions = ref<Array<{ value: string; label: string }>>([])
const selectedGuildMember = ref<string | undefined>()
const activeTab = ref('基础')
const formRef = ref()
const fmlRaceQuickSetupVisible = ref(false)
const fmlRaceQuickSetupSaving = ref(false)
const fmlRaceQuickSetupStep = ref<1 | 2>(1)
const fmlRaceQuickSetupRules = ref(createDefaultFmlRaceAcceptRules())
const fmlRaceQuickSetupMembers = ref<string[]>([])
const fmlRaceQuickSetupUseDiamondUpgrade = ref(true)
const fmlRaceQuickSetupTitle = computed(() => {
  if (fmlRaceQuickSetupStep.value === 1) return '接取规则'
  return '使用勾玉升级任务'
})

// 表单验证规则
const formRules = {
  reconnectInterval: [{ required: true, message: '请输入重连间隔' }],
  nickName: [{ required: true, message: '请输入角色昵称' }],
}

const config = ref<GameConfig>(createDefaultGameConfig())
normalizeGameConfigSelects(config.value)

const handleCultivateEnabledChange = (enabled: boolean) => {
  config.value.plant.cultivate.autoHarvestEnabled = enabled
}

const palaceIgnoreQuality = computed({
  get: () => config.value.order.palace.ignoreQuality,
  set: (enabled: boolean) => {
    config.value.order.palace.ignoreQuality = enabled
    if (enabled) config.value.order.palace.diamondRefresh = false
  },
})

const palaceDiamondRefresh = computed({
  get: () => config.value.order.palace.diamondRefresh,
  set: (enabled: boolean) => {
    config.value.order.palace.diamondRefresh = enabled
    if (enabled) config.value.order.palace.ignoreQuality = false
  },
})

const DIAMOND_COST_WARNING = '开启此项会消耗勾玉，请谨慎开启，谢谢'

type DiamondCostSwitchPath =
  | 'basic.pearl.autoBuyHireTicket'
  | 'plant.elves.speedUpDispatch'
  | 'plant.market.autoBuyPutCount'
  | 'order.palace.diamondRefresh'
  | 'order.team.oneMore'
  | 'union.build.dmd'
  | 'union.fmlRace.upgradeTask'
  | 'union.fmlRace.onlyDiamondUpgradeTask'
  | 'union.fmlRace.diamondRefreshTask'

const applyDiamondCostSwitchValue = (path: DiamondCostSwitchPath, enabled: boolean) => {
  if (path === 'order.palace.diamondRefresh') {
    palaceDiamondRefresh.value = enabled
    return
  }

  const keys = path.split('.')
  let target = config.value as unknown as Record<string, any>
  for (let index = 0; index < keys.length - 1; index += 1) {
    target = target[keys[index]] as Record<string, any>
  }
  target[keys[keys.length - 1]] = enabled
}

const handleDiamondCostSwitchChange = (path: DiamondCostSwitchPath, enabled: boolean) => {
  if (!enabled) {
    applyDiamondCostSwitchValue(path, false)
    return
  }

  Modal.confirm({
    title: '开启确认',
    content: DIAMOND_COST_WARNING,
    okText: '确认开启',
    cancelText: '取消',
    centered: true,
    onOk() {
      applyDiamondCostSwitchValue(path, true)
    },
  })
}

const handleCustomerFloralCoinEnabledChange = (enabled: boolean) => {
  if (!enabled) {
    config.value.order.customer.floralCoinEnabled = false
    return
  }

  Modal.confirm({
    title: '注意！',
    content: '开启此项可能造成每天做的顾客订单偏少，请谨慎开启',
    okText: '确认开启',
    cancelText: '取消',
    centered: true,
    onOk() {
      config.value.order.customer.floralCoinEnabled = true
    },
  })
}

const handleSmallAccountExclusiveChange = (enabled: boolean) => {
  const fmlRace = config.value.union.fmlRace
  fmlRace.smallAccountExclusiveEnabled = enabled
  if (!enabled) {
    fmlRace.onlyDiamondUpgradeTask = false
    fmlRace.diamondRefreshTask = false
  }
}

const resetFmlRaceQuickSetup = () => {
  fmlRaceQuickSetupStep.value = 1
  fmlRaceQuickSetupRules.value = createDefaultFmlRaceAcceptRules()
  fmlRaceQuickSetupMembers.value = [...config.value.union.fmlRace.specifiedUpgradePlayers]
  fmlRaceQuickSetupUseDiamondUpgrade.value = true
}

const openFmlRaceQuickSetup = () => {
  resetFmlRaceQuickSetup()
  fmlRaceQuickSetupVisible.value = true
}

const cancelFmlRaceQuickSetup = () => {
  if (fmlRaceQuickSetupSaving.value) return
  fmlRaceQuickSetupVisible.value = false
  resetFmlRaceQuickSetup()
}

const applyFmlRaceQuickSetup = async () => {
  const fmlRace = config.value.union.fmlRace

  fmlRace.enabled = true
  fmlRace.autoEnableModules = true
  fmlRace.useSpeedUpTicketInTask = true
  fmlRace.acceptRules = normalizeFmlRaceAcceptRules(fmlRaceQuickSetupRules.value)
  fmlRace.specifiedUpgradePlayers = [...fmlRaceQuickSetupMembers.value]
  fmlRace.avoidProgressTask = true
  fmlRace.taskTypePriority = { ...defaultFmlRaceTaskTypePriority }
  fmlRace.upgradeTask = fmlRaceQuickSetupUseDiamondUpgrade.value

  const flower = config.value.plant.flower
  flower.harvestEnabled = true
  flower.plantEnabled = true
  flower.videoSpeedUp = true
  flower.waterThreshold = 1
  flower.taskMode = true
  flower.taskPriorityConfig['公会竞赛'] = 1

  fmlRaceQuickSetupVisible.value = false
  await saveConfig()
  resetFmlRaceQuickSetup()
}

const handleFmlRaceQuickSetupConfirm = async () => {
  const rangeError = validateFmlRaceScoreRanges(fmlRaceQuickSetupRules.value)
  if (rangeError) {
    message.warning(rangeError)
    return
  }
  if (fmlRaceQuickSetupStep.value === 1) {
    if (!Object.values(fmlRaceQuickSetupRules.value).some((rule) => rule.enabled)) {
      message.warning('请至少开启一种需要接取的任务类型')
      return
    }
    const other = fmlRaceQuickSetupRules.value.otherUpgrade
    if (
      other.enabled && other.memberMode === 'specified' &&
      !fmlRaceQuickSetupMembers.value.some((name) => name.trim())
    ) {
      message.warning('请填写指定成员名称，或选择全部成员')
      return
    }
    fmlRaceQuickSetupStep.value = 2
    return
  }

  fmlRaceQuickSetupSaving.value = true
  try {
    await applyFmlRaceQuickSetup()
  } finally {
    fmlRaceQuickSetupSaving.value = false
  }
}

const showSpecifiedUpgradeMembers = computed(() =>
  config.value.union.fmlRace.acceptRules.otherUpgrade.enabled &&
  config.value.union.fmlRace.acceptRules.otherUpgrade.memberMode === 'specified',
)

const getGuildMemberName = (member: unknown): string => {
  if (typeof member === 'string') return member.trim()
  if (!member || typeof member !== 'object') return ''

  const data = member as Record<string, unknown>
  const nameKeys = [
    'nickName',
    'nickname',
    'name',
    'playerName',
    'memberName',
    'roleName',
    'userName',
    'username',
    'nick',
    'displayName',
  ]
  for (const key of nameKeys) {
    if (typeof data[key] === 'string' && data[key].trim()) return data[key].trim()
  }

  const nestedKeys = ['player', 'member', 'user', 'profile']
  for (const key of nestedKeys) {
    const nestedName = getGuildMemberName(data[key])
    if (nestedName) return nestedName
  }
  return ''
}

const normalizeGuildMembers = (value: unknown): string[] => {
  let members: unknown[] = []
  if (Array.isArray(value)) {
    members = value
  } else if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>
    const nestedList =
      data.names ??
      data.members ??
      data.memberList ??
      data.list ??
      data.items ??
      data.results ??
      data.data
    members = Array.isArray(nestedList)
      ? nestedList
      : nestedList && typeof nestedList === 'object'
        ? Object.values(nestedList)
        : Object.values(data)
  }

  return Array.from(new Set(members.map(getGuildMemberName).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )
}

const fetchGuildMemberNames = async () => {
  if (!accountId.value) {
    message.error('缺少账号参数')
    return
  }

  guildMembersLoading.value = true
  guildMemberOptions.value = []
  selectedGuildMember.value = undefined
  try {
    const response = await axios.get(`/api/game-accounts/player_records?ids=${accountId.value}`)
    const results = response.data?.data?.results
    const records = Array.isArray(results) ? results : []
    const playerRecord =
      records.find((item: { id?: string | number }) => Number(item?.id) === accountId.value) ??
      records[0]
    const record = playerRecord?.record ?? playerRecord
    const names = normalizeGuildMembers(record?.fmlMembers)

    if (!names.length) {
      message.warning('未读取到公会成员名字，请确认账号已启动并加入公会')
      return
    }

    guildMemberOptions.value = names.map((name) => ({ value: name, label: name }))
    message.success(`已读取 ${names.length} 名公会玩家`)
  } catch (error) {
    console.error('读取公会玩家失败:', error)
    message.error('读取公会玩家失败，请稍后重试')
  } finally {
    guildMembersLoading.value = false
  }
}

const filterGuildMemberOption = (input: string, option?: { label?: string }) =>
  (option?.label ?? '').toLowerCase().includes(input.trim().toLowerCase())

const addSpecifiedUpgradePlayer = (name: string) => {
  const normalizedName = String(name || '').trim()
  selectedGuildMember.value = undefined
  if (!normalizedName) return

  const players = config.value.union.fmlRace.specifiedUpgradePlayers
  if (players.includes(normalizedName)) {
    message.info(`${normalizedName} 已在指定用户名中`)
    return
  }

  config.value.union.fmlRace.specifiedUpgradePlayers = [...players, normalizedName]
  message.success(`已添加 ${normalizedName}`)
}

const forceCollectHourOptions = Array.from({ length: 8 }, (_, i) => i + 16)
const forceCollectMinuteOptions = Array.from({ length: 60 }, (_, i) => i)

const residentOrderHourOptions = Array.from({ length: 24 }, (_, i) => i)
const residentOrderMinuteOptions = Array.from({ length: 60 }, (_, i) => i)

const parseResidentOrderTime = (time?: string) => {
  const [hRaw, mRaw] = (time || '00:00').split(':')
  let hour = Number(hRaw)
  let minute = Number(mRaw)
  if (!Number.isFinite(hour)) hour = 0
  if (!Number.isFinite(minute)) minute = 0
  return {
    hour: Math.min(23, Math.max(0, Math.floor(hour))),
    minute: Math.min(59, Math.max(0, Math.floor(minute))),
  }
}

const residentOrderStartHour = computed({
  get: () => parseResidentOrderTime(config.value.order.resident.startTime).hour,
  set: (hour: number) => {
    const { minute } = parseResidentOrderTime(config.value.order.resident.startTime)
    config.value.order.resident.startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  },
})

const residentOrderStartMinute = computed({
  get: () => parseResidentOrderTime(config.value.order.resident.startTime).minute,
  set: (minute: number) => {
    const { hour } = parseResidentOrderTime(config.value.order.resident.startTime)
    config.value.order.resident.startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  },
})

const residentOrderEndHour = computed({
  get: () => parseResidentOrderTime(config.value.order.resident.endTime).hour,
  set: (hour: number) => {
    const { minute } = parseResidentOrderTime(config.value.order.resident.endTime)
    config.value.order.resident.endTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  },
})

const residentOrderEndMinute = computed({
  get: () => parseResidentOrderTime(config.value.order.resident.endTime).minute,
  set: (minute: number) => {
    const { hour } = parseResidentOrderTime(config.value.order.resident.endTime)
    config.value.order.resident.endTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  },
})


const parseForceCollectTime = (time?: string) => {
  const [hRaw, mRaw] = (time || '23:30').split(':')
  let hour = Number(hRaw)
  let minute = Number(mRaw)
  if (!Number.isFinite(hour)) hour = 23
  if (!Number.isFinite(minute)) minute = 30
  hour = Math.min(23, Math.max(16, Math.floor(hour)))
  minute = Math.min(59, Math.max(0, Math.floor(minute)))
  return { hour, minute }
}

const forceCollectHour = computed({
  get: () => parseForceCollectTime(config.value.plant.water.forceCollectTime).hour,
  set: (hour: number) => {
    const { minute } = parseForceCollectTime(config.value.plant.water.forceCollectTime)
    config.value.plant.water.forceCollectTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  },
})

const forceCollectMinute = computed({
  get: () => parseForceCollectTime(config.value.plant.water.forceCollectTime).minute,
  set: (minute: number) => {
    const { hour } = parseForceCollectTime(config.value.plant.water.forceCollectTime)
    config.value.plant.water.forceCollectTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  },
})

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
        migrateLegacyFmlRaceTaskPriority(response.data.data)
        migrateLegacyFloralShopCatalog(response.data.data)
        const mergedConfig = deepMerge(createDefaultGameConfig(), response.data.data)
        normalizeGameConfigSelects(mergedConfig)
        config.value = mergedConfig
        console.log('✅ 配置加载成功')
      } else {
        console.log('⚠️ 未找到账号配置，使用默认配置')

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

// 配置提示弹窗（需点击确定后才能继续）
function showConfigNoticeModal(title: string, contentHtml: string, okText = '确定') {
  Modal.info({
    title,
    content: h('div', { innerHTML: contentHtml }),
    centered: true,
    okText,
  })
}

// 保存配置
const saveConfig = async () => {
  const rangeError = validateFmlRaceScoreRanges(config.value.union.fmlRace.acceptRules)
  if (rangeError) {
    message.warning(rangeError)
    return
  }
  loading.value = true
  try {
    console.log('🔄 开始保存配置:', {
      accountId: accountId.value,
      configSize: JSON.stringify(config.value).length,
    })

    normalizeGameConfigSelects(config.value)

    const response = await axios.put(`/api/game-accounts/${accountId.value}/setting`, config.value)

    console.log('📨 服务器响应:', response.data)

    if (response.data.success) {
      showConfigNoticeModal('配置保存成功', '请注意：保存配置后，需要先停止再启动才能生效。')
    } else {
      console.error('❌ 保存失败 - 服务器返回:', response.data)
      message.error(response.data.message || '保存失败')
    }
  } finally {
    loading.value = false
  }
}

const formatImportAccountLabel = (account: {
  id: number
  nickname?: string
  account_name?: string
  username?: string
  server_name?: string
  server_id?: string
}) => {
  const name = account.nickname || account.account_name || account.username || `账号${account.id}`
  const server = account.server_name || account.server_id
  return server ? `${name}（${server}）` : name
}

const fetchImportAccountOptions = async () => {
  importAccountListLoading.value = true
  try {
    const response = await axios.get('/api/game-accounts/list')

    if (!response.data?.success || !Array.isArray(response.data.data)) {
      message.error('获取账号列表失败')
      return
    }

    importAccountOptions.value = response.data.data
      .filter((account: { id?: number }) => account.id !== accountId.value)
      .map(
        (account: {
          id: number
          nickname?: string
          account_name?: string
          username?: string
          server_name?: string
          server_id?: string
        }) => ({
          value: account.id,
          label: formatImportAccountLabel(account),
        }),
      )
  } catch (error) {
    console.error('获取账号列表失败:', error)
    message.error('获取账号列表失败')
  } finally {
    importAccountListLoading.value = false
  }
}

const openImportConfigModal = () => {
  importSourceAccountId.value = undefined
  importConfigModalVisible.value = true
  fetchImportAccountOptions()
}

const filterImportAccountOption = (input: string, option?: { label?: string }) => {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

const openFreeStylePage = () => {
  router.push(`/game-config/${accountId.value}/free-style`)
}

const importConfigFromSelectedAccount = async () => {
  if (!importSourceAccountId.value) {
    message.warning('请选择要复制配置的账号')
    return Promise.reject()
  }

  importConfigLoading.value = true
  try {
    const sourceResponse = await axios.get(
      `/api/game-accounts/${importSourceAccountId.value}/setting`,
    )

    if (
      sourceResponse.status !== 200 ||
      !sourceResponse.data ||
      sourceResponse.data['未找到账号']
    ) {
      message.error('读取来源账号配置失败')
      return
    }

    migrateLegacyFmlRaceTaskPriority(sourceResponse.data.data)
    migrateLegacyFloralShopCatalog(sourceResponse.data.data)
    const payload = deepMerge(createDefaultGameConfig(), sourceResponse.data.data)
    normalizeGameConfigSelects(payload)
    const rangeError = validateFmlRaceScoreRanges(payload.union.fmlRace.acceptRules)
    if (rangeError) {
      message.warning(rangeError)
      return
    }
    const saveResponse = await axios.put(`/api/game-accounts/${accountId.value}/setting`, payload)

    if (!saveResponse.data?.success) {
      message.error(saveResponse.data?.message || '导入配置失败')
      return
    }

    config.value = payload
    normalizeGameConfigSelects(config.value)
    importConfigModalVisible.value = false
    showConfigNoticeModal('配置导入成功', '请注意：导入配置后，需要先停止再启动才能生效。')
  } catch (error) {
    console.error('导入配置失败:', error)
    message.error('导入配置失败')
  } finally {
    importConfigLoading.value = false
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

onMounted(() => {
  if (accountId.value) {
    fetchConfig()
  } else {
    message.error('缺少必要参数')
  }
  showConfigNoticeModal(
    '配置修改流程',
    `操作步骤： 停止程序 → 修改配置 → 保存配置 → 启动程序<br/><br/>修改后务必点击"保存"按钮`,
    '我知道了',
  )
})
</script>

<style lang="scss" scoped>
.ant-tabs {
  :deep(.ant-tabs-tab + .ant-tabs-tab) {
    margin: 0 0 0 18px;
  }
}
.import-config-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-config-modal p {
  margin: 0;
}

.import-config-warning {
  color: #cf1322;
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

.fml-race-quick-setup {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
}

.fml-race-quick-setup-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.fml-race-rule-help {
  margin: 0 0 16px;
  color: #666;
  font-size: 13px;
}

.fml-race-taken-task-help {
  margin: 8px 0 0;
  color: #666;
  font-size: 12px;
}

.fml-race-accept-rule-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.fml-race-score-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #666;
  font-size: 12px;
}

.fml-race-range-separator {
  align-self: flex-end;
  line-height: 32px;
  color: #999;
}

.fml-race-range-error {
  margin: 0;
  color: #ff4d4f;
  font-size: 12px;
}

.fml-race-accept-rule-controls .fml-race-rule-score {
  width: 80px !important;
  min-width: 68px;
  flex-shrink: 1;
}

.fml-race-accept-rule-item :deep(.ant-form-item-row) {
  flex-wrap: nowrap;
  align-items: center;
}

// 桌面继承父表单的 8/16 标签列，不能给规则单独固定 145px。
@media (max-width: 575px) {
  .fml-race-accept-rule-item :deep(.ant-form-item-label) {
    flex: 0 0 110px;
    max-width: 110px;
    padding: 0 8px 0 0;
    text-align: right;
  }

  .fml-race-accept-rule-item :deep(.ant-form-item-control) {
    flex: 1 1 0;
    min-width: 0;
    max-width: calc(100% - 110px);
  }

  .fml-race-accept-rule-controls {
    gap: 4px;
  }

  .fml-race-accept-rule-controls .fml-race-rule-score {
    width: 48px !important;
    min-width: 48px;
  }

  .fml-race-quick-setup-field {
    gap: 4px;
  }

  .fml-race-quick-setup-field > span {
    flex-shrink: 0;
    font-size: 12px;
  }
}

.fml-race-quick-setup-question {
  font-weight: 500;
  color: #262626;
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

.locked-on-switch.ant-switch-checked {
  background-color: #bfbfbf;
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

  :deep(.ant-form-item-control),
  :deep(.ant-form-item-control-input),
  :deep(.ant-form-item-control-input-content) {
    max-width: 100%;
    min-width: 0;
  }

  .form-item--stack-mobile :deep(.ant-form-item-row) {
    flex-direction: column;
  }

  .form-item--stack-mobile :deep(.ant-form-item-label),
  .form-item--stack-mobile :deep(.ant-form-item-control) {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .form-item--stack-mobile :deep(.ant-form-item-label) {
    padding-bottom: 4px;
  }
}
</style>
