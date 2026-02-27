/**
 * 前端构建配置文件
 * 修改后需要重新执行 npm run build
 */

export default {
  /**
   * 代码混淆开关
   * true: 启用混淆（推荐生产环境）
   * false: 关闭混淆（方便调试问题）
   */
  ENABLE_OBFUSCATION: true,

  /**
   * 混淆强度配置
   * 'high': 高强度混淆（性能影响较大，安全性最高）
   * 'medium': 中等混淆（推荐，平衡性能和安全）
   * 'low': 低强度混淆（性能影响小，混淆效果一般）
   */
  OBFUSCATION_LEVEL: 'high',

  /**
   * 移除 console 日志
   * true: 生产环境移除所有 console
   * false: 保留 console（方便排查问题）
   * 注意：设置为 true 需要安装 terser 依赖
   */
  REMOVE_CONSOLE: true,
}
