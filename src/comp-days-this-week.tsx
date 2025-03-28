import { updateCommandMetadata, showToast, Toast, environment, LaunchType, LaunchProps } from "@raycast/api";
import { getAllCompDays } from "./utils/holiday";

// Get the date range for the current week (Monday to Sunday)
function getCurrentWeekDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 1-6 is Monday to Saturday
  
  // Calculate Monday's date
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  monday.setHours(0, 0, 0, 0);
  
  // Calculate Sunday's date
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { startDate: monday, endDate: sunday };
}

// Check if a date is within the specified range
function isDateInRange(date: string, startDate: Date, endDate: Date): boolean {
  const dateObj = new Date(date);
  return dateObj >= startDate && dateObj <= endDate;
}

// Format date as "MM.DD (Weekday)" format
function formatDateWithWeekday(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = weekdays[date.getDay()];
  
  return `${month}.${day} (${weekday})`;
}

// Find the next make-up workday
function findNextCompDay(allCompDays: string[], after: Date): string | null {
  // Sort by date
  const sortedCompDays = [...allCompDays].sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  
  // Find the first make-up workday after the specified date
  for (const compDay of sortedCompDays) {
    const compDayDate = new Date(compDay);
    if (compDayDate > after) {
      return compDay;
    }
  }
  
  return null;
}

// Update command metadata
function updateCommandSubtitle(compDaysThisWeek: string[], nextCompDay: string | null): void {
  if (compDaysThisWeek.length > 0) {
    // Format make-up workdays
    const formattedDates = compDaysThisWeek.map(formatDateWithWeekday).join(", ");
    
    if (nextCompDay && !compDaysThisWeek.includes(nextCompDay)) {
      // Has make-up workdays this week and future ones
      updateCommandMetadata({
        subtitle: `⚠️ Make-up workdays this week: ${formattedDates} | Next: ${formatDateWithWeekday(nextCompDay)}`
      });
    } else {
      // Has make-up workdays this week but no future ones
      updateCommandMetadata({
        subtitle: `⚠️ Make-up workdays this week: ${formattedDates}`
      });
    }
  } else {
    if (nextCompDay) {
      // No make-up workdays this week but has future ones
      updateCommandMetadata({
        subtitle: `🎉 No make-up workdays this week | Next: ${formatDateWithWeekday(nextCompDay)}`
      });
    } else {
      // No make-up workdays at all
      updateCommandMetadata({
        subtitle: "🎉 Great! No make-up workdays scheduled"
      });
    }
  }
}

// Show Toast notification
async function showCompDaysToast(compDaysThisWeek: string[], nextCompDay: string | null): Promise<void> {
  if (compDaysThisWeek.length > 0) {
    // Has make-up workdays this week
    const message = nextCompDay && !compDaysThisWeek.includes(nextCompDay) 
      ? `This week: ${compDaysThisWeek.map(formatDateWithWeekday).join(", ")}\nNext: ${formatDateWithWeekday(nextCompDay)}`
      : compDaysThisWeek.map(formatDateWithWeekday).join(", ");
      
    await showToast({
      style: Toast.Style.Failure,
      title: "Make-up Workdays This Week",
      message
    });
  } else {
    // No make-up workdays this week
    const message = nextCompDay 
      ? `Next make-up workday: ${formatDateWithWeekday(nextCompDay)}`
      : "No make-up workdays scheduled";
      
    await showToast({
      style: Toast.Style.Success,
      title: "No Make-up Workdays This Week",
      message
    });
  }
}

// Check if data should be force refreshed
function shouldForceRefreshData(props: LaunchProps): boolean {
  const isRefreshAction = props.launchContext?.action === "refresh";
  const isUserInitiated = environment.launchType === LaunchType.UserInitiated;
  
  // Force refresh in these cases: 1. Click refresh button 2. User manually activates command
  return isRefreshAction || isUserInitiated;
}

// Check if Toast should be shown
function shouldShowToast(props: LaunchProps): boolean {
  const isRefreshAction = props.launchContext?.action === "refresh";
  const isUserInitiated = environment.launchType === LaunchType.UserInitiated;
  
  // Show Toast only when user manually triggers command or refreshes
  return isUserInitiated || isRefreshAction;
}

// Handle errors
async function handleError(error: unknown): Promise<void> {
  console.error("Error in comp days command:", error);
  updateCommandMetadata({
    subtitle: "Error fetching make-up workday information"
  });
  
  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to fetch make-up workday information"
    });
  }
}

export default async function Command(props: LaunchProps) {
  try {
    // Check if data should be force refreshed
    const forceRefresh = shouldForceRefreshData(props);
    
    // Debug logs
    console.log("Launch type:", environment.launchType, 
                "isUserInitiated:", environment.launchType === LaunchType.UserInitiated,
                "isRefreshAction:", props.launchContext?.action === "refresh",
                "shouldForceRefresh:", forceRefresh);
    
    // Get current week date range
    const { startDate, endDate } = getCurrentWeekDates();
    
    // Get all make-up workdays
    const allCompDays = await getAllCompDays(forceRefresh);
    
    // Find make-up workdays this week
    const compDaysThisWeek = allCompDays.filter(date => 
      isDateInRange(date, startDate, endDate)
    );
    
    // Find next make-up workday (from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextCompDay = findNextCompDay(allCompDays, today);
    
    // Update command metadata
    updateCommandSubtitle(compDaysThisWeek, nextCompDay);
    
    // Show Toast notification (if needed)
    if (shouldShowToast(props)) {
      await showCompDaysToast(compDaysThisWeek, nextCompDay);
    }
  } catch (error) {
    await handleError(error);
  }
} 
