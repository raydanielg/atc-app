import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function LearnTab() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('course_categories').select('*').order('name');
    setCategories(data || []);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.curvedHeader}>
        <Text style={styles.collegeName}>Arusha Technical College</Text>
        {/* Optionally add logo here: <Image source={require('@/assets/images/ATC.png')} style={styles.logo} /> */}
        <Text style={styles.headerTitle}>Learn</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Browse courses by category</Text>
        {loading ? (
          <ActivityIndicator size="large" color={lightTheme.primary} />
        ) : categories.length === 0 ? (
          <Text style={styles.emptyText}>No categories found.</Text>
        ) : (
          categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              onPress={() => router.push(`/learn/${cat.slug}` as any)}
            >
              <Text style={styles.cardTitle}>{cat.name}</Text>
              <View style={styles.cardIcon}><ChevronRight size={28} color={lightTheme.primary} /></View>
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
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  collegeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  content: { padding: 24 },
  subtitle: { fontSize: 16, color: lightTheme.textSecondary, marginBottom: 24, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: lightTheme.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.primary + '10',
  },
  cardTitle: { fontSize: 20, fontWeight: '600', color: lightTheme.text },
  cardIcon: { marginLeft: 12 },
  emptyText: { color: lightTheme.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 40 },
  // logo: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
}); 