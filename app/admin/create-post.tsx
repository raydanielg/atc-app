import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase, postService } from '@/lib/supabase';
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [author, setAuthor] = useState('Soateco Team');
  const [featured, setFeatured] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState<{ name: string; url: string }[]>([]);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfLink, setPdfLink] = useState('');

  useState(() => {
    fetchCategories();
  });

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handlePickPdf = async () => {
    try {
      setPdfUploading(true);
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled) return;
      const file = result.assets[0];
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('pdfs').upload(fileName, file);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);
      setPdfs(prev => [...prev, { name: file.name, url: publicUrlData.publicUrl }]);
    } catch (err) {
      Alert.alert('Error', 'Failed to upload PDF');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleAddPdfLink = () => {
    if (!pdfLink.trim()) return;
    setPdfs(prev => [...prev, { name: pdfLink, url: pdfLink }]);
    setPdfLink('');
  };

  const handleRemovePdf = (url: string) => {
    setPdfs(prev => prev.filter(pdf => pdf.url !== url));
  };

  const handleSave = async () => {
    if (!title || !content || !excerpt) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug(title);
      
      const { data, error } = await postService.createPost({
        title,
        content,
        excerpt,
        image_url: imageUrl || 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg',
        category_id: selectedCategory,
        author,
        slug,
        featured,
        pdfs,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={lightTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        >
          <Save size={20} color={loading ? lightTheme.textSecondary : lightTheme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter post title"
            placeholderTextColor={lightTheme.textSecondary}
            multiline
          />
        </View>

        {/* Excerpt */}
        <View style={styles.section}>
          <Text style={styles.label}>Excerpt *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={excerpt}
            onChangeText={setExcerpt}
            placeholder="Brief description of the post"
            placeholderTextColor={lightTheme.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.label}>Content *</Text>
          <TextInput
            style={[styles.input, styles.contentArea]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your post content here..."
            placeholderTextColor={lightTheme.textSecondary}
            multiline
            numberOfLines={10}
          />
        </View>

        {/* PDF Attachments */}
        <View style={styles.section}>
          <Text style={styles.label}>Attach PDFs</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickPdf} disabled={pdfUploading}>
              <Text style={styles.uploadButtonText}>{pdfUploading ? 'Uploading...' : 'Upload PDF'}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              value={pdfLink}
              onChangeText={setPdfLink}
              placeholder="Paste PDF link..."
              placeholderTextColor={lightTheme.textSecondary}
            />
            <TouchableOpacity style={styles.addLinkButton} onPress={handleAddPdfLink}>
              <Text style={styles.addLinkButtonText}>Add Link</Text>
            </TouchableOpacity>
          </View>
          {/* List of PDFs */}
          {pdfs.length > 0 && (
            <View style={styles.pdfList}>
              {pdfs.map((pdf, idx) => (
                <View key={pdf.url} style={styles.pdfItem}>
                  <Text style={styles.pdfName} numberOfLines={1}>{pdf.name}</Text>
                  <TouchableOpacity onPress={() => handleRemovePdf(pdf.url)}>
                    <Text style={styles.removePdf}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Image URL */}
        <View style={styles.section}>
          <Text style={styles.label}>Image URL</Text>
          <View style={styles.imageInputContainer}>
            <ImageIcon size={20} color={lightTheme.textSecondary} />
            <TextInput
              style={styles.imageInput}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://images.pexels.com/..."
              placeholderTextColor={lightTheme.textSecondary}
            />
          </View>
        </View>

        {/* Author */}
        <View style={styles.section}>
          <Text style={styles.label}>Author</Text>
          <TextInput
            style={styles.input}
            value={author}
            onChangeText={setAuthor}
            placeholder="Author name"
            placeholderTextColor={lightTheme.textSecondary}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.selectedCategoryChip,
                    { borderColor: category.color }
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category.id && styles.selectedCategoryChipText,
                      { color: selectedCategory === category.id ? '#FFFFFF' : category.color }
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Featured Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <View>
              <Text style={styles.label}>Featured Post</Text>
              <Text style={styles.toggleDescription}>
                Featured posts appear in the highlights section
              </Text>
            </View>
            <Switch
              value={featured}
              onValueChange={setFeatured}
              thumbColor={featured ? lightTheme.primary : lightTheme.border}
              trackColor={{ false: lightTheme.border, true: lightTheme.primary + '40' }}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Post...' : 'Create Post'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: lightTheme.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: lightTheme.text,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  contentArea: {
    height: 200,
    textAlignVertical: 'top',
  },
  imageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: lightTheme.border,
    gap: 12,
  },
  imageInput: {
    flex: 1,
    fontSize: 16,
    color: lightTheme.text,
    paddingVertical: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: lightTheme.background,
  },
  selectedCategoryChip: {
    backgroundColor: lightTheme.primary,
    borderColor: lightTheme.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: lightTheme.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  toggleDescription: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: lightTheme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pdfList: { marginTop: 8 },
  pdfItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pdfName: { flex: 1, color: lightTheme.text, fontSize: 14 },
  removePdf: { color: lightTheme.error, marginLeft: 12, fontSize: 13 },
  uploadButton: { backgroundColor: lightTheme.primary, padding: 8, borderRadius: 8 },
  uploadButtonText: { color: '#fff', fontWeight: '600' },
  addLinkButton: { backgroundColor: lightTheme.secondary, padding: 8, borderRadius: 8, marginLeft: 8 },
  addLinkButtonText: { color: '#fff', fontWeight: '600' },
});