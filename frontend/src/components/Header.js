// src/components/Header.js
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'; // Added Box here
import { Home as HomeIcon, Chat as ChatIcon, Explore as ExploreIcon, AccountCircle as AccountIcon } from '@mui/icons-material';

function Header() {
  return (
    <AppBar position="static" sx={{
      background: 'linear-gradient(90deg, #8B5CF6 0%, #6366F1 50%, #06B6D4 100%)',
      boxShadow: '0 8px 32px rgba(139, 92, 246, 0.6)',
      mb: 3
    }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Social App
        </Typography>
        <Box> {/* This Box is now properly imported */}
          <Button color="inherit" startIcon={<HomeIcon />} href="/">Home</Button>
          <Button color="inherit" startIcon={<ChatIcon />} href="/">Chat</Button>
          <Button color="inherit" startIcon={<ExploreIcon />} href="/explore">Explore</Button>
          <Button color="inherit" startIcon={<AccountIcon />} href="/account">Account</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;