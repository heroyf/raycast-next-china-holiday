import { MenuBarExtra } from "@raycast/api";
import React, { useEffect, useState } from "react";
import ICAL from "ical.js";
import fetch from "node-fetch";

const HOLIDAY_CALENDAR_URL = "https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayCal.ics";

interface Holiday {
  name: string;
  startDate: Date;
  endDate: Date;
  daysUntil: number;
}

async function fetchNextHoliday(): Promise<Holiday | null> {
  try {
    const response = await fetch(HOLIDAY_CALENDAR_URL);
    const icsData = await response.text();
    
    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");
    
    const now = new Date();
    let nextHoliday: Holiday | null = null;
    let minDaysUntil = Infinity;

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();
      
      // Only consider future holidays and exclude work days (补班)
      if (startDate > now && !event.summary.includes('补班')) {
        const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil < minDaysUntil) {
          minDaysUntil = daysUntil;
          nextHoliday = {
            name: event.summary.replace(/ 假期.*$/, ''),  // Remove the "假期 第X天/共X天" suffix
            startDate,
            endDate,
            daysUntil
          };
        }
      }
    }

    return nextHoliday;
  } catch (error) {
    console.error("Error fetching holiday data:", error);
    return null;
  }
}

export default function Command(): JSX.Element {
  const [nextHoliday, setNextHoliday] = useState<Holiday | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHolidayData() {
      const holiday = await fetchNextHoliday();
      setNextHoliday(holiday);
      setIsLoading(false);
    }

    loadHolidayData();
  }, []);

  if (isLoading) {
    return React.createElement(MenuBarExtra, { title: "🎉 加载中..." },
      React.createElement(MenuBarExtra.Item, { title: "正在获取节假日信息..." })
    );
  }

  if (!nextHoliday) {
    return React.createElement(MenuBarExtra, { title: "🎉 无法获取节假日" },
      React.createElement(MenuBarExtra.Item, { title: "获取节假日信息失败" })
    );
  }

  const title = `🎉 ${nextHoliday.name} (${nextHoliday.daysUntil}天)`;

  return React.createElement(MenuBarExtra, { title },
    React.createElement(MenuBarExtra.Item, {
      title: `假期时间: ${nextHoliday.startDate.toLocaleDateString('zh-CN')} - ${nextHoliday.endDate.toLocaleDateString('zh-CN')}`
    }),
    React.createElement(MenuBarExtra.Item, {
      title: `距离开始还有 ${nextHoliday.daysUntil} 天`
    })
  );
}
