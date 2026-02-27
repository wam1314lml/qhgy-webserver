import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'path'
import obfuscator from 'rollup-plugin-obfuscator'
import buildConfig from './build.config.js'
// import updateTitlePlugin from './vite-plugin-update-title'

/**
 * 根据混淆强度获取混淆配置
 */
function getObfuscationOptions(level: string) {
  const baseOptions = {
    compact: true, // 是否压缩代码，移除换行和空格
    log: false, // 是否在控制台输出混淆器日志
    renameGlobals: false, // 是否重命名全局变量和函数名
    identifierNamesGenerator: 'hexadecimal', // 标识符名称生成器类型（hexadecimal/mangled/dictionary）
  }

  switch (level) {
    case 'high':
      return {
        ...baseOptions,
        controlFlowFlattening: true, // 是否启用控制流扁平化，将代码逻辑转换为更难理解的形式
        controlFlowFlatteningThreshold: 0.75, // 控制流扁平化应用的代码比例（0-1）
        deadCodeInjection: true, // 是否注入无用的死代码块
        deadCodeInjectionThreshold: 0.4, // 死代码注入的比例（0-1）
        debugProtection: false, // 是否启用调试保护，阻止开发者工具调试
        debugProtectionInterval: 0, // 调试保护的检测间隔时间（毫秒），0表示仅检测一次
        disableConsoleOutput: true, // 是否禁用所有console方法的输出
        numbersToExpressions: true, // 是否将数字字面量转换为表达式
        selfDefending: true, // 是否启用自我防御，防止代码被格式化和美化
        simplify: true, // 是否简化代码结构
        splitStrings: true, // 是否拆分字符串字面量
        splitStringsChunkLength: 10, // 字符串拆分时每个块的长度
        stringArray: true, // 是否将字符串字面量提取到一个特殊数组中
        stringArrayCallsTransform: true, // 是否转换字符串数组的调用方式
        stringArrayEncoding: ['base64'], // 字符串数组的编码方式（none/base64/rc4）
        stringArrayIndexShift: true, // 是否移动字符串数组的索引
        stringArrayRotate: true, // 是否旋转字符串数组
        stringArrayShuffle: true, // 是否打乱字符串数组的顺序
        stringArrayWrappersCount: 2, // 字符串数组包装器的数量
        stringArrayWrappersChainedCalls: true, // 是否为字符串数组包装器启用链式调用
        stringArrayWrappersParametersMaxCount: 4, // 字符串数组包装器的最大参数数量
        stringArrayWrappersType: 'function', // 字符串数组包装器的类型（variable/function）
        stringArrayThreshold: 0.75, // 字符串字面量插入到字符串数组的比例（0-1）
        transformObjectKeys: true, // 是否转换对象的键名
        unicodeEscapeSequence: true, // 是否将字符串转换为Unicode转义序列
      }

    case 'medium':
      return {
        ...baseOptions,
        controlFlowFlattening: true, // 是否启用控制流扁平化
        controlFlowFlatteningThreshold: 0.5, // 控制流扁平化应用的代码比例（0-1）
        deadCodeInjection: false, // 是否注入无用的死代码块
        debugProtection: false, // 是否启用调试保护
        disableConsoleOutput: true, // 是否禁用所有console方法的输出
        numbersToExpressions: false, // 是否将数字字面量转换为表达式
        selfDefending: true, // 是否启用自我防御
        simplify: true, // 是否简化代码结构
        splitStrings: true, // 是否拆分字符串字面量
        splitStringsChunkLength: 10, // 字符串拆分时每个块的长度
        stringArray: true, // 是否将字符串字面量提取到一个特殊数组中
        stringArrayCallsTransform: false, // 是否转换字符串数组的调用方式
        stringArrayEncoding: ['base64'], // 字符串数组的编码方式（none/base64/rc4）
        stringArrayIndexShift: true, // 是否移动字符串数组的索引
        stringArrayRotate: true, // 是否旋转字符串数组
        stringArrayShuffle: true, // 是否打乱字符串数组的顺序
        stringArrayThreshold: 0.5, // 字符串字面量插入到字符串数组的比例（0-1）
        transformObjectKeys: false, // 是否转换对象的键名
        unicodeEscapeSequence: false, // 是否将字符串转换为Unicode转义序列
      }

    case 'low':
      return {
        ...baseOptions,
        controlFlowFlattening: true, // 是否启用控制流扁平化
        deadCodeInjection: true, // 是否注入无用的死代码块
        debugProtection: false, // 是否启用调试保护
        disableConsoleOutput: true, // 是否禁用所有console方法的输出
        numbersToExpressions: true, // 是否将数字字面量转换为表达式
        selfDefending: true, // 是否启用自我防御
        simplify: true, // 是否简化代码结构
        splitStrings: true, // 是否拆分字符串字面量
        stringArray: true, // 是否将字符串字面量提取到一个特殊数组中
        stringArrayEncoding: [], // 字符串数组的编码方式（none/base64/rc4）
        stringArrayThreshold: 0.3, // 字符串字面量插入到字符串数组的比例（0-1）
      }

    default:
      return baseOptions
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  // 从环境变量获取代理目标地址，默认为 localhost:5000
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:5000'

  console.log('========================================')
  console.log('📦 前端构建配置:')
  console.log(`   代码混淆: ${buildConfig.ENABLE_OBFUSCATION ? '✅ 已启用' : '❌ 已关闭'}`)
  console.log(`   混淆强度: ${buildConfig.OBFUSCATION_LEVEL}`)
  console.log(`   移除Console: ${buildConfig.REMOVE_CONSOLE ? '✅ 是' : '❌ 否'}`)
  console.log('========================================')

  return {
    plugins: [
      vue(),
      UnoCSS(),
      basicSsl(), // 启用 HTTPS 支持（自签名证书）
      // updateTitlePlugin()
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    // 构建配置
    build: {
      // 使用 terser 移除 console（可选）
      minify: buildConfig.REMOVE_CONSOLE ? 'terser' : 'esbuild',
      terserOptions: buildConfig.REMOVE_CONSOLE
        ? {
            compress: {
              drop_console: true, // 移除所有 console
              drop_debugger: true, // 移除 debugger
            },
            format: {
              comments: false, // 移除所有注释
            },
          }
        : undefined,
      // Rollup 配置
      rollupOptions: {
        plugins: buildConfig.ENABLE_OBFUSCATION
          ? [
              obfuscator({
                options: getObfuscationOptions(buildConfig.OBFUSCATION_LEVEL),
              }),
            ]
          : [],
      },
    },
    server: {
      host: '0.0.0.0', // 允许外部访问
      port: 8089,
      allowedHosts: ['localhost', '127.0.0.1', 'tera.game-re.cn'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/temp': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
