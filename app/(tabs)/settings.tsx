import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { adminAuth, supabase, analyticsService } from '@/lib/supabase';
import { Bell, Moon, Shield, Info, Settings as SettingsIcon, UserCog, LogIn, LogOut, CircleHelp as HelpCircle, Mail } from 'lucide-react-native';
import { PieChart } from 'react-native-svg-charts';
import { G, Text as SvgText } from 'react-native-svg';
import NotificationService from '@/lib/notifications';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import OnboardingService from '@/lib/onboarding';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserPassword, setAddUserPassword] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState(false);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  useEffect(() => {
    checkAdminStatus();
    fetchAnalytics();
    checkNotificationStatus();
  }, []);

  const checkAdminStatus = async () => {
    const user = await adminAuth.getCurrentUser();
    setIsAdmin(!!user);
  };

  const handleAdminLogin = () => {
    router.push('/admin/login');
  };

  const handleAdminLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await adminAuth.signOut();
            setIsAdmin(false);
          },
        },
      ]
    );
  };

  const handleAdminPanel = () => {
    router.push('/admin/dashboard');
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    const postRes = await analyticsService.getPostCount();
    const viewsRes = await analyticsService.getTotalViews();
    const likesRes = await analyticsService.getTotalLikes();
    setTotalPosts(postRes.count);
    setTotalViews(viewsRes.total);
    setTotalLikes(likesRes.count);
    // Fetch posts per category for pie chart
    const { data: categories } = await supabase.from('categories').select('id, name, color');
    const { data: posts } = await supabase.from('posts').select('category_id');
    if (categories && posts) {
      const catCounts = categories.map(cat => ({
        key: cat.id,
        name: cat.name,
        color: cat.color,
        count: posts.filter(p => p.category_id === cat.id).length,
      })).filter(c => c.count > 0);
      setCategoryData(catCounts);
    }
    setLoadingAnalytics(false);
  };

  const handleAddUser = async () => {
    setAddUserLoading(true);
    setAddUserError('');
    setAddUserSuccess(false);
    if (!addUserEmail || !addUserPassword) {
      setAddUserError('Email and password required');
      setAddUserLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({ email: addUserEmail, password: addUserPassword });
    setAddUserLoading(false);
    if (error) {
      setAddUserError(error.message);
    } else {
      setAddUserSuccess(true);
      setAddUserEmail('');
      setAddUserPassword('');
      fetchAnalytics();
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      setNotificationsEnabled(status === 'granted');
    } catch (error) {
      // Handle notification status check error silently
    }
  };

  const toggleNotifications = async () => {
    try {
      if (notificationsEnabled) {
        // Disable notifications
        setNotificationsEnabled(false);
        Alert.alert('Notifications Disabled', 'You will no longer receive notifications from ATC APP.');
      } else {
        // Request permission and enable notifications
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          setNotificationsEnabled(true);
          setPermissionStatus(status);
          await NotificationService.registerForPushNotificationsAsync();
          Alert.alert('Notifications Enabled', 'You will now receive notifications from ATC APP!');
        } else {
          Alert.alert(
            'Permission Denied',
            'To receive notifications, please enable them in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                Alert.alert('Settings', 'Please go to your device settings and enable notifications for ATC APP.');
              }}
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const testNotification = async () => {
    try {
      await NotificationService.sendNewsNotification(
        'Test Notification',
        'This is a test notification from ATC APP!'
      );
      Alert.alert('Test Sent', 'Check your notification panel for the test notification.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Denied';
      case 'undetermined':
        return 'Not Determined';
      default:
        return 'Unknown';
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return '#10B981';
      case 'denied':
        return '#EF4444';
      case 'undetermined':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const resetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show the onboarding screens again on next app launch. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await OnboardingService.resetOnboarding();
            Alert.alert('Success', 'Onboarding has been reset. Restart the app to see the onboarding screens.');
          }
        }
      ]
    );
  };

  const settingsItems = [
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Manage push notifications',
      action: () => toggleNotifications(),
      rightElement: (
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor={notificationsEnabled ? '#FFFFFF' : '#F3F4F6'}
        />
      ),
    },
    {
      icon: Moon,
      title: 'Dark Mode',
      subtitle: 'Switch to dark theme',
      action: () => setDarkMode(!darkMode),
      rightElement: (
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor={darkMode ? '#FFFFFF' : '#F3F4F6'}
        />
      ),
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      action: () => setShowPrivacy(true),
    },
    {
      icon: Info,
      title: 'About',
      subtitle: 'Learn more about ATC APP',
      action: () => setShowAbout(true),
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      action: () => setShowHelp(true),
    },
    {
      icon: Mail,
      title: 'FAQ',
      subtitle: 'Frequently asked questions',
      action: () => setShowFAQ(true),
    },
  ];

  // Add admin-specific items
  if (isAdmin) {
    settingsItems.push(
      {
        icon: UserCog,
        title: 'Admin Panel',
        subtitle: 'Access admin dashboard',
        action: handleAdminPanel,
      },
      {
        icon: LogOut,
        title: 'Sign Out',
        subtitle: 'Sign out of admin account',
        action: handleAdminLogout,
      },
      {
        icon: SettingsIcon,
        title: 'Reset Onboarding',
        subtitle: 'Show onboarding screens again',
        action: resetOnboarding,
      }
    );
  } else {
    settingsItems.push({
      icon: LogIn,
      title: 'Admin Login',
      subtitle: 'Sign in to admin account',
      action: handleAdminLogin,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Add User Modal */}
      <Modal visible={showAddUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.settingTitle}>Add New User</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={addUserEmail}
              onChangeText={setAddUserEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={addUserPassword}
              onChangeText={setAddUserPassword}
              secureTextEntry
            />
            {addUserError ? <Text style={{ color: 'red', marginBottom: 8 }}>{addUserError}</Text> : null}
            {addUserSuccess ? <Text style={{ color: lightTheme.success, marginBottom: 8 }}>User created successfully!</Text> : null}
            <TouchableOpacity style={styles.saveButton} onPress={handleAddUser} disabled={addUserLoading}>
              {addUserLoading ? <ActivityIndicator color={lightTheme.primary} /> : <Text style={styles.saveButtonText}>Add User</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={() => setShowAddUser(false)}>
              <Text style={styles.uploadButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy & Security Modal */}
      <Modal visible={showPrivacy} animationType="slide" transparent>
        <View style={styles.curvedModalOverlay}>
          <View style={styles.curvedModalContent}>
            <View style={styles.modalIconWrapper}><Shield size={40} color={lightTheme.primary} /></View>
            <Text style={styles.modalTitle}>Privacy & Security</Text>
            <Text style={styles.modalText}>
              <Text style={{ fontWeight: 'bold', color: lightTheme.primary }}>Important Notice:{"\n"}</Text>
              This is NOT an official app of Arusha Technical College. This is a student project developed for educational purposes only.\n\n
              <Text style={{ fontWeight: 'bold' }}>Privacy Policy:{"\n"}</Text>
              We value your privacy. This app does not collect personal data or share information with third parties. All data is stored securely and used only for educational purposes within Arusha Technical College.\n\n
              <Text style={{ fontWeight: 'bold' }}>Purpose:{"\n"}</Text>
              This application was created by a student to demonstrate mobile development skills and is intended for learning and portfolio purposes only.
            </Text>
            <TouchableOpacity style={styles.saveButton} onPress={() => setShowPrivacy(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAbout} animationType="slide" transparent>
        <View style={styles.curvedModalOverlay}>
          <View style={styles.curvedModalContent}>
            <View style={styles.modalIconWrapper}><Info size={40} color={lightTheme.primary} /></View>
            <Text style={styles.modalTitle}>About</Text>
            <Text style={styles.modalText}>
              This application was developed by me, Ray Daniel, a student at Arusha Technical College, as part of a personal learning and portfolio-building project. The main purpose of this app is to showcase my skills as a mobile developer, specifically using React Native for frontend development and Supabase for backend services including authentication and data storage.\n\nThis is not a commercial app — it is strictly for educational and demonstration purposes, intended to show how real-world features such as login systems, likes, views, role-based access (RLS), and database interaction can be implemented in a clean, mobile-friendly environment.\n\nThe app is designed with a modern and user-friendly interface (UI/UX) and reflects my passion for creating practical solutions that can be applied in schools, communities, or youth-based projects.\n\nIf you're looking for someone to build your app, collaborate on a project, or if you're just interested in supporting local tech talent, feel free to reach out to me directly.\n\nYou can contact me via phone at 📞 0613 976 254 or check out more of my work through my GitHub profile (link included in the app). I'm open to freelance work, internships, and partnerships — especially in the fields of education, student platforms, or any creative digital idea you may have.\n\nThis app is just a starting point — and I'm excited to keep growing, building, and solving problems through technology.
            </Text>
            <TouchableOpacity style={styles.saveButton} onPress={() => setShowAbout(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help & FAQ Modal */}
      <Modal visible={showFAQ} animationType="slide" transparent>
        <View style={styles.curvedModalOverlay}>
          <View style={styles.curvedModalContent}>
            <View style={styles.modalIconWrapper}><HelpCircle size={40} color={lightTheme.primary} /></View>
            <Text style={styles.modalTitle}>Help & FAQ</Text>
            <Text style={styles.modalText}>
              <Text style={{ fontWeight: 'bold' }}>Q: Who developed this app?{"\n"}</Text>
              A: Ray Daniel from Arusha Technical College.{"\n\n"}
              <Text style={{ fontWeight: 'bold' }}>Q: What is the purpose of this app?{"\n"}</Text>
              A: It is for educational use only and works under React Native.{"\n\n"}
              <Text style={{ fontWeight: 'bold' }}>Q: How can I get support?{"\n"}</Text>
              A: Contact 0613 976 254 or visit the GitHub link above.{"\n\n"}
              <Text style={{ fontWeight: 'bold' }}>Q: Is my data safe?{"\n"}</Text>
              A: Yes, your data is only used within the college and not shared externally.
            </Text>
            <TouchableOpacity style={styles.saveButton} onPress={() => setShowFAQ(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings List */}
      <View style={styles.settingsContainer}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.settingItem}
            onPress={item.action}
          >
            <View style={styles.settingIcon}>
              <item.icon size={24} color={lightTheme.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            </View>
            {item.rightElement && (
              <View style={styles.settingRight}>
                {item.rightElement}
              </View>
            )}
            {!item.rightElement && (
              <Ionicons name="chevron-forward" size={20} color={lightTheme.textSecondary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © {new Date().getFullYear()} ATC APP. All rights reserved.
        </Text>
        <Text style={styles.footerSubtext}>
          Developed by Arusha Tech Community
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  settingsContainer: {
    flex: 1,
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
    backgroundColor: lightTheme.surface,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightTheme.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  settingRight: {
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: lightTheme.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  curvedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  curvedModalContent: {
    backgroundColor: lightTheme.surface,
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: lightTheme.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: lightTheme.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: lightTheme.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: lightTheme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: lightTheme.surface,
    color: lightTheme.text,
  },
  saveButton: {
    backgroundColor: lightTheme.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: lightTheme.surface,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  uploadButtonText: {
    color: lightTheme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: lightTheme.border,
    backgroundColor: lightTheme.surface,
  },
  footerText: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 12,
    color: lightTheme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});