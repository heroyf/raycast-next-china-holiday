import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Holiday, getNextHoliday } from "./utils/holiday";

export default function Command() {
  const [nextHoliday, setNextHoliday] = useState<Holiday | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshHoliday() {
    setIsLoading(true);
    const holiday = await getNextHoliday(true);
    setNextHoliday(holiday);
    setIsLoading(false);
    await showToast({ title: "已刷新节假日信息", style: Toast.Style.Success });
  }

  useEffect(() => {
    async function loadHolidayData() {
      const holiday = await getNextHoliday();
      setNextHoliday(holiday);
      setIsLoading(false);
    }

    loadHolidayData();
  }, []);

  return (
    <List isLoading={isLoading}>
      {nextHoliday ? (
        <List.Item
          icon="🎉"
          title={nextHoliday.name}
          subtitle={`距离开始还有 ${nextHoliday.daysUntil} 天`}
          accessories={[
            { text: `${new Date(nextHoliday.startDate).toLocaleDateString('zh-CN')} - ${new Date(nextHoliday.endDate).toLocaleDateString('zh-CN')}` }
          ]}
          actions={
            <ActionPanel>
              <Action
                title="刷新节假日信息"
                onAction={refreshHoliday}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Item
          icon="❌"
          title="无法获取节假日信息"
          actions={
            <ActionPanel>
              <Action
                title="重试"
                onAction={refreshHoliday}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
} 
