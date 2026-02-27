import { Plugin } from 'vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Vite 插件：在构建完成后更新 HTML 文件中 title 的时间戳
 * 将 title 最后的四位数字替换为当前时间（时+分，HHMM 格式）
 */
export default function updateTitlePlugin(): Plugin {
  return {
    name: 'update-title',
    // 在构建完成后执行
    closeBundle() {
      try {
        // 获取当前时间，格式为 HHMM
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        const timeStamp = hours + minutes

        // HTML 文件路径
        const htmlPath = resolve(process.cwd(), 'dist/index.html')

        try {
          // 读取 HTML 文件
          const htmlContent = readFileSync(htmlPath, 'utf-8')

          // 使用正则表达式匹配 title 中最后的四位数字并替换
          // 匹配模式：<title>...数字4位</title>
          const updatedContent = htmlContent.replace(
            /(<title>.*?)(\d{4})(<\/title>)/i,
            `$1${timeStamp}$3`,
          )

          // 检查是否有变化
          if (updatedContent !== htmlContent) {
            // 写回文件
            writeFileSync(htmlPath, updatedContent, 'utf-8')
            console.log(`✅ Title timestamp updated to: ${timeStamp}`)
          } else {
            console.log('⚠️  No title with 4-digit timestamp found to update')
          }
        } catch (fileError) {
          console.warn(`⚠️  Could not read/write HTML file: ${fileError}`)
        }
      } catch (error) {
        console.error('❌ Error in updateTitlePlugin:', error)
      }
    },
  }
}
