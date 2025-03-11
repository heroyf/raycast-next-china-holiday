import { LocalStorage } from "@raycast/api";
import ICAL from "ical.js";
import fetch from "node-fetch";

const HOLIDAY_CALENDAR_URL = "https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayCal.ics";
const CACHE_KEY = "holiday_cache";
const CACHE_TIMESTAMP_KEY = "holiday_cache_timestamp";

export interface Holiday {
  name: string;
  startDate: Date;
  endDate: Date;
  daysUntil: number;
}

interface CacheData {
  holiday: Holiday | null;
  timestamp: number;
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

export async function getNextHoliday(forceRefresh = false): Promise<Holiday | null> {
  try {
    // Check cache first
    if (!forceRefresh) {
      const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
      const cachedTimestamp = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();
        
        // Cache is valid for 24 hours
        if (now - timestamp < 24 * 60 * 60 * 1000) {
          const holiday = JSON.parse(cachedData);
          // Update daysUntil based on current time
          if (holiday) {
            const startDate = new Date(holiday.startDate);
            holiday.daysUntil = Math.ceil((startDate.getTime() - now) / (1000 * 60 * 60 * 24));
          }
          return holiday;
        }
      }
    }
    
    // Fetch new data
    const holiday = await fetchNextHoliday();
    
    // Update cache
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(holiday));
    await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    return holiday;
  } catch (error) {
    console.error("Error getting holiday data:", error);
    return null;
  }
} 
