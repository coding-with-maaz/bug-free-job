import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  Animated,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchCategories, 
  fetchPopularCategories 
} from '../store/slices/categorySlice';
import AdLoadingManager from '../components/AdLoadingManager';

const CategoriesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const adManagerRef = useRef(null);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  
  // Update how we access the Redux store to handle nested data structure
  const { categories, popularCategories, loading, error } = useSelector(state => {
    console.log('🔵 Redux State:', state.categories); // Debug log
    return {
      categories: Array.isArray(state.categories.categories?.data) ? state.categories.categories.data : [],
      popularCategories: Array.isArray(state.categories.popularCategories?.data) ? state.categories.popularCategories.data : [],
      loading: state.categories.loading,
      error: state.categories.error
    };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🔵 Categories:', categories);
    console.log('🔵 Popular Categories:', popularCategories);
    console.log('🔵 Loading:', loading);
    console.log('🔵 Error:', error);
  }, [categories, popularCategories, loading, error]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('🔵 Loading categories...'); // Debug log
      const [categoriesResult, popularResult] = await Promise.all([
        dispatch(fetchCategories()).unwrap(),
        dispatch(fetchPopularCategories()).unwrap()
      ]);
      console.log('🔵 Categories Result:', categoriesResult); // Debug log
      console.log('🔵 Popular Result:', popularResult); // Debug log
    } catch (error) {
      console.error('🔵 Error loading categories:', error);
      Alert.alert(
        'Error',
        'Failed to load categories. Please try again later.'
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const filteredCategories = useMemo(() => {
    console.log('🔵 Filtering categories:', categories); // Debug log
    if (!Array.isArray(categories)) return [];
    
    return categories.filter(category =>
      category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const handleCategoryPress = async (category) => {
    if (!category) return;
    
    try {
      setCurrentCategoryId(category.id);
      setIsAdLoading(true);

      if (adManagerRef.current) {
        // Check if ad is ready before showing
        if (adManagerRef.current.isInterstitialLoading()) {
          console.log('Ad is still loading, waiting...');
          // Wait for a short time and try again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await adManagerRef.current.showInterstitialAd();
      }

      navigation.navigate('CategoryResults', {
        categoryId: category.id,
        slug: category.slug
      });
    } catch (error) {
      console.error('Error showing ad:', error);
      // If ad fails, still navigate to category results
    navigation.navigate('CategoryResults', { category });
    } finally {
      setCurrentCategoryId(null);
      setIsAdLoading(false);
    }
  };

  const renderCategory = ({ item }) => {
    const isCategoryLoading = (item.id === currentCategoryId) && isAdLoading;
    
    return (
      <TouchableOpacity 
        style={[
          styles.categoryCard, 
          { borderColor: item.color || '#e9ecef' },
          isCategoryLoading && styles.categoryCardLoading
        ]}
        onPress={() => handleCategoryPress(item)}
        disabled={isCategoryLoading}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color || '#007AFF' }]}>
          <Ionicons name={item.icon || 'briefcase-outline'} size={32} color="#fff" />
        </View>
        <Text style={styles.categoryName}>{item.name || 'Unnamed Category'}</Text>
        <Text style={styles.jobCount}>
          {item.jobCount?.toLocaleString() || 0} {item.jobCount === 1 ? 'job' : 'jobs'}
        </Text>
        
        <View style={styles.popularContainer}>
          {(item.popularSearches || []).slice(0, 2).map((search, index) => (
            <View key={index} style={styles.popularTag}>
              <Text style={styles.popularText} numberOfLines={1}>
                {search}
              </Text>
            </View>
          ))}
        </View>

        {isCategoryLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading ad...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPopularCategories = () => {
    console.log('🔵 Rendering popular categories:', popularCategories); // Debug log
    if (!Array.isArray(popularCategories) || !popularCategories.length) return null;

    return (
      <View style={styles.popularSection}>
        <Text style={styles.sectionTitle}>Popular Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularScrollContent}
        >
          {popularCategories.map(category => {
            if (!category) return null;
            
            // Ensure jobCount is a number and has a fallback
            const jobCount = typeof category.jobCount === 'number' ? category.jobCount : 0;
            
            return (
              <TouchableOpacity 
                key={category.id}
                style={[styles.popularCard, { backgroundColor: category.color || '#007AFF' }]}
                onPress={() => handleCategoryPress(category)}
              >
                <Ionicons name={category.icon || 'briefcase-outline'} size={24} color="#fff" />
                <Text style={styles.popularCardText}>{category.name || 'Unnamed Category'}</Text>
                <Text style={styles.popularCardCount}>
                  {jobCount.toLocaleString()} {jobCount === 1 ? 'job' : 'jobs'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  if (loading && !refreshing) {
      return (
        <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      );
    }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadCategories}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {renderPopularCategories()}

      <Text style={[styles.sectionTitle, { marginHorizontal: 20, marginTop: 20 }]}>
        All Categories
      </Text>

      <View style={styles.contentContainer}>
      <FlatList
        data={filteredCategories}
        renderItem={renderCategory}
        keyExtractor={item => item?.id?.toString()}
        numColumns={2}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: 180 }
          ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Categories Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'No categories available'}
            </Text>
          </View>
        }
      />
      </View>

      <AdLoadingManager 
        ref={adManagerRef}
        onAdLoaded={() => {
          console.log('Ad loaded successfully');
          setIsAdLoading(false);
        }}
        onAdFailedToLoad={(error) => {
          console.log('Ad failed to load:', error);
          setIsAdLoading(false);
        }}
      />

      {adManagerRef.current?.getInterstitialError() && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{adManagerRef.current.getInterstitialError()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  popularSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  popularScrollContent: {
    paddingRight: 20,
  },
  popularCard: {
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  popularCardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  popularCardCount: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  listContainer: {
    padding: 20,
  },
  categoryCard: {
    flex: 1,
    margin: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  jobCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  popularContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  popularTag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  popularText: {
    fontSize: 12,
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: '#ffebee',
    padding: 10,
    alignItems: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  categoryCardLoading: {
    opacity: 0.7,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});

export default CategoriesScreen; 