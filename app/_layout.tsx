import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import NotificationService from '@/lib/notifications';
import * as Notifications from 'expo-notifications';
import { userService } from '@/lib/supabase';
import { adminAuth } from '@/lib/supabase';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    // Initialize notifications
    const initializeNotifications = async () => {
      try {
        // Register for push notifications
        const token = await NotificationService.registerForPushNotificationsAsync();
        if (token) {
          // Save token to Supabase if user is authenticated
          const user = await adminAuth.getCurrentUser();
          if (user && user.id) {
            await userService.savePushToken(user.id, token.data);
          }
        }

        // Set up notification listeners
        const notificationListener = NotificationService.addNotificationReceivedListener(notification => {
          // Handle notification received
        });

        const responseListener = NotificationService.addNotificationResponseReceivedListener(response => {
          // Handle notification tap - navigate to relevant screen
          const data = response.notification.request.content.data;
          if (data?.type === 'news') {
            // Navigate to news
          } else if (data?.type === 'lms') {
            // Navigate to LMS
          }
        });

        return () => {
          Notifications.removeNotificationSubscription(notificationListener);
          Notifications.removeNotificationSubscription(responseListener);
        };
      } catch (error) {
        // Handle notification initialization error silently
      }
    };

    initializeNotifications();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}