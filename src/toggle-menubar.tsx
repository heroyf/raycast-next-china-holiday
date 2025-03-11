import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

interface Preferences {
  menubarEnabled: boolean;
}

export default function Command() {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreference = useCallback(async () => {
    try {
      const prefs = getPreferenceValues<Preferences>();
      setIsEnabled(prefs.menubarEnabled);
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  async function toggleMenuBar() {
    setIsLoading(true);
    try {
      const newValue = !isEnabled;
      // 更新状态
      setIsEnabled(newValue);
    } catch (error) {
      console.error("Error toggling menubar:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={isEnabled ? "🟢" : "⚪️"}
        title="菜单栏显示"
        subtitle={isEnabled ? "已启用" : "已禁用"}
        actions={
          <ActionPanel>
            <Action
              title={isEnabled ? "禁用菜单栏显示" : "启用菜单栏显示"}
              onAction={toggleMenuBar}
            />
          </ActionPanel>
        }
      />
    </List>
  );
} 
