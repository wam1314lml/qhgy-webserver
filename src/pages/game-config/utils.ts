import dayjs from 'dayjs'

// 深度合并函数，用于检查和补齐配置数据
export const deepMerge = (defaultObj: any, responseObj: any): any => {
  if (responseObj === null || responseObj === undefined) {
    return defaultObj
  }

  if (typeof defaultObj !== 'object' || typeof responseObj !== 'object') {
    return responseObj !== undefined ? responseObj : defaultObj
  }

  if (Array.isArray(defaultObj)) {
    return Array.isArray(responseObj) ? responseObj : defaultObj
  }

  const result = { ...defaultObj }

  for (const key in responseObj) {
    if (responseObj.hasOwnProperty(key)) {
      if (defaultObj.hasOwnProperty(key)) {
        result[key] = deepMerge(defaultObj[key], responseObj[key])
      } else {
        result[key] = responseObj[key]
      }
    }
  }

  return result
}

// 时间转换辅助函数
export const timeStringToDayjs = (timeString: string) => {
  return timeString ? dayjs(timeString, 'HH:mm') : dayjs()
}

// 时间格式校验方法
export const validateTimeFormat = (timeString: string) => {
  if (!timeString) return { isValid: false, errorMessage: '时间不能为空' }

  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

  if (!timePattern.test(timeString)) {
    return {
      isValid: false,
      errorMessage: `时间格式不正确: ${timeString}，应为HH:mm格式`,
    }
  }

  return { isValid: true, errorMessage: '' }
}

// 时间范围校验方法
export const validateTimeRange = (timeRange: string, defaultValue: string = '23:30-23:59') => {
  if (!timeRange) return defaultValue

  if (!timeRange.includes('-')) {
    console.warn('⚠️ 时间范围格式不正确，缺少分隔符"-"')
    return defaultValue
  }

  const [startTime, endTime] = timeRange.split('-')
  const startValidation = validateTimeFormat(startTime)
  const endValidation = validateTimeFormat(endTime)

  if (!startValidation.isValid) {
    console.warn(`⚠️ 开始${startValidation.errorMessage}`)
    return defaultValue
  }

  if (!endValidation.isValid) {
    console.warn(`⚠️ 结束${endValidation.errorMessage}`)
    return defaultValue
  }

  console.log(`✅ 时间格式验证通过: ${startTime} - ${endTime}`)
  return timeRange
}

// 禁用时间配置（只允许10-21点）
export const getDisabledTime = () => {
  return {
    disabledHours: () => {
      const hours = []
      for (let i = 0; i < 10; i++) {
        hours.push(i)
      }
      for (let i = 22; i < 24; i++) {
        hours.push(i)
      }
      return hours
    },
  }
}

// 禁用时间配置（只允许08:00-18:59）
export const getDisabledTimeForSetTime = () => {
  return {
    disabledHours: () => {
      const hours = []
      for (let i = 0; i < 8; i++) {
        hours.push(i)
      }
      for (let i = 19; i < 24; i++) {
        hours.push(i)
      }
      return hours
    },
  }
}

// 禁用除了21点以外的所有小时
export const disabledHoursForRandomJoin = () => {
  return Array.from({ length: 24 }, (_, i) => i).filter((hour) => hour !== 21)
}

// 只允许55-59分钟
export const disabledMinutesForRandomJoin = () => {
  return Array.from({ length: 60 }, (_, i) => i).filter((minute) => minute < 55 || minute > 59)
}
