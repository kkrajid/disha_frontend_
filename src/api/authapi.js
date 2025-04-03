import axios from 'axios';

const API_URL = 'http://localhost:8000/api/auth/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (phoneNumber, password) => {
  try {
    const response = await api.post('login/', {
      phone_number: phoneNumber,
      password,
    });
    
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    // Pass the full error response from the backend
    const errorData = error.response?.data || { error: 'Login failed. Please try again.' };
    throw errorData; // Throw the error object to be handled by the caller
  }
};

// Other functions (register, logout, getProfile, updateProfile) remain unchanged for this example
export const register = async (userData) => {
  try {
    const response = await api.post('register/', userData);
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Registration failed' };
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
};

export const getProfile = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');
  try {
    const response = await api.get('profile/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch profile' };
  }
};

export const updateProfile = async (profileData) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');
  try {
    const response = await api.put('profile/', profileData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to update profile' };
  }
};