import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, Post, postService } from '@/lib/supabase';
import { lightTheme } from '@/lib/theme';
import { 
  ArrowLeft, 
  Share2, 
  BookOpen, 
  Clock, 
  User, 
  Heart, 
  Eye,
  MessageCircle 
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchPost();
      incrementViews();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (postData) {
        setPost(postData);
        setLikeCount(postData.likes || 0);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    if (id) {
      await postService.incrementViews(id as string);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    
    // For demo purposes, we'll use a dummy user ID
    // In a real app, you'd get this from authentication
    const dummyUserId = 'demo-user-id';
    
    try {
      const { liked: newLikedState, error } = await postService.toggleLike(post.id, dummyUserId);
      
      if (error) {
        Alert.alert('Error', 'Failed to update like');
        return;
      }
      
      setLiked(newLikedState);
      setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    if (post) {
      try {
        // Construct SEO-friendly URL
        const baseUrl = 'https://yourdomain.com/post'; // <-- Replace with your real domain
        const slug = post.slug || post.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const fullUrl = `${baseUrl}/${post.id}${slug ? `-${slug}` : ''}`;
        await Share.share({
          message: `Check out this article: ${post.title}\n\n${fullUrl}`,
          url: fullUrl,
          title: post.title,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Article not found</Text>
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Share2 size={20} color={lightTheme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Featured Image */}
        <Image
          source={{
            uri: post.image_url || 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg'
          }}
          style={styles.featuredImage}
        />

        {/* Post Content */}
        <View style={styles.postContent}>
          {/* Category */}
          {post.categories && (
            <TouchableOpacity style={styles.categoryContainer}>
              <View 
                style={[
                  styles.categoryDot, 
                  { backgroundColor: post.categories.color || lightTheme.primary }
                ]} 
              />
              <Text style={[
                styles.categoryText,
                { color: post.categories.color || lightTheme.primary }
              ]}>
                {post.categories.name}
              </Text>
            </TouchableOpacity>
          )}

          {/* Title */}
          <Text style={styles.title}>{post.title}</Text>

          {/* Metadata */}
          <View style={styles.metadata}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <User size={16} color={lightTheme.textSecondary} />
                <Text style={styles.metaText}>{post.author}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={16} color={lightTheme.textSecondary} />
                <Text style={styles.metaText}>{formatDate(post.created_at)}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <BookOpen size={16} color={lightTheme.textSecondary} />
                <Text style={styles.metaText}>{getReadingTime(post.content)} min read</Text>
              </View>
            </View>
          </View>

          {/* Excerpt */}
          <View style={styles.excerptContainer}>
            <Text style={styles.excerpt}>{post.excerpt}</Text>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.contentText}>{post.content}</Text>
          </View>

          {/* Engagement Actions */}
          <View style={styles.engagementContainer}>
            <TouchableOpacity 
              style={[styles.engagementButton, liked && styles.likedButton]}
              onPress={handleLike}
            >
              <Heart 
                size={20} 
                color={liked ? '#FFFFFF' : lightTheme.like}
                fill={liked ? '#FFFFFF' : 'none'}
              />
              <Text style={[
                styles.engagementText,
                liked && styles.likedText
              ]}>
                {formatNumber(likeCount)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.engagementButton} onPress={handleShare}>
              <Share2 size={20} color={lightTheme.textSecondary} />
              <Text style={styles.engagementText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.background,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  featuredImage: {
    width: width,
    height: 250,
  },
  postContent: {
    padding: 20,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: lightTheme.text,
    lineHeight: 36,
    marginBottom: 16,
  },
  metadata: {
    marginBottom: 20,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: lightTheme.textSecondary,
  },
  excerptContainer: {
    backgroundColor: lightTheme.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: lightTheme.primary,
  },
  excerpt: {
    fontSize: 16,
    color: lightTheme.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  contentContainer: {
    marginBottom: 32,
  },
  contentText: {
    fontSize: 16,
    color: lightTheme.text,
    lineHeight: 26,
  },
  engagementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: lightTheme.border,
    gap: 12,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: lightTheme.surface,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  likedButton: {
    backgroundColor: lightTheme.like,
  },
  engagementText: {
    fontSize: 14,
    color: lightTheme.textSecondary,
    fontWeight: '600',
  },
  likedText: {
    color: '#FFFFFF',
  },
});