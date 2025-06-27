import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { ChevronRight, ArrowLeft, BookOpen, Calendar } from 'lucide-react-native';

export default function CourseDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [course, setCourse] = useState<{ id: number; title: string; description: string; created_at: string } | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('id, title, description, created_at')
        .eq('id', id)
        .single();
      setCourse(courseData);
      
      // Fetch modules for this course
      const { data: modulesData } = await supabase
        .from('modules')
        .select('id, title, description, course_id, created_at, updated_at')
        .eq('course_id', id)
        .order('id', { ascending: true });
      
      // For each module, fetch notes count
      const modulesWithNotes = await Promise.all((modulesData || []).map(async (mod) => {
        const { count } = await supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('module_id', mod.id);
        return { ...mod, note_count: count || 0 };
      }));
      setModules(modulesWithNotes);
    } catch (error) {
      console.error('Error fetching course/modules:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.curvedHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.collegeName}>Arusha Technical College</Text>
        <Text style={styles.headerTitle}>{course ? course.title : 'Course'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={lightTheme.primary} />
        ) : !course ? (
          <Text style={styles.emptyText}>Course not found.</Text>
        ) : (
          <>
            {/* Course Info Card */}
            <View style={styles.courseInfoCard}>
              <View style={styles.courseStats}>
                <View style={styles.statItem}>
                  <BookOpen size={20} color={lightTheme.primary} />
                  <Text style={styles.statText}>{modules.length} Modules</Text>
                </View>
                <View style={styles.statItem}>
                  <Calendar size={20} color={lightTheme.primary} />
                  <Text style={styles.statText}>
                    {new Date(course.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text style={styles.description}>{course.description}</Text>
            </View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Course Modules</Text>
              <Text style={styles.sectionSubtitle}>
                {modules.length === 0 ? 'No modules available' : `${modules.length} module${modules.length !== 1 ? 's' : ''} in this course`}
              </Text>
            </View>
            {modules.length === 0 ? (
              <View style={styles.emptyCard}>
                <BookOpen size={48} color={lightTheme.textSecondary} />
                <Text style={styles.emptyText}>No modules available yet</Text>
                <Text style={styles.emptySubtext}>Check back later for course content</Text>
              </View>
            ) : (
              modules.map((mod, idx) => (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.moduleCard}
                  onPress={() => router.push(`/learn/module/${mod.id}` as any)}
                >
                  <View style={styles.moduleIndex}>
                    <Text style={styles.moduleNumber}>{idx + 1}</Text>
                  </View>
                  <View style={styles.moduleContent}>
                    <Text style={styles.moduleTitle}>{mod.title}</Text>
                    {mod.description ? (
                      <Text style={styles.moduleDesc} numberOfLines={2}>
                        {mod.description}
                      </Text>
                    ) : null}
                    <View style={styles.moduleMeta}>
                      <Text style={styles.moduleNotes}>
                        {mod.note_count} note{mod.note_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={lightTheme.primary} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.background },
  curvedHeader: {
    backgroundColor: lightTheme.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 36,
    paddingBottom: 32,
    marginBottom: 12,
    elevation: 4,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  collegeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  content: { padding: 24 },
  courseInfoCard: {
    backgroundColor: lightTheme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: lightTheme.primary + '10',
    elevation: 2,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: lightTheme.textSecondary,
    fontWeight: '500',
  },
  description: { 
    fontSize: 16, 
    color: lightTheme.text,
    lineHeight: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: lightTheme.text, 
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: lightTheme.primary + '10',
    elevation: 1,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  moduleIndex: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightTheme.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  moduleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: lightTheme.primary,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: lightTheme.text,
    marginBottom: 4,
  },
  moduleDesc: { 
    fontSize: 14, 
    color: lightTheme.textSecondary, 
    marginBottom: 8,
    lineHeight: 20,
  },
  moduleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleNotes: {
    fontSize: 12,
    color: lightTheme.primary,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: lightTheme.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: lightTheme.primary + '10',
  },
  emptyText: { 
    color: lightTheme.textSecondary, 
    fontSize: 16, 
    textAlign: 'center', 
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: lightTheme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
}); 