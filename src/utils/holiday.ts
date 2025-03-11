import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";

const HOLIDAY_API_URL = "https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayAPI.json";
const CACHE_KEY = "holiday_cache";
const CACHE_TIMESTAMP_KEY = "holiday_cache_timestamp";

export interface Holiday {
  name: string;
  startDate: string;  // 原始API日期字符串
  endDate: string;    // 原始API日期字符串
  daysUntil: number;
}

interface HolidayAPIResponse {
  Name: string;
  Version: string;
  Generated: string;
  Timezone: string;
  Years: {
    [key: string]: Array<{
      Name: string;
      StartDate: string;
      EndDate: string;
      Duration: number;
      CompDays: string[];
      URL: string;
      Memo: string;
    }>;
  };
}

// 计算两个日期之间的天数差异，考虑时区问题
function calculateDaysUntil(dateString: string): number {
  // 创建当前日期，设置为当天的00:00:00
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  // 解析日期字符串，确保使用正确的时区
  // 格式为 "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);
  
  // 计算天数差异
  return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function fetchNextHoliday(): Promise<Holiday | null> {
  try {
    const response = await fetch(HOLIDAY_API_URL);
    const data = await response.json() as HolidayAPIResponse;
    
    // 获取当前年份和下一年
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // 只获取当前年份和下一年的假期数据
    let relevantHolidays: Array<{
      Name: string;
      StartDate: string;
      EndDate: string;
      Duration: number;
      CompDays: string[];
      URL: string;
      Memo: string;
    }> = [];
    
    // 添加当前年份的假期
    if (data.Years[currentYear.toString()]) {
      relevantHolidays = relevantHolidays.concat(data.Years[currentYear.toString()]);
    }
    
    // 添加下一年的假期
    if (data.Years[nextYear.toString()]) {
      relevantHolidays = relevantHolidays.concat(data.Years[nextYear.toString()]);
    }
    
    // 调试日志
    console.log(`获取了 ${currentYear} 和 ${nextYear} 年的假期数据，共 ${relevantHolidays.length} 条`);
    
    // 找到最近的假期
    let nextHoliday: Holiday | null = null;
    let minDaysUntil = Infinity;
    
    for (const holiday of relevantHolidays) {
      // 计算距离假期开始还有多少天
      const daysUntil = calculateDaysUntil(holiday.StartDate);
      
      // 调试日志
      console.log("Processing holiday:", {
        name: holiday.Name,
        startDate: holiday.StartDate,
        endDate: holiday.EndDate,
        daysUntil,
        duration: holiday.Duration
      });
      
      // 只考虑未来的假期
      if (daysUntil > 0 && daysUntil < minDaysUntil) {
        minDaysUntil = daysUntil;
        nextHoliday = {
          name: holiday.Name,
          startDate: holiday.StartDate,  // 保持原始格式
          endDate: holiday.EndDate,      // 保持原始格式
          daysUntil
        };
      }
    }
    
    if (nextHoliday) {
      console.log("Selected next holiday:", {
        name: nextHoliday.name,
        startDate: nextHoliday.startDate,
        endDate: nextHoliday.endDate,
        daysUntil: nextHoliday.daysUntil
      });
    } else {
      console.log("未找到未来的假期");
    }
    
    return nextHoliday;
  } catch (error) {
    console.error("Error fetching holiday data:", error);
    return null;
  }
}

export async function getNextHoliday(forceRefresh = false): Promise<Holiday | null> {
  try {
    console.log("Getting holiday data, forceRefresh:", forceRefresh);
    
    // 如果强制刷新，直接获取新数据
    if (forceRefresh) {
      console.log("Force refreshing holiday data...");
      const holiday = await fetchNextHoliday();
      
      // 更新缓存
      if (holiday) {
        await LocalStorage.setItem(CACHE_KEY, JSON.stringify(holiday));
        await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log("Cache updated with fresh data");
      }
      
      return holiday;
    }
    
    // 检查缓存
    const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
    const cachedTimestamp = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);
    
    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp);
      const now = Date.now();
      
      // 缓存23小时内有效
      const cacheValidityHours = 23;
      if (now - timestamp < cacheValidityHours * 60 * 60 * 1000) {
        console.log("Using cached data, cache age:", Math.round((now - timestamp) / (60 * 60 * 1000)), "hours");
        const holidayData = JSON.parse(cachedData);
        
        // 从缓存创建Holiday对象
        const holiday: Holiday = {
          name: holidayData.name,
          startDate: holidayData.startDate,
          endDate: holidayData.endDate,
          daysUntil: 0
        };
        
        // 重新计算距离天数
        holiday.daysUntil = calculateDaysUntil(holiday.startDate);
        
        console.log("Using cached holiday data:", {
          name: holiday.name,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          daysUntil: holiday.daysUntil
        });
        
        return holiday;
      } else {
        console.log("Cache expired, fetching fresh data...");
      }
    } else {
      console.log("No cache found, fetching fresh data...");
    }
    
    // 获取新数据
    const holiday = await fetchNextHoliday();
    
    // 更新缓存
    if (holiday) {
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(holiday));
      await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log("Cache updated with fresh data");
    }
    
    return holiday;
  } catch (error) {
    console.error("Error getting holiday data:", error);
    return null;
  }
} 
