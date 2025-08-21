import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PaymentForm from './components/paymentForm';
import PaymentSuccess from './components/paymentSuccess';
import PaymentFailure from './components/paymentFailure';
import PaymentDashboard from './components/paymentDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              MIGS Payment Gateway Integration
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={
              <Box>
                <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
                  <Tab label="Make Payment" />
                  <Tab label="Manage Payments" />
                </Tabs>
                
                {tabValue === 0 && <PaymentForm />}
                {tabValue === 1 && <PaymentDashboard />}
              </Box>
            } />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/payment/error" element={
              <Box textAlign="center" mt={4}>
                <Typography variant="h4" color="error">Payment Error</Typography>
                <Typography variant="body1" mt={2}>
                  An error occurred while processing your payment. Please try again.
                </Typography>
              </Box>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;
