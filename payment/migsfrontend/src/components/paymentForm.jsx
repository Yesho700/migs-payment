import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { toast } from 'react-toastify';
import paymentService from '../services/paymentApi';

const PaymentForm = () => {
  const [formData, setFormData] = useState({
    orderInfo: '',
    amount: '',
    currency: 'AED',
    customerEmail: '',
    customerPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.orderInfo.trim()) {
      newErrors.orderInfo = 'Order information is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (formData.customerEmail && !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const paymentData = {
        orderInfo: formData.orderInfo,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        customerEmail: formData.customerEmail || undefined,
        customerPhone: formData.customerPhone || undefined,
      };

      const response = await paymentService.createPayment(paymentData);

      if (response.success) {
        toast.success('Payment created successfully! Redirecting to payment gateway...');
        
        // Store payment info in localStorage for later reference
        localStorage.setItem('currentPayment', JSON.stringify({
          paymentId: response.data.paymentId,
          merchantTxnRef: response.data.merchantTxnRef,
          amount: response.data.amount,
          currency: response.data.currency,
        }));

        // Redirect to MIGS payment page
        window.location.href = response.data.paymentUrl;
      } else {
        toast.error('Failed to create payment');
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          MIGS Payment Gateway
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Order Information *"
                name="orderInfo"
                value={formData.orderInfo}
                onChange={handleChange}
                error={!!errors.orderInfo}
                helperText={errors.orderInfo}
                placeholder="e.g., Order #12345"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount *"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                error={!!errors.amount}
                helperText={errors.amount}
                inputProps={{ step: '0.01', min: '0.01' }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                disabled
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Email"
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleChange}
                error={!!errors.customerEmail}
                helperText={errors.customerEmail}
                placeholder="customer@example.com"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Phone"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="+971501234567"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ mt: 2, py: 1.5 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating Payment...
                  </>
                ) : (
                  'Pay Now'
                )}
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            You will be redirected to the secure MIGS payment page to complete your transaction.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
