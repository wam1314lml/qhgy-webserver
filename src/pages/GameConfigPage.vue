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
              label="礼仪分监控"
              name="basic.reputation.enabled"
              tooltip="每5分钟检查礼仪分，低于阈值时自动停止所有任务"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="礼仪分阈值"
              name="basic.reputation.threshold"
              tooltip="礼仪分低于此值时停止所有任务"
            >
              <custom-input-number
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="道具日志"
              name="basic.debug"
              tooltip="开启后显示背包道具的增加和消耗详情"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="重连间隔"
              name="basic.reconnectInterval"
              tooltip="自动顶号间隔，建议设置为 5 分钟"
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

            <CustomFormItem label="每日任务" name="basic.task.daily">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="每周任务" name="basic.task.weekly">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="主线任务" name="basic.task.main">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="主线剧情" name="basic.task.story">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="花坊悬赏" name="basic.task.achieve">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <Divider orientation="left">邮件配置</Divider>
            <CustomFormItem label="自动领取" name="basic.mail">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">福利配置</Divider>
            <CustomFormItem
              label="双倍金币"
              name="basic.benefit.buff"
              tooltip="每4小时自动看视频领取双倍金币福利"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="福利宝箱"
              name="basic.benefit.box"
              tooltip="每1小时自动开启福利宝箱"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="分享奖励"
              name="basic.benefit.shareRwd"
              tooltip="当制作了新花艺、培育了新花朵或升级时自动分享，领取分享奖励"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="防骗宝箱" name="basic.benefit.antiScamBox">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">签到配置</Divider>
            <CustomFormItem label="自动签到" name="basic.sign.daily">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="自动补签" name="basic.sign.patch">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <Divider orientation="left">珍珠配置</Divider>

            <CustomFormItem label="免费珍珠" name="basic.pearl.freePearl" tooltip="自动看视频领取免费珍珠">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="雇佣劳工" name="basic.pearl.autoHire" tooltip="自动雇佣劳工">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem
              label="雇佣券上限"
              name="basic.pearl.maxHireTicketUsage"
              tooltip="当日最大可以使用的雇佣券数量, 为0则不限制。"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="开启防身"
              name="basic.pearl.protectEnabled"
              tooltip="开启后别人雇佣自己会消耗防身符"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="买雇佣书"
              name="basic.pearl.autoBuyHireTicket"
              tooltip="雇佣书不足时自动购买"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="元宝上限"
              name="basic.pearl.maxSpendDmd"
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
              name="basic.shop.videoFreeGift"
              tooltip="自动观看视频领取礼包商城免费礼包"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="材料商店"
              name="basic.shop.cultivateShop.autoBuy"
              tooltip="自动买光材料商店所有耗材，自动刷新"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem
              label="VIP商店"
              name="basic.shop.vipShop.autoBuy"
              tooltip="自动购买VIP商店物品"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">随机事件</Divider>
            <CustomFormItem
              label="自动处理"
              name="basic.randomEvent"
              tooltip="自动处理随机事件"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">喂猫撸猫</Divider>
            <CustomFormItem label="总开关" name="basic.feedCat.enabled" tooltip="自动购买VIP商店物品">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem
              label="自动召回"
              name="basic.feedCat.autoRecall"
              tooltip="自动购买VIP商店物品"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动购买猫粮"
              name="basic.feedCat.autoBuyFood"
              tooltip="自动购买VIP商店物品"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动喂猫"
              name="basic.feedCat.autoFeed"
              tooltip="保持猫粮盆满"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动撸猫"
              name="basic.feedCat.autoStroke"
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
              name="plant.cultivate.enabled"
              tooltip="自动培育可培育花种"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="视频加速" name="plant.cultivate.videoSpeedUp" tooltip="自动观看视频加速培育正在培育的花种，培育时间减半">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem
              label="鲜花升级"
              name="plant.cultivate.upgradeEnabled"
              tooltip="自动花费金币进行鲜花升级"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="目标等级"
              name="plant.cultivate.tagetLevel"
              tooltip="鲜花升级到目标等级"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">水滴配置</Divider>
            <CustomFormItem label="水车水滴" name="plant.water.enabled" tooltip="自动领取水车水滴">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="限时水滴" name="plant.water.timedEnabled" tooltip="自动领取限时水滴">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="水滴阈值"
              name="plant.water.minWaterThreshold"
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
              name="plant.flower.autoUnlockLand"
              tooltip="自动花费金币解锁可解锁的土地"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动收获"
              name="plant.flower.harvestEnabled"
              tooltip="自动完成土地收获"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动种植"
              name="plant.flower.plantEnabled"
              tooltip="自动完成土地浇水，加速，种植"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="视频加速"
              name="plant.flower.videoSpeedUp"
              tooltip="自动观看视频加速收获，当所有土地种了花且可加速才会使用，避免浪费视频加速次数"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="使用加速"
              name="plant.flower.useSpeedUpTicket"
              tooltip="使用加速券加速收获"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="保留水滴"
              name="plant.flower.waterThreshold"
              tooltip="保留多少水滴不用于浇花"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem label="任务优先" name="plant.flower.taskMode">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="任务日志"
              name="plant.flower.taskLogEnabled"
              tooltip="是否显示种植任务队列日志"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="种植模式"
              name="plant.flower.plantingMode"
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
              name="plant.flower.flowerCount"
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
              name="plant.flower.minFlowerLevel"
              tooltip="限制种植的最低花朵等级，0则不限制"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">好友偷花</Divider>
            <CustomFormItem label="自动偷花" name="plant.friendSteal.enabled" tooltip="默认不会偷取花灵">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="偷取花灵" name="plant.friendSteal.stealElves" tooltip="开启后偷取有花灵的地块，关闭则跳过有花灵的地块">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="偷花模式"
              name="plant.friendSteal.stealMode"
              tooltip="选择偷花过滤模式：指定品质或指定花朵"
            >
              <Radio.Group v-model:value="config.homeland.drainStaminaStealMode">
                <Space direction="vertical">
                  <Radio :value="0">指定品质 </Radio>
                  <Radio :value="1">指定花朵 </Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              label="指定品质"
              name="plant.friendSteal.stealQualities"
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
              name="plant.friendSteal.buyStealEnabled"
              tooltip="花费好友币购买偷取次数"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="购买次数"
              name="plant.friendSteal.buyStealCount"
              tooltip="每个好友购买多少次偷取次数"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">花灵</Divider>
            <CustomFormItem
              label="自动种花灵"
              name="plant.elves.enabled"
              tooltip="自动选择双倍加成花灵种植（8朵主花+其余辅花），需要打开种植系统自动收获和自动种植，每日花灵达到收获上限后恢复到原有种植模式"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动申请协助"
              name="plant.elves.requestAid"
              tooltip="自动参与花贸市场"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动领取协助加成"
              name="plant.elves.recvAid"
              tooltip="当协助人数达到5人时自动领取协助加成"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动协助好友"
              name="plant.elves.helpFrd"
              tooltip="自动参与花贸市场"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动派遣花灵"
              name="plant.elves.dispatch"
              tooltip="自动将背包中的花灵派遣到空闲位置"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动加速派遣"
              name="plant.elves.speedUpDispatch"
              tooltip="花费元宝加速派遣中的花灵"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动领取派遣奖励"
              name="plant.elves.recvDispatch"
              tooltip="派遣完成后自动领取星辰币奖励"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">花灵密令</Divider>
            <CustomFormItem label="等级奖励" name="plant.elves.recvPass" tooltip="自动领取花灵密令等级奖励">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="任务奖励" name="plant.elves.recvPassTask" tooltip="自动领取花灵密令任务奖励">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">花之密令</Divider>
            <CustomFormItem label="等级奖励" name="plant.elves.recvFlowerPass" tooltip="自动领取花之密令等级奖励">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="任务奖励" name="plant.elves.recvFlowerPassTask" tooltip="自动领取花之密令任务奖励">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">花艺上架</Divider>
            <CustomFormItem label="自动解锁花架" name="plant.artSell.autoUnlockStand" tooltip="自动解锁花架">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="自动上架" name="plant.artSell.autoSellArt" tooltip="自动上架花艺，自动领取金币收益">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="指定花艺"
              name="plant.artSell.specifiedArts"
              tooltip="指定花艺，优先选择有库存的上架，否则进行制作，如果花朵库存不足需要配合种植开启任务优先进行使用。"
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
              name="plant.artSell.flowerArtPerRack"
              tooltip="每个花架上架多少花艺"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem label="花艺经验" name="plant.artSell.recvArtCreateRwd" tooltip="自动领取花艺制作经验">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="图鉴奖励" name="plant.artSell.recvCollectRwd" tooltip="自动领取鲜花收藏，花瓶收藏，花艺收藏奖励">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">花贸市场</Divider>
            <CustomFormItem label="解锁货架" name="plant.market.autoUnlockShelf" tooltip="自动花费元宝解锁花贸市场货架">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动上架"
              name="plant.market.putEnabled"
              tooltip="自动领取花贸市场收益并上架花朵，注意上架会消耗元宝，请谨慎开启！"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="好友摊位扫货"
              name="plant.market.autoBuyFromFriend"
              tooltip="自动购买好友货架的花朵"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>
          <!-- 订单配置 -->
          <div v-if="activeTab === '订单'" class="config-section">
            <Divider orientation="left">居民订单</Divider>
            <CustomFormItem
              label="普通订单"
              name="order.resident.normalEnabled"
              tooltip="自动提交普通居民订单，不包括建材和绸缎订单，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="普通订单上限"
              name="order.resident.normalMaxNum"
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
              name="order.resident.satinEnabled"
              tooltip="自动提交绸缎订单，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="绸缎订单上限"
              name="order.resident.satinMaxNum"
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
              name="order.resident.decorateEnabled"
              tooltip="自动提交建材订单，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="建材订单上限"
              name="order.resident.decorateMaxNum"
              tooltip="建材订单单日最大完成次数"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
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
            <CustomFormItem label="自动完成" name="order.customer.enabled" tooltip="自动完成顾客订单">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动拒绝"
              name="order.customer.rejectEnabled"
              tooltip="自动拒绝无法培育且库存不足的订单"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">宫廷订单</Divider>
            <CustomFormItem label="自动完成" name="order.palace.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">组团订单</Divider>
            <CustomFormItem label="自动完成" name="order.team.enabled" tooltip="自动完成团单">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
          </div>
          <!-- 公会配置 -->
          <div v-if="activeTab === '公会'" class="config-section">
            <Divider orientation="left">公会种植</Divider>
            <CustomFormItem label="自动收获" name="union.land.harvest" tooltip="公会土地自动收获">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem
              label="品质限定"
              name="union.land.flowers"
              tooltip="限定要在公会土地种植的花朵品质"
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
            <CustomFormItem label="视频建设" name="union.build.free" tooltip="自动观看视频进行公会建设">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="金币建设" name="union.build.gld" tooltip="自动花费金币进行公会建设">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="元宝建设" name="union.build.dmd" tooltip="自动花费元宝进行公会建设">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">公会分享</Divider>
            <CustomFormItem label="自动分享" name="union.flower.share" tooltip="自动分享花到公会分享栏">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="分享模式" name="union.flower.shareMode">
              <Radio.Group v-model:value="config.homeland.drainStaminaStealMode1">
                <Space direction="vertical">
                  <Radio :value="0">指定品质 </Radio>
                  <Radio :value="1">指定花朵 </Radio>
                </Space>
              </Radio.Group>
            </CustomFormItem>
            <CustomFormItem
              label="品质限定"
              name="union.flower.shareQualities"
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
              name="union.flower.shareFlowerIds"
              tooltip="选择要分享到公会的具体花朵"
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
              name="union.flower.take"
              tooltip="自动摸取别人分享的花"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">公会竞赛</Divider>
            <CustomFormItem
              label="自动完成"
              name="union.fmlRace.enabled"
              tooltip="自动领取，完成公会竞赛任务"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动启用模块"
              name="union.fmlRace.autoEnableModules"
              tooltip="根据任务类型自动启用相关模块"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动升级任务"
              name="union.fmlRace.upgradeTask"
              tooltip="领取任务后花费元宝自动升级"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="限制分数"
              name="union.fmlRace.minTaskScore"
              tooltip="只接分数不低于此值的任务，0 表示不限制"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>
            <CustomFormItem
              label="删除低分任务"
              name="union.fmlRace.deleteTask"
              tooltip="会长/副会长专属：自动删除低于指定分数的任务"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="删除分数上限"
              name="union.fmlRace.deleteTaskMaxScore"
              tooltip="低于此分数的未领取任务将被自动删除"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">公会摸花</Divider>
            <CustomFormItem
              label="自动领取"
              name="union.redPacket.enabled"
              tooltip="自动领取公会红包"
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
            <Divider orientation="left">花笺集芳</Divider>
            <CustomFormItem
              label="自动完成"
              name="activity.cyclicNote.enabled"
              tooltip="自动完成花笺集芳任务，自动领取阶段宝箱奖励"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="解锁槽位"
              name="activity.cyclicNote.unlockSlot"
              tooltip="自动花费元宝解锁任务槽位"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="自动开启模块"
              name="activity.cyclicNote.autoEnableModules"
              tooltip="根据任务自动启用对应功能模块（种植、花艺售卖、居民订单、顾客订单、珍珠雇佣等），任务完成后自动恢复到您开始的设置"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">莳花纪闻</Divider>
            <CustomFormItem
              label="自动完成"
              name="activity.actCyclicStory.enabled"
              tooltip="自动完成莳花纪闻订单任务，如果花库存不足，需要配合种植开启任务优先使用"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="任务刷新"
              name="activity.actCyclicStory.refreshEnabled"
              tooltip="花费元宝刷新莳花纪闻订单任务"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="完成分数"
              name="activity.actCyclicStory.maxFinshCntPerBatch"
              tooltip="每期活动最多完成多少分，即获得花史残页数量，0则不限制"
            >
              <CustomInputNumber
                v-model:value="config.homeland.xianYuNum"
                :min="0"
                class="w-42! sm:w-48!"
              />
            </CustomFormItem>

            <Divider orientation="left">丰仓鱼干</Divider>
            <CustomFormItem label="自动参与" name="activity.fishMerge.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <CustomFormItem label="显示结果" name="activity.fishMerge.showResult">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="失败重启" name="activity.fishMerge.autoRestart">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">奇妙泡泡</Divider>
            <CustomFormItem label="自动参与" name="activity.magicBubble.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">鱼乐无穷</Divider>
            <CustomFormItem label="自动参与" name="activity.fishFun.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="体力领取"
              name="activity.fishFun.autoClaimEnergy"
              tooltip="自动领取每日任务完成后的体力奖励"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="游戏倍速"
              name="activity.fishFun.speed"
              tooltip="选择游戏倍速，倍速越高单次移动消耗体力越多"
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
            <CustomFormItem label="显示结果" name="activity.fishFun.showResult">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem label="失败重启" name="activity.fishFun.autoRestart">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">花漾物语</Divider>
            <CustomFormItem label="自动参与" name="activity.actElim.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="体力领取"
              name="activity.actElim.autoClaimEnergy"
              tooltip="自动领取每日任务完成后的体力奖励"
            >
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
            <CustomFormItem
              label="游戏倍速"
              name="activity.actElim.speed"
              tooltip="选择游戏倍速，倍速越高单次移动消耗体力越多"
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

            <Divider orientation="left">红包雨</Divider>
            <CustomFormItem label="自动参与" name="activity.redPacket.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">迎新接福</Divider>
            <CustomFormItem label="自动领取" name="activity.recvLuck.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">杨紫打call</Divider>
            <CustomFormItem label="自动打call" name="activity.yzCall.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>

            <Divider orientation="left">摇钱树</Divider>
            <CustomFormItem label="自动摇钱" name="activity.moneyTree.enabled">
              <Switch v-model:checked="config.basic.hasSeparation" />
            </CustomFormItem>
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
