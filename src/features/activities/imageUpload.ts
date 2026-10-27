/** 上传前缩小大图，避免把数 MB 原图放入活动列表正文；最终图片仍由服务端校验。 */
export async function prepareActivityImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('请选择不超过 8 MB 的 PNG、JPEG 或 WebP 图片')
  const source = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = source
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 24_000_000) throw new Error('图片尺寸过大，请选择 2400 万像素以内的图片')
    const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法处理图片')
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const value = canvas.toDataURL('image/jpeg', 0.88)
    if (value.length > Math.ceil(2 * 1024 * 1024 * 4 / 3)) throw new Error('图片压缩后仍超过 2 MB，请使用更小的图片')
    return value
  } finally { URL.revokeObjectURL(source) }
}
