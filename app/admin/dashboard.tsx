import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lightTheme } from '@/lib/theme';
import { supabase, analyticsService, adminAuth } from '@/lib/supabase';
import { ArrowLeft, Plus, Users, FileText, Eye, Heart, TrendingUp, Settings, BarChart3, Edit, User, LogOut, Key, Monitor, BookOpen, GraduationCap } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { PieChart, BarChart, LineChart, Grid } from 'react-native-svg-charts';
import * as shape from 'd3-shape';

// Add this at the top if you get a type error for react-native-svg-charts
// declare module 'react-native-svg-charts';

const TABS = [
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'create', label: 'Create Post', icon: Plus },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'lms', label: 'LMS', icon: GraduationCap },
  { key: 'config', label: 'App Config', icon: Settings },
];

// Types for analytics
type CategoryData = { key: string; name: string; color: string; count: number };
type TopViewedPost = { id: string; title: string; views: number };
type SessionView = { session_id: string; count: number };
type DailyView = { day: string; count: number };
type LikesPerCategory = { key: string; name: string; color: string; likes: number };
type MostLikedPost = { id: string; title: string; likes: number } | null;

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({ userCount: 0, postCount: 0, totalViews: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [categoryData, setCategoryData] = React.useState<CategoryData[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState(false);
  const [topViewedPosts, setTopViewedPosts] = React.useState<TopViewedPost[]>([]);
  const [sessionViews, setSessionViews] = React.useState<SessionView[]>([]);
  const [dailyViews, setDailyViews] = React.useState<DailyView[]>([]);
  const [likesPerCategory, setLikesPerCategory] = React.useState<LikesPerCategory[]>([]);
  const [mostLikedPost, setMostLikedPost] = React.useState<MostLikedPost>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  React.useEffect(() => {
    if (activeTab === 'analytics') fetchDashboardData();
    if (activeTab === 'posts') fetchPosts();
    fetchCurrentUser();
  }, [activeTab]);

  const fetchCurrentUser = async () => {
    const user = await adminAuth.getCurrentUser();
    setCurrentUser(user);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [userResult, postResult, viewsResult, likesResult] = await Promise.all([
        analyticsService.getUserCount(),
        analyticsService.getPostCount(),
        analyticsService.getTotalViews(),
        analyticsService.getTotalLikes(),
      ]);
      setStats({
        userCount: userResult.count,
        postCount: postResult.count,
        totalViews: viewsResult.total,
        totalLikes: likesResult.count,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select(`*, categories (name, color)`)
        .order('created_at', { ascending: false });
      if (postsData) setPosts(postsData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await adminAuth.signOut();
    router.replace('/settings');
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setPasswordError(''); // Clear error when user types
  };

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword.trim()) {
      setPasswordError('Current password is required');
      return false;
    }
    if (!passwordForm.newPassword.trim()) {
      setPasswordError('New password is required');
      return false;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }
    return true;
  };

  const handleUpdatePassword = async () => {
    if (!validatePasswordForm()) return;

    setPasswordLoading(true);
    setPasswordError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        Alert.alert(
          'Success', 
          'Password updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowPasswordModal(false);
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      setPasswordError('An unexpected error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  // --- Tab Content Components ---
  function PostsTab() {
    if (selectedPost && editMode) return <EditPostPage post={selectedPost} onBack={() => { setEditMode(false); setSelectedPost(null); }} />;
    if (selectedPost) return <PostDetailPage post={selectedPost} onBack={() => setSelectedPost(null)} onEdit={() => setEditMode(true)} />;
    return (
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />}>
        <Text style={styles.sectionTitle}>All Posts</Text>
        {posts.map((post) => (
          <TouchableOpacity key={post.id} style={styles.postItem} onPress={() => setSelectedPost(post)}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postMeta}>{post.author} | {new Date(post.created_at).toLocaleDateString()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function PostDetailPage({ post, onBack, onEdit }: any) {
    return (
      <ScrollView style={styles.innerPage}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backLink}>← Back to Posts</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>{post.title}</Text>
        <Text style={styles.postMeta}>By {post.author} | {new Date(post.created_at).toLocaleDateString()} | Category: {post.categories?.name || 'Uncategorized'}</Text>
        <Image source={{ uri: post.image_url || 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg' }} style={styles.detailImage} />
        <Text style={styles.postExcerpt}>{post.excerpt}</Text>
        <Text style={styles.postContent}>{post.content}</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Featured:</Text>
          <Text style={styles.detailValue}>{post.featured ? 'Yes' : 'No'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Created:</Text>
          <Text style={styles.detailValue}>{new Date(post.created_at).toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Updated:</Text>
          <Text style={styles.detailValue}>{new Date(post.updated_at).toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Edit size={18} color={lightTheme.primary} />
          <Text style={{ color: lightTheme.primary, marginLeft: 8 }}>Edit Post</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function EditPostPage({ post, onBack }: any) {
    const [form, setForm] = useState({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      image_url: post.image_url,
      category_id: post.category_id,
      featured: post.featured,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);

    const handleChange = (key: string, value: any) => {
      setForm({ ...form, [key]: value });
    };

    const handleSave = async () => {
      setSaving(true);
      setError('');
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: form.title,
          content: form.content,
          excerpt: form.excerpt,
          image_url: form.image_url,
          category_id: form.category_id,
          featured: form.featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);
      setSaving(false);
      if (updateError) {
        setError(updateError.message);
      } else {
        Alert.alert('Success', 'Post updated successfully');
        onBack();
      }
    };

    const handleDelete = async () => {
      Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
          setDeleting(false);
          if (deleteError) {
            setError(deleteError.message);
          } else {
            Alert.alert('Deleted', 'Post deleted successfully');
            onBack();
          }
        }}
      ]);
    };

    // Image upload logic
    const pickImage = async () => {
      setImageUploading(true);
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          // You would upload to Supabase Storage here and get a public URL
          // For demo, just use the local uri
          handleChange('image_url', result.assets[0].uri);
        }
      } catch (e) {
        setError('Failed to pick image');
      }
      setImageUploading(false);
    };

    // Fetch categories for dropdown
    const [categories, setCategories] = useState<any[]>([]);
    React.useEffect(() => {
      supabase.from('categories').select('*').then(({ data }) => {
        if (data) setCategories(data);
      });
    }, []);

    return (
      <ScrollView style={styles.innerPage}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backLink}>← Back to Post</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Edit Post: {post.title}</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={v => handleChange('title', v)}
          placeholder="Title"
        />
        <TextInput
          style={styles.input}
          value={form.excerpt}
          onChangeText={v => handleChange('excerpt', v)}
          placeholder="Excerpt"
        />
        <TextInput
          style={[styles.input, { height: 120 }]}
          value={form.content}
          onChangeText={v => handleChange('content', v)}
          placeholder="Content"
          multiline
        />
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.detailLabel}>Image:</Text>
          {form.image_url ? (
            <Image source={{ uri: form.image_url }} style={styles.detailImage} />
          ) : (
            <View style={[styles.detailImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: lightTheme.textSecondary }}>No Image</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={imageUploading}>
              <Text style={styles.uploadButtonText}>{imageUploading ? 'Uploading...' : 'Upload Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={() => handleChange('image_url', '')}>
              <Text style={styles.uploadButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={form.image_url}
            onChangeText={v => handleChange('image_url', v)}
            placeholder="Or paste image URL here"
          />
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            {categories.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, form.category_id === cat.id && styles.selectedCategoryChip, { borderColor: cat.color }]}
                onPress={() => handleChange('category_id', cat.id)}
              >
                <Text style={[styles.categoryChipText, form.category_id === cat.id && styles.selectedCategoryChipText, { color: form.category_id === cat.id ? '#fff' : cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Featured:</Text>
          <TouchableOpacity onPress={() => handleChange('featured', !form.featured)} style={styles.featuredToggle}>
            <Text style={{ color: form.featured ? lightTheme.primary : lightTheme.textSecondary }}>{form.featured ? 'Yes' : 'No'}</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={lightTheme.primary} /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color={lightTheme.error} /> : <Text style={styles.deleteButtonText}>Delete Post</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function CreatePostTab() {
    const [form, setForm] = useState({
      title: '',
      content: '',
      excerpt: '',
      image_url: '',
      category_id: '',
      featured: false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [imageUploading, setImageUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (key: string, value: any) => {
      setForm({ ...form, [key]: value });
    };

    // Fetch categories for dropdown
    const [categories, setCategories] = useState<any[]>([]);
    React.useEffect(() => {
      supabase.from('categories').select('*').then(({ data }) => {
        if (data) setCategories(data);
      });
    }, []);

    // Image upload logic
    const pickImage = async () => {
      setImageUploading(true);
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          handleChange('image_url', result.assets[0].uri);
        }
      } catch (e) {
        setError('Failed to pick image');
      }
      setImageUploading(false);
    };

    const handleSave = async () => {
      setSaving(true);
      setError('');
      setSuccess(false);
      if (!form.title || !form.content || !form.excerpt || !form.category_id) {
        setError('Please fill in all required fields.');
        setSaving(false);
        return;
      }
      const slug = form.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const { error: createError } = await supabase.from('posts').insert({
        title: form.title,
        content: form.content,
        excerpt: form.excerpt,
        image_url: form.image_url,
        category_id: form.category_id,
        author: 'Admin',
        slug,
        featured: form.featured,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setSaving(false);
      if (createError) {
        setError(createError.message);
      } else {
        setSuccess(true);
        setForm({ title: '', content: '', excerpt: '', image_url: '', category_id: '', featured: false });
        // Switch to posts tab and refresh posts
        setActiveTab('posts');
        fetchPosts();
      }
    };

    return (
      <ScrollView style={styles.innerPage}>
        <Text style={styles.sectionTitle}>Create New Post</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={v => handleChange('title', v)}
          placeholder="Title *"
        />
        <TextInput
          style={styles.input}
          value={form.excerpt}
          onChangeText={v => handleChange('excerpt', v)}
          placeholder="Excerpt *"
        />
        <TextInput
          style={[styles.input, { height: 120 }]}
          value={form.content}
          onChangeText={v => handleChange('content', v)}
          placeholder="Content *"
          multiline
        />
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.detailLabel}>Image:</Text>
          {form.image_url ? (
            <Image source={{ uri: form.image_url }} style={styles.detailImage} />
          ) : (
            <View style={[styles.detailImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: lightTheme.textSecondary }}>No Image</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={imageUploading}>
              <Text style={styles.uploadButtonText}>{imageUploading ? 'Uploading...' : 'Upload Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={() => handleChange('image_url', '')}>
              <Text style={styles.uploadButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={form.image_url}
            onChangeText={v => handleChange('image_url', v)}
            placeholder="Or paste image URL here"
          />
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            {categories.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, form.category_id === cat.id && styles.selectedCategoryChip, { borderColor: cat.color }]}
                onPress={() => handleChange('category_id', cat.id)}
              >
                <Text style={[styles.categoryChipText, form.category_id === cat.id && styles.selectedCategoryChipText, { color: form.category_id === cat.id ? '#fff' : cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Featured:</Text>
          <TouchableOpacity onPress={() => handleChange('featured', !form.featured)} style={styles.featuredToggle}>
            <Text style={{ color: form.featured ? lightTheme.primary : lightTheme.textSecondary }}>{form.featured ? 'Yes' : 'No'}</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
        {success ? <Text style={{ color: lightTheme.success, marginBottom: 8 }}>Post created successfully!</Text> : null}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={lightTheme.primary} /> : <Text style={styles.saveButtonText}>Create Post</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function AnalyticsTab() {
    const [categoryData, setCategoryData] = React.useState<CategoryData[]>([]);
    const [loadingAnalytics, setLoadingAnalytics] = React.useState(false);
    const [topViewedPosts, setTopViewedPosts] = React.useState<TopViewedPost[]>([]);
    const [sessionViews, setSessionViews] = React.useState<SessionView[]>([]);
    const [dailyViews, setDailyViews] = React.useState<DailyView[]>([]);
    const [likesPerCategory, setLikesPerCategory] = React.useState<LikesPerCategory[]>([]);
    const [mostLikedPost, setMostLikedPost] = React.useState<MostLikedPost>(null);
    React.useEffect(() => {
      fetchCategoryData();
      fetchViewAnalytics();
      fetchDailyViews();
      fetchLikesPerCategory();
      fetchMostLikedPost();
    }, []);
    const fetchCategoryData = async () => {
      setLoadingAnalytics(true);
      const { data: categories } = await supabase.from('categories').select('id, name, color');
      const { data: posts } = await supabase.from('posts').select('category_id');
      if (categories && posts) {
        const catCounts: CategoryData[] = categories.map((cat: any) => ({
          key: cat.id,
          name: cat.name,
          color: cat.color,
          count: posts.filter((p: any) => p.category_id === cat.id).length,
        })).filter((c: CategoryData) => c.count > 0);
        setCategoryData(catCounts);
      }
      setLoadingAnalytics(false);
    };
    const fetchViewAnalytics = async () => {
      // Top viewed posts
      const { data: posts } = await supabase.from('posts').select('id, title, views').order('views', { ascending: false }).limit(5);
      setTopViewedPosts((posts as TopViewedPost[]) || []);
      // Views per session
      const { data: events } = await supabase.from('post_view_events').select('session_id').limit(1000); // limit for demo
      if (events) {
        const sessionMap: { [key: string]: number } = {};
        (events as any[]).forEach((e: any) => {
          sessionMap[e.session_id] = (sessionMap[e.session_id] || 0) + 1;
        });
        setSessionViews(Object.entries(sessionMap).map(([session_id, count]) => ({ session_id, count: count as number })));
      } else {
        setSessionViews([]);
      }
    };
    const fetchDailyViews = async () => {
      // Get daily views for last 7 days
      const { data } = await supabase.rpc('get_daily_views_last_7_days');
      setDailyViews((data as DailyView[]) || []);
    };
    const fetchLikesPerCategory = async () => {
      // Likes per category
      const { data: categories } = await supabase.from('categories').select('id, name, color');
      const { data: posts } = await supabase.from('posts').select('category_id, likes');
      if (categories && posts) {
        const catLikes: LikesPerCategory[] = categories.map((cat: any) => ({
          key: cat.id,
          name: cat.name,
          color: cat.color,
          likes: (posts as any[]).filter((p: any) => p.category_id === cat.id).reduce((sum, p) => sum + (p.likes || 0), 0),
        })).filter((c: LikesPerCategory) => c.likes > 0);
        setLikesPerCategory(catLikes);
      }
    };
    const fetchMostLikedPost = async () => {
      const { data: posts } = await supabase.from('posts').select('id, title, likes').order('likes', { ascending: false }).limit(1);
      setMostLikedPost(posts && (posts as MostLikedPost[]) && (posts as MostLikedPost[])[0] ? (posts as MostLikedPost[])[0] : null);
    };
    // Prepare chart data
    const lineData = dailyViews.map(d => d.count);
    const barData = likesPerCategory.map(c => c.likes);
    const barColors = likesPerCategory.map(c => c.color);
    return (
      <ScrollView 
        style={styles.analyticsContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.analyticsHeader}>
          <Text style={styles.analyticsTitle}>Analytics Dashboard</Text>
          <Text style={styles.analyticsSubtitle}>Monitor your content performance</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statIconContainer}>
                <FileText size={24} color="#fff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.postCount}</Text>
                <Text style={styles.statLabel}>Total Posts</Text>
              </View>
            </View>
            <View style={[styles.statCard, styles.statCardSuccess]}>
              <View style={styles.statIconContainer}>
                <Eye size={24} color="#fff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.totalViews}</Text>
                <Text style={styles.statLabel}>Total Views</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardWarning]}>
              <View style={styles.statIconContainer}>
                <Heart size={24} color="#fff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.totalLikes}</Text>
                <Text style={styles.statLabel}>Total Likes</Text>
              </View>
            </View>
            <View style={[styles.statCard, styles.statCardInfo]}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={24} color="#fff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{categoryData.length}</Text>
                <Text style={styles.statLabel}>Categories</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Most Liked Post Card */}
        {mostLikedPost && (
          <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
              <Heart size={20} color={lightTheme.like} />
              <Text style={styles.highlightTitle}>Most Liked Post</Text>
            </View>
            <Text style={styles.highlightPostTitle}>{mostLikedPost.title}</Text>
            <View style={styles.highlightStats}>
              <Text style={styles.highlightStat}>{mostLikedPost.likes} Likes</Text>
            </View>
          </View>
        )}

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          {/* Pie Chart for Posts per Category */}
          {categoryData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Posts per Category</Text>
              <View style={styles.chartContainer}>
                <PieChart
                  style={{ height: 200, width: 200 }}
                  data={categoryData.map((cat, i) => ({
                    value: cat.count,
                    svg: { fill: cat.color },
                    key: `pie-${cat.key}`,
                    arc: { outerRadius: '100%', padAngle: 0.02 },
                  }))}
                  outerRadius={'95%'}
                  innerRadius={'50%'}
                />
              </View>
              <View style={styles.chartLegend}>
                {categoryData.map(cat => (
                  <View key={cat.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.legendText}>{cat.name} ({cat.count})</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Line Chart for Daily Views */}
          {lineData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Views in Last 7 Days</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  style={{ height: 150 }}
                  data={lineData}
                  svg={{ stroke: lightTheme.primary, strokeWidth: 3 }}
                  contentInset={{ top: 20, bottom: 20 }}
                  curve={shape.curveMonotoneX}
                >
                  <Grid />
                </LineChart>
              </View>
              <View style={styles.chartLabels}>
                {dailyViews.map((d, i) => (
                  <Text key={i} style={styles.chartLabel}>{d.day}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Bar Chart for Likes per Category */}
          {barData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Likes per Category</Text>
              <View style={styles.chartContainer}>
                <BarChart
                  style={{ height: 150 }}
                  data={barData}
                  svg={{ fill: lightTheme.like }}
                  contentInset={{ top: 20, bottom: 20 }}
                  spacingInner={0.3}
                >
                  <Grid />
                </BarChart>
              </View>
              <View style={styles.chartLabels}>
                {likesPerCategory.map((c, i) => (
                  <Text key={i} style={[styles.chartLabel, { color: c.color }]}>{c.name}</Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Tables Section */}
        <View style={styles.tablesSection}>
          {/* Top Viewed Posts Table */}
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Top Viewed Posts</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Title</Text>
              <Text style={styles.tableHeaderText}>Views</Text>
            </View>
            {topViewedPosts.map(post => (
              <View key={post.id} style={styles.tableRow}>
                <Text style={styles.tableCell} numberOfLines={2}>{post.title}</Text>
                <Text style={styles.tableCellValue}>{post.views}</Text>
              </View>
            ))}
          </View>

          {/* Views Per Session Table */}
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Views Per Session</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Session ID</Text>
              <Text style={styles.tableHeaderText}>Count</Text>
            </View>
            {sessionViews.map((s, i) => (
              <View key={s.session_id + i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{s.session_id}</Text>
                <Text style={styles.tableCellValue}>{s.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  function AppConfigTab() {
    const [activeConfigTab, setActiveConfigTab] = useState('categories');
    const [categories, setCategories] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#FF5722', image_url: '' });
    const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'user' });
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [appSettings, setAppSettings] = useState({
      defaultAuthor: 'Arusha Technical College',
      featuredPostLimit: 3,
      enableComments: false,
      requireApproval: false
    });

    React.useEffect(() => {
      fetchConfigData();
    }, []);

    const fetchConfigData = async () => {
      setLoading(true);
      const [categoriesRes, usersRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('users').select('*').order('created_at', { ascending: false })
      ]);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      setLoading(false);
    };

    const pickImage = async (setImageUrl: (url: string) => void) => {
      setImageUploading(true);
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setImageUrl(result.assets[0].uri);
        }
      } catch (e) {
        console.error('Failed to pick image:', e);
      }
      setImageUploading(false);
    };

    const handleAddCategory = async () => {
      if (!newCategory.name) return;
      const slug = newCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { error } = await supabase.from('categories').insert({
        name: newCategory.name,
        slug,
        description: newCategory.description,
        color: newCategory.color,
        image_url: newCategory.image_url
      });
      if (!error) {
        setNewCategory({ name: '', description: '', color: '#FF5722', image_url: '' });
        setShowAddCategory(false);
        fetchConfigData();
      }
    };

    const handleEditCategory = async () => {
      if (!editingCategory || !editingCategory.name) return;
      const { error } = await supabase.from('categories')
        .update({
          name: editingCategory.name,
          description: editingCategory.description,
          color: editingCategory.color,
          image_url: editingCategory.image_url
        })
        .eq('id', editingCategory.id);
      if (!error) {
        setEditingCategory(null);
        fetchConfigData();
      }
    };

    const handleDeleteCategory = async (categoryId: string) => {
      Alert.alert('Delete Category', 'Are you sure? This will affect all posts in this category.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('categories').delete().eq('id', categoryId);
          if (!error) fetchConfigData();
        }}
      ]);
    };

    const handleAddUser = async () => {
      if (!newUser.email || !newUser.full_name) return;
      const { error } = await supabase.from('users').insert(newUser);
      if (!error) {
        setNewUser({ email: '', full_name: '', role: 'user' });
        setShowAddUser(false);
        fetchConfigData();
      }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
      const { error } = await supabase.from('users')
        .update({ role: newRole })
        .eq('id', userId);
      if (!error) fetchConfigData();
    };

    const handleBulkAction = async (action: string) => {
      Alert.alert('Bulk Action', `Are you sure you want to ${action}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: async () => {
          if (action === 'clear_analytics') {
            await supabase.from('post_view_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('post_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.rpc('reset_post_counters');
          }
          Alert.alert('Success', `${action} completed`);
        }}
      ]);
    };

    const configTabs = [
      { key: 'categories', label: 'Categories', icon: '📂' },
      { key: 'users', label: 'Users', icon: '👥' },
      { key: 'settings', label: 'Settings', icon: '⚙️' },
      { key: 'maintenance', label: 'Maintenance', icon: '🔧' }
    ];

    return (
      <ScrollView style={styles.innerPage}>
        <Text style={styles.sectionTitle}>App Configuration</Text>
        
        {/* Config Tabs */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {configTabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.configTab, activeConfigTab === tab.key && styles.activeConfigTab]}
              onPress={() => setActiveConfigTab(tab.key)}
            >
              <Text style={styles.configTabIcon}>{tab.icon}</Text>
              <Text style={[styles.configTabLabel, activeConfigTab === tab.key && styles.activeConfigTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories Management */}
        {activeConfigTab === 'categories' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '600', color: lightTheme.text }}>Categories ({categories.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddCategory(true)}>
                <Text style={styles.addButtonText}>Add Category</Text>
              </TouchableOpacity>
            </View>
            
            {categories.map(category => (
              <View key={category.id} style={styles.configItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {category.image_url ? (
                    <Image source={{ uri: category.image_url }} style={styles.categoryImage} />
                  ) : (
                    <View style={[styles.colorDot, { backgroundColor: category.color }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: lightTheme.text }}>{category.name}</Text>
                    <Text style={{ fontSize: 12, color: lightTheme.textSecondary }}>{category.description}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => setEditingCategory(category)}>
                    <Text style={{ color: lightTheme.primary }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCategory(category.id)}>
                    <Text style={{ color: 'red' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Users Management */}
        {activeConfigTab === 'users' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '600', color: lightTheme.text }}>Users ({users.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddUser(true)}>
                <Text style={styles.addButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>
            
            {users.map(user => (
              <View key={user.id} style={styles.configItem}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: lightTheme.text }}>{user.full_name}</Text>
                  <Text style={{ fontSize: 12, color: lightTheme.textSecondary }}>{user.email}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.roleButton, user.role === 'admin' && styles.adminRoleButton]}
                  onPress={() => handleUpdateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                >
                  <Text style={[styles.roleButtonText, user.role === 'admin' && styles.adminRoleButtonText]}>
                    {user.role}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* App Settings */}
        {activeConfigTab === 'settings' && (
          <View>
            <Text style={{ fontWeight: '600', color: lightTheme.text, marginBottom: 16 }}>App Settings</Text>
            
            <View style={styles.settingItem}>
              <Text style={{ color: lightTheme.text }}>Default Author</Text>
              <TextInput
                style={styles.settingInput}
                value={appSettings.defaultAuthor}
                onChangeText={(text) => setAppSettings({...appSettings, defaultAuthor: text})}
                placeholder="Default author name"
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={{ color: lightTheme.text }}>Featured Post Limit</Text>
              <TextInput
                style={styles.settingInput}
                value={appSettings.featuredPostLimit.toString()}
                onChangeText={(text) => setAppSettings({...appSettings, featuredPostLimit: parseInt(text) || 3})}
                placeholder="3"
                keyboardType="numeric"
              />
            </View>
            
            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Maintenance */}
        {activeConfigTab === 'maintenance' && (
          <View>
            <Text style={{ fontWeight: '600', color: lightTheme.text, marginBottom: 16 }}>Database Maintenance</Text>
            
            <TouchableOpacity style={styles.maintenanceButton} onPress={() => handleBulkAction('clear_analytics')}>
              <Text style={styles.maintenanceButtonText}>Clear Analytics Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.maintenanceButton} onPress={() => handleBulkAction('reset_counters')}>
              <Text style={styles.maintenanceButtonText}>Reset Post Counters</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.maintenanceButton} onPress={() => handleBulkAction('optimize_database')}>
              <Text style={styles.maintenanceButtonText}>Optimize Database</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add Category Modal */}
        {showAddCategory && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Category</Text>
              
              <Text style={styles.modalLabel}>Category Image</Text>
              {newCategory.image_url ? (
                <Image source={{ uri: newCategory.image_url }} style={styles.modalImagePreview} />
              ) : (
                <View style={styles.modalImagePlaceholder}>
                  <Text style={styles.modalImagePlaceholderText}>No Image</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity 
                  style={styles.uploadButton} 
                  onPress={() => pickImage((url) => setNewCategory({...newCategory, image_url: url}))}
                  disabled={imageUploading}
                >
                  <Text style={styles.uploadButtonText}>
                    {imageUploading ? 'Uploading...' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>
                {newCategory.image_url && (
                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: lightTheme.error }]} 
                    onPress={() => setNewCategory({...newCategory, image_url: ''})}
                  >
                    <Text style={styles.uploadButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.modalLabel}>Category Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter category name"
                value={newCategory.name}
                onChangeText={(text) => setNewCategory({...newCategory, name: text})}
              />

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter category description"
                value={newCategory.description}
                onChangeText={(text) => setNewCategory({...newCategory, description: text})}
                multiline
              />

              <Text style={styles.modalLabel}>Color</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="#FF5722"
                value={newCategory.color}
                onChangeText={(text) => setNewCategory({...newCategory, color: text})}
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity style={styles.modalButton} onPress={handleAddCategory}>
                  <Text style={styles.modalButtonText}>Add Category</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: lightTheme.border }]} onPress={() => setShowAddCategory(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add User</Text>
              
              <Text style={styles.modalLabel}>Email *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter email address"
                value={newUser.email}
                onChangeText={(text) => setNewUser({...newUser, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter full name"
                value={newUser.full_name}
                onChangeText={(text) => setNewUser({...newUser, full_name: text})}
              />

              <Text style={styles.modalLabel}>Role</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.roleSelectButton, newUser.role === 'user' && styles.roleSelectButtonActive]}
                  onPress={() => setNewUser({...newUser, role: 'user'})}
                >
                  <Text style={[styles.roleSelectButtonText, newUser.role === 'user' && styles.roleSelectButtonTextActive]}>
                    User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleSelectButton, newUser.role === 'admin' && styles.roleSelectButtonActive]}
                  onPress={() => setNewUser({...newUser, role: 'admin'})}
                >
                  <Text style={[styles.roleSelectButtonText, newUser.role === 'admin' && styles.roleSelectButtonTextActive]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity style={styles.modalButton} onPress={handleAddUser}>
                  <Text style={styles.modalButtonText}>Add User</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: lightTheme.border }]} onPress={() => setShowAddUser(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Edit Category Modal */}
        {editingCategory && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Category</Text>
              
              <Text style={styles.modalLabel}>Category Image</Text>
              {editingCategory.image_url ? (
                <Image source={{ uri: editingCategory.image_url }} style={styles.modalImagePreview} />
              ) : (
                <View style={styles.modalImagePlaceholder}>
                  <Text style={styles.modalImagePlaceholderText}>No Image</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity 
                  style={styles.uploadButton} 
                  onPress={() => pickImage((url) => setEditingCategory({...editingCategory, image_url: url}))}
                  disabled={imageUploading}
                >
                  <Text style={styles.uploadButtonText}>
                    {imageUploading ? 'Uploading...' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>
                {editingCategory.image_url && (
                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: lightTheme.error }]} 
                    onPress={() => setEditingCategory({...editingCategory, image_url: ''})}
                  >
                    <Text style={styles.uploadButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.modalLabel}>Category Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter category name"
                value={editingCategory.name}
                onChangeText={(text) => setEditingCategory({...editingCategory, name: text})}
              />

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter category description"
                value={editingCategory.description}
                onChangeText={(text) => setEditingCategory({...editingCategory, description: text})}
                multiline
              />

              <Text style={styles.modalLabel}>Color</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="#FF5722"
                value={editingCategory.color}
                onChangeText={(text) => setEditingCategory({...editingCategory, color: text})}
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity style={styles.modalButton} onPress={handleEditCategory}>
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: lightTheme.border }]} onPress={() => setEditingCategory(null)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  function StatCard({ label, value, icon: Icon, color }: any) {
    return (
      <View style={[styles.statCard, { borderColor: color + '60' }]}> 
        <Icon size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  function LearnAdminTab() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
      setLoading(true);
      const { data } = await supabase.from('course_categories').select('*').order('name');
      setCategories(data || []);
      setLoading(false);
    };

    const handleAdd = async () => {
      if (!name.trim() || !slug.trim()) return;
      await supabase.from('course_categories').insert([{ name, slug }]);
      setShowAdd(false); setName(''); setSlug(''); fetchCategories();
    };
    const handleEdit = async () => {
      if (!editCategory || !name.trim() || !slug.trim()) return;
      await supabase.from('course_categories').update({ name, slug }).eq('id', editCategory.id);
      setShowEdit(false); setEditCategory(null); setName(''); setSlug(''); fetchCategories();
    };
    const handleDelete = async (id) => {
      Alert.alert('Delete Category', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('course_categories').delete().eq('id', id);
          fetchCategories();
        }}
      ]);
    };

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: lightTheme.primary }}>Manage Course Categories</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {loading ? <ActivityIndicator size="large" color={lightTheme.primary} /> :
            categories.length === 0 ? <Text style={{ color: lightTheme.textSecondary, textAlign: 'center' }}>No categories found.</Text> :
            categories.map(cat => (
              <View key={cat.id} style={[styles.configItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }] }>
                <Text style={{ fontSize: 18, fontWeight: '600', color: lightTheme.text }}>{cat.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => { setEditCategory(cat); setName(cat.name); setSlug(cat.slug); setShowEdit(true); }}>
                    <Text style={{ color: lightTheme.primary }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(cat.id)}>
                    <Text style={{ color: lightTheme.error }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </ScrollView>
        {/* Add Modal */}
        {showAdd && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Category</Text>
              <TextInput style={styles.modalInput} placeholder="Name" value={name} onChangeText={setName} />
              <TextInput style={styles.modalInput} placeholder="Slug (e.g. diploma)" value={slug} onChangeText={setSlug} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: lightTheme.border }]} onPress={() => { setShowAdd(false); setName(''); setSlug(''); }}>
                  <Text style={[styles.saveButtonText, { color: lightTheme.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {/* Edit Modal */}
        {showEdit && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Category</Text>
              <TextInput style={styles.modalInput} placeholder="Name" value={name} onChangeText={setName} />
              <TextInput style={styles.modalInput} placeholder="Slug (e.g. diploma)" value={slug} onChangeText={setSlug} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: lightTheme.border }]} onPress={() => { setShowEdit(false); setEditCategory(null); setName(''); setSlug(''); }}>
                  <Text style={[styles.saveButtonText, { color: lightTheme.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  function LMSTab() {
    const handleNavigateToLMS = () => {
      router.push('/admin/lms');
    };

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Learning Management System</Text>
          <Text style={styles.sectionSubtitle}>Manage courses, categories, and modules</Text>
        </View>

        <TouchableOpacity 
          style={styles.lmsCard} 
          onPress={handleNavigateToLMS}
        >
          <View style={styles.lmsCardContent}>
            <GraduationCap size={32} color={lightTheme.primary} />
            <View style={styles.lmsCardText}>
              <Text style={styles.lmsCardTitle}>LMS Management</Text>
              <Text style={styles.lmsCardDescription}>
                Manage courses, categories, modules, and view analytics
              </Text>
            </View>
            <ArrowLeft size={20} color={lightTheme.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={lightTheme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Image source={require('../../assets/images/ATC.png')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.avatarButton} 
            onPress={() => setShowUserMenu(!showUserMenu)}
          >
            <User size={24} color={lightTheme.text} />
          </TouchableOpacity>
          
          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              {/* Backdrop */}
              <TouchableOpacity 
                style={styles.backdrop}
                activeOpacity={1}
                onPress={() => setShowUserMenu(false)}
              />
              <View style={styles.userMenu}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <User size={20} color={lightTheme.primary} />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{currentUser?.email || 'Admin User'}</Text>
                    <Text style={styles.userRole}>Administrator</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push('/(tabs)');
                  }}
                >
                  <View style={styles.menuIconContainer}>
                    <Monitor size={18} color={lightTheme.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuText}>User Panel</Text>
                    <Text style={styles.menuDescription}>Switch to user interface</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    setShowUserMenu(false);
                    setShowPasswordModal(true);
                  }}
                >
                  <View style={styles.menuIconContainer}>
                    <Key size={18} color={lightTheme.accent} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuText}>Change Password</Text>
                    <Text style={styles.menuDescription}>Update your login credentials</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.menuItem, styles.logoutItem]} 
                  onPress={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                >
                  <View style={styles.menuIconContainer}>
                    <LogOut size={18} color="#FF3B30" />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[styles.menuText, styles.logoutText]}>Sign Out</Text>
                    <Text style={styles.menuDescription}>Logout from admin panel</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
      
      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'posts' && <PostsTab />}
        {activeTab === 'create' && <CreatePostTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'lms' && <LMSTab />}
        {activeTab === 'learn' && <LearnAdminTab />}
        {activeTab === 'config' && <AppConfigTab />}
      </View>

      {/* Tabs - Moved to bottom */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTab]}
            onPress={() => { setActiveTab(tab.key); setSelectedPost(null); setEditMode(false); }}
          >
            <tab.icon size={20} color={activeTab === tab.key ? lightTheme.primary : lightTheme.textSecondary} />
            <Text style={{ color: activeTab === tab.key ? lightTheme.primary : lightTheme.textSecondary, fontWeight: '600', marginTop: 2 }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.passwordModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Text style={styles.modalSubtitle}>Update your account password</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Current Password</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter current password"
                placeholderTextColor={lightTheme.textSecondary}
                value={passwordForm.currentPassword}
                onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>New Password</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter new password (min 6 characters)"
                placeholderTextColor={lightTheme.textSecondary}
                value={passwordForm.newPassword}
                onChangeText={(value) => handlePasswordChange('newPassword', value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {passwordForm.newPassword.length > 0 && (
                <View style={styles.passwordStrength}>
                  <Text style={styles.strengthLabel}>Password strength:</Text>
                  <View style={styles.strengthBar}>
                    <View 
                      style={[
                        styles.strengthFill, 
                        { 
                          width: `${Math.min((passwordForm.newPassword.length / 8) * 100, 100)}%`,
                          backgroundColor: passwordForm.newPassword.length >= 6 ? lightTheme.primary : lightTheme.error
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.strengthText}>
                    {passwordForm.newPassword.length < 6 ? 'Too short' : 
                     passwordForm.newPassword.length < 8 ? 'Weak' : 
                     passwordForm.newPassword.length < 12 ? 'Good' : 'Strong'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Confirm New Password</Text>
              <TextInput
                style={[
                  styles.formInput,
                  passwordForm.confirmPassword.length > 0 && 
                  passwordForm.newPassword !== passwordForm.confirmPassword && 
                  styles.formInputError
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={lightTheme.textSecondary}
                value={passwordForm.confirmPassword}
                onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {passwordForm.confirmPassword.length > 0 && 
               passwordForm.newPassword !== passwordForm.confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>

            {passwordError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setPasswordError('');
                }}
                disabled={passwordLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword) && styles.saveButtonDisabled
                ]}
                onPress={handleUpdatePassword}
                disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
              >
                {passwordLoading ? (
                  <Text style={styles.saveButtonText}>Updating...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>Update Password</Text>
                )}
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
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
  },
  headerRight: {
    position: 'relative',
    zIndex: 1001,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lightTheme.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: lightTheme.primary + '30',
  },
  userMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: lightTheme.surface,
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    zIndex: 9999,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
    marginBottom: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightTheme.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
  },
  userRole: {
    fontSize: 12,
    color: lightTheme.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: lightTheme.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 14,
    color: lightTheme.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: lightTheme.textSecondary,
    lineHeight: 16,
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: lightTheme.border,
    marginTop: 8,
    paddingTop: 12,
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: lightTheme.border,
    backgroundColor: lightTheme.surface,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: lightTheme.primary,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: lightTheme.text,
    marginBottom: 16,
  },
  postItem: {
    backgroundColor: lightTheme.card,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 4,
  },
  postMeta: {
    fontSize: 12,
    color: lightTheme.textSecondary,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: lightTheme.text,
    marginBottom: 16,
  },
  innerPage: {
    flex: 1,
  },
  backLink: {
    color: lightTheme.primary,
    marginBottom: 12,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  detailImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#eee',
  },
  postExcerpt: {
    fontSize: 15,
    color: lightTheme.textSecondary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: lightTheme.textSecondary,
    marginRight: 8,
  },
  detailValue: {
    color: lightTheme.text,
  },
  input: {
    backgroundColor: lightTheme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 12,
    fontSize: 15,
    color: lightTheme.text,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    marginRight: 8,
    backgroundColor: lightTheme.background,
  },
  selectedCategoryChip: {
    backgroundColor: lightTheme.primary,
    borderColor: lightTheme.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  featuredToggle: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: lightTheme.primary,
    backgroundColor: lightTheme.surface,
  },
  saveButton: {
    backgroundColor: lightTheme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: lightTheme.secondary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: lightTheme.error,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  configTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeConfigTab: {
    borderBottomWidth: 3,
    borderBottomColor: lightTheme.primary,
  },
  configTabIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.textSecondary,
  },
  configTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
    marginTop: 2,
  },
  activeConfigTabLabel: {
    color: lightTheme.primary,
  },
  addButton: {
    backgroundColor: lightTheme.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  configItem: {
    backgroundColor: lightTheme.card,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.primary,
    backgroundColor: lightTheme.surface,
  },
  adminRoleButton: {
    backgroundColor: lightTheme.primary,
    borderColor: lightTheme.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.primary,
  },
  adminRoleButtonText: {
    color: '#fff',
  },
  settingItem: {
    marginBottom: 16,
  },
  settingInput: {
    backgroundColor: lightTheme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 12,
    fontSize: 15,
    color: lightTheme.text,
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
    backgroundColor: lightTheme.background,
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: lightTheme.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: lightTheme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 12,
    fontSize: 15,
    color: lightTheme.text,
    marginBottom: 16,
  },
  modalImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: lightTheme.surface,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  modalImagePlaceholderText: {
    color: lightTheme.textSecondary,
  },
  modalButton: {
    backgroundColor: lightTheme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  maintenanceButton: {
    backgroundColor: lightTheme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  maintenanceButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  roleSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.primary,
    backgroundColor: lightTheme.surface,
  },
  roleSelectButtonActive: {
    backgroundColor: lightTheme.primary,
    borderColor: lightTheme.primary,
  },
  roleSelectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.primary,
  },
  roleSelectButtonTextActive: {
    color: '#fff',
  },
  categoryImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  // Analytics Styles
  analyticsContainer: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  analyticsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: lightTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  analyticsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: lightTheme.text,
    marginBottom: 4,
  },
  analyticsSubtitle: {
    fontSize: 16,
    color: lightTheme.textSecondary,
  },
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardPrimary: {
    backgroundColor: '#3B82F6',
  },
  statCardSuccess: {
    backgroundColor: '#10B981',
  },
  statCardWarning: {
    backgroundColor: '#F59E0B',
  },
  statCardInfo: {
    backgroundColor: '#8B5CF6',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  highlightCard: {
    backgroundColor: lightTheme.card,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: lightTheme.primary + '30',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.primary,
    marginLeft: 8,
  },
  highlightPostTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  highlightStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightStat: {
    fontSize: 16,
    fontWeight: 'bold',
    color: lightTheme.like,
  },
  chartsSection: {
    paddingHorizontal: 20,
  },
  chartCard: {
    backgroundColor: lightTheme.card,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: lightTheme.text,
    fontWeight: '500',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  chartLabel: {
    fontSize: 10,
    color: lightTheme.textSecondary,
    fontWeight: '500',
  },
  tablesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tableCard: {
    backgroundColor: lightTheme.card,
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: lightTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  tableCell: {
    flex: 2,
    fontSize: 14,
    color: lightTheme.text,
  },
  tableCellValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.primary,
    textAlign: 'right',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 9998,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: lightTheme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 12,
    fontSize: 15,
    color: lightTheme.text,
    marginBottom: 12,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: lightTheme.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: lightTheme.text,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: lightTheme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  passwordModalContent: {
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalSubtitle: {
    fontSize: 16,
    color: lightTheme.textSecondary,
    textAlign: 'center',
  },
  passwordStrength: {
    marginTop: 12,
  },
  strengthLabel: {
    fontSize: 14,
    color: lightTheme.text,
    fontWeight: '600',
  },
  strengthBar: {
    width: '100%',
    height: 8,
    backgroundColor: lightTheme.surface,
    borderRadius: 4,
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  strengthText: {
    fontSize: 12,
    color: lightTheme.text,
    fontWeight: '500',
  },
  formInputError: {
    borderColor: lightTheme.error,
  },
  errorContainer: {
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: lightTheme.border,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: lightTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: lightTheme.textSecondary,
  },
  lmsCard: {
    backgroundColor: lightTheme.card,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lmsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lmsCardText: {
    flex: 1,
    marginLeft: 16,
  },
  lmsCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.text,
  },
  lmsCardDescription: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});