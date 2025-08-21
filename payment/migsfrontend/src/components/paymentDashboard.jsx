import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Search, Cancel, Refresh as RefundIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import paymentService from '../services/paymentApi';

const PaymentDashboard = () => {
  const [paymentId, setPaymentId] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");

  const fetchPaymentDetails = async () => {
    if (!paymentId.trim()) {
      toast.error('Please enter a payment ID');
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.getPaymentStatus(paymentId);
      if (response.success) {
        setPaymentDetails(response.data);
        toast.success('Payment details fetched successfully');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error('Payment not found or error occurred');
      setPaymentDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentDetails) return;

    setProcessing(true);
    try {
      const response = await paymentService.cancelPayment(paymentDetails.paymentId);
      if (response.success) {
        setPaymentDetails(prev => ({ ...prev, status: 'cancelled' }));
        toast.success('Payment cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    setProcessing(true);
    try {
      setHtmlContent("");
      const refundData = {
        paymentId: paymentDetails.paymentId,
        amount: parseFloat(refundAmount),
        reason: refundReason || 'Customer request',
      };

      const response = await paymentService.refundPayment(refundData);
      console.log(response, "Response");
      if (typeof response === 'string'){
        setHtmlContent(response);
        console.log(htmlContent, "HtmlContent");
      }
      else if (response.success) {
        setPaymentDetails(prev => ({
          ...prev,
          status: response.data.status,
          refundedAmount: response.data.refundedAmount,
        }));
        setRefundDialog(false);
        setRefundAmount('');
        setRefundReason('');
        toast.success('Refund processed successfully');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      case 'cancelled': return 'default';
      case 'refunded': return 'info';
      case 'partially_refunded': return 'info';
      default: return 'default';
    }
  };

  const canCancel = paymentDetails?.status === 'pending';
  const canRefund = paymentDetails?.status === 'success' || paymentDetails?.status === 'partially_refunded';
  const availableRefundAmount = paymentDetails ? paymentDetails.amount - (paymentDetails.refundedAmount || 0) : 0;

  return (
    <>
    { htmlContent !== "" ? (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
) : (
    <div>hello</div>
)}

    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Payment Management Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Payment ID"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="Enter payment ID to search"
            />
            <Button
              variant="contained"
              onClick={fetchPaymentDetails}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Search />}
              sx={{ minWidth: 120 }}
            >
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {paymentDetails && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment Details
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Payment ID
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {paymentDetails.paymentId}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Transaction ID
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {paymentDetails.transactionId || 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {paymentDetails.amount} {paymentDetails.currency}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={paymentDetails.status.toUpperCase()} 
                  color={getStatusColor(paymentDetails.status)}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Grid>

              {paymentDetails.refundedAmount > 0 && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Refunded Amount
                  </Typography>
                  <Typography variant="body1" color="info.main">
                    {paymentDetails.refundedAmount} {paymentDetails.currency}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">
                  {new Date(paymentDetails.createdAt).toLocaleString()}
                </Typography>
              </Grid>

              {paymentDetails.processedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Processed At
                  </Typography>
                  <Typography variant="body1">
                    {new Date(paymentDetails.processedAt).toLocaleString()}
                  </Typography>
                </Grid>
              )}

              {paymentDetails.responseMessage && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Response Message
                  </Typography>
                  <Typography variant="body1">
                    {paymentDetails.responseMessage}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              {canCancel && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={handleCancelPayment}
                  disabled={processing}
                >
                  Cancel Payment
                </Button>
              )}

              {canRefund && availableRefundAmount > 0 && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RefundIcon />}
                  onClick={() => setRefundDialog(true)}
                  disabled={processing}
                >
                  Refund Payment
                </Button>
              )}
            </Box>

            {paymentDetails.status === 'failed' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                This payment failed. No further actions are available.
              </Alert>
            )}

            {paymentDetails.status === 'refunded' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This payment has been fully refunded.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onClose={() => setRefundDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Refund Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Available refund amount: {availableRefundAmount} {paymentDetails?.currency}
          </Typography>
          
          <TextField
            fullWidth
            label="Refund Amount"
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            inputProps={{ 
              step: '0.01', 
              min: '0.01', 
              max: availableRefundAmount 
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Refund Reason"
            multiline
            rows={3}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Enter reason for refund (optional)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleRefundPayment} 
            variant="contained"
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} /> : 'Process Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </>

  );
};

export default PaymentDashboard;
