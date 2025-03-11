import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Holiday, getNextHoliday } from "./utils/holiday";

interface Preferences {
  menubarEnabled: boolean;
}

export default function Command(): JSX.Element | null {
  const [nextHoliday, setNextHoliday] = useState<Holiday | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { menubarEnabled } = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadHolidayData() {
      if (!menubarEnabled) {
        setIsLoading(false);
        return;
      }

      try {
        const holiday = await getNextHoliday();
        setNextHoliday(holiday);
      } catch (error) {
        console.error("Error loading holiday data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHolidayData();
    
    // 每小时更新一次数据
    const interval = setInterval(loadHolidayData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [menubarEnabled]);

  if (!menubarEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <MenuBarExtra title="🎉 加载中...">
        <MenuBarExtra.Item title="正在获取节假日信息..." />
      </MenuBarExtra>
    );
  }

  if (!nextHoliday) {
    return (
      <MenuBarExtra title="🎉 无法获取节假日">
        <MenuBarExtra.Item title="获取节假日信息失败" />
      </MenuBarExtra>
    );
  }

  const title = `🎉 ${nextHoliday.name} (${nextHoliday.daysUntil}天)`;

  return (
    <MenuBarExtra title={title}>
      <MenuBarExtra.Item
        title={`假期时间: ${new Date(nextHoliday.startDate).toLocaleDateString('zh-CN')} - ${new Date(nextHoliday.endDate).toLocaleDateString('zh-CN')}`}
      />
      <MenuBarExtra.Item title={`距离开始还有 ${nextHoliday.daysUntil} 天`} />
    </MenuBarExtra>
  );
} 
