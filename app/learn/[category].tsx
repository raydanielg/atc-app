import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { ChevronRight, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function CategoryCourses() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [courses, setCourses] = useState<{ id: number; title: string; description: string; category_id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCategoryId();
  }, [category]);

  useEffect(() => {
    if (categoryId) fetchCourses();
  }, [categoryId]);

  const fetchCategoryId = async () => {
    const { data } = await supabase
      .from('course_categories')
      .select('id')
      .eq('slug', category)
      .single();
    setCategoryId(data?.id);
  };

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, category_id')
      .eq('category_id', categoryId);
    setCourses(data || []);
    setLoading(false);
  };

  // Filtered courses for search
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(search.toLowerCase())
  );

  // Helper to highlight the matching part
  const highlightMatch = (title: string) => {
    if (!search) return <Text style={styles.cardTitle}>{title}</Text>;
    const idx = title.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return <Text style={styles.cardTitle}>{title}</Text>;
    return (
      <Text style={styles.cardTitle}>
        {title.substring(0, idx)}
        <Text style={styles.highlight}>{title.substring(idx, idx + search.length)}</Text>
        {title.substring(idx + search.length)}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.curvedHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.collegeName}>Arusha Technical College</Text>
        <Text style={styles.headerTitle}>{category?.toString().toUpperCase()} Courses</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          placeholderTextColor={lightTheme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={lightTheme.primary} />
        ) : filteredCourses.length === 0 ? (
          <Text style={styles.emptyText}>No courses found.</Text>
        ) : (
          filteredCourses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.card}
              onPress={() => router.push(`/learn/course/${course.id}` as any)}
            >
              <View style={styles.cardContent}>
                {highlightMatch(course.title)}
                {course.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {course.description}
                  </Text>
                )}
              </View>
              <View style={styles.cardIcon}>
                <ChevronRight size={24} color={lightTheme.primary} />
              </View>
            </TouchableOpacity>
          ))
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
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: lightTheme.background,
  },
  searchInput: {
    backgroundColor: lightTheme.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 12,
    fontSize: 16,
    color: lightTheme.text,
    marginTop: 8,
    marginBottom: 8,
  },
  highlight: {
    backgroundColor: lightTheme.primary + '30',
    color: lightTheme.primary,
    fontWeight: 'bold',
  },
  content: { 
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.primary + '15',
    minHeight: 80,
  },
  cardContent: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: lightTheme.text,
    marginBottom: 4,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    lineHeight: 20,
  },
  cardIcon: { 
    alignSelf: 'center',
    padding: 4,
  },
  emptyText: { color: lightTheme.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 40 },
}); 