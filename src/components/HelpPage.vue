<template>
  <div class="help-container">
    <a-collapse v-model:activeKey="activeKey" :bordered="false" class="help-collapse">
      <a-collapse-panel key="1" header="如何开始使用？">
        <div class="collapse-content">
          <h4>系统介绍</h4>
          <p>欢迎使用我们的系统！这是一个功能强大的管理平台，您可以通过以下步骤开始使用：</p>
          <ol>
            <li>首先完成账号注册和登录</li>
            <li>在仪表盘查看您的账户信息和数据概览</li>
            <li>根据需要配置相关设置</li>
            <li>开始使用各项功能</li>
          </ol>

          <h4>快速导航</h4>
          <ul>
            <li><strong>仪表盘</strong>：查看账户概览和重要数据</li>
            <li><strong>个人中心</strong>：管理个人资料和设置</li>
            <li><strong>首页</strong>：配置和管理参数</li>
            <li><strong>充值页面</strong>：账户充值操作</li>
          </ul>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeKey = ref(['1'])
</script>

<style scoped>
.help-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.help-collapse {
  background: transparent;
}

.help-collapse :deep(.ant-collapse-item) {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.help-collapse :deep(.ant-collapse-header) {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.help-collapse :deep(.ant-collapse-header:hover) {
  background: #f0f0f0;
}

.collapse-content {
  padding: 4px 0;
  line-height: 1.6;
}

.collapse-content h4 {
  color: #1890ff;
  margin: 16px 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.collapse-content h5 {
  color: #333;
  margin: 12px 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.collapse-content p {
  margin: 8px 0;
  color: #555;
}

.collapse-content ul,
.collapse-content ol {
  margin: 8px 0 16px 0;
  padding-left: 24px;
}

.collapse-content li {
  margin: 4px 0;
  color: #555;
}

.collapse-content strong {
  color: #1890ff;
}
</style>
