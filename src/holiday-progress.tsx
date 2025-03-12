import { updateCommandMetadata, showToast, Toast, environment, LaunchType, LaunchProps } from "@raycast/api";
import { getNextHoliday } from "./utils/holiday";

function formatDate(date: string): string {
  // 从字符串创建Date对象
  const dateObj = new Date(date);
  return `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
}

// 将数字转换为emoji数字
function numberToEmoji(num: number): string {
  if (num > 99) return `${num}`; // 如果大于99，直接返回数字
  
  const emojiDigits = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  
  if (num < 10) {
    return emojiDigits[num];
  } else {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${emojiDigits[tens]}${emojiDigits[ones]}`;
  }
}

// 生成节假日状态显示
function generateHolidayStatus(holiday: { name: string, startDate: string, endDate: string, daysUntil: number }): string {
  const startDateStr = formatDate(holiday.startDate);
  const endDateStr = formatDate(holiday.endDate);
  const dateRange = `${startDateStr}-${endDateStr}`;
  
  // 根据剩余天数选择合适的emoji
  let statusEmoji = '🎉';
  if (holiday.daysUntil <= 0) {
    statusEmoji = '🎊'; // 已经开始
  } else if (holiday.daysUntil <= 3) {
    statusEmoji = '⏳'; // 即将到来
  } else if (holiday.daysUntil <= 7) {
    statusEmoji = '📅'; // 一周内
  } else if (holiday.daysUntil <= 30) {
    statusEmoji = '📆'; // 一个月内
  }
  
  // 剩余天数的emoji表示
  const daysEmoji = holiday.daysUntil > 0 ? numberToEmoji(holiday.daysUntil) : '0️⃣';
  
  // 组合最终显示
  return `${statusEmoji} ${holiday.name}(${dateRange}) ${daysEmoji} ${holiday.daysUntil > 0 ? '天' : '放假啦'}`;
}

export default async function Command(props: LaunchProps) {
  try {
    // 检查是否是通过刷新按钮触发的或用户手动激活的
    const isRefreshAction = props.launchContext?.action === "refresh";
    const isUserInitiated = environment.launchType === LaunchType.UserInitiated;
    
    // 在以下情况下强制刷新：1. 点击刷新按钮 2. 用户手动激活命令
    const shouldForceRefresh = isRefreshAction || isUserInitiated;
    
    // 调试日志
    console.log("Launch type:", environment.launchType, 
                "isUserInitiated:", isUserInitiated,
                "isRefreshAction:", isRefreshAction,
                "shouldForceRefresh:", shouldForceRefresh);
    
    // 根据条件决定是否强制刷新
    const holiday = await getNextHoliday(shouldForceRefresh);
    
    if (!holiday) {
      updateCommandMetadata({
        subtitle: "无法获取节假日信息"
      });
      return;
    }

    // 调试日志
    console.log("Holiday dates:", {
      name: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      daysUntil: holiday.daysUntil,
      refreshType: shouldForceRefresh ? "强制刷新" : "使用缓存"
    });

    // 生成节假日状态显示
    const subtitle = generateHolidayStatus(holiday);
    
    updateCommandMetadata({ subtitle });

    // 只在用户主动触发命令或刷新时显示 Toast
    if (isUserInitiated || isRefreshAction) {
      await showToast({
        style: Toast.Style.Success,
        title: shouldForceRefresh ? "数据已刷新" : holiday.name,
        message: `${formatDate(holiday.startDate)}-${formatDate(holiday.endDate)} ${holiday.daysUntil > 0 ? `还有 ${holiday.daysUntil} 天` : "已开始"}`
      });
    }
  } catch (error) {
    console.error("Error in holiday progress command:", error);
    updateCommandMetadata({
      subtitle: "获取节假日信息时出错"
    });
    
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "错误",
        message: "获取节假日信息时出错"
      });
    }
  }
} 
