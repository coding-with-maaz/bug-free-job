import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { ENDPOINTS } from '../../config/api';

// Async thunks
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.JOBS.ALL, { params });
      console.log('🔵 Jobs API Response:', response.data); // Debug log
      return response.data.data || []; // Ensure we return an array
    } catch (error) {
      console.error('🔵 Jobs API Error:', error); // Debug log
      return rejectWithValue(error.response?.data || 'Failed to fetch jobs');
    }
  }
);

export const fetchLatestJobs = createAsyncThunk(
  'jobs/fetchLatestJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.JOBS.LATEST);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch latest jobs');
    }
  }
);

export const fetchTodayJobs = createAsyncThunk(
  'jobs/fetchTodayJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.JOBS.TODAY);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch today jobs');
    }
  }
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.JOBS.DETAILS(id));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch job');
    }
  }
);

export const fetchJobBySlug = createAsyncThunk(
  'jobs/fetchJobBySlug',
  async (slug, { rejectWithValue }) => {
    try {
      const response = await api.get(`${ENDPOINTS.JOBS.ALL}/slug/${slug}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch job');
    }
  }
);

export const fetchFeaturedJobs = createAsyncThunk(
  'jobs/fetchFeaturedJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.JOBS.FEATURED);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch featured jobs');
    }
  }
);

export const searchJobs = createAsyncThunk(
  'jobs/searchJobs',
  async (searchParams, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.JOBS.SEARCH, { params: searchParams });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to search jobs');
    }
  }
);

export const saveJob = createAsyncThunk(
  'jobs/saveJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await api.post(`${ENDPOINTS.JOBS.DETAILS(jobId)}/save`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to save job');
    }
  }
);

export const unsaveJob = createAsyncThunk(
  'jobs/unsaveJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`${ENDPOINTS.JOBS.DETAILS(jobId)}/save`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to unsave job');
    }
  }
);

export const fetchSavedJobs = createAsyncThunk(
  'jobs/fetchSavedJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`${ENDPOINTS.JOBS.ALL}/saved`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch saved jobs');
    }
  }
);

const initialState = {
  jobs: [],
  featuredJobs: [],
  savedJobs: [],
  latestJobs: [],
  todayJobs: [],
  selectedJob: null,
  loading: false,
  error: null,
  filters: {
    category: null,
    type: null,
    location: null,
    salary: null,
    experience: null
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  searchResults: [],
  searchLoading: false,
  searchError: null
};

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearSelectedJob: (state) => {
      state.selectedJob = null;
    },
    clearError: (state) => {
      state.error = null;
      state.searchError = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchLoading = false;
      state.searchError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all jobs
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = Array.isArray(action.payload) ? action.payload : [];
        console.log('🔵 Jobs state updated:', state.jobs); // Debug log
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('🔵 Jobs fetch error:', action.payload); // Debug log
      })
      // Fetch job by ID
      .addCase(fetchJobById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch job by slug
      .addCase(fetchJobBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedJob = action.payload;
      })
      .addCase(fetchJobBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch featured jobs
      .addCase(fetchFeaturedJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeaturedJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredJobs = action.payload;
      })
      .addCase(fetchFeaturedJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search jobs
      .addCase(searchJobs.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchJobs.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchJobs.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      })
      // Save job
      .addCase(saveJob.fulfilled, (state, action) => {
        const job = state.jobs.find(j => j.id === action.payload.jobId);
        if (job) {
          job.isSaved = true;
        }
        const featuredJob = state.featuredJobs.find(j => j.id === action.payload.jobId);
        if (featuredJob) {
          featuredJob.isSaved = true;
        }
        const searchJob = state.searchResults.find(j => j.id === action.payload.jobId);
        if (searchJob) {
          searchJob.isSaved = true;
        }
        if (state.selectedJob?.id === action.payload.jobId) {
          state.selectedJob.isSaved = true;
        }
      })
      // Unsave job
      .addCase(unsaveJob.fulfilled, (state, action) => {
        const job = state.jobs.find(j => j.id === action.payload.jobId);
        if (job) {
          job.isSaved = false;
        }
        const featuredJob = state.featuredJobs.find(j => j.id === action.payload.jobId);
        if (featuredJob) {
          featuredJob.isSaved = false;
        }
        const searchJob = state.searchResults.find(j => j.id === action.payload.jobId);
        if (searchJob) {
          searchJob.isSaved = false;
        }
        if (state.selectedJob?.id === action.payload.jobId) {
          state.selectedJob.isSaved = false;
        }
      })
      // Fetch saved jobs
      .addCase(fetchSavedJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.savedJobs = action.payload;
      })
      .addCase(fetchSavedJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch latest jobs
      .addCase(fetchLatestJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLatestJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.latestJobs = action.payload;
      })
      .addCase(fetchLatestJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch today jobs
      .addCase(fetchTodayJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.todayJobs = action.payload;
      })
      .addCase(fetchTodayJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  setFilters, 
  clearFilters, 
  clearSelectedJob, 
  clearError,
  clearSearchResults 
} = jobSlice.actions;

export default jobSlice.reducer; 