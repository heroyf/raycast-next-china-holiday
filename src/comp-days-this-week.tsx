import { updateCommandMetadata, showToast, Toast, environment, LaunchType, LaunchProps } from "@raycast/api";
import { getAllCompDays } from "./utils/holiday";

// 获取本周的日期范围（周一到周日）
function getCurrentWeekDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const currentDay = now.getDay(); // 0是周日，1-6是周一到周六
  
  // 计算本周一的日期
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  monday.setHours(0, 0, 0, 0);
  
  // 计算本周日的日期
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { startDate: monday, endDate: sunday };
}

// 检查日期是否在指定范围内
function isDateInRange(date: string, startDate: Date, endDate: Date): boolean {
  const dateObj = new Date(date);
  return dateObj >= startDate && dateObj <= endDate;
}

// 格式化日期为 "MM.DD (周几)" 格式
function formatDateWithWeekday(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[date.getDay()];
  
  return `${month}.${day} (${weekday})`;
}

// 查找下一个补班日期
function findNextCompDay(allCompDays: string[], after: Date): string | null {
  // 按日期排序
  const sortedCompDays = [...allCompDays].sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  
  // 查找第一个在指定日期之后的补班日
  for (const compDay of sortedCompDays) {
    const compDayDate = new Date(compDay);
    if (compDayDate > after) {
      return compDay;
    }
  }
  
  return null;
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
    
    // 获取本周日期范围
    const { startDate, endDate } = getCurrentWeekDates();
    
    // 调试日志
    console.log("本周日期范围:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // 获取所有补班日期
    const allCompDays = await getAllCompDays(shouldForceRefresh);
    
    // 查找本周的补班日期
    const compDaysThisWeek = allCompDays.filter(date => 
      isDateInRange(date, startDate, endDate)
    );
    
    // 查找下一个补班日期（从今天开始）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextCompDay = findNextCompDay(allCompDays, today);
    
    // 调试日志
    console.log("本周补班日期:", compDaysThisWeek);
    console.log("下一个补班日期:", nextCompDay);
    
    // 更新命令元数据
    if (compDaysThisWeek.length > 0) {
      // 格式化补班日期
      const formattedDates = compDaysThisWeek.map(formatDateWithWeekday).join(", ");
      
      if (nextCompDay && !compDaysThisWeek.includes(nextCompDay)) {
        // 本周有补班，且还有未来的补班
        updateCommandMetadata({
          subtitle: `⚠️ 本周需要补班: ${formattedDates} | 下次: ${formatDateWithWeekday(nextCompDay)}`
        });
      } else {
        // 本周有补班，但没有未来的补班
        updateCommandMetadata({
          subtitle: `⚠️ 本周需要补班: ${formattedDates}`
        });
      }
    } else {
      if (nextCompDay) {
        // 本周没有补班，但有未来的补班
        updateCommandMetadata({
          subtitle: `🎉 本周没有补班 | 下次补班: ${formatDateWithWeekday(nextCompDay)}`
        });
      } else {
        // 本周没有补班，也没有未来的补班
        updateCommandMetadata({
          subtitle: "🎉 太棒了，没有安排补班"
        });
      }
    }
    
    // 只在用户主动触发命令或刷新时显示 Toast
    if (isUserInitiated || isRefreshAction) {
      if (compDaysThisWeek.length > 0) {
        // 本周有补班
        const message = nextCompDay && !compDaysThisWeek.includes(nextCompDay) 
          ? `本周: ${compDaysThisWeek.map(formatDateWithWeekday).join(", ")}\n下次: ${formatDateWithWeekday(nextCompDay)}`
          : compDaysThisWeek.map(formatDateWithWeekday).join(", ");
          
        await showToast({
          style: Toast.Style.Failure,
          title: "本周需要补班",
          message
        });
      } else {
        // 本周没有补班
        const message = nextCompDay 
          ? `下次补班: ${formatDateWithWeekday(nextCompDay)}`
          : "没有安排补班";
          
        await showToast({
          style: Toast.Style.Success,
          title: "本周没有补班",
          message
        });
      }
    }
  } catch (error) {
    console.error("Error in comp days command:", error);
    updateCommandMetadata({
      subtitle: "获取补班信息时出错"
    });
    
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "错误",
        message: "获取补班信息时出错"
      });
    }
  }
} 
