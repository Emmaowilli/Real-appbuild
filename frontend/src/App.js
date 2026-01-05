import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

import {
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Typography,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Send as SendIcon,
  CameraAlt as CameraAltIcon,
  Mic as MicIcon,
  VideoCall as VideoCallIcon,
  Call as CallIcon,
  EmojiEmotions as EmojiEmotionsIcon
} from '@mui/icons-material';

const socket = io('http://localhost:5000');

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/explore" component={Explorer} />
        <Route path="/chat/:userId" component={Chat} />
        <Route path="/account" component={Account} />
      </Switch>
    </Router>
  );
}

// Home Page
function Home() {
  const [users, setUsers] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [welcome] = useState('Welcome!');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Fixed: Full URL here
      axios.get('http://localhost:5000/users', { headers: { 'x-auth-token': token } })
        .then(res => {
          setUsers(res.data);
          setIsLoggedIn(true);
        })
        .catch(err => {
          console.error('Token invalid or server error', err);
          localStorage.removeItem('token');
          setIsLoggedIn(false);
        });
    }

    socket.on('user-status', ({ userId, isActive }) => {
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive } : u));
    });

    return () => socket.off('user-status');
  }, []);

  const sendFriendRequest = (toId) => {
    const token = localStorage.getItem('token');
    axios.post('http://localhost:5000/friend-request', { toId }, { headers: { 'x-auth-token': token } })
      .then(() => alert('Friend request sent!'))
      .catch(err => alert('Error sending request'));
  };

  return (
    <Box sx={{ p: 4, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom align="center" color="primary">
        {welcome}
      </Typography>

      {!isLoggedIn ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 4 }}>
          {/* Register Form */}
          <Box sx={{ p: 4, border: '1px solid #ddd', borderRadius: 3, bgcolor: '#f9f9f9' }}>
            <Typography variant="h5" gutterBottom>
              Register New Account
            </Typography>
            <TextField label="Name" fullWidth margin="normal" value={name} onChange={e => setName(e.target.value)} />
            <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth margin="normal" value={pass} onChange={e => setPass(e.target.value)} />
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              sx={{ mt: 3 }}
              onClick={async () => {
                if (!name || !email || !pass) {
                  alert('Please fill all fields');
                  return;
                }
                try {
                  const res = await axios.post('http://localhost:5000/register', { name, email, password: pass });
                  localStorage.setItem('token', res.data.token);
                  setIsLoggedIn(true);
                  alert('🎉 Success! You are now logged in as ' + name);
                  // Clear form
                  setName(''); setEmail(''); setPass('');
                } catch (err) {
                  console.error(err);
                  alert('Registration failed. Check console (F12) or try different email.');
                }
              }}
            >
              Register
            </Button>
          </Box>

          {/* Login Form */}
          <Box sx={{ p: 4, border: '1px solid #ddd', borderRadius: 3, bgcolor: '#e3f2fd' }}>
            <Typography variant="h5" gutterBottom>
              Login to Existing Account
            </Typography>
            <TextField label="Email" type="email" fullWidth margin="normal" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth margin="normal" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            <Button
              variant="contained"
              color="success"
              size="large"
              fullWidth
              sx={{ mt: 3 }}
              onClick={async () => {
                try {
                  const res = await axios.post('http://localhost:5000/login', { email: loginEmail, password: loginPass });
                  localStorage.setItem('token', res.data.token);
                  setIsLoggedIn(true);
                  alert('✅ Logged in successfully!');
                  setLoginEmail(''); setLoginPass('');
                } catch (err) {
                  alert('Login failed: Wrong email or password');
                }
              }}
            >
              Login
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Button variant="text" size="large" onClick={() => window.location.href = '/explore'}>
              Continue as Guest → Explorer Page
            </Button>
          </Box>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h4">Hello! You're logged in 👋</Typography>
            <Button variant="outlined" href="/account">My Account</Button>
          </Box>

          <Typography variant="h5" gutterBottom>
            Active Users ({users.length} total, {users.filter(u => u.isActive).length} online)
          </Typography>

          <List>
            {users.map(user => (
              <ListItem
                key={user._id}
                secondaryAction={
                  <Button variant="contained" size="small" onClick={() => sendFriendRequest(user._id)}>
                    Add Friend
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Avatar />
                </ListItemAvatar>
                <ListItemText primary={user.name} secondary={user.email} />
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: user.isActive ? 'success.main' : 'warning.main',
                    ml: 2,
                    boxShadow: 3
                  }}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}
// Explorer Page
function Explorer() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ google: [], youtube: [] });

  const search = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/explore/search?query=${query}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <TextField
          fullWidth
          label="Search Google or YouTube"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && search()}
        />
        <Button variant="contained" onClick={search}>Search</Button>
      </Box>

      <Typography variant="h5" gutterBottom>Google Results</Typography>
      {results.google.map((item, i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Typography variant="subtitle1">{item.title}</Typography>
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            {item.link}
          </a>
        </Box>
      ))}

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>YouTube Videos</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
        {results.youtube.map((item, i) => (
          <Box key={i}>
            <Typography variant="subtitle1" gutterBottom>
              {item.snippet.title}
            </Typography>
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${item.id.videoId}`}
              title={item.snippet.title}
              frameBorder="0"
              allowFullScreen
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Chat Page
function Chat({ match }) {
  const userId = match.params.userId;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`http://localhost:5000/chat/${userId}`, { headers: { 'x-auth-token': token } })
        .then(res => setMessages(res.data))
        .catch(err => console.error(err));
    }

    socket.on('new-message', msg => {
      if (msg.from === userId || msg.to === userId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => socket.off('new-message');
  }, [userId]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const token = localStorage.getItem('token');
    axios.post('http://localhost:5000/send-message', {
      toId: userId,
      text: text,
      type: 'text'
    }, { headers: { 'x-auth-token': token } });
    setText('');
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: theme === 'dark' ? '#121212' : '#f5f5f5' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Chat</Typography>
        <FormControl size="small">
          <InputLabel>Theme</InputLabel>
          <Select value={theme} label="Theme" onChange={(e) => setTheme(e.target.value)}>
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <List>
          {messages.map(msg => (
            <ListItem key={msg._id}>
              <ListItemText
                primary={msg.text}
                secondary={msg.media && <img src={`http://localhost:5000${msg.media}`} alt="media" style={{ maxWidth: '200px', borderRadius: 8 }} />}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <IconButton color="primary" onClick={sendMessage}>
          <SendIcon />
        </IconButton>
        <IconButton><EmojiEmotionsIcon /></IconButton>
        <IconButton><CameraAltIcon /></IconButton>
        <IconButton><MicIcon /></IconButton>
        <IconButton color="success"><CallIcon /></IconButton>
        <IconButton color="error"><VideoCallIcon /></IconButton>
      </Box>
    </Box>
  );
}

// Account Page
function Account() {
  const requestDelete = () => {
    const token = localStorage.getItem('token');
    axios.post('http://localhost:5000/request-delete', {}, { headers: { 'x-auth-token': token } })
      .then(() => alert('Delete request sent to admin'))
      .catch(err => console.error(err));
  };

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>My Account</Typography>
      <Button variant="outlined" color="error" onClick={requestDelete}>
        Request Account Deletion
      </Button>
    </Box>
  );
}

export default App;
