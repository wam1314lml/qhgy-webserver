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
              tooltip="当制作了新花艺、培育了新花朵或升级时自动分享，领取分享奖励"
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
              <Switch v-model:checked="config.basic.pearl.autoBuyHireTicket" />
            </CustomFormItem>
            <CustomFormItem
              label="元宝上限"
              name="basic.pearl.maxSpendDmd"
              tooltip="购买雇佣书消耗最大元宝"
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

            <CustomFormItem
              label="vip商店"
              name="basic.shop.vipShop.autoBuy"
              tooltip="自动购买vip商店物品"
            >
              <Switch v-model:checked="config.basic.shop.vipShop.autoBuy" />
            </CustomFormItem>
            <template v-if="config.basic.shop.vipShop.autoBuy">
              <CustomFormItem
                label="元宝上限"
                name="basic.shop.vipShop.maxSpendDmd"
                tooltip="vip商店花费元宝上限，0则不限制"
              >
                <CustomInputNumber
                  v-model:value="config.basic.shop.vipShop.maxSpendDmd"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="花坊币上限"
                name="basic.shop.vipShop.maxSpendFloralCoin"
                tooltip="vip商店花费花坊币上限，0则不限制"
              >
                <CustomInputNumber
                  v-model:value="config.basic.shop.vipShop.maxSpendFloralCoin"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">花坊</Divider>
            <CustomFormItem
              label="花坊兑换"
              name="basic.shop.floralShop.enabled"
              tooltip="开启后会根据用户设置兑换未拥有的鲜花/花瓶（花坊商店 tempId=6，每种限购一件，已购过的自动跳过）"
            >
              <Switch v-model:checked="config.basic.shop.floralShop.enabled" />
            </CustomFormItem>
            <template v-if="config.basic.shop.floralShop.enabled">
              <CustomFormItem
                label="兑换商品"
                name="basic.shop.floralShop.itemIds"
                tooltip="选择花坊商店要兑换的鲜花/花瓶，已购过的自动跳过"
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
              <Switch v-model:checked="config.plant.cultivate.enabled" />
            </CustomFormItem>
            <CustomFormItem
              label="视频加速"
              name="plant.cultivate.videoSpeedUp"
              tooltip="自动观看视频加速培育正在培育的花种，培育时间减半"
            >
              <Switch v-model:checked="config.plant.cultivate.videoSpeedUp" />
            </CustomFormItem>

            <CustomFormItem
              label="鲜花升级"
              name="plant.cultivate.upgradeEnabled"
              tooltip="自动花费金币进行鲜花升级"
            >
              <Switch v-model:checked="config.plant.cultivate.upgradeEnabled" />
            </CustomFormItem>
            <CustomFormItem
              label="目标等级"
              name="plant.cultivate.tagetLevel"
              tooltip="鲜花升级到目标等级"
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
                    <Select.Option
                      v-for="m in forceCollectMinuteOptions"
                      :key="m"
                      :value="m"
                    >
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
                tooltip="严格按照单花占地数量种植，地块不足时等待满足条件再种，美观但效率较低，效率低体现在做任务方面，如居民订单，顾客订单之类的"
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
                tooltip="开启后：如果订单里缺花，系统会先种订单需要的花；发现有空地时，会直接插队用来种这些花；花种完以后，会自动恢复到原来设置的模式（指定品质 / 指定种类 / 指定花朵）"
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
                tooltip="配置订单任务的优先级，数字越小优先级越高，0是不做此任务（公会竞赛最低为1，不能设置0），可以几个任务设置一样的数字，就会一起做这几个任务。有些玩家说居民订单不做，花艺不做，莳花不做，都跟您设置的数字有关，数字最大就会把任务排到最后，让您产生不做的错觉"
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
                    <span class="text-sm">花艺售卖</span>
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
                    <Radio value="specific">指定花朵 </Radio>
                    <Radio value="lowStock">库存模式 </Radio>
                    <Radio value="freeStyle">64块地模式 </Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <!-- 指定品质模式 -->
              <CustomFormItem
                label="选择品质"
                name="plant.flower.qualities"
                tooltip="选择要种植的花朵品质，可多选，库存少的优先种植。"
                v-if="config.plant.flower.plantingMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.plant.flower.qualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
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
              <!-- 指定花朵模式 -->
              <CustomFormItem
                label="选择花朵"
                name="plant.flower.specificFlowerIds"
                tooltip="选择要种植的花朵，可多选，库存少的优先种植。"
                v-if="config.plant.flower.plantingMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.flower.specificFlowerIds"
                  mode="multiple"
                  placeholder="请选择花朵"
                  :options="getFlowerPickerOptions(config.plant.flower.specificFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
              <!-- 库存模式 -->
              <CustomFormItem
                label="最低库存"
                name="plant.flower.lowStockThreshold"
                tooltip="比如设置了500，那么就种植库存不足500的花，无视限制花朵等级，所有花库存都有500了就不会种植了，适合小号存水。"
                v-if="config.plant.flower.plantingMode === 'lowStock'"
              >
                <CustomInputNumber
                  v-model:value="config.plant.flower.lowStockThreshold"
                  :min="1"
                  :max="999999"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <!-- 64块地模式 -->
              <CustomFormItem
                label="设置每块土地"
                name="plant.flower.freeStyleList"
                tooltip="这个模式可以设置每块土地种什么花，无视限制花朵等级，所有任务做完才会进入这个种植模式。设置好后需要点保存才生效哦"
                v-if="config.plant.flower.plantingMode === 'freeStyle'"
              >
                <a-button type="primary" @click="openFreeStylePage">
                  设置每块土地
                </a-button>
              </CustomFormItem>
              <CustomFormItem
                label="限制花朵等级"
                name="plant.flower.minFlowerLevel"
                tooltip="限制种植的最低花朵等级，0则不限制，此项的设置只针对补库存，做订单和公会竞赛之类的不受此设置影响"
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
              tooltip="默认不会偷取花灵，但在好友种植花灵时会偷取花朵，需要在偷花模式里设置排除花朵，排除花灵主花"
            >
              <Switch v-model:checked="config.plant.friendSteal.enabled" />
            </CustomFormItem>
            <template v-if="config.plant.friendSteal.enabled">
              <CustomFormItem
                label="不摸花灵"
                tooltip="若好友地块中某花朵是花灵书册的副花品种、且该好友同时种了对应主花，则判定为花灵副花并跳过不偷，需偷花灵请把偷取花灵开关打开即可"
              >
                <Switch :checked="true" disabled class="locked-on-switch" />
              </CustomFormItem>
              <CustomFormItem
                label="偷取花灵"
                name="plant.friendSteal.stealElves"
                tooltip="开启后偷取有花灵的地块，关闭则跳过有花灵的地块"
              >
                <Switch v-model:checked="config.plant.friendSteal.stealElves" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.friendSteal.stealElves"
                label="只偷指定好友"
                name="plant.friendSteal.onlyStealSpecifiedFriends"
                tooltip="开启后仅限制花灵偷取为指定好友，普通花偷取不受影响"
              >
                <Switch v-model:checked="config.plant.friendSteal.onlyStealSpecifiedFriends" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.friendSteal.stealElves && config.plant.friendSteal.onlyStealSpecifiedFriends"
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
                label="只偷指定花灵"
                name="plant.friendSteal.onlyStealSpecifiedElves"
                tooltip="开启后只偷选中的花灵种类"
              >
                <Switch v-model:checked="config.plant.friendSteal.onlyStealSpecifiedElves" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.friendSteal.stealElves && config.plant.friendSteal.onlyStealSpecifiedElves"
                label="指定花灵"
                name="plant.friendSteal.specifiedElvesIds"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.specifiedElvesIds"
                  mode="multiple"
                  placeholder="请选择花灵"
                  :options="elfOptions"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="偷花模式"
                name="plant.friendSteal.stealMode"
                tooltip="排除已有种子：选择此项就会不偷自己可以种的花朵，只偷不能种的"
              >
                <Radio.Group v-model:value="config.plant.friendSteal.stealMode">
                  <Space >
                    <Radio value="quality">指定品质 </Radio>
                    <Radio value="specific">指定花朵 </Radio>
                    <Radio value="exclude">排除花朵 </Radio>
                    <Radio value="excludeCultivating">排除已有种子</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="指定品质"
                name="plant.friendSteal.stealQualities"
                tooltip="只偷取指定品质的花朵"
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
                label="指定花朵"
                name="plant.friendSteal.stealFlowerIds"
                tooltip="只偷取指定的花朵"
                v-if="config.plant.friendSteal.stealMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.stealFlowerIds"
                  mode="multiple"
                  placeholder="请选择花朵"
                  :options="getFlowerPickerOptions(config.plant.friendSteal.stealFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="排除花朵"
                name="plant.friendSteal.excludeFlowerIds"
                tooltip="不偷取指定的花朵，不想影响好友种植花灵的话，建议把所有花灵主花设置上，排除掉"
                v-if="config.plant.friendSteal.stealMode === 'exclude'"
              >
                <CustomSelect
                  v-model:value="config.plant.friendSteal.excludeFlowerIds"
                  mode="multiple"
                  placeholder="请选择要排除的花朵"
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
                  :max="10"
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
                tooltip="23:00 后忽略所有偷花筛选条件（品质、指定花朵、排除花朵等），直接偷任何普通花耗光免费次数，不自动购买；注意：避开花灵土地此配置仍然生效"
              >
                <Switch v-model:checked="config.plant.friendSteal.lateNightConsumeEnabled" />
              </CustomFormItem>
            </template>

            <Divider orientation="left">花灵</Divider>
            <CustomFormItem
              label="自动种花灵"
              name="plant.elves.enabled"
              tooltip="优先种植指定花灵，否则选择当期双倍加成花灵种植（8朵主花+其余辅花），需要打开种植系统自动收获和自动种植，每日花灵达到收获上限后恢复到原有种植模式"
            >
              <Switch v-model:checked="config.plant.elves.enabled" />
            </CustomFormItem>
            <CustomFormItem
              label="指定花灵"
              name="plant.elves.selectedElvesIds"
              v-if="config.plant.elves.enabled"
            >
              <CustomSelect
                v-model:value="config.plant.elves.selectedElvesIds"
                mode="multiple"
                placeholder="请选择花灵"
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
              tooltip="浇水/加速后等待指定分钟数再收获，让花灵在地里待一会儿供好友偷取"
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
            <CustomFormItem
              label="自动申请协助"
              name="plant.elves.requestAid"
            >
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
              label="自动派遣花灵"
              name="plant.elves.dispatch"
              tooltip="自动将背包中的花灵派遣到空闲位置"
            >
              <Switch v-model:checked="config.plant.elves.dispatch" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.plant.elves.dispatch"
              label="派遣模式"
              name="plant.elves.dispatchMode"
              tooltip="先双倍后普通：优先派遣双倍花灵，无双倍花灵时派遣普通花灵；只派遣双倍：无双倍花灵时跳过派遣"
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
              tooltip="每个槽位每次派遣几个花灵（1-12）"
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
              tooltip="花费元宝加速派遣中的花灵"
            >
              <Switch v-model:checked="config.plant.elves.speedUpDispatch" />
            </CustomFormItem>
            <CustomFormItem
              label="自动领取派遣奖励"
              name="plant.elves.recvDispatch"
              tooltip="派遣完成后自动领取星辰币奖励"
            >
              <Switch v-model:checked="config.plant.elves.recvDispatch" />
            </CustomFormItem>

            <Divider orientation="left">花灵密令</Divider>
            <CustomFormItem
              label="等级奖励"
              name="plant.elves.recvPass"
              tooltip="自动领取花灵密令等级奖励，不会做针对性做花灵密令任务哦，日常做其他任务会有顺带做到花灵密令的部分任务，做完了就会顺便领取"
            >
              <Switch v-model:checked="config.plant.elves.recvPass" />
            </CustomFormItem>
            <CustomFormItem
              label="任务奖励"
              name="plant.elves.recvPassTask"
              tooltip="自动领取花灵密令任务奖励，不会做针对性做花灵密令任务哦，日常做其他任务会有顺带做到花灵密令的部分任务，做完了就会顺便领取"
            >
              <Switch v-model:checked="config.plant.elves.recvPassTask" />
            </CustomFormItem>

            <Divider orientation="left">花之密令</Divider>
            <CustomFormItem
              label="等级奖励"
              name="plant.elves.recvFlowerPass"
              tooltip="自动领取花之密令等级奖励"
            >
              <Switch v-model:checked="config.plant.elves.recvFlowerPass" />
            </CustomFormItem>
            <CustomFormItem
              label="任务奖励"
              name="plant.elves.recvFlowerPassTask"
              tooltip="自动领取花之密令任务奖励"
            >
              <Switch v-model:checked="config.plant.elves.recvFlowerPassTask" />
            </CustomFormItem>

            <Divider orientation="left">花艺上架</Divider>
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
              tooltip="自动上架花艺，自动领取金币收益"
            >
              <Switch v-model:checked="config.plant.artSell.autoSellArt" />
            </CustomFormItem>
            <template v-if="config.plant.artSell.autoSellArt">
              <CustomFormItem
                label="上架模式"
                name="plant.artSell.artSellMode"
              >
                <Radio.Group v-model:value="config.plant.artSell.artSellMode">
                  <Space direction="vertical">
                    <Radio value="vase">指定花瓶</Radio>
                    <Radio value="full">指定花艺</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="指定花瓶"
                name="plant.artSell.specifiedArts"
                tooltip="指定花瓶，优先选择有库存的上架，否则进行制作，如果花朵库存不足需要配合种植开启任务优先进行使用。"
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
                label="指定花艺"
                name="plant.artSell.specifiedArtsFull"
                tooltip="指定花艺，优先选择有库存的上架，否则进行制作，如果花朵库存不足需要配合种植开启任务优先进行使用。"
                v-if="config.plant.artSell.artSellMode === 'full'"
              >
                <CustomSelect
                  v-model:value="config.plant.artSell.specifiedArtsFull"
                  mode="multiple"
                  wide
                  placeholder="请选择花艺"
                  :options="getSpecifiedArtsFullPickerOptions(config.plant.artSell.specifiedArtsFull)"
                />
              </CustomFormItem>
              <CustomFormItem
                label="上架数量"
                name="plant.artSell.flowerArtPerRack"
                tooltip="每个花架上架多少花艺"
              >
                <CustomInputNumber
                  v-model:value="config.plant.artSell.flowerArtPerRack"
                  :min="0"
                  :max="12"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
                label="花艺4分钟下架"
                name="plant.artSell.rackAutoRefresh"
                tooltip="上架后4分钟能下架了马上下架，适合做一些任务"
              >
                <Switch v-model:checked="config.plant.artSell.rackAutoRefresh" />
              </CustomFormItem>
              <CustomFormItem
                label="库存优先"
                name="plant.artSell.stockFirst"
                tooltip="开启后会优先上架已有的花艺(从多到少排序)，全部没有后才会再根据上架模式上架设置的花艺"
              >
                <Switch v-model:checked="config.plant.artSell.stockFirst" />
              </CustomFormItem>
            </template>
            <CustomFormItem
              label="花艺经验"
              name="plant.artSell.recvArtCreateRwd"
              tooltip="自动领取花艺制作经验"
            >
              <Switch v-model:checked="config.plant.artSell.recvArtCreateRwd" />
            </CustomFormItem>
            <CustomFormItem
              label="图鉴奖励"
              name="plant.artSell.recvCollectRwd"
              tooltip="自动领取鲜花收藏，花瓶收藏，花艺收藏奖励"
            >
              <Switch v-model:checked="config.plant.artSell.recvCollectRwd" />
            </CustomFormItem>
            <CustomFormItem
              label="花艺首做"
              name="plant.artSell.artFirstMake"
              tooltip="自动制作所有未首次制作过的花艺，制作效率和任务优先级里的花艺售卖优先级挂钩"
            >
              <Switch v-model:checked="config.plant.artSell.artFirstMake" />
            </CustomFormItem>

            <Divider orientation="left">花贸市场</Divider>
            <CustomFormItem
              label="解锁货架"
              name="plant.market.autoUnlockShelf"
              tooltip="自动花费元宝解锁花贸市场货架"
            >
              <Switch v-model:checked="config.plant.market.autoUnlockShelf" />
            </CustomFormItem>
            <CustomFormItem
              label="自动上架"
              name="plant.market.putEnabled"
              tooltip="自动领取花贸市场收益并上架花朵，注意上架会消耗元宝，请谨慎开启！"
            >
              <Switch v-model:checked="config.plant.market.putEnabled" />
            </CustomFormItem>
            <template v-if="config.plant.market.putEnabled">
              <CustomFormItem label="上架策略" name="plant.market.putMode">
                <Radio.Group v-model:value="config.plant.market.putMode">
                  <Space >
                    <Radio value="inventory">库存最多</Radio>
                    <Radio value="specific">指定花朵</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="选择花朵"
                name="plant.market.specificFlowerIds"
                tooltip="选择要上架的花朵，可多选，库存多的优先上架"
                v-if="config.plant.market.putMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.market.specificFlowerIds"
                  mode="multiple"
                  placeholder="请选择花朵"
                  :options="getFlowerPickerOptions(config.plant.market.specificFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem label="上架价格" name="plant.market.priceIndex">
                <Radio.Group v-model:value="config.plant.market.priceIndex">
                  <Space >
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
                tooltip="保护自己上架的花朵，防止被他人购买（4位数字）"
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
                tooltip="当免费上架次数用完时，自动花费元宝购买上架次数"
              >
                <Switch v-model:checked="config.plant.market.autoBuyPutCount" />
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
              tooltip="自动购买好友货架的花朵"
            >
              <Switch v-model:checked="config.plant.market.autoBuyFromFriend" />
            </CustomFormItem>
            <template v-if="config.plant.market.autoBuyFromFriend">
              <CustomFormItem label="扫货策略" name="plant.market.buyMode">
                <Radio.Group v-model:value="config.plant.market.buyMode">
                  <Space >
                    <Radio value="all">全部</Radio>
                    <Radio value="specific">指定花朵</Radio>
                    <Radio value="quality">指定品质</Radio>
                    <Radio value="exclude">排除花朵</Radio>
                    <Radio value="friend">指定好友</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                v-if="config.plant.market.buyMode === 'friend'"
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
                label="指定花朵"
                name="plant.market.buySpecificFlowerIds"
                tooltip="选择要从好友处购买的花朵，可多选"
                v-if="config.plant.market.buyMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.plant.market.buySpecificFlowerIds"
                  mode="multiple"
                  placeholder="请选择花朵"
                  :options="getFlowerPickerOptions(config.plant.market.buySpecificFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="指定品质"
                name="plant.market.buyQualities"
                tooltip="选择要从好友处购买的花朵品质，可多选"
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
                label="排除花朵"
                name="plant.market.excludeFlowerIds"
                tooltip="选择不要购买的花朵，可多选"
                v-if="config.plant.market.buyMode === 'exclude'"
              >
                <CustomSelect
                  v-model:value="config.plant.market.excludeFlowerIds"
                  mode="multiple"
                  placeholder="请选择不要购买的花朵"
                  :options="getFlowerPickerOptions(config.plant.market.excludeFlowerIds)"
                  show-search
                  option-filter-prop="label"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="最小上架时长"
                name="plant.market.minPutTimeDiff"
                tooltip="只购买上架时间超过此时长的花朵，0表示不限制。单位：秒"
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
            <!-- <CustomFormItem
              label="仅已培育"
              name="basic.hasSeparation"
              tooltip="仅提交已培育的花朵"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem> -->
            <CustomFormItem
              label="品质限定"
              name="order.resident.qualities"
              tooltip="仅提交指定品质的花朵到居民订单"
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
              label="元宝刷新"
              name="order.palace.diamondRefresh"
              tooltip="开启后，若没有设置的品质，则会使用元宝刷新到有设置的品质为止，慎重开启，可能会用掉很多元宝"
              v-if="config.order.palace.enabled"
            >
              <Switch v-model:checked="palaceDiamondRefresh" />
            </CustomFormItem>

            <Divider orientation="left">组团订单</Divider>
            <CustomFormItem label="自动完成" name="order.team.enabled" tooltip="自动完成团单">
              <Switch v-model:checked="config.order.team.enabled" />
            </CustomFormItem>
            <template v-if="config.order.team.enabled">
              <CustomFormItem label="再来一单" name="order.team.oneMore" tooltip="花费元宝再来一单">
                <Switch v-model:checked="config.order.team.oneMore" />
              </CustomFormItem>
              <CustomFormItem
                label="仅已培育"
                name="order.team.submitOnlyCultivatedFlowers"
                tooltip="仅提交已培育的花朵"
              >
                <Switch v-model:checked="config.order.team.submitOnlyCultivatedFlowers" />
              </CustomFormItem>
              <CustomFormItem
                label="团单模式"
                name="order.team.teamMode"
                tooltip="品质限定：只提交指定品质的花朵；排除花朵：碰到排除的花朵就刷新，其余花朵均可提交"
              >
                <Radio.Group v-model:value="config.order.team.teamMode">
                  <Space>
                    <Radio value="quality">品质限定</Radio>
                    <Radio value="exclude">排除花朵</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <!-- 品质限定模式 -->
              <CustomFormItem
                label="选择品质"
                name="order.team.qualities"
                tooltip="仅提交指定品质的花朵到团单"
                v-if="config.order.team.teamMode === 'quality'"
              >
                <CustomSelect
                  v-model:value="config.order.team.qualities"
                  mode="multiple"
                  :options="flowerQualityOptions"
                  style="width: 100%"
                />
              </CustomFormItem>
              <!-- 排除花朵模式 -->
              <CustomFormItem
                label="排除花朵"
                name="order.team.excludeFlowerIds"
                tooltip="请选择排除的花朵，团单碰到排除的花朵就会跳过（刷新）"
                v-if="config.order.team.teamMode === 'exclude'"
              >
                <CustomSelect
                  v-model:value="config.order.team.excludeFlowerIds"
                  mode="multiple"
                  placeholder="请选择排除的花朵"
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
              tooltip="自动种植空闲土地，自动将不符合限定条件的已种土地替换为目标花朵"
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
                    <Radio value="specific">指定花朵</Radio>
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
                label="指定花朵"
                name="union.land.specificFlowerIds"
                tooltip="留空则不限定花朵"
                v-if="config.union.land.plantMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.union.land.specificFlowerIds"
                  mode="multiple"
                  placeholder="请选择花朵"
                  :options="getFlowerPickerOptions(config.union.land.specificFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
              <CustomFormItem
                label="最低库存"
                name="union.land.lowStockThreshold"
                tooltip="比如设置了500，那么就种植库存不足500的花，无视限制花朵等级，所有花库存都有500了就不会种植了，请注意设置"
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
                tooltip="花朵等级高于该值的不种，0表示不限制，比如设置了13，就会种植低于13级且为你所有花里最低等级的花"
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
              label="元宝建设"
              name="union.build.dmd"
              tooltip="自动花费元宝进行公会建设"
            >
              <Switch v-model:checked="config.union.build.dmd" />
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
                  <Space >
                    <Radio value="quality">指定品质</Radio>
                    <Radio value="specific">指定花朵</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="品质限定"
                name="union.flower.shareQualities"
                tooltip="限定要分享到公会的花朵品质"
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
                label="指定花朵"
                name="union.flower.shareFlowerIds"
                tooltip="选择要分享到公会的具体花朵"
                v-if="config.union.flower.shareMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.union.flower.shareFlowerIds"
                  mode="multiple"
                  placeholder="选择要分享的花朵"
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
                  <Space >
                    <Radio value="quality">指定品质</Radio>
                    <Radio value="specific">指定花朵</Radio>
                  </Space>
                </Radio.Group>
              </CustomFormItem>
              <CustomFormItem
                label="品质限定"
                name="union.flower.takeQualities"
                tooltip="限定要从公会拿取的花朵品质"
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
                label="指定花朵"
                name="union.flower.takeFlowerIds"
                tooltip="选择要从公会摸取的具体花朵"
                v-if="config.union.flower.takeMode === 'specific'"
              >
                <CustomSelect
                  v-model:value="config.union.flower.takeFlowerIds"
                  mode="multiple"
                  placeholder="选择要摸取的花朵"
                  :options="getFlowerPickerOptions(config.union.flower.takeFlowerIds)"
                  style="width: 100%"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">公会竞赛</Divider>
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
            <CustomFormItem
              label="限制分数-未升级"
              name="union.fmlRace.minTaskScore"
              tooltip="接分数不低于此值的普通任务，0 表示不限制。"
            >
              <CustomInputNumber
                v-model:value="config.union.fmlRace.minTaskScore"
                :min="minTaskScoreMin"
                :max="60"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="限制分数-升级后"
              name="union.fmlRace.minUpgradeTaskScore"
              tooltip="接分数不低于此值的玩家升级后任务/原金任务（双倍分数），0 表示不限制，举例：「限制分数-未升级」设置20，「限制分数-升级后」设置50，则接20分以上普通任务，50分以上升级后任务。注意！若要开启【放弃低分任务】+【自动升级任务】，需要设置「限制分数-未升级」的值乘以2大于等于「限制分数-升级后」的值。否则会出现元宝升级后把这个任务放弃的情况"
            >
              <CustomInputNumber
                v-model:value="config.union.fmlRace.minUpgradeTaskScore"
                :min="0"
                :max="60"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="放弃低分任务"
              name="union.fmlRace.giveuplowscoretask"
              tooltip="根据「限制分数-未升级」「限制分数-升级后」的设置来判断，例：未升级设置了25，升级后设置了50，则任务列表里有小于等于25的未升级会放弃，有小于等于50的已升级会放弃。开启此项又开启了【自动升级任务】的话，必须要按照「限制分数-未升级」乘以2大于等于「限制分数-升级后」这个规则来设置，否则会出现元宝升级后把这个任务放弃的情况。"
            >
              <Switch v-model:checked="config.union.fmlRace.giveuplowscoretask" />
            </CustomFormItem>
            <CustomFormItem
              label="避开有进度任务"
              name="union.fmlRace.avoidProgressTask"
              tooltip="开启后，只要任务已有进度（别人做了一半后放弃的任务），即使满足其他接取条件也不会接取。"
            >
              <Switch v-model:checked="config.union.fmlRace.avoidProgressTask" />
            </CustomFormItem>
            <CustomFormItem
              label="只接已升级任务"
              name="union.fmlRace.onlyUpgradeTask"
              tooltip="比如设置了限制27分，开启后就只会接大于等于54分的任务，会使公会任务做的非常慢，慎重开启（系统/玩家升级好的双倍任务比较少，捡漏的可能是比较小的哦）"
            >
              <Switch v-model:checked="config.union.fmlRace.onlyUpgradeTask" />
            </CustomFormItem>
            <CustomFormItem
              label="他人升级任务设置"
              name="union.fmlRace.othersUpgradeTaskMode"
              tooltip="根据用户设置接不接元宝升级任务"
            >
              <Switch v-model:checked="config.union.fmlRace.othersUpgradeTaskMode" />
            </CustomFormItem>
            <CustomFormItem
              label="排除他人升级任务"
              name="union.fmlRace.excludeOthersUpgradeTask"
              tooltip="基于礼貌的开关，开启后，公会其他玩家用元宝升级的任务就不会去接了"
              v-if="config.union.fmlRace.othersUpgradeTaskMode"
            >
              <Radio
                :checked="othersUpgradeTaskChoice === 'exclude'"
                @change="othersUpgradeTaskChoice = 'exclude'"
              />
            </CustomFormItem>
            <CustomFormItem
              label="接指定玩家升级任务"
              name="union.fmlRace.onlySpecifiedUpgradeTask"
              tooltip="选择他就只会接指定玩家的升级任务，其他玩家的升级任务不接，适合小号给大号刷任务用"
              v-if="config.union.fmlRace.othersUpgradeTaskMode"
            >
              <Radio
                :checked="othersUpgradeTaskChoice === 'specified'"
                @change="othersUpgradeTaskChoice = 'specified'"
              />
            </CustomFormItem>
            <CustomFormItem
              label="指定用户名"
              name="union.fmlRace.specifiedUpgradePlayers"
              tooltip="可填写多个玩家名，不要有错别字不然识别不了，按回车就是填写下一个玩家名"
              v-if="config.union.fmlRace.othersUpgradeTaskMode && config.union.fmlRace.onlySpecifiedUpgradeTask"
            >
              <CustomSelect
                v-model:value="config.union.fmlRace.specifiedUpgradePlayers"
                mode="tags"
                placeholder="输入玩家名后按回车"
                :token-separators="[',', '，']"
                style="width: 100%"
              />
            </CustomFormItem>
            <CustomFormItem
              label="公会玩家"
              tooltip="点一下读取公会所有玩家名字，支持输入名字搜索；选择名字后会自动添加到指定用户名里"
              v-if="
                config.union.fmlRace.othersUpgradeTaskMode &&
                config.union.fmlRace.onlySpecifiedUpgradeTask
              "
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
              label="接指定花朵"
              name="union.fmlRace.harvestTaskFlowerFilterEnabled"
              tooltip="开启后，种植收获优先级大于等于1的情况下，会根据设置的分数，只接达到设置分数的花朵"
            >
              <Switch v-model:checked="config.union.fmlRace.harvestTaskFlowerFilterEnabled" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.union.fmlRace.harvestTaskFlowerFilterEnabled"
              label="指定花朵"
              name="union.fmlRace.harvestTaskFlowerIds"
            >
              <CustomSelect
                v-model:value="config.union.fmlRace.harvestTaskFlowerIds"
                mode="multiple"
                placeholder="请选择花朵"
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
              tooltip="领取任务后花费元宝自动升级，开启此项又开启了【放弃低分任务】的话，必须要按照「限制分数-未升级」的值乘以2大于等于「限制分数-升级后」的值，这个规则来设置，否则会出现元宝升级后把这个任务放弃的情况。"
            >
              <Switch v-model:checked="config.union.fmlRace.upgradeTask" />
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
              tooltip="开启后会保留玩家用元宝升级过的任务，不判断分数"
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
              label="小号专属-只升级不做"
              name="union.fmlRace.onlyDiamondUpgradeTask"
              tooltip="开启后只执行接取、元宝升级、放弃流程；未开启元宝刷新时，仅处理达到升级最低分且任务优先级不为0的任务。"
            >
              <Switch v-model:checked="config.union.fmlRace.onlyDiamondUpgradeTask" />
            </CustomFormItem>
            <template v-if="config.union.fmlRace.onlyDiamondUpgradeTask">
              <CustomFormItem
                label="元宝刷新任务"
                name="union.fmlRace.diamondRefreshTask"
                tooltip="开启后，接取低于设定分数的任务时不判断任务优先级，持续用元宝刷新；达到目标分数且任务优先级大于等于1后停止刷新并升级、放弃。"
              >
                <Switch v-model:checked="config.union.fmlRace.diamondRefreshTask" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.union.fmlRace.diamondRefreshTask"
                label="接取低分阈值"
                name="union.fmlRace.diamondRefreshBelowScore"
                tooltip="仅接取低于该分数的未升级任务进行元宝刷新，默认14，范围1-99。"
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
                tooltip="刷新到该分数且任务优先级大于等于1时停止，默认24，范围1-99。"
              >
                <CustomInputNumber
                  v-model:value="config.union.fmlRace.diamondRefreshTargetScore"
                  :min="1"
                  :max="99"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem
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
                label="种植收获细化"
                name="union.fmlRace.harvestUpgradeRefine"
                tooltip="开启后，种植收获优先级大于等于1时，只会升级指定花朵且达到升级最低积分的任务；若开启元宝刷新任务，则刷新到指定花朵且达到升级最低积分的任务才会停止刷新。"
              >
                <Switch v-model:checked="config.union.fmlRace.harvestUpgradeRefine" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.union.fmlRace.harvestUpgradeRefine"
                label="指定花朵"
                name="union.fmlRace.harvestUpgradeFlowerIds"
                tooltip="未选择花朵时，不会升级任何种植收获任务。"
              >
                <CustomSelect
                  v-model:value="config.union.fmlRace.harvestUpgradeFlowerIds"
                  mode="multiple"
                  show-search
                  :filter-option="filterOption"
                  :options="getFlowerPickerOptions(config.union.fmlRace.harvestUpgradeFlowerIds)"
                  class="w-full sm:w-80"
                  placeholder="请选择指定花朵"
                />
              </CustomFormItem>
              <CustomFormItem
                label="保留元宝"
                name="union.fmlRace.diamondUpgradeReserve"
                tooltip="刷新和升级共用该保留值，任一步操作后元宝低于此值都将停止；填0则不保留。"
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

          <!-- 活动设置 -->
          <div v-if="activeTab === '活动'" class="config-section">
            <Divider orientation="left">花笺集芳</Divider>
            <CustomFormItem
              label="领取奖励"
              name="activity.cyclicNote.enabled"
              tooltip="领取已完成的任务奖励，领取阶段宝箱奖励，花笺所需任务都是基本的日常任务，没有写专门去做这个任务，只需把基础页种植页订单页那些功能开起来，就能完成花笺的任务，会帮你把完成的领取"
            >
              <Switch v-model:checked="config.activity.cyclicNote.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.cyclicNote.enabled">
              <CustomFormItem
                label="解锁槽位"
                name="activity.cyclicNote.unlockSlot"
                tooltip="自动花费元宝解锁任务槽位"
              >
                <Switch v-model:checked="config.activity.cyclicNote.unlockSlot" />
              </CustomFormItem>
              <CustomFormItem
                label="居民订单守护"
                name="activity.cyclicNote.orderGuard.enabled"
                tooltip="开启后，在花笺活动期间内，根据设置的时间，在设置的时间内，就算订单页的居民订单开启了，也不会做，需等到花笺出现居民订单任务了才会做，在设置时间外就会正常做居民订单了。如：设置了21：00，那么00：00-21：00期间就只会等待花笺出现居民订单任务才会做居民订单。21点后就不等待了直接做居民订单"
              >
                <Switch v-model:checked="config.activity.cyclicNote.orderGuard.enabled" />
              </CustomFormItem>
              <CustomFormItem
                v-if="config.activity.cyclicNote.orderGuard.enabled"
                label="设置时间"
                name="activity.cyclicNote.orderGuard.timeRanges"
                tooltip="守护生效的截止时间点。例如设置 21:00，则 00:00-21:00 期间等待花笺居民订单任务，21:00 后正常做居民订单"
              >
                <Space>
                  <Select v-model:value="cyclicNoteOrderGuardHour" class="w-24!">
                    <Select.Option v-for="h in cyclicNoteOrderGuardHourOptions" :key="h" :value="h">
                      {{ h }}时
                    </Select.Option>
                  </Select>
                  <Select v-model:value="cyclicNoteOrderGuardMinute" class="w-24!">
                    <Select.Option
                      v-for="m in cyclicNoteOrderGuardMinuteOptions"
                      :key="m"
                      :value="m"
                    >
                      {{ String(m).padStart(2, '0') }}分
                    </Select.Option>
                  </Select>
                </Space>
              </CustomFormItem>
            </template>

            <Divider orientation="left">莳花纪闻</Divider>
            <CustomFormItem
              label="自动完成"
              name="activity.actCyclicStory.enabled"
              tooltip="自动完成莳花纪闻订单任务，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.activity.actCyclicStory.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.actCyclicStory.enabled">
              <CustomFormItem
                label="元宝刷新"
                name="activity.actCyclicStory.refreshEnabled"
                tooltip="花费元宝立即刷新莳花纪闻订单任务"
              >
                <Switch v-model:checked="config.activity.actCyclicStory.refreshEnabled" />
              </CustomFormItem>
              <CustomFormItem
                label="完成分数"
                name="activity.actCyclicStory.maxFinshCntPerBatch"
                tooltip="每期活动最多完成多少分，即获得花史残页数量，0则不限制"
              >
                <CustomInputNumber
                  v-model:value="config.activity.actCyclicStory.maxFinshCntPerBatch"
                  :min="0"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">丰仓鱼干</Divider>
            <CustomFormItem label="自动参与" name="activity.fishMerge.enabled">
              <Switch v-model:checked="config.activity.fishMerge.enabled" />
            </CustomFormItem>

            <template v-if="config.activity.fishMerge.enabled">
              <CustomFormItem label="显示结果" name="activity.fishMerge.showResult">
                <Switch v-model:checked="config.activity.fishMerge.showResult" />
              </CustomFormItem>
              <CustomFormItem label="失败重启" name="activity.fishMerge.autoRestart">
                <Switch v-model:checked="config.activity.fishMerge.autoRestart" />
              </CustomFormItem>
            </template>

            <Divider orientation="left">奇妙泡泡</Divider>
            <CustomFormItem label="自动参与" name="activity.magicBubble.enabled">
              <Switch v-model:checked="config.activity.magicBubble.enabled" />
            </CustomFormItem>

            <Divider orientation="left">鱼乐无穷</Divider>
            <CustomFormItem label="自动参与" name="activity.fishFun.enabled">
              <Switch v-model:checked="config.activity.fishFun.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.fishFun.enabled">
              <CustomFormItem
                label="体力领取"
                name="activity.fishFun.autoClaimEnergy"
                tooltip="自动领取每日任务完成后的体力奖励"
              >
                <Switch v-model:checked="config.activity.fishFun.autoClaimEnergy" />
              </CustomFormItem>
              <CustomFormItem
                label="游戏倍速"
                name="activity.fishFun.speed"
                tooltip="选择游戏倍速，倍速越高单次移动消耗体力越多"
              >
                <CustomSelect
                  v-model:value="config.activity.fishFun.speed"
                  :options="fishFunSpeedOptions"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
              <CustomFormItem label="显示结果" name="activity.fishFun.showResult">
                <Switch v-model:checked="config.activity.fishFun.showResult" />
              </CustomFormItem>
              <CustomFormItem label="失败重启" name="activity.fishFun.autoRestart">
                <Switch v-model:checked="config.activity.fishFun.autoRestart" />
              </CustomFormItem>
            </template>

            <Divider orientation="left">花漾物语</Divider>
            <CustomFormItem label="自动参与" name="activity.actElim.enabled">
              <Switch v-model:checked="config.activity.actElim.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.actElim.enabled">
              <CustomFormItem
                label="体力领取"
                name="activity.actElim.autoClaimEnergy"
                tooltip="自动领取每日任务完成后的体力奖励"
              >
                <Switch v-model:checked="config.activity.actElim.autoClaimEnergy" />
              </CustomFormItem>
              <CustomFormItem
                label="游戏倍速"
                name="activity.actElim.speed"
                tooltip="选择游戏倍速，倍速越高单次移动消耗体力越多"
              >
                <CustomSelect
                  v-model:value="config.activity.actElim.speed"
                  :options="actElimSpeedOptions"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">红包雨</Divider>
            <CustomFormItem label="自动参与" name="activity.redPacket.enabled" tooltip="自动抢红包">
              <Switch v-model:checked="config.activity.redPacket.enabled" />
            </CustomFormItem>

            <Divider orientation="left">迎新接福</Divider>
            <CustomFormItem
              label="自动领取"
              name="activity.recvLuck.enabled"
              tooltip="自动领取福袋"
            >
              <Switch v-model:checked="config.activity.recvLuck.enabled" />
            </CustomFormItem>

            <Divider orientation="left">杨紫打call</Divider>
            <CustomFormItem
              label="自动打call"
              name="activity.yzCall.enabled"
              tooltip="自动为杨紫打call活动"
            >
              <Switch v-model:checked="config.activity.yzCall.enabled" />
            </CustomFormItem>

            <Divider orientation="left">为家业助力</Divider>
            <CustomFormItem
              label="自动助力"
              name="activity.actJYCALL.enabled"
              tooltip="自动为家业助力"
            >
              <Switch v-model:checked="config.activity.actJYCALL.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.actJYCALL.enabled">
              <CustomFormItem
                label="领取助力奖励"
                name="activity.actJYCALL.recvBoxes"
                tooltip="自动领取家业助力的奖励"
              >
                <Switch v-model:checked="config.activity.actJYCALL.recvBoxes" />
              </CustomFormItem>
            </template>

            <Divider orientation="left">摇钱树</Divider>
            <CustomFormItem label="自动摇钱" name="activity.moneyTree.enabled">
              <Switch v-model:checked="config.activity.moneyTree.enabled" />
            </CustomFormItem>

            <Divider orientation="left">花香满园</Divider>
            <CustomFormItem
              label="自动参与"
              name="activity.zooGameElim.enabled"
              tooltip="自动进行花香满园消消乐活动"
            >
              <Switch v-model:checked="config.activity.zooGameElim.enabled" />
            </CustomFormItem>

            <Divider orientation="left">元宵灯谜</Divider>
            <CustomFormItem
              label="自动答题"
              name="activity.lanternFestival.enabled"
              tooltip="自动完成元宵灯谜答题并领取奖励"
            >
              <Switch v-model:checked="config.activity.lanternFestival.enabled" />
            </CustomFormItem>

            <Divider orientation="left">香卉甜糕</Divider>
            <CustomFormItem label="自动投放" name="activity.actDessert.enabled">
              <Switch v-model:checked="config.activity.actDessert.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.actDessert.enabled">
              <CustomFormItem
                label="体力领取"
                name="activity.actDessert.autoClaimEnergy"
                tooltip="自动领取每日任务完成后的体力奖励"
              >
                <Switch v-model:checked="config.activity.actDessert.autoClaimEnergy" />
              </CustomFormItem>
              <CustomFormItem label="使用道具" name="activity.actDessert.useItems">
                <Switch v-model:checked="config.activity.actDessert.useItems" />
              </CustomFormItem>
              <CustomFormItem
                label="游戏倍速"
                name="activity.actDessert.speed"
                tooltip="选择游戏倍速，倍速越高单次消耗体力越多；需要解锁足够积分才能使用高倍速"
              >
                <CustomSelect
                  v-model:value="config.activity.actDessert.speed"
                  :options="actDessertSpeedOptions"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">田园奇趣</Divider>
            <CustomFormItem label="自动合并" name="activity.actMerge2.enabled">
              <Switch v-model:checked="config.activity.actMerge2.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.actMerge2.enabled">
              <CustomFormItem
                label="体力领取"
                name="activity.actMerge2.autoClaimEnergy"
                tooltip="自动领取每日任务完成后的体力奖励"
              >
                <Switch v-model:checked="config.activity.actMerge2.autoClaimEnergy" />
              </CustomFormItem>
              <CustomFormItem
                label="游戏倍速"
                name="activity.actMerge2.speed"
                tooltip="选择游戏倍速，倍速越高单次消耗体力越多；需要消耗足够体力才能使用高倍速"
              >
                <CustomSelect
                  v-model:value="config.activity.actMerge2.speed"
                  :options="actMerge2SpeedOptions"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">梳丝引线</Divider>
            <CustomFormItem label="自动玩" name="activity.actSpool.enabled">
              <Switch v-model:checked="config.activity.actSpool.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.actSpool.enabled">
              <CustomFormItem
                label="体力领取"
                name="activity.actSpool.autoClaimReward"
                tooltip="自动领取每日任务完成后的体力奖励"
              >
                <Switch v-model:checked="config.activity.actSpool.autoClaimReward" />
              </CustomFormItem>
              <CustomFormItem
                label="开启宝箱"
                name="activity.actSpool.openBox"
                tooltip="自动开启宝箱"
              >
                <Switch v-model:checked="config.activity.actSpool.openBox" />
              </CustomFormItem>
              <CustomFormItem
                label="自动重开"
                name="activity.actSpool.autoRestart"
                tooltip="开启后，死了就会重新开始继续玩"
              >
                <Switch v-model:checked="config.activity.actSpool.autoRestart" />
              </CustomFormItem>
              <CustomFormItem
                label="游戏倍数"
                name="activity.actSpool.speed"
                tooltip="选择游戏倍速，倍速越高单次消耗体力越多；需要消耗足够体力才能使用高倍速"
              >
                <CustomSelect
                  v-model:value="config.activity.actSpool.speed"
                  :options="actSpoolSpeedOptions"
                  class="w-42! sm:w-48!"
                />
              </CustomFormItem>
            </template>

            <Divider orientation="left">龙舟竞渡</Divider>
            <CustomFormItem
              label="参赛"
              name="activity.actDuanWu.enabled"
              tooltip="开启后会玩龙舟"
            >
              <Switch v-model:checked="config.activity.actDuanWu.enabled" />
            </CustomFormItem>
            <template v-if="config.activity.actDuanWu.enabled">
              <CustomFormItem
                label="签到"
                name="activity.actDuanWu.autoSign"
                tooltip="开启后会签到"
              >
                <Switch v-model:checked="config.activity.actDuanWu.autoSign" />
              </CustomFormItem>
              <CustomFormItem
                label="开宝箱"
                name="activity.actDuanWu.autoOpenBox"
                tooltip="开启后会开宝箱"
              >
                <Switch v-model:checked="config.activity.actDuanWu.autoOpenBox" />
              </CustomFormItem>
              <CustomFormItem
                label="购买元宝道具"
                name="activity.actDuanWu.giftBuy"
                tooltip="慎重开启，开启后会总共花费900元宝购买5次龙舟鼓"
              >
                <Switch v-model:checked="config.activity.actDuanWu.giftBuy" />
              </CustomFormItem>
            </template>

            <Divider orientation="left">百花成蜜</Divider>
            <CustomFormItem
              label="领奖励"
              name="activity.actHoney.enabled"
              tooltip="只会领奖励，不会做指定任务"
            >
              <Switch v-model:checked="config.activity.actHoney.enabled" />
            </CustomFormItem>

            <Divider orientation="left">卡册</Divider>
            <CustomFormItem
              label="领取奖励"
              name="activity.actCardCollect.enabledCardCollect"
              tooltip="会领取福利卡包，开启卡包"
            >
              <Switch v-model:checked="config.activity.actCardCollect.enabledCardCollect" />
            </CustomFormItem>
            <CustomFormItem
              label="凝烟成炱"
              name="activity.actCardCollect.enabledSmoke"
              tooltip="会领取灯芯草并且按顺序凝烟"
            >
              <Switch v-model:checked="config.activity.actCardCollect.enabledSmoke" />
            </CustomFormItem>

            <Divider orientation="left">彩翼星绽</Divider>
            <CustomFormItem
              label="灿若繁星"
              name="activity.actAnniv26Star.enabled"
              tooltip="开启后会领取奖励"
            >
              <Switch v-model:checked="config.activity.actAnniv26Star.enabled" />
            </CustomFormItem>
            <CustomFormItem
              v-if="config.activity.actAnniv26Star.enabled"
              label="点亮星辰"
              name="activity.actAnniv26Star.lightStarsEnabled"
              tooltip="开启后星石袋就会去点亮星辰"
            >
              <Switch v-model:checked="config.activity.actAnniv26Star.lightStarsEnabled" />
            </CustomFormItem>
          </div>
        </Form>
      </div>
    </div>

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
import { ref, computed, onMounted, h, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Form,
  Input,
  Switch,
  Divider,
  message,
  Select,
  Radio,
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
  actDessertSpeedOptions,
  actElimSpeedOptions,
  actMerge2SpeedOptions,
  actSpoolSpeedOptions,
  elfOptions,
  fishFunSpeedOptions,
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
import { normalizeGameConfigSelects } from './game-config/normalizeConfigSelects'
import { syncMinTaskScoreForAutoUpgrade, getMinTaskScoreFloor } from './game-config/fmlRaceUtils'
import type { GameConfig } from './game-config/types'

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

// 表单验证规则
const formRules = {
  reconnectInterval: [{ required: true, message: '请输入重连间隔' }],
  nickName: [{ required: true, message: '请输入角色昵称' }],
}

const config = ref<GameConfig>(createDefaultGameConfig())
normalizeGameConfigSelects(config.value)

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

const othersUpgradeTaskChoice = computed({
  get: () =>
    config.value.union.fmlRace.onlySpecifiedUpgradeTask ? 'specified' : 'exclude',
  set: (value: 'exclude' | 'specified') => {
    const onlySpecified = value === 'specified'
    config.value.union.fmlRace.onlySpecifiedUpgradeTask = onlySpecified
    config.value.union.fmlRace.excludeOthersUpgradeTask = !onlySpecified
  },
})

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

watch(
  () => ({
    upgradeTask: config.value.union.fmlRace.upgradeTask,
    minUpgradeTaskScore: config.value.union.fmlRace.minUpgradeTaskScore,
    minTaskScore: config.value.union.fmlRace.minTaskScore,
  }),
  () => {
    syncMinTaskScoreForAutoUpgrade(config.value.union.fmlRace)
  },
)

const minTaskScoreMin = computed(() => {
  const fmlRace = config.value.union.fmlRace
  if (!fmlRace.upgradeTask) return 0
  return getMinTaskScoreFloor(fmlRace.minUpgradeTaskScore)
})

const forceCollectHourOptions = Array.from({ length: 8 }, (_, i) => i + 16)
const forceCollectMinuteOptions = Array.from({ length: 60 }, (_, i) => i)

const cyclicNoteOrderGuardHourOptions = Array.from({ length: 24 }, (_, i) => i)
const cyclicNoteOrderGuardMinuteOptions = Array.from({ length: 60 }, (_, i) => i)

const parseOrderGuardEndTime = (time?: string) => {
  const [hRaw, mRaw] = (time || '21:00').split(':')
  let hour = Number(hRaw)
  let minute = Number(mRaw)
  if (!Number.isFinite(hour)) hour = 21
  if (!Number.isFinite(minute)) minute = 0
  hour = Math.min(23, Math.max(0, Math.floor(hour)))
  minute = Math.min(59, Math.max(0, Math.floor(minute)))
  return { hour, minute }
}

const ensureCyclicNoteOrderGuardRange = () => {
  const orderGuard = config.value.activity.cyclicNote.orderGuard
  if (!orderGuard.timeRanges?.length) {
    orderGuard.timeRanges = [{ start: '00:00', end: '21:00' }]
  }
  return orderGuard.timeRanges[0]
}

const cyclicNoteOrderGuardHour = computed({
  get: () => parseOrderGuardEndTime(ensureCyclicNoteOrderGuardRange().end).hour,
  set: (hour: number) => {
    const range = ensureCyclicNoteOrderGuardRange()
    const { minute } = parseOrderGuardEndTime(range.end)
    range.start = '00:00'
    range.end = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  },
})

const cyclicNoteOrderGuardMinute = computed({
  get: () => parseOrderGuardEndTime(ensureCyclicNoteOrderGuardRange().end).minute,
  set: (minute: number) => {
    const range = ensureCyclicNoteOrderGuardRange()
    const { hour } = parseOrderGuardEndTime(range.end)
    range.start = '00:00'
    range.end = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
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
        const mergedConfig = deepMerge(config.value, response.data.data)
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
      showConfigNoticeModal(
        '配置保存成功',
        '请注意：保存配置后，需要先停止再启动才能生效。',
      )
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
        })
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
      `/api/game-accounts/${importSourceAccountId.value}/setting`
    )

    if (
      sourceResponse.status !== 200 ||
      !sourceResponse.data ||
      sourceResponse.data['未找到账号']
    ) {
      message.error('读取来源账号配置失败')
      return
    }

    const payload = deepMerge(createDefaultGameConfig(), sourceResponse.data.data)
    normalizeGameConfigSelects(payload)
    const saveResponse = await axios.put(`/api/game-accounts/${accountId.value}/setting`, payload)

    if (!saveResponse.data?.success) {
      message.error(saveResponse.data?.message || '导入配置失败')
      return
    }

    config.value = payload
    normalizeGameConfigSelects(config.value)
    importConfigModalVisible.value = false
    showConfigNoticeModal(
      '配置导入成功',
      '请注意：导入配置后，需要先停止再启动才能生效。',
    )
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
