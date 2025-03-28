import { updateCommandMetadata, showToast, Toast, environment, LaunchType, LaunchProps } from "@raycast/api";
import { getNextHoliday } from "./utils/holiday";

function formatDate(date: string): string {
  // Create Date object from string
  const dateObj = new Date(date);
  return `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
}

// Convert number to emoji number
function numberToEmoji(num: number): string {
  if (num > 99) return `${num}`; // If greater than 99, return number directly
  
  const emojiDigits = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  
  if (num < 10) {
    return emojiDigits[num];
  } else {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${emojiDigits[tens]}${emojiDigits[ones]}`;
  }
}

// Generate holiday status display
function generateHolidayStatus(holiday: { name: string, startDate: string, endDate: string, daysUntil: number }): string {
  const startDateStr = formatDate(holiday.startDate);
  const endDateStr = formatDate(holiday.endDate);
  const dateRange = `${startDateStr}-${endDateStr}`;
  
  // Choose appropriate emoji based on remaining days
  let statusEmoji = '🎉';
  if (holiday.daysUntil <= 0) {
    statusEmoji = '🎊'; // Already started
  } else if (holiday.daysUntil <= 3) {
    statusEmoji = '⏳'; // Coming soon
  } else if (holiday.daysUntil <= 7) {
    statusEmoji = '📅'; // Within a week
  } else if (holiday.daysUntil <= 30) {
    statusEmoji = '📆'; // Within a month
  }
  
  // Emoji representation of remaining days
  const daysEmoji = holiday.daysUntil > 0 ? numberToEmoji(holiday.daysUntil) : '0️⃣';
  
  // Combine final display
  return `${statusEmoji} ${holiday.name}(${dateRange}) ${daysEmoji} ${holiday.daysUntil > 0 ? 'days' : 'Started'}`;
}

export default async function Command(props: LaunchProps) {
  try {
    // Check if triggered by refresh button or user manually
    const isRefreshAction = props.launchContext?.action === "refresh";
    const isUserInitiated = environment.launchType === LaunchType.UserInitiated;
    
    // Force refresh in these cases: 1. Click refresh button 2. User manually activates command
    const shouldForceRefresh = isRefreshAction || isUserInitiated;
    
    // Debug logs
    console.log("Launch type:", environment.launchType, 
                "isUserInitiated:", isUserInitiated,
                "isRefreshAction:", isRefreshAction,
                "shouldForceRefresh:", shouldForceRefresh);
    
    // Get holiday data with optional force refresh
    const holiday = await getNextHoliday(shouldForceRefresh);
    
    if (!holiday) {
      updateCommandMetadata({
        subtitle: "Unable to fetch holiday information"
      });
      return;
    }

    // Debug logs
    console.log("Holiday dates:", {
      name: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      daysUntil: holiday.daysUntil,
      refreshType: shouldForceRefresh ? "Force refresh" : "Using cache"
    });

    // Generate holiday status display
    const subtitle = generateHolidayStatus(holiday);
    
    updateCommandMetadata({ subtitle });

    // Show Toast only when user manually triggers command or refreshes
    if (isUserInitiated || isRefreshAction) {
      await showToast({
        style: Toast.Style.Success,
        title: shouldForceRefresh ? "Data refreshed" : holiday.name,
        message: `${formatDate(holiday.startDate)}-${formatDate(holiday.endDate)} ${holiday.daysUntil > 0 ? `${holiday.daysUntil} days left` : "Started"}`
      });
    }
  } catch (error) {
    console.error("Error in holiday progress command:", error);
    updateCommandMetadata({
      subtitle: "Error fetching holiday information"
    });
    
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to fetch holiday information"
      });
    }
  }
} 
