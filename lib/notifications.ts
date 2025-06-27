import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  static async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
      } catch (error) {
        console.log('Error getting push token:', error);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  static async scheduleLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
  }

  static async sendNewsNotification(title: string, body: string) {
    await this.scheduleLocalNotification(
      `📰 ${title}`,
      body,
      { type: 'news', title, body }
    );
  }

  static async sendUpdateNotification(title: string, body: string) {
    await this.scheduleLocalNotification(
      `🔄 ${title}`,
      body,
      { type: 'update', title, body }
    );
  }

  static async sendLMSNotification(title: string, body: string) {
    await this.scheduleLocalNotification(
      `📚 ${title}`,
      body,
      { type: 'lms', title, body }
    );
  }

  static addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  static addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  static async getBadgeCountAsync() {
    return await Notifications.getBadgeCountAsync();
  }

  static async setBadgeCountAsync(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  static async cancelAllNotificationsAsync() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export default NotificationService; 