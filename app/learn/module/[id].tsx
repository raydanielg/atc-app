import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { FileText, Download, BookOpen, File, Eye, ArrowLeft, Calendar, User, X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';

const windowHeight = Dimensions.get('window').height;

type Note = {
  id: number;
  title: string;
  content: string;
  file_url: string | null;
  created_at: string;
  updated_at: string;
};

export default function ModuleDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [module, setModule] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    fetchModule();
  }, [id]);

  const fetchModule = async () => {
    setLoading(true);
    try {
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select(`
          id, 
          title, 
          description,
          created_at,
          courses(title, description)
        `)
        .eq('id', id)
        .single();
      
      if (moduleError) throw moduleError;
      setModule(moduleData);
      
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('module_id', id)
        .order('created_at', { ascending: false });
      
      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching module:', error);
      Alert.alert('Error', 'Failed to load module data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (fileUrl: string) => {
    try {
      await Linking.openURL(fileUrl);
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Could not open file. Please try again.');
    }
  };

  const openNoteModal = (note: Note) => {
    setSelectedNote(note);
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setSelectedNote(null);
    setShowNoteModal(false);
  };

  const getFileType = (fileUrl: string) => {
    const extension = fileUrl.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF Document';
      case 'doc': return 'Word Document';
      case 'docx': return 'Word Document';
      case 'ppt': return 'PowerPoint';
      case 'pptx': return 'PowerPoint';
      case 'xls': return 'Excel Spreadsheet';
      case 'xlsx': return 'Excel Spreadsheet';
      default: return 'Document';
    }
  };

  const getFileName = (fileUrl: string) => {
    return fileUrl.split('/').pop() || 'Document';
  };

  const handleDownloadPdf = async (pdfUrl: string, noteId: number) => {
    try {
      // Open PDF directly in browser - user can view or download from there
      await Linking.openURL(pdfUrl);
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Could not open PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.primary} />
          <Text style={styles.loadingText}>Loading module...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!module) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Module not found</Text>
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
      {/* Header */}
      <View style={styles.curvedHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.collegeName}>Arusha Technical College</Text>
          <Text style={styles.headerTitle}>{module.title}</Text>
          {module?.courses?.title && (
            <Text style={styles.courseName}>{module.courses.title}</Text>
          )}
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Module Info Card */}
        <View style={styles.moduleInfoCard}>
          <View style={styles.moduleStats}>
            <View style={styles.statItem}>
              <BookOpen size={20} color={lightTheme.primary} />
              <Text style={styles.statText}>{notes.length} Notes</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar size={20} color={lightTheme.primary} />
              <Text style={styles.statText}>
                {new Date(module.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          {module.description && (
            <Text style={styles.description}>{module.description}</Text>
          )}
        </View>
        
        {/* Notes Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Learning Materials</Text>
          <Text style={styles.sectionSubtitle}>
            {notes.length === 0 ? 'No materials available' : `${notes.length} resource${notes.length !== 1 ? 's' : ''} available`}
          </Text>
        </View>
        
        {notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={48} color={lightTheme.textSecondary} />
            <Text style={styles.emptyText}>No learning materials yet</Text>
            <Text style={styles.emptySubtext}>Check back later for notes and resources</Text>
          </View>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={styles.noteIcon}>
                  {note.file_url ? (
                    <File size={20} color={lightTheme.primary} />
                  ) : (
                    <FileText size={20} color={lightTheme.primary} />
                  )}
                </View>
                <View style={styles.noteInfo}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.noteType}>
                    {note.file_url ? getFileType(note.file_url) : 'Text Content'}
                  </Text>
                </View>
                <View style={styles.noteActions}>
                  {note.file_url && note.file_url.toLowerCase().endsWith('.pdf') ? (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDownloadPdf(note.file_url!, note.id)}
                    >
                      <Download size={18} color={lightTheme.primary} />
                      <Text style={styles.actionButtonText}>Open PDF</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/learn/note/${note.id}`)}
                    >
                      <Eye size={18} color={lightTheme.primary} />
                      <Text style={styles.actionButtonText}>View</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {note.content && (
                <Text style={styles.notePreview} numberOfLines={2}>
                  {note.content}
                </Text>
              )}
              {note.file_url && (
                <View style={styles.fileInfo}>
                  <File size={14} color={lightTheme.textSecondary} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {getFileName(note.file_url)}
                  </Text>
                </View>
              )}
              <Text style={styles.noteDate}>
                Added {new Date(note.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Note Detail Modal */}
      {showNoteModal && selectedNote && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedNote.title}</Text>
              <TouchableOpacity onPress={closeNoteModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedNote.content && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Content</Text>
                  <Text style={styles.modalContent}>{selectedNote.content}</Text>
                </View>
              )}
              
              {selectedNote.file_url && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>File</Text>
                  <View style={styles.fileCard}>
                    <File size={24} color={lightTheme.primary} />
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileTitle}>{getFileName(selectedNote.file_url)}</Text>
                      <Text style={styles.fileType}>{getFileType(selectedNote.file_url)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => handleFileDownload(selectedNote.file_url!)}
                    >
                      <Download size={16} color="#fff" />
                      <Text style={styles.downloadButtonText}>Open</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Details</Text>
                <View style={styles.detailRow}>
                  <Calendar size={16} color={lightTheme.textSecondary} />
                  <Text style={styles.detailText}>
                    Created: {new Date(selectedNote.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {selectedNote.updated_at !== selectedNote.created_at && (
                  <View style={styles.detailRow}>
                    <User size={16} color={lightTheme.textSecondary} />
                    <Text style={styles.detailText}>
                      Updated: {new Date(selectedNote.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: lightTheme.background 
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
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
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  collegeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  courseName: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  content: { 
    padding: 24 
  },
  moduleInfoCard: {
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
  moduleStats: {
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
  noteCard: {
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
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: lightTheme.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 2,
  },
  noteType: {
    fontSize: 12,
    color: lightTheme.textSecondary,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  notePreview: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  fileName: {
    fontSize: 12,
    color: lightTheme.textSecondary,
    flex: 1,
  },
  noteDate: {
    fontSize: 11,
    color: lightTheme.textSecondary,
    textAlign: 'right',
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: lightTheme.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
    flex: 1,
  },
  closeButton: {
    fontSize: 20,
    color: lightTheme.textSecondary,
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 12,
  },
  modalContent: {
    fontSize: 16,
    color: lightTheme.text,
    lineHeight: 24,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.background,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: lightTheme.textSecondary,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: lightTheme.primary + '20',
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: lightTheme.primary,
    marginLeft: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: lightTheme.primary + '20',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: lightTheme.primary,
  },
}); 