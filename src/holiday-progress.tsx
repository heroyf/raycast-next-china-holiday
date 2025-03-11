import { updateCommandMetadata, showToast, Toast, environment, LaunchType } from "@raycast/api";
import { getNextHoliday } from "./utils/holiday";

function generateProgressBar(daysUntil: number): string {
  // 假设最大显示30天的进度
  const maxDays = 30;
  const progress = Math.max(0, Math.min(1, 1 - (daysUntil / maxDays)));
  const width = 10; // 缩短进度条长度以适应命令列表显示
  const filledCount = Math.round(progress * width);
  const emptyCount = width - filledCount;
  
  return "▓".repeat(filledCount) + "░".repeat(emptyCount);
}

export default async function Command() {
  try {
    const holiday = await getNextHoliday();
    
    if (!holiday) {
      updateCommandMetadata({
        subtitle: "无法获取节假日信息"
      });
      return;
    }

    const progressBar = generateProgressBar(holiday.daysUntil);
    const daysText = holiday.daysUntil > 0 ? `还有 ${holiday.daysUntil} 天` : "已开始";
    const subtitle = `${holiday.name} ${progressBar} ${daysText}`;
    
    updateCommandMetadata({ subtitle });

    // 只在用户主动触发命令时显示 Toast
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Success,
        title: holiday.name,
        message: `${progressBar} ${daysText}`
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
