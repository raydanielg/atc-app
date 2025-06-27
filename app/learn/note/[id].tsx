import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Image, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, User, FileText, Clock, BookOpen } from 'lucide-react-native';

const { width } = Dimensions.get('window');

function renderNoteContent(content: string) {
  if (!content) return null;
  const lines = content.split(/\r?\n/);
  const elements = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  function flushList() {
    if (listBuffer) {
      if (listBuffer.type === 'ul') {
        elements.push(
          <View key={elements.length} style={styles.listBlock}>
            {listBuffer.items.map((item, idx) => (
              <View key={idx} style={styles.listItemRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.listItemText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      } else {
        elements.push(
          <View key={elements.length} style={styles.listBlock}>
            {listBuffer.items.map((item, idx) => (
              <View key={idx} style={styles.listItemRow}>
                <Text style={styles.bullet}>{`${idx + 1}.`}</Text>
                <Text style={styles.listItemText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      }
      listBuffer = null;
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Image
    if (/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))$/i.test(trimmed)) {
      flushList();
      elements.push(
        <Image
          key={elements.length}
          source={{ uri: trimmed }}
          style={styles.contentImage}
          resizeMode="cover"
        />
      );
      return;
    }
    // Title
    if (trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      flushList();
      elements.push(
        <Text key={elements.length} style={styles.contentTitle}>{trimmed}</Text>
      );
      return;
    }
    // Numbered list (e.g., 1. Item)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(olMatch[2]);
      return;
    }
    // Bulleted list (- or * Item)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      return;
    }
    // Paragraph
    flushList();
    if (trimmed.length > 0) {
      elements.push(
        <Text key={elements.length} style={styles.contentParagraph}>{trimmed}</Text>
      );
    }
  });
  flushList();
  return elements;
}

export default function NoteDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHtmlContent, setIsHtmlContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNote();
  }, [id]);

  useEffect(() => {
    if (note && note.content) {
      const hasHtmlTags = /<[^>]*>/g.test(note.content);
      setIsHtmlContent(hasHtmlTags);
    }
  }, [note]);

  const fetchNote = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setNote(data);
    } catch (error) {
      console.error('Error fetching note:', error);
      setError('Failed to load note');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Note</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.primary} />
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !note) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Note</Text>
        </View>
        <View style={styles.errorContainer}>
          <BookOpen size={48} color={lightTheme.textSecondary} />
          <Text style={styles.errorTitle}>Note Not Found</Text>
          <Text style={styles.errorText}>{error || 'The note you are looking for does not exist.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNote}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Note</Text>
      </View>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.noteCard}>
          <View style={styles.noteHeaderRow}>
            <View style={styles.noteIconContainer}>
              <FileText size={28} color={lightTheme.primary} />
            </View>
            <View style={styles.noteTitleContainer}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              <View style={styles.noteMetaRow}>
                <Clock size={14} color={lightTheme.textSecondary} />
                <Text style={styles.noteMetaText}>
                  {new Date(note.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.sectionDivider} />
          
          <View style={styles.contentSection}>
            <Text style={styles.sectionLabel}>Content</Text>
            {isHtmlContent ? (
              <WebView
                originWhitelist={['*']}
                source={{ 
                  html: `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                        <script src='https://cdn.tailwindcss.com'></script>
                        <style>
                          body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                            margin: 0; 
                            padding: 0; 
                            background: transparent;
                            line-height: 1.7;
                            color: #374151;
                            font-size: 16px;
                          }
                          h1, h2, h3 { color: #1f2937; margin-top: 24px; margin-bottom: 12px; }
                          p { margin-bottom: 16px; }
                          ul, ol { margin-bottom: 16px; padding-left: 20px; }
                          li { margin-bottom: 8px; }
                          img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
                          blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; font-style: italic; }
                          code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
                        </style>
                      </head>
                      <body>
                        ${note.content}
                      </body>
                    </html>
                  `
                }}
                style={styles.htmlPreview}
                javaScriptEnabled
                domStorageEnabled
                scalesPageToFit
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noteContentBlock}>{renderNoteContent(note.content)}</View>
            )}
          </View>
          
          <View style={styles.sectionDivider} />
          
          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.metaRow}>
              <Calendar size={16} color={lightTheme.textSecondary} />
              <Text style={styles.metaText}>
                Created: {new Date(note.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            {note.updated_at && note.updated_at !== note.created_at && (
              <View style={styles.metaRow}>
                <User size={16} color={lightTheme.textSecondary} />
                <Text style={styles.metaText}>
                  Updated: {new Date(note.updated_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: lightTheme.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.primary,
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 12,
    elevation: 8,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  backButton: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  content: { 
    padding: 20 
  },
  noteCard: {
    backgroundColor: lightTheme.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: lightTheme.primary + '15',
    elevation: 4,
    shadowColor: lightTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  noteIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: lightTheme.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteTitleContainer: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: lightTheme.text,
    marginBottom: 8,
    lineHeight: 32,
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteMetaText: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: lightTheme.border,
    marginVertical: 20,
    borderRadius: 1,
  },
  contentSection: {
    marginBottom: 8,
  },
  detailsSection: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    color: lightTheme.primary,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1,
  },
  noteContentBlock: {
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 20,
    color: lightTheme.accent,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 1,
  },
  contentParagraph: {
    fontSize: 16,
    color: lightTheme.textSecondary,
    lineHeight: 28,
    marginBottom: 12,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 16,
    backgroundColor: lightTheme.background,
  },
  listBlock: {
    marginBottom: 12,
    marginLeft: 8,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    fontSize: 16,
    color: lightTheme.primary,
    width: 24,
    textAlign: 'right',
    marginRight: 8,
    fontWeight: 'bold',
  },
  listItemText: {
    fontSize: 16,
    color: lightTheme.textSecondary,
    flex: 1,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  metaText: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    fontWeight: '500',
  },
  htmlPreview: {
    flex: 1,
    backgroundColor: 'transparent',
    marginBottom: 16,
    minHeight: 600,
    height: 800,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: lightTheme.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: lightTheme.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: lightTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: lightTheme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 