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
  BookOpen
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

type Course = {
  id: number;
  title: string;
  description: string;
  category_id: number;
  category_name: string;
  created_at: string;
  module_count: number;
};

type Category = {
  id: number;
  name: string;
};

type CourseCategory = { id: string; name: string; slug: string };

// Type for PDF
type PdfFile = { name: string; url: string };

export default function CoursesManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', category_id: '' });
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [pdfUploading, setPdfUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCourses(), fetchCategories()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          category_id,
          created_at,
          course_categories!inner(name),
          modules(id)
        `)
        .order('title');

      if (error) throw error;

      if (data) {
        const coursesWithCount = data.map(course => ({
          id: course.id,
          title: course.title,
          description: course.description,
          category_id: course.category_id,
          category_name: Array.isArray(course.course_categories) && course.course_categories.length > 0
            ? course.course_categories[0].name
            : 'Unknown',
          created_at: course.created_at,
          module_count: course.modules?.length || 0,
        }));
        setCourses(coursesWithCount);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('course_categories')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAdd = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.category_id) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .insert([{
          title: formData.title.trim(),
          description: formData.description.trim(),
          category_id: parseInt(formData.category_id)
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Course added successfully');
      setShowAddModal(false);
      setFormData({ title: '', description: '', category_id: '' });
      fetchCourses();
    } catch (error) {
      console.error('Error adding course:', error);
      Alert.alert('Error', 'Failed to add course');
    }
  };

  const handleEdit = async () => {
    if (!editingCourse || !formData.title.trim() || !formData.description.trim() || !formData.category_id) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category_id: parseInt(formData.category_id)
        })
        .eq('id', editingCourse.id);

      if (error) throw error;

      Alert.alert('Success', 'Course updated successfully');
      setShowEditModal(false);
      setEditingCourse(null);
      setFormData({ title: '', description: '', category_id: '' });
      fetchCourses();
    } catch (error) {
      console.error('Error updating course:', error);
      Alert.alert('Error', 'Failed to update course');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete this course? This will also delete all associated modules.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Course deleted successfully');
              fetchCourses();
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', 'Failed to delete course');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({ 
      title: course.title, 
      description: course.description, 
      category_id: course.category_id.toString() 
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setFormData({ title: '', description: '', category_id: '' });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingCourse(null);
    setFormData({ title: '', description: '', category_id: '' });
  };

  const handlePickPdf = async () => {
    try {
      setPdfUploading(true);
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled) return;
      const file = result.assets[0];
      const fileName = `${Date.now()}_${file.name}`;

      // Read file as base64
      const fileBase64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage.from('pdfs').upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);
      setPdfs(prev => [...prev, { name: file.name, url: publicUrlData.publicUrl }]);
    } catch (err) {
      Alert.alert('Error', 'Failed to upload PDF');
    } finally {
      setPdfUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={lightTheme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Courses</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
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
        <Text style={styles.headerTitle}>Courses</Text>
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
        {courses.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color={lightTheme.textSecondary} />
            <Text style={styles.emptyStateText}>No courses found</Text>
            <Text style={styles.emptyStateSubtext}>Create your first course to get started</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={openAddModal}>
              <Plus size={20} color="white" />
              <Text style={styles.emptyStateButtonText}>Add Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          courses.map((course) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.courseContent}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseCategory}>{course.category_name}</Text>
                  <Text style={styles.courseDescription} numberOfLines={2}>
                    {course.description}
                  </Text>
                  <Text style={styles.courseMeta}>
                    {course.module_count} modules • Created {new Date(course.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.courseActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Eye size={16} color={lightTheme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openEditModal(course)}
                  >
                    <Edit size={16} color={lightTheme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDelete(course.id)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Course</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color={lightTheme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter course title"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter course description"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView style={styles.categoryPicker}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      formData.category_id === category.id.toString() && styles.categoryOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, category_id: category.id.toString() }))}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      formData.category_id === category.id.toString() && styles.categoryOptionTextSelected
                    ]}>
                      {category.name}
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
                <Text style={styles.saveButtonText}>Add Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Course</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color={lightTheme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter course title"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter course description"
                placeholderTextColor={lightTheme.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView style={styles.categoryPicker}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      formData.category_id === category.id.toString() && styles.categoryOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, category_id: category.id.toString() }))}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      formData.category_id === category.id.toString() && styles.categoryOptionTextSelected
                    ]}>
                      {category.name}
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
                <Text style={styles.saveButtonText}>Update Course</Text>
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
  courseCard: {
    backgroundColor: lightTheme.card,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 4,
  },
  courseCategory: {
    fontSize: 14,
    color: lightTheme.primary,
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  courseMeta: {
    fontSize: 12,
    color: lightTheme.textSecondary,
  },
  courseActions: {
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
    height: 100,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    maxHeight: 120,
  },
  categoryOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: lightTheme.background,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  categoryOptionSelected: {
    backgroundColor: lightTheme.primary + '20',
    borderColor: lightTheme.primary,
  },
  categoryOptionText: {
    fontSize: 16,
    color: lightTheme.text,
  },
  categoryOptionTextSelected: {
    color: lightTheme.primary,
    fontWeight: '600',
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
}); 