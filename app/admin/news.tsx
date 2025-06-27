import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { adminAuth, supabase, userService } from '@/lib/supabase';
import { ArrowLeft, Send, Plus, Trash2, Edit, Eye } from 'lucide-react-native';
import NotificationService from '@/lib/notifications';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  sent: boolean;
}

export default function NewsScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
    fetchNews();
  }, []);

  const checkAdminStatus = async () => {
    const user = await adminAuth.getCurrentUser();
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    setIsAdmin(true);
  };

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      Alert.alert('Error', 'Failed to fetch news items');
    } finally {
      setLoading(false);
    }
  };

  const createNewsTable = async () => {
    try {
      const { error } = await supabase.rpc('create_news_table');
      if (error) throw error;
      Alert.alert('Success', 'News table created successfully');
    } catch (error) {
      console.error('Error creating news table:', error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (editingId) {
        // Update existing news
        const { error } = await supabase
          .from('news')
          .update({ title: title.trim(), content: content.trim() })
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Success', 'News updated successfully');
      } else {
        // Create new news
        const { error } = await supabase
          .from('news')
          .insert({ title: title.trim(), content: content.trim() });

        if (error) throw error;
        Alert.alert('Success', 'News created successfully');
      }

      setTitle('');
      setContent('');
      setEditingId(null);
      setShowForm(false);
      fetchNews();
    } catch (error) {
      console.error('Error saving news:', error);
      Alert.alert('Error', 'Failed to save news');
    }
  };

  const handleSendNotification = async (newsItem: NewsItem) => {
    Alert.alert(
      'Send Notification',
      `Send "${newsItem.title}" to all users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              // Fetch all push tokens
              const { tokens, error } = await userService.getAllPushTokens();
              if (error) throw error;
              if (!tokens.length) throw new Error('No user tokens found');

              // Send push notification to each token via Expo API
              await Promise.all(tokens.map(async (pushToken: string) => {
                await fetch('https://exp.host/--/api/v2/push/send', {
                  method: 'POST',
                  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: pushToken,
                    sound: 'default',
                    title: newsItem.title,
                    body: newsItem.content,
                    data: { type: 'news', title: newsItem.title, body: newsItem.content },
                  })
                });
              }));

              // Update news item as sent
              const { error: updateError } = await supabase
                .from('news')
                .update({ sent: true })
                .eq('id', newsItem.id);

              if (updateError) throw updateError;

              Alert.alert('Success', 'Notification sent to all users!');
              fetchNews();
            } catch (error) {
              console.error('Error sending notification:', error);
              Alert.alert('Error', 'Failed to send notification');
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  const handleEdit = (newsItem: NewsItem) => {
    setTitle(newsItem.title);
    setContent(newsItem.content);
    setEditingId(newsItem.id);
    setShowForm(true);
  };

  const handleDelete = (newsItem: NewsItem) => {
    Alert.alert(
      'Delete News',
      `Are you sure you want to delete "${newsItem.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('news')
                .delete()
                .eq('id', newsItem.id);

              if (error) throw error;
              Alert.alert('Success', 'News deleted successfully');
              fetchNews();
            } catch (error) {
              console.error('Error deleting news:', error);
              Alert.alert('Error', 'Failed to delete news');
            }
          }
        }
      ]
    );
  };

  const cancelEdit = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
    setShowForm(false);
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.title}>News Management</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
          <Plus size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Setup Button */}
        <TouchableOpacity style={styles.setupButton} onPress={createNewsTable}>
          <Text style={styles.setupButtonText}>Setup News Table</Text>
        </TouchableOpacity>

        {/* News Form */}
        {showForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit News' : 'Create News'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="News Title"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="News Content"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* News List */}
        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>News Items</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading news...</Text>
            </View>
          ) : news.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No news items yet</Text>
              <Text style={styles.emptySubtext}>Create your first news item to get started</Text>
            </View>
          ) : (
            news.map((item) => (
              <View key={item.id} style={styles.newsItem}>
                <View style={styles.newsHeader}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <View style={styles.newsStatus}>
                    {item.sent && (
                      <View style={styles.sentBadge}>
                        <Text style={styles.sentText}>Sent</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.newsContent} numberOfLines={3}>
                  {item.content}
                </Text>
                
                <Text style={styles.newsDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
                
                <View style={styles.newsActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => Alert.alert(item.title, item.content)}
                  >
                    <Eye size={16} color="#3B82F6" />
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEdit(item)}
                  >
                    <Edit size={16} color="#10B981" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  {!item.sent && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.sendButton]}
                      onPress={() => handleSendNotification(item)}
                      disabled={sending}
                    >
                      {sending ? (
                        <ActivityIndicator size={16} color="#FFFFFF" />
                      ) : (
                        <Send size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  setupButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  newsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  newsItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  newsStatus: {
    marginLeft: 8,
  },
  sentBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  newsContent: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  newsDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  newsActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  viewButton: {
    backgroundColor: '#EFF6FF',
  },
  viewButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#ECFDF5',
  },
  editButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
}); 