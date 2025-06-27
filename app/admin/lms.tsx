import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  BookOpen, 
  FolderOpen, 
  Layers, 
  Users, 
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react-native';

type LMSStats = {
  categories: number;
  courses: number;
  modules: number;
  totalStudents: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  course_count: number;
};

type Course = {
  id: number;
  title: string;
  description: string;
  category_name: string;
  module_count: number;
};

type Module = {
  id: number;
  title: string;
  description: string;
  course_title: string;
};

export default function LMSManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<LMSStats>({ categories: 0, courses: 0, modules: 0, totalStudents: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchCategories(),
        fetchCourses(),
        fetchModules(),
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [categoriesResult, coursesResult, modulesResult] = await Promise.all([
        supabase.from('course_categories').select('*', { count: 'exact' }),
        supabase.from('courses').select('*', { count: 'exact' }),
        supabase.from('modules').select('*', { count: 'exact' }),
      ]);

      setStats({
        categories: categoriesResult.count || 0,
        courses: coursesResult.count || 0,
        modules: modulesResult.count || 0,
        totalStudents: 0, // Placeholder for future student tracking
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('course_categories')
        .select(`
          id,
          name,
          slug,
          courses!inner(id)
        `)
        .order('name');
      
      if (data) {
        const categoriesWithCount = data.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          course_count: cat.courses?.length || 0,
        }));
        setCategories(categoriesWithCount);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          course_categories!inner(name),
          modules!inner(id)
        `)
        .order('title');
      
      if (data) {
        const coursesWithCount = data.map(course => ({
          id: course.id,
          title: course.title,
          description: course.description,
          category_name: Array.isArray(course.course_categories) && course.course_categories.length > 0 ? course.course_categories[0].name : 'Unknown',
          module_count: course.modules?.length || 0,
        }));
        setCourses(coursesWithCount);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchModules = async () => {
    try {
      const { data } = await supabase
        .from('modules')
        .select(`
          id,
          title,
          description,
          courses!inner(title)
        `)
        .order('title');
      
      if (data) {
        const modulesWithCourse = data.map(module => ({
          id: module.id,
          title: module.title,
          description: module.description,
          course_title: Array.isArray(module.courses) && module.courses.length > 0 ? module.courses[0].title : 'Unknown',
        }));
        setModules(modulesWithCourse);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const navigateToManage = (type: string) => {
    router.push(`/admin/lms/${type}` as any);
  };

  const StatCard = ({ title, value, icon: Icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress}>
      <View style={styles.statIcon}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </TouchableOpacity>
  );

  const OverviewTab = () => (
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.statsGrid}>
        <StatCard
          title="Categories"
          value={stats.categories}
          icon={FolderOpen}
          color={lightTheme.primary}
          onPress={() => navigateToManage('categories')}
        />
        <StatCard
          title="Courses"
          value={stats.courses}
          icon={BookOpen}
          color={lightTheme.accent}
          onPress={() => navigateToManage('courses')}
        />
        <StatCard
          title="Modules"
          value={stats.modules}
          icon={Layers}
          color={lightTheme.success}
          onPress={() => navigateToManage('modules')}
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          icon={Users}
          color={lightTheme.warning}
          onPress={() => navigateToManage('students')}
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigateToManage('categories')}
          >
            <Plus size={20} color={lightTheme.primary} />
            <Text style={styles.actionButtonText}>Add Category</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigateToManage('courses')}
          >
            <Plus size={20} color={lightTheme.accent} />
            <Text style={styles.actionButtonText}>Add Course</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigateToManage('modules')}
          >
            <Plus size={20} color={lightTheme.success} />
            <Text style={styles.actionButtonText}>Add Module</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.recentCard}>
          <Text style={styles.recentText}>No recent activity to display</Text>
        </View>
      </View>
    </ScrollView>
  );

  const CategoriesTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Course Categories</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigateToManage('categories')}
        >
          <Plus size={20} color="white" />
          <Text style={styles.addButtonText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      {categories.map((category) => (
        <View key={category.id} style={styles.listItem}>
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>{category.name}</Text>
            <Text style={styles.listItemSubtitle}>{category.course_count} courses</Text>
          </View>
          <View style={styles.listItemActions}>
            <TouchableOpacity style={styles.actionIcon}>
              <Eye size={16} color={lightTheme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Edit size={16} color={lightTheme.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Trash2 size={16} color={lightTheme.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const CoursesTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Courses</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigateToManage('courses')}
        >
          <Plus size={20} color="white" />
          <Text style={styles.addButtonText}>Add Course</Text>
        </TouchableOpacity>
      </View>

      {courses.map((course) => (
        <View key={course.id} style={styles.listItem}>
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>{course.title}</Text>
            <Text style={styles.listItemSubtitle}>{course.category_name} • {course.module_count} modules</Text>
          </View>
          <View style={styles.listItemActions}>
            <TouchableOpacity style={styles.actionIcon}>
              <Eye size={16} color={lightTheme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Edit size={16} color={lightTheme.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Trash2 size={16} color={lightTheme.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const ModulesTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Modules</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigateToManage('modules')}
        >
          <Plus size={20} color="white" />
          <Text style={styles.addButtonText}>Add Module</Text>
        </TouchableOpacity>
      </View>

      {modules.map((module) => (
        <View key={module.id} style={styles.listItem}>
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>{module.title}</Text>
            <Text style={styles.listItemSubtitle}>{module.course_title}</Text>
          </View>
          <View style={styles.listItemActions}>
            <TouchableOpacity style={styles.actionIcon}>
              <Eye size={16} color={lightTheme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Edit size={16} color={lightTheme.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Trash2 size={16} color={lightTheme.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const TABS = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'categories', label: 'Categories', icon: FolderOpen },
    { key: 'courses', label: 'Courses', icon: BookOpen },
    { key: 'modules', label: 'Modules', icon: Layers },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={lightTheme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LMS Management</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.primary} />
          <Text style={styles.loadingText}>Loading LMS data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={lightTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LMS Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <tab.icon size={20} color={activeTab === tab.key ? lightTheme.primary : lightTheme.textSecondary} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? lightTheme.primary : lightTheme.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'courses' && <CoursesTab />}
        {activeTab === 'modules' && <ModulesTab />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
    backgroundColor: lightTheme.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: lightTheme.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: lightTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: lightTheme.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: lightTheme.card,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: lightTheme.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: lightTheme.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightTheme.card,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentCard: {
    backgroundColor: lightTheme.card,
    padding: 20,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  recentText: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    textAlign: 'center',
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: lightTheme.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    padding: 4,
  },
}); 