import { updateCommandMetadata, showToast, Toast, environment, LaunchType } from "@raycast/api";
import { getNextHoliday } from "./utils/holiday";

function formatDate(date: string): string {
  // 从字符串创建Date对象
  const dateObj = new Date(date);
  return `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
}

function generateProgressBar(daysUntil: number): string {
  // 假设最大显示30天的进度
  const maxDays = 30;
  const progress = Math.max(0, Math.min(1, 1 - (daysUntil / maxDays)));
  const width = 10; // 缩短进度条长度以适应命令列表显示
  const filledCount = Math.round(progress * width);
  const emptyCount = width - filledCount;
  
  return "■".repeat(filledCount) + "□".repeat(emptyCount);
}

export default async function Command() {
  try {
    // 检查是否是通过刷新按钮触发的或用户手动激活的
    const isRefreshAction = environment.launchContext?.action === "refresh";
    const isUserInitiated = environment.launchType === LaunchType.UserInitiated;
    
    // 在以下情况下强制刷新：1. 点击刷新按钮 2. 用户手动激活命令
    const shouldForceRefresh = isRefreshAction || isUserInitiated;
    
    console.log("Launch context:", environment.launchContext, 
                "isRefreshAction:", isRefreshAction, 
                "isUserInitiated:", isUserInitiated,
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

    const progressBar = generateProgressBar(holiday.daysUntil);
    const startDateStr = formatDate(holiday.startDate);
    const endDateStr = formatDate(holiday.endDate);
    const daysText = holiday.daysUntil > 0 ? `还有 ${holiday.daysUntil} 天` : "已开始";
    const subtitle = `${holiday.name}(${startDateStr}-${endDateStr}) ${progressBar} ${daysText}`;
    
    updateCommandMetadata({ subtitle });

    // 只在用户主动触发命令或刷新时显示 Toast
    if (isUserInitiated || isRefreshAction) {
      await showToast({
        style: Toast.Style.Success,
        title: shouldForceRefresh ? "数据已刷新" : holiday.name,
        message: `${startDateStr}-${endDateStr} ${progressBar} ${daysText}`
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
