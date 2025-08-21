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
import { CheckCircle, Receipt } from '@mui/icons-material';
import paymentService from '../services/paymentApi';
import { toast } from 'react-toastify';

const PaymentSuccess = () => {
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
      toast.error('Failed to fetch payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPayment = () => {
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
        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom color="success.main">
          Payment Successful!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your payment has been processed successfully.
        </Typography>

        {paymentDetails && (
          <Box sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              Payment Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Transaction ID:
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {paymentDetails.transactionId || 'N/A'}
              </Typography>
            </Box>

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
                color="success" 
                size="small" 
              />
            </Box>

            {paymentDetails.authCode && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Auth Code:
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {paymentDetails.authCode}
                </Typography>
              </Box>
            )}

            {paymentDetails.receiptNo && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Receipt No:
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {paymentDetails.receiptNo}
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

        <Alert severity="success" sx={{ mt: 3, mb: 3 }}>
          <Typography variant="body2">
            Please save this information for your records. You will also receive a confirmation email if provided.
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={handleNewPayment}
            sx={{ minWidth: 150 }}
          >
            New Payment
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Receipt />}
            onClick={() => window.print()}
            sx={{ minWidth: 150 }}
          >
            Print Receipt
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PaymentSuccess;
