import { configureStore } from '@reduxjs/toolkit';
import jobReducer from './slices/jobSlice';
import categoryReducer from './slices/categorySlice';
import authReducer from './slices/authSlice';
import applicationReducer from './slices/applicationSlice';

export const store = configureStore({
  reducer: {
    jobs: jobReducer,
    categories: categoryReducer,
    auth: authReducer,
    applications: applicationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
}); 