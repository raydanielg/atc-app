import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  BookOpen, 
  Bell, 
  Users, 
  ArrowRight, 
  ArrowLeft, 
  SkipForward,
  Play,
  GraduationCap,
  Newspaper
} from 'lucide-react-native';
import OnboardingService from '@/lib/onboarding';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'Welcome to ATC APP',
    subtitle: 'Your Gateway to Learning & News',
    description: 'Discover the latest news, educational content, and stay connected with Arusha Technical College community.',
    icon: GraduationCap,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#1D4ED8'],
    image: require('../assets/images/ATC.png'),
  },
  {
    id: 2,
    title: 'Stay Connected',
    subtitle: 'Never Miss Important Updates',
    description: 'Get instant notifications about new courses, announcements, and important updates from your college.',
    icon: Bell,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    image: require('../assets/images/ATC.png'),
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await OnboardingService.markOnboardingCompleted();
    router.replace('/(tabs)');
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setCurrentIndex(index);
  };

  const renderSlide = (item: any, index: number) => {
    const IconComponent = item.icon;
    
    return (
      <View key={item.id} style={styles.slide}>
        <LinearGradient
          colors={item.gradient}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView style={styles.slideContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image source={require('../assets/images/ATC.png')} style={styles.logo} />
              </View>
              <Text style={styles.appName}>ATC APP</Text>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <View style={styles.iconContainer}>
                <IconComponent size={80} color="#FFFFFF" />
              </View>
              
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              {index === 0 ? (
                <>
                  <View style={styles.featureItem}>
                    <Newspaper size={24} color="#FFFFFF" />
                    <Text style={styles.featureText}>Latest News & Updates</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <BookOpen size={24} color="#FFFFFF" />
                    <Text style={styles.featureText}>Educational Content</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Users size={24} color="#FFFFFF" />
                    <Text style={styles.featureText}>Community Connection</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.featureItem}>
                    <Bell size={24} color="#FFFFFF" />
                    <Text style={styles.featureText}>Instant Notifications</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <GraduationCap size={24} color="#FFFFFF" />
                    <Text style={styles.featureText}>Course Updates</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Newspaper size={24} color="#FFFFFF" />
                    <Text style={styles.featureText}>Important Announcements</Text>
                  </View>
                </>
              )}
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <SkipForward size={20} color="#FFFFFF" />
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => renderSlide(item, index))}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        {/* Dots */}
        <View style={styles.dots}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <ArrowLeft size={20} color="#6B7280" />
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex === onboardingData.length - 1 && styles.startButton,
            ]}
            onPress={handleNext}
          >
            {currentIndex === onboardingData.length - 1 ? (
              <>
                <Play size={20} color="#FFFFFF" />
                <Text style={styles.nextButtonText}>Get Started</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextButtonText}>Next</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
  },
  gradientBackground: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  features: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  navigation: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  previousButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 120,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
}); 