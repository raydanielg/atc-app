import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, File } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

const windowHeight = Dimensions.get('window').height;

export default function PdfNotePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNote();
  }, [id]);

  const fetchNote = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setNote(data);
    } catch (error) {
      setNote(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.primary} />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!note || !note.file_url) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>PDF not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={lightTheme.primary} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pdfHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={lightTheme.primary} />
        </TouchableOpacity>
        <File size={22} color={lightTheme.primary} style={{ marginLeft: 8 }} />
        <Text style={styles.pdfTitle} numberOfLines={1}>{note.title}</Text>
      </View>
      <WebView
        source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(note.file_url)}` }}
        style={styles.pdfViewer}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={lightTheme.primary} />
          </View>
        )}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.background },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: lightTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
    zIndex: 2,
  },
  backButton: {
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.background,
    borderRadius: 8,
    padding: 6,
    paddingHorizontal: 10,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginLeft: 12,
    flex: 1,
  },
  pdfViewer: {
    flex: 1,
    width: '100%',
    height: windowHeight - 80,
    backgroundColor: '#fff',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: lightTheme.textSecondary,
    marginBottom: 24,
  },
  backButtonText: {
    color: lightTheme.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 