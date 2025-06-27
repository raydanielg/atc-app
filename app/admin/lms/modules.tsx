import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  Layers,
  FileText,
  Upload,
  File,
  Download,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { enhanceNoteContentWithGemini } from '@/lib/gemini';
import { WebView } from 'react-native-webview';

type Module = {
  id: number;
  title: string;
  description: string;
  course_id: number;
  course_title: string;
  created_at: string;
  note_count: number;
};

type Note = {
  id: number;
  title: string;
  content: string;
  file_url: string | null;
  module_id: number;
  created_at: string;
  updated_at: string;
};

type Course = {
  id: number;
  title: string;
};

export default function ModulesManagement() {
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', course_id: '' });
  const [noteFormData, setNoteFormData] = useState({ title: '', content: '', file_url: '' });
  const [noteType, setNoteType] = useState<'content' | 'file'>('content');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [aiFields, setAiFields] = useState({ description: '', summary: '', pages: '1', customPrompt: '' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchModules(), fetchCourses()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          id,
          title,
          description,
          course_id,
          created_at,
          courses!inner(title),
          notes(id)
        `)
        .order('title');

      if (error) throw error;

      if (data) {
        const modulesWithCount = data.map(module => ({
          id: module.id,
          title: module.title,
          description: module.description,
          course_id: module.course_id,
          course_title: module.courses?.title || 'Unknown',
          created_at: module.created_at,
          note_count: module.notes?.length || 0,
        }));
        setModules(modulesWithCount);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      Alert.alert('Error', 'Failed to load modules');
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchNotes = async (moduleId: number) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAdd = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.course_id) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .insert([{
          title: formData.title.trim(),
          description: formData.description.trim(),
          course_id: parseInt(formData.course_id)
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Module added successfully');
      setShowAddModal(false);
      setFormData({ title: '', description: '', course_id: '' });
      fetchModules();
    } catch (error) {
      console.error('Error adding module:', error);
      Alert.alert('Error', 'Failed to add module');
    }
  };

  const handleEdit = async () => {
    if (!editingModule || !formData.title.trim() || !formData.description.trim() || !formData.course_id) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          course_id: parseInt(formData.course_id)
        })
        .eq('id', editingModule.id);

      if (error) throw error;

      Alert.alert('Success', 'Module updated successfully');
      setShowEditModal(false);
      setEditingModule(null);
      setFormData({ title: '', description: '', course_id: '' });
      fetchModules();
    } catch (error) {
      console.error('Error updating module:', error);
      Alert.alert('Error', 'Failed to update module');
    }
  };

  const handleDelete = async (module: Module) => {
    Alert.alert(
      'Delete Module',
      `Are you sure you want to delete "${module.title}"? This will also delete all associated notes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', module.id);

              if (error) throw error;

              Alert.alert('Success', 'Module deleted successfully');
              fetchModules();
            } catch (error) {
              console.error('Error deleting module:', error);
              Alert.alert('Error', 'Failed to delete module');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (module: Module) => {
    setEditingModule(module);
    setFormData({ 
      title: module.title, 
      description: module.description, 
      course_id: module.course_id.toString() 
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setFormData({ title: '', description: '', course_id: '' });
    setShowAddModal(true);
  };

  const openNotesModal = async (module: Module) => {
    setSelectedModule(module);
    setShowNotesModal(true);
    await fetchNotes(module.id);
  };

  const openAddNoteModal = () => {
    setNoteFormData({ title: '', content: '', file_url: '' });
    setNoteType('content');
    setShowAddNoteModal(true);
  };

  const openEditNoteModal = (note: Note) => {
    setEditingNote(note);
    setNoteFormData({ 
      title: note.title, 
      content: note.content, 
      file_url: note.file_url || '' 
    });
    setNoteType(note.file_url ? 'file' : 'content');
    setShowEditNoteModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowNotesModal(false);
    setShowAddNoteModal(false);
    setShowEditNoteModal(false);
    setEditingModule(null);
    setEditingNote(null);
    setSelectedModule(null);
    setFormData({ title: '', description: '', course_id: '' });
    setNoteFormData({ title: '', content: '', file_url: '' });
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploadingFile(true);

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('notes')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('notes')
        .getPublicUrl(fileName);

      setNoteFormData(prev => ({ ...prev, file_url: publicUrl }));
      setUploadingFile(false);
      Alert.alert('Success', 'File uploaded successfully');
    } catch (error) {
      setUploadingFile(false);
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const handleAddNote = async () => {
    if (!selectedModule || !noteFormData.title.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (noteType === 'content' && !noteFormData.content.trim()) {
      Alert.alert('Error', 'Please enter note content');
      return;
    }

    if (noteType === 'file' && !noteFormData.file_url) {
      Alert.alert('Error', 'Please upload a file');
      return;
    }

    try {
      const { error } = await supabase
        .from('notes')
        .insert([{
          title: noteFormData.title.trim(),
          content: noteType === 'content' ? noteFormData.content.trim() : '',
          file_url: noteType === 'file' ? noteFormData.file_url : null,
          module_id: selectedModule.id
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Note added successfully');
      setShowAddNoteModal(false);
      setNoteFormData({ title: '', content: '', file_url: '' });
      if (selectedModule) {
        await fetchNotes(selectedModule.id);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleEditNote = async () => {
    if (!editingNote || !noteFormData.title.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (noteType === 'content' && !noteFormData.content.trim()) {
      Alert.alert('Error', 'Please enter note content');
      return;
    }

    if (noteType === 'file' && !noteFormData.file_url) {
      Alert.alert('Error', 'Please upload a file');
      return;
    }

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: noteFormData.title.trim(),
          content: noteType === 'content' ? noteFormData.content.trim() : '',
          file_url: noteType === 'file' ? noteFormData.file_url : null,
        })
        .eq('id', editingNote.id);

      if (error) throw error;

      Alert.alert('Success', 'Note updated successfully');
      setShowEditNoteModal(false);
      setEditingNote(null);
      setNoteFormData({ title: '', content: '', file_url: '' });
      if (selectedModule) {
        await fetchNotes(selectedModule.id);
      }
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Error', 'Failed to update note');
    }
  };

  const handleDeleteNote = async (note: Note) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', note.id);

              if (error) throw error;

              Alert.alert('Success', 'Note deleted successfully');
              if (selectedModule) {
                await fetchNotes(selectedModule.id);
              }
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={lightTheme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modules</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.primary} />
          <Text style={styles.loadingText}>Loading modules...</Text>
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
        <Text style={styles.headerTitle}>Modules</Text>
        <TouchableOpacity onPress={openAddModal}>
          <Plus size={24} color={lightTheme.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {modules.length === 0 ? (
          <View style={styles.emptyState}>
            <Layers size={48} color={lightTheme.textSecondary} />
            <Text style={styles.emptyStateText}>No modules found</Text>
            <Text style={styles.emptyStateSubtext}>Create your first module to get started</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={openAddModal}>
              <Plus size={20} color="white" />
              <Text style={styles.emptyStateButtonText}>Add Module</Text>
            </TouchableOpacity>
          </View>
        ) : (
          modules.map((module) => (
            <View key={module.id} style={styles.moduleCard}>
              <View style={styles.moduleContent}>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleCourse}>{module.course_title}</Text>
                  <Text style={styles.moduleDescription} numberOfLines={2}>
                    {module.description}
                  </Text>
                  <Text style={styles.moduleMeta}>
                    {module.note_count} notes • Created {new Date(module.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.moduleActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openNotesModal(module)}
                  >
                    <Eye size={16} color={lightTheme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openEditModal(module)}
                  >
                    <Edit size={16} color={lightTheme.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDelete(module)}
                  >
                    <Trash2 size={16} color={lightTheme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Module Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Module</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color={lightTheme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter module title"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter module description"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Course</Text>
              <ScrollView style={styles.coursePicker}>
                {courses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.courseOption,
                      formData.course_id === course.id.toString() && styles.courseOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, course_id: course.id.toString() }))}
                  >
                    <Text style={[
                      styles.courseOptionText,
                      formData.course_id === course.id.toString() && styles.courseOptionTextSelected
                    ]}>
                      {course.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
                <Save size={16} color="white" />
                <Text style={styles.saveButtonText}>Add Module</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Module Modal */}
      {showEditModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Module</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color={lightTheme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter module title"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter module description"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Course</Text>
              <ScrollView style={styles.coursePicker}>
                {courses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.courseOption,
                      formData.course_id === course.id.toString() && styles.courseOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, course_id: course.id.toString() }))}
                  >
                    <Text style={[
                      styles.courseOptionText,
                      formData.course_id === course.id.toString() && styles.courseOptionTextSelected
                    ]}>
                      {course.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
                <Save size={16} color="white" />
                <Text style={styles.saveButtonText}>Update Module</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedModule && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: '95%' }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notes for {selectedModule.title}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <X size={24} color={lightTheme.textSecondary} />
                </TouchableOpacity>
              </View>
              {notes.length === 0 ? (
                <Text style={styles.emptyStateText}>No notes found for this module.</Text>
              ) : (
                notes.map((note) => (
                  <View key={note.id} style={[styles.noteCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteTitle}>{note.title}</Text>
                      <Text style={styles.noteMeta}>{note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => openEditNoteModal(note)}>
                        <Edit size={18} color={lightTheme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteNote(note)}>
                        <Trash2 size={18} color={lightTheme.error || 'red'} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => {/* Optionally implement view note */}}>
                        <Eye size={18} color={lightTheme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.saveButton} onPress={openAddNoteModal}>
                <Plus size={16} color="white" />
                <Text style={styles.saveButtonText}>Add Note</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && selectedModule && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: '95%' }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Note</Text>
                <TouchableOpacity onPress={closeModal}>
                  <X size={24} color={lightTheme.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter note title"
                  placeholderTextColor={lightTheme.textSecondary}
                  value={noteFormData.title}
                  onChangeText={(text) => setNoteFormData(prev => ({ ...prev, title: text }))}
                />
              </View>
              {/* AI fields for content generation */}
              {noteType === 'content' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Description</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Describe the note (optional)"
                      placeholderTextColor={lightTheme.textSecondary}
                      value={aiFields.description}
                      onChangeText={text => setAiFields(f => ({ ...f, description: text }))}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Short Summary (Maelezo Mafupi)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Short summary for the note (optional)"
                      placeholderTextColor={lightTheme.textSecondary}
                      value={aiFields.summary}
                      onChangeText={text => setAiFields(f => ({ ...f, summary: text }))}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Number of Pages/Sections</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 3"
                      placeholderTextColor={lightTheme.textSecondary}
                      value={aiFields.pages}
                      onChangeText={text => setAiFields(f => ({ ...f, pages: text.replace(/[^0-9]/g, '') }))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Custom Instructions for Gemini (optional)</Text>
                    <TextInput
                      style={[styles.formInput, { minHeight: 40 }]}
                      placeholder="Add any extra instructions for Gemini AI (optional)"
                      placeholderTextColor={lightTheme.textSecondary}
                      value={aiFields.customPrompt}
                      onChangeText={text => setAiFields(f => ({ ...f, customPrompt: text }))}
                      multiline
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.geminiButton, aiGenerating && { opacity: 0.6 }]}
                    onPress={async () => {
                      if (!noteFormData.title.trim()) {
                        Alert.alert('Error', 'Please enter a title for the note');
                        return;
                      }
                      setAiGenerating(true);
                      const prompt = `Create a beautiful, easy-to-understand, and well-illustrated note for a learning module.\nTitle: ${noteFormData.title}\nDescription: ${aiFields.description}\nSummary: ${aiFields.summary}\nSplit the content into ${aiFields.pages || 1} sections/pages. Use clear section titles, bullet points, images (with links), illustrations, and examples where appropriate. Output the note as responsive HTML using Tailwind CSS classes for modern mobile-friendly design. Use simple, clear language.\n${aiFields.customPrompt}`;
                      const aiContent = await enhanceNoteContentWithGemini(prompt);
                      setAiGenerating(false);
                      if (aiContent) {
                        setNoteFormData(prev => ({ ...prev, content: aiContent }));
                        setPreviewMode(true);
                      } else {
                        Alert.alert('AI Error', 'Failed to generate content. Try again.');
                      }
                    }}
                    disabled={aiGenerating}
                  >
                    {aiGenerating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.geminiButtonText}>Generate with Gemini AI</Text>
                    )}
                  </TouchableOpacity>
                  {/* Preview/Edit Toggle */}
                  {noteFormData.content ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <TouchableOpacity onPress={() => setPreviewMode(!previewMode)}>
                        <Text style={{ color: lightTheme.primary, fontWeight: 'bold' }}>
                          {previewMode ? 'Edit HTML' : 'Preview'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {/* HTML Preview or Editor */}
                  {noteFormData.content && previewMode ? (
                    <View style={{ height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: lightTheme.border }}>
                      <WebView
                        originWhitelist={['*']}
                        source={{ html: `<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'><script src='https://cdn.tailwindcss.com'></script></head><body class='bg-white p-4'>${noteFormData.content}</body></html>` }}
                        style={{ flex: 1, backgroundColor: 'white' }}
                        javaScriptEnabled
                        domStorageEnabled
                        scalesPageToFit
                      />
                    </View>
                  ) : noteFormData.content ? (
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>HTML Content</Text>
                      <TextInput
                        style={[styles.formInput, styles.textArea, { minHeight: 60, maxHeight: 120 }]}
                        value={noteFormData.content}
                        onChangeText={text => setNoteFormData(prev => ({ ...prev, content: text }))}
                        multiline
                        numberOfLines={4}
                      />
                    </View>
                  ) : null}
                </>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      noteType === 'content' && styles.typeOptionSelected
                    ]}
                    onPress={() => setNoteType('content')}
                  >
                    <FileText size={16} color={noteType === 'content' ? 'white' : lightTheme.text} />
                    <Text style={[
                      styles.typeOptionText,
                      noteType === 'content' && styles.typeOptionTextSelected
                    ]}>
                      Text Content
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      noteType === 'file' && styles.typeOptionSelected
                    ]}
                    onPress={() => setNoteType('file')}
                  >
                    <Upload size={16} color={noteType === 'file' ? 'white' : lightTheme.text} />
                    <Text style={[
                      styles.typeOptionText,
                      noteType === 'file' && styles.typeOptionTextSelected
                    ]}>
                      PDF File
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {noteType === 'content' ? (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Content</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Enter note content"
                    placeholderTextColor={lightTheme.textSecondary}
                    value={noteFormData.content}
                    onChangeText={(text) => setNoteFormData(prev => ({ ...prev, content: text }))}
                    multiline
                    numberOfLines={6}
                  />
                </View>
              ) : (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PDF File</Text>
                  {noteFormData.file_url ? (
                    <View style={styles.filePreview}>
                      <File size={20} color={lightTheme.primary} />
                      <Text style={styles.filePreviewText}>File uploaded successfully</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.uploadButton} 
                      onPress={pickDocument}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <ActivityIndicator size="small" color={lightTheme.primary} />
                      ) : (
                        <Upload size={20} color={lightTheme.primary} />
                      )}
                      <Text style={styles.uploadButtonText}>
                        {uploadingFile ? 'Uploading...' : 'Choose PDF File'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleAddNote}>
                  <Save size={16} color="white" />
                  <Text style={styles.saveButtonText}>Add Note</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Edit Note Modal */}
      {showEditNoteModal && editingNote && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Note</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color={lightTheme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter note title"
                placeholderTextColor={lightTheme.textSecondary}
                value={noteFormData.title}
                onChangeText={(text) => setNoteFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    noteType === 'content' && styles.typeOptionSelected
                  ]}
                  onPress={() => setNoteType('content')}
                >
                  <FileText size={16} color={noteType === 'content' ? 'white' : lightTheme.text} />
                  <Text style={[
                    styles.typeOptionText,
                    noteType === 'content' && styles.typeOptionTextSelected
                  ]}>
                    Text Content
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    noteType === 'file' && styles.typeOptionSelected
                  ]}
                  onPress={() => setNoteType('file')}
                >
                  <Upload size={16} color={noteType === 'file' ? 'white' : lightTheme.text} />
                  <Text style={[
                    styles.typeOptionText,
                    noteType === 'file' && styles.typeOptionTextSelected
                  ]}>
                    PDF File
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {noteType === 'content' ? (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Content</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Enter note content"
                  placeholderTextColor={lightTheme.textSecondary}
                  value={noteFormData.content}
                  onChangeText={(text) => setNoteFormData(prev => ({ ...prev, content: text }))}
                  multiline
                  numberOfLines={6}
                />
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>PDF File</Text>
                {noteFormData.file_url ? (
                  <View style={styles.filePreview}>
                    <File size={20} color={lightTheme.primary} />
                    <Text style={styles.filePreviewText}>File uploaded successfully</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.uploadButton} 
                    onPress={pickDocument}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <ActivityIndicator size="small" color={lightTheme.primary} />
                    ) : (
                      <Upload size={20} color={lightTheme.primary} />
                    )}
                    <Text style={styles.uploadButtonText}>
                      {uploadingFile ? 'Uploading...' : 'Choose PDF File'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleEditNote}>
                <Save size={16} color="white" />
                <Text style={styles.saveButtonText}>Update Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: lightTheme.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: lightTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  moduleCard: {
    backgroundColor: lightTheme.card,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  moduleContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 4,
  },
  moduleCourse: {
    fontSize: 14,
    color: lightTheme.primary,
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  moduleMeta: {
    fontSize: 12,
    color: lightTheme.textSecondary,
  },
  moduleActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: lightTheme.surface,
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
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  notesModalContent: {
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: lightTheme.text,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notesSubtitle: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addNoteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  notesList: {
    flex: 1,
  },
  emptyNotes: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyNotesText: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyNotesSubtext: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: lightTheme.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  noteMeta: {
    fontSize: 12,
    color: lightTheme.textSecondary,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 4,
  },
  noteActionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: lightTheme.surface,
  },
  noteContent: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    lineHeight: 20,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: lightTheme.background,
    borderRadius: 6,
  },
  fileText: {
    fontSize: 14,
    color: lightTheme.text,
    flex: 1,
  },
  downloadButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: lightTheme.primary + '20',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: lightTheme.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 12,
    fontSize: 16,
    color: lightTheme.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  coursePicker: {
    maxHeight: 120,
  },
  courseOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: lightTheme.background,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  courseOptionSelected: {
    backgroundColor: lightTheme.primary + '20',
    borderColor: lightTheme.primary,
  },
  courseOptionText: {
    fontSize: 16,
    color: lightTheme.text,
  },
  courseOptionTextSelected: {
    color: lightTheme.primary,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: lightTheme.background,
    borderWidth: 1,
    borderColor: lightTheme.border,
    gap: 8,
  },
  typeOptionSelected: {
    backgroundColor: lightTheme.primary,
    borderColor: lightTheme.primary,
  },
  typeOptionText: {
    fontSize: 14,
    color: lightTheme.text,
    fontWeight: '500',
  },
  typeOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: lightTheme.background,
    borderWidth: 2,
    borderColor: lightTheme.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    color: lightTheme.text,
    fontWeight: '500',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: lightTheme.primary + '20',
    gap: 8,
  },
  filePreviewText: {
    fontSize: 14,
    color: lightTheme.primary,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: lightTheme.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: lightTheme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: lightTheme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  geminiButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  geminiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
}); 