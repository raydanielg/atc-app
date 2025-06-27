import React, { useRef } from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  TextInput,
  FlatList,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase, Post, Category } from '@/lib/supabase';
import { lightTheme } from '@/lib/theme';
import { Search, Clock, Eye, Heart, Share2, TrendingUp } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
const ATCLogo = require('@/assets/images/ATC.png');

const { width } = Dimensions.get('window');

export default function NewsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef<FlatList<any>>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pdfs, setPdfs] = useState<{ name: string; url: string }[]>([]);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfLink, setPdfLink] = useState('');

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  // Auto-slide effect for featured news
  useEffect(() => {
    if (featuredPosts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % featuredPosts.length;
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: next, animated: true });
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredPosts]);

  // Add sample featured news if none are fetched
  useEffect(() => {
    if (featuredPosts.length === 0 && !loading) {
      setFeaturedPosts([
        {
          id: 'sample1',
          title: 'AI Revolutionizes Education in Africa',
          image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
          featured: true,
          created_at: new Date().toISOString(),
          author: 'Tech News',
          excerpt: 'Artificial Intelligence is transforming classrooms across the continent.',
          content: '',
          category_id: '',
          updated_at: '',
          slug: 'ai-revolutionizes-education',
          likes: 0,
          views: 0,
          categories: { id: '', name: 'Technology', slug: 'technology', description: '', color: '#2196F3', created_at: '' },
        },
        {
          id: 'sample2',
          title: 'Green Energy Projects Expand in Tanzania',
          image_url: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
          featured: true,
          created_at: new Date().toISOString(),
          author: 'Eco News',
          excerpt: 'Solar and wind energy projects are on the rise.',
          content: '',
          category_id: '',
          updated_at: '',
          slug: 'green-energy-tanzania',
          likes: 0,
          views: 0,
          categories: { id: '', name: 'Environment', slug: 'environment', description: '', color: '#4CAF50', created_at: '' },
        },
        {
          id: 'sample3',
          title: 'Student Innovation Fair 2024 Announced',
          image_url: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308',
          featured: true,
          created_at: new Date().toISOString(),
          author: 'Campus Life',
          excerpt: 'The annual fair will showcase student projects in science and tech.',
          content: '',
          category_id: '',
          updated_at: '',
          slug: 'student-innovation-fair',
          likes: 0,
          views: 0,
          categories: { id: '', name: 'Events', slug: 'events', description: '', color: '#FF5722', created_at: '' },
        },
      ]);
    }
  }, [featuredPosts, loading]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (postsData) {
        setPosts(postsData);
        setFilteredPosts(postsData);
        setFeaturedPosts(postsData.filter(post => post.featured).slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const navigateToPost = (post: Post) => {
    router.push({
      pathname: '/post/[id]',
      params: { id: post.id },
    });
  };

  const navigateToCategory = (categorySlug: string) => {
    router.push({
      pathname: '/category/[slug]',
      params: { slug: categorySlug },
    });
  };

  // Filter posts by selected category
  const displayedPosts = selectedCategory === 'all'
    ? filteredPosts
    : filteredPosts.filter(post => post.category_id === selectedCategory);

  // Add like handler
  const handleLike = async (postId: string) => {
    try {
      // Optimistically update UI
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
      setFilteredPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
      // Get current likes
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();
      if (fetchError) throw fetchError;
      const newLikes = (data?.likes || 0) + 1;
      // Update in Supabase
      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId);
      if (error) throw error;
    } catch (err) {
      Alert.alert('Error', 'Failed to like post.');
    }
  };

  // Add share handler
  const handleShare = async (post: Post) => {
    try {
      await Share.share({
        message: `${post.title}\n\nRead more in the ATC App!`,
        url: post.image_url || undefined,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to share post.');
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Curved Header */}
        <View style={styles.curvedHeader}>
          <Image source={require('../../assets/images/ATC.png')} style={styles.curvedLogo} />
          <Text style={styles.curvedTitle}>Arusha Technical College</Text>
          <Text style={styles.slogan}>Skills make the difference</Text>
        </View>

        {/* Category Pills - Real, Scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          <TouchableOpacity
            style={[styles.categoryPill, selectedCategory === 'all' && styles.activePill]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.categoryText, selectedCategory === 'all' && styles.activeCategoryText]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryPill, selectedCategory === cat.id && styles.activePill]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.activeCategoryText]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={lightTheme.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search news..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={lightTheme.textSecondary}
            />
          </View>
        </View>

        {/* Featured News Carousel */}
        {featuredPosts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured News</Text>
            </View>
            <FlatList
              ref={flatListRef}
              data={featuredPosts}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (width * 0.8));
                setCurrentSlide(index);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.featuredCard}
                  onPress={() => navigateToPost(item)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: item.image_url || 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg' }}
                    style={styles.featuredImage}
                  />
                  <View style={styles.featuredOverlay}>
                    <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.featuredContainer}
              contentContainerStyle={styles.featuredContent}
            />
          </>
        )}

        {/* Latest News Section */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
          <Text style={styles.sectionTitle}>Latest News</Text>
          <TouchableOpacity onPress={() => router.push('/post/posts')}>
            <Text style={{ color: lightTheme.primary, fontWeight: '600' }}>View All</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>{displayedPosts.length} articles</Text>

        {/* News List */}
        <View style={styles.newsContainer}>
          {displayedPosts.map((post, index) => (
            <TouchableOpacity
              key={post.id}
              style={[
                styles.newsCard,
                index === 0 && styles.firstNewsCard
              ]}
              onPress={() => navigateToPost(post)}
            >
              <Image
                source={{
                  uri: post.image_url || 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg'
                }}
                style={index === 0 ? styles.largeNewsImage : styles.newsImage}
              />
              <View style={styles.newsContent}>
                {post.categories && (
                  <TouchableOpacity 
                    style={[styles.categoryTag, { backgroundColor: post.categories.color || lightTheme.primary }]}
                    onPress={() => navigateToCategory(post.categories.slug)}
                  >
                    <Text style={styles.categoryTagText}>{post.categories.name}</Text>
                  </TouchableOpacity>
                )}
                <Text style={[
                  styles.newsTitle,
                  index === 0 && styles.largeNewsTitle
                ]} numberOfLines={index === 0 ? 3 : 2}>
                  {post.title}
                </Text>
                <Text style={styles.newsExcerpt} numberOfLines={index === 0 ? 3 : 2}>
                  {post.excerpt}
                </Text>
                <View style={styles.newsMeta}>
                  <View style={styles.metaLeft}>
                    <Text style={styles.newsDate}>{formatDate(post.created_at)}</Text>
                    <Text style={styles.newsAuthor}>by {post.author}</Text>
                  </View>
                  <View style={styles.metaRight}>
                    <TouchableOpacity style={styles.metaItem} onPress={() => handleLike(post.id)}>
                      <Heart size={14} color={lightTheme.like} />
                      <Text style={styles.metaText}>{formatNumber(post.likes || 0)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareButton} onPress={() => handleShare(post)}>
                      <Share2 size={14} color={lightTheme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {displayedPosts.length === 0 && searchQuery && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No news found for "{searchQuery}"</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.background,
  },
  scrollView: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: lightTheme.textSecondary,
  },
  curvedHeader: {
    backgroundColor: '#0A3761', // ATC blue
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#0A3761',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  curvedLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  curvedTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  slogan: {
    fontSize: 13,
    color: '#E0E6ED',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: lightTheme.text,
    marginBottom: 2,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightTheme.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: lightTheme.text,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  categoryContent: {
    gap: 12,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: lightTheme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  activePill: {
    backgroundColor: lightTheme.primary,
    borderColor: lightTheme.primary,
  },
  categoryText: {
    fontSize: 14,
    color: lightTheme.text,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: lightTheme.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  featuredContainer: {
    marginBottom: 32,
  },
  featuredContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  featuredCard: {
    width: width * 0.8,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  newsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  newsCard: {
    backgroundColor: lightTheme.card,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  firstNewsCard: {
    marginBottom: 24,
  },
  newsImage: {
    width: '100%',
    height: 160,
  },
  largeNewsImage: {
    width: '100%',
    height: 220,
  },
  newsContent: {
    padding: 16,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  largeNewsTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  newsExcerpt: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  newsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flex: 1,
  },
  newsDate: {
    fontSize: 12,
    color: lightTheme.textSecondary,
    marginBottom: 2,
  },
  newsAuthor: {
    fontSize: 12,
    color: lightTheme.textSecondary,
    fontWeight: '500',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: lightTheme.textSecondary,
  },
  shareButton: {
    padding: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: lightTheme.textSecondary,
    textAlign: 'center',
  },
});