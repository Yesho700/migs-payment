import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { Error, Refresh } from '@mui/icons-material';
import paymentService from '../services/paymentApi';

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const paymentId = searchParams.get('id');
  const merchantTxnRef = searchParams.get('ref');

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await paymentService.getPaymentStatus(paymentId);
      if (response.success) {
        setPaymentDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ textAlign: 'center', p: 4 }}>
        <Error sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom color="error.main">
          Payment Failed
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Unfortunately, your payment could not be processed.
        </Typography>

        {paymentDetails && (
          <Box sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              Payment Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Reference:
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {paymentDetails.merchantTxnRef}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Amount:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {paymentDetails.amount} {paymentDetails.currency}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Status:
              </Typography>
              <Chip 
                label={paymentDetails.status} 
                color="error" 
                size="small" 
              />
            </Box>

            {paymentDetails.responseMessage && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Reason:
                </Typography>
                <Typography variant="body2" color="error.main">
                  {paymentDetails.responseMessage}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Date:
              </Typography>
              <Typography variant="body2">
                {new Date(paymentDetails.processedAt || paymentDetails.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        )}

        <Alert severity="error" sx={{ mt: 3, mb: 3 }}>
          <Typography variant="body2">
            Please check your payment details and try again. If the problem persists, contact support.
          </Typography>
        </Alert>

        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleTryAgain}
          sx={{ minWidth: 200 }}
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentFailure;
