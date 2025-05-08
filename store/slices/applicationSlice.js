import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { firebase } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Async thunks
export const createApplication = createAsyncThunk(
  'applications/create',
  async ({ jobId, formData, resumeUri }) => {
    try {
      // Upload resume to Firebase Storage
      const resumeRef = storage().ref(`resumes/${Date.now()}_${formData.fullName}`);
      await resumeRef.putFile(resumeUri);
      const resumeUrl = await resumeRef.getDownloadURL();

      // Create application in Firestore
      const applicationData = {
        jobId,
        ...formData,
        resume: resumeUrl,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await firebase.firestore().collection('applications').add(applicationData);
      return { id: docRef.id, ...applicationData };
    } catch (error) {
      throw new Error(error.message);
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false
};

const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    resetApplicationState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createApplication.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.success = false;
      });
  }
});

export const { resetApplicationState } = applicationSlice.actions;
export default applicationSlice.reducer; 