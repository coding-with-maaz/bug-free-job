import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api';

// Async thunks
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.CATEGORIES.ALL);
      console.log('🔵 Categories API Response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('🔵 Categories API Error:', error); // Debug log
      return rejectWithValue(error.response?.data || 'Failed to fetch categories');
    }
  }
);

export const fetchPopularCategories = createAsyncThunk(
  'categories/fetchPopularCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.CATEGORIES.POPULAR);
      console.log('🔵 Popular Categories API Response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('🔵 Popular Categories API Error:', error); // Debug log
      return rejectWithValue(error.response?.data || 'Failed to fetch popular categories');
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  'categories/fetchCategoryById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.CATEGORIES.DETAILS(id));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch category');
    }
  }
);

export const fetchCategoryBySlug = createAsyncThunk(
  'categories/fetchCategoryBySlug',
  async (slug, { rejectWithValue }) => {
    try {
      const response = await api.get(`${ENDPOINTS.CATEGORIES.ALL}/slug/${slug}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch category');
    }
  }
);

const initialState = {
  categories: [],
  popularCategories: [],
  selectedCategory: null,
  loading: false,
  error: null,
  stats: {
    totalCategories: 0,
    popularCategories: 0,
    categoriesByJobCount: []
  }
};

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearSelectedCategory: (state) => {
      state.selectedCategory = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
        console.log('🔵 Categories state updated:', state.categories); // Debug log
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('🔵 Categories fetch error:', action.payload); // Debug log
      })
      // Fetch popular categories
      .addCase(fetchPopularCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPopularCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.popularCategories = action.payload;
        console.log('🔵 Popular Categories state updated:', state.popularCategories); // Debug log
      })
      .addCase(fetchPopularCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('🔵 Popular Categories fetch error:', action.payload); // Debug log
      })
      // Fetch category by ID
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCategory = action.payload;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch category by slug
      .addCase(fetchCategoryBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCategory = action.payload;
      })
      .addCase(fetchCategoryBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearSelectedCategory, clearError } = categorySlice.actions;
export default categorySlice.reducer; 