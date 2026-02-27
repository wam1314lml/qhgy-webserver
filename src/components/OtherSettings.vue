<template>
  <div class="other-settings p-6 bg-gray-50 min-h-full">
    <a-card title="其他配置" class="shadow-sm">
      <!-- 加载状态 -->
      <a-spin :spinning="loading" tip="加载中...">
        <a-form
          :model="formState"
          layout="horizontal"
          :label-col="{ span: 4 }"
          :wrapper-col="{ span: 20 }"
        >
          <a-form-item label="群聊图片" name="image">
            <div class="upload-wrapper">
              <a-upload
                v-model:file-list="fileList"
                :before-upload="beforeUpload"
                :max-count="1"
                list-type="picture-card"
                accept="image/*"
                @change="handleChange"
                @remove="handleRemove"
              >
                <div v-if="fileList.length < 1">
                  <PlusOutlined />
                  <div class="ant-upload-text">上传图片</div>
                </div>
              </a-upload>
              <div class="upload-tip">
                <p>支持 JPG、PNG、GIF 等格式，建议尺寸不超过 2MB</p>
              </div>

              <!-- 当前图片预览 -->
              <div v-if="currentImage && !fileList.length" class="current-image-preview mt-4">
                <p class="text-gray-600 mb-2">当前图片：</p>
                <div class="image-container">
                  <img :src="currentImage" alt="当前群聊图片" class="preview-image" />
                </div>
              </div>
            </div>
          </a-form-item>
        </a-form>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import type { UploadChangeParam, UploadFile } from 'ant-design-vue'
import axios from '../utils/axios'

// 响应式数据
const formState = ref({
  image: '',
})

const fileList = ref<UploadFile[]>([])
const currentImage = ref<string>('')
const loading = ref(false)

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

// 上传前的校验
const beforeUpload = (file: File) => {
  console.log('beforeUpload 触发:', file)

  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('只能上传图片文件！')
    return false
  }

  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    message.error('图片大小不能超过 2MB！')
    return false
  }

  // 返回 false 阻止自动上传，我们在 handleChange 中手动处理
  return false
}

// 处理文件变化
const handleChange = async (info: UploadChangeParam) => {
  const { file, fileList: newFileList } = info

  console.log('handleChange 触发:', { file, status: file.status, fileList: newFileList })

  if (file.status === 'removed') {
    return
  }

  // 获取原始文件对象
  const originFile = file.originFileObj || (file as any)

  // 只处理新添加的文件 - 当有新文件且不是移除操作
  if (newFileList.length > 0 && originFile instanceof File) {
    // 显示确认对话框
    Modal.confirm({
      title: '确认上传',
      content: '确定要上传这张图片作为群聊图片吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          loading.value = true

          // 将图片转换为 base64
          const base64Image = await fileToBase64(originFile)
          formState.value.image = base64Image

          // 提交到后端
          await submitImage(base64Image)

          message.success('群聊图片上传成功！')
        } catch (error) {
          console.error('上传失败:', error)
          message.error('上传失败，请重试')
          fileList.value = []
        } finally {
          loading.value = false
        }
      },
      onCancel: () => {
        // 取消上传，清空文件列表
        fileList.value = []
      },
    })
  }
}

// 处理文件移除
const handleRemove = () => {
  fileList.value = []
  formState.value.image = ''
}

// 提交图片到后端
const submitImage = async (base64Image: string) => {
  try {
    const response = await axios.post('/api/admin/group-chat-image', {
      image: base64Image,
    })

    if (response.data.success) {
      // 更新当前图片显示
      currentImage.value = base64Image
      // 清空文件列表，显示已保存的图片
      fileList.value = []
    } else {
      throw new Error(response.data.message || '上传失败')
    }
  } catch (error: any) {
    console.error('提交图片失败:', error)
    throw error
  }
}

// 获取当前配置
const fetchCurrentImage = async () => {
  try {
    loading.value = true
    const response = await axios.get('/api/admin/group-chat-image')

    if (response.data.success && response.data.data?.image) {
      currentImage.value = response.data.data.image
      formState.value.image = response.data.data.image
    }
  } catch (error) {
    console.error('获取群聊图片失败:', error)
    // 如果接口不存在或出错，不显示错误提示（因为可能是首次配置）
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  fetchCurrentImage()
})
</script>

<style scoped lang="scss">
.other-settings {
  .upload-wrapper {
    .upload-tip {
      margin-top: 8px;

      p {
        margin: 0;
        font-size: 12px;
        color: #999;
      }
    }
  }

  .current-image-preview {
    margin-top: 16px;

    .image-container {
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      padding: 8px;
      display: inline-block;
      background-color: #fafafa;

      .preview-image {
        max-width: 300px;
        max-height: 300px;
        display: block;
        border-radius: 4px;
      }
    }
  }
}

:deep(.ant-upload-picture-card-wrapper) {
  .ant-upload.ant-upload-select {
    width: 150px;
    height: 150px;
  }

  .ant-upload-list-picture-card-container {
    width: 150px;
    height: 150px;
  }
}

:deep(.ant-form-item) {
  .ant-form-item-label {
    > label {
      font-weight: 500;
      color: rgba(0, 0, 0, 0.88);
    }
  }
}
</style>
