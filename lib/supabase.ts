import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string;
  category_id: string;
  created_at: string;
  updated_at: string;
  author: string;
  slug: string;
  featured: boolean;
  likes: number;
  views: number;
  categories: Category;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: 'admin' | 'user';
  created_at: string;
  push_token?: string;
};

export type PostLike = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

// Admin functions
export const adminAuth = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};

// Post management functions
export const postService = {
  createPost: async (post: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'likes' | 'views' | 'categories'>) => {
    const { data, error } = await supabase
      .from('posts')
      .insert([post])
      .select()
      .single();
    return { data, error };
  },
  
  updatePost: async (id: string, updates: Partial<Post>) => {
    const { data, error } = await supabase
      .from('posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
  
  deletePost: async (id: string) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);
    return { error };
  },
  
  incrementViews: async (id: string) => {
    const { error } = await supabase.rpc('increment_post_views', { post_id: id });
    return { error };
  },
  
  toggleLike: async (postId: string, userId: string) => {
    // Check if like exists
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
    
    if (existingLike) {
      // Remove like
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      return { liked: false, error };
    } else {
      // Add like
      const { error } = await supabase
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);
      return { liked: true, error };
    }
  }
};

// Analytics functions
export const analyticsService = {
  getUserCount: async () => {
    const { count, error } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true });
    return { count: count || 0, error };
  },
  
  getPostCount: async () => {
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    return { count: count || 0, error };
  },
  
  getTotalViews: async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('views');
    
    if (error) return { total: 0, error };
    
    const total = data?.reduce((sum, post) => sum + (post.views || 0), 0) || 0;
    return { total, error: null };
  },
  
  getTotalLikes: async () => {
    const { count, error } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true });
    return { count: count || 0, error };
  }
};

export const userService = {
  savePushToken: async (userId: string, token: string) => {
    const { error } = await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId);
    return { error };
  },
  getAllPushTokens: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('push_token')
      .not('push_token', 'is', null);
    return { tokens: data?.map((u: any) => u.push_token).filter(Boolean) || [], error };
  },
};