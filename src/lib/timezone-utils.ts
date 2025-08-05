/**
 * 时区处理工具 - 专门处理美西时间（PST/PDT）
 * 用于Star系统的日期边界计算
 */

// 美西时区标识符
const PACIFIC_TIMEZONE = 'America/Los_Angeles'

/**
 * 获取美西时间的当前日期字符串 (YYYY-MM-DD)
 */
export function getPacificDateString(): string {
  const now = new Date()
  const pacificDate = new Date(now.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }))
  
  const year = pacificDate.getFullYear()
  const month = String(pacificDate.getMonth() + 1).padStart(2, '0')
  const day = String(pacificDate.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 获取美西时间的当前时间戳
 */
export function getPacificTimestamp(): Date {
  const now = new Date()
  return new Date(now.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }))
}

/**
 * 将任意时间转换为美西时间的日期字符串
 */
export function toPacificDateString(date: Date): string {
  const pacificDate = new Date(date.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }))
  
  const year = pacificDate.getFullYear()
  const month = String(pacificDate.getMonth() + 1).padStart(2, '0')
  const day = String(pacificDate.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 检查两个日期是否为美西时间的同一天
 */
export function isSamePacificDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false
  
  return toPacificDateString(date1) === toPacificDateString(date2)
}

/**
 * 获取美西时间今天的开始时间 (00:00:00)
 */
export function getPacificDayStart(): Date {
  const pacificDateStr = getPacificDateString()
  // 创建美西时间的今天00:00:00
  const dayStart = new Date(`${pacificDateStr}T00:00:00`)
  
  // 转换回UTC时间
  const utcOffset = dayStart.getTimezoneOffset() * 60000
  const pacificOffset = getPacificTimezoneOffset()
  
  return new Date(dayStart.getTime() - utcOffset + pacificOffset)
}

/**
 * 获取美西时间今天的结束时间 (23:59:59.999)
 */
export function getPacificDayEnd(): Date {
  const dayStart = getPacificDayStart()
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
}

/**
 * 获取美西时区相对于UTC的偏移量（毫秒）
 */
function getPacificTimezoneOffset(): number {
  const now = new Date()
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  const pacificTime = new Date(now.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }))
  
  return pacificTime.getTime() - utcTime
}

/**
 * 检查当前是否为美西时间的新一天（相对于上次检查时间）
 */
export function isNewPacificDay(lastCheckTime: Date | null): boolean {
  if (!lastCheckTime) return true
  
  const currentPacificDay = getPacificDateString()
  const lastCheckPacificDay = toPacificDateString(lastCheckTime)
  
  return currentPacificDay !== lastCheckPacificDay
}

/**
 * 生成用于数据库唯一性约束的日期键
 * 格式: userId:YYYY-MM-DD (基于美西时间)
 */
export function generateDailyUniqueKey(userId: string, action: string): string {
  const pacificDate = getPacificDateString()
  return `${userId}:${action}:${pacificDate}`
}

/**
 * 调试用：获取当前美西时间信息
 */
export function getPacificTimeInfo() {
  const now = new Date()
  const pacificTime = getPacificTimestamp()
  const pacificDateStr = getPacificDateString()
  
  return {
    utcTime: now.toISOString(),
    pacificTime: pacificTime.toISOString(),
    pacificDateString: pacificDateStr,
    isDST: isPacificDST(now)
  }
}

/**
 * 检查当前是否为太平洋夏令时 (PDT)
 */
function isPacificDST(date: Date): boolean {
  const year = date.getFullYear()
  
  // 夏令时通常从3月第二个周日开始，到11月第一个周日结束
  // 这是一个简化的检查，实际情况可能更复杂
  const march = new Date(year, 2, 1) // 3月1日
  const november = new Date(year, 10, 1) // 11月1日
  
  // 找到3月第二个周日
  const firstSundayMarch = 7 - march.getDay()
  const secondSundayMarch = firstSundayMarch + 7
  const dstStart = new Date(year, 2, secondSundayMarch)
  
  // 找到11月第一个周日
  const firstSundayNovember = 7 - november.getDay()
  const dstEnd = new Date(year, 10, firstSundayNovember)
  
  return date >= dstStart && date < dstEnd
}
