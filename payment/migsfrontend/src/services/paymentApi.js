import axios from 'axios';

const API_BASE_URL = 'https://localhost:3001';

const paymentApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
paymentApi.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
paymentApi.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export const paymentService = {
  // Create payment
  createPayment: async (paymentData) => {
    const response = await paymentApi.post('/api/payments/create', paymentData);
    return response.data;
  },

  // Get payment status
  getPaymentStatus: async (paymentId) => {
    const response = await paymentApi.get(`/api/payments/status/${paymentId}`);
    return response.data;
  },

  // Cancel payment
  cancelPayment: async (paymentId) => {
    const response = await paymentApi.post(`/api/payments/cancel/${paymentId}`);
    return response.data;
  },

  // Refund payment
  refundPayment: async (refundData) => {
    const response = await paymentApi.post('/api/payments/refund', refundData);
    console.log(response.data);
    return response.data;
  },

  // Query payment
  queryPayment: async (merchantTxnRef) => {
    const response = await paymentApi.get(`/api/payments/query/${merchantTxnRef}`);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await paymentApi.get('/api/payments/health');
    return response.data;
  },
};

export default paymentService;
