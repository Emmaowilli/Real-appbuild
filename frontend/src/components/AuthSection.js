// src/components/AuthSection.js
import React, { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import axios from 'axios';

function AuthSection({ onLoginSuccess }) {
  const [showForm, setShowForm] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !pass) return alert('Fill all fields');
    try {
      const res = await axios.post('http://localhost:5000/register', { name, email, password: pass });
      localStorage.setItem('token', res.data.token);
      onLoginSuccess();
      alert('Success! Logged in as ' + name);
    } catch (err) {
      alert('Failed. Try different email.');
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:5000/login', { email: loginEmail, password: loginPass });
      localStorage.setItem('token', res.data.token);
      onLoginSuccess();
      alert('Logged in!');
    } catch (err) {
      alert('Wrong email/password');
    }
  };

  if (showForm === '') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 4 }}>
        <Button variant="contained" size="large" onClick={() => setShowForm('register')}>
          Register
        </Button>
        <Button variant="outlined" size="large" onClick={() => setShowForm('login')}>
          Login
        </Button>
        <Button variant="text" onClick={() => window.location.href = '/explore'}>
          Continue as Guest → Explorer
        </Button>
      </Box>
    );
  }

  if (showForm === 'register') {
    return (
      <Box sx={{ p: 4, borderRadius: 3, bgcolor: '#f9f9f9', boxShadow: 3 }}>
        <Typography variant="h5" gutterBottom>Register</Typography>
        <TextField label="Name" fullWidth margin="normal" value={name} onChange={e => setName(e.target.value)} />
        <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
        <TextField label="Password" type="password" fullWidth margin="normal" value={pass} onChange={e => setPass(e.target.value)} />
        <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={handleRegister}>Register</Button>
        <Button onClick={() => setShowForm('')} sx={{ mt: 2 }}>Back</Button>
      </Box>
    );
  }

  if (showForm === 'login') {
    return (
      <Box sx={{ p: 4, borderRadius: 3, bgcolor: '#e3f2fd', boxShadow: 3 }}>
        <Typography variant="h5" gutterBottom>Login</Typography>
        <TextField label="Email" type="email" fullWidth margin="normal" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
        <TextField label="Password" type="password" fullWidth margin="normal" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
        <Button variant="contained" color="success" fullWidth sx={{ mt: 3 }} onClick={handleLogin}>Login</Button>
        <Button onClick={() => setShowForm('')} sx={{ mt: 2 }}>Back</Button>
      </Box>
    );
  }

  return null;
}

export default AuthSection;