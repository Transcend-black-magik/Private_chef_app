import { Platform } from "react-native";
import Constants from "expo-constants";

import { getCurrentUserRecord, saveUserRecord } from "@/lib/app-state";

type NotificationsModule = typeof import("expo-notifications");
type NotificationSubscription = { remove: () => void };

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function canUseNativePushNotifications() {
  return Platform.OS !== "web" && Constants.appOwnership !== "expo" && !Constants.expoGoConfig;
}

async function loadNotificationsModule() {
  if (!canUseNativePushNotifications()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications")
      .then((Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        return Notifications;
      })
      .catch(() => null);
  }

  return notificationsModulePromise;
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    ""
  );
}

export async function registerCurrentDeviceForPushNotifications() {
  const Notifications = await loadNotificationsModule();
  const currentUser = await getCurrentUserRecord();

  if (!Notifications || !currentUser) {
    return;
  }

  const permissions = await Notifications.getPermissionsAsync();
  const finalPermission =
    permissions.status === "granted"
      ? permissions
      : await Notifications.requestPermissionsAsync();

  if (finalPermission.status !== "granted") {
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Private Chef",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4D694E",
    });
  }

  const projectId = getProjectId();
  const tokenResult = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResult.data;

  if (!token) {
    return;
  }

  const expoPushTokens = Array.from(new Set([...(currentUser.expoPushTokens || []), token]));
  await saveUserRecord({
    ...currentUser,
    expoPushTokens,
    updatedAt: new Date().toISOString(),
  });
}

export function listenForPushNotificationResponses(
  callback: (data: Record<string, unknown>) => void,
) {
  let removed = false;
  let subscription: NotificationSubscription | null = null;

  void loadNotificationsModule().then((Notifications) => {
    if (!Notifications || removed) {
      return;
    }

    subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      callback(response.notification.request.content.data || {});
    });
  });

  return {
    remove: () => {
      removed = true;
      subscription?.remove();
    },
  };
}
