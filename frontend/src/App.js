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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  BottomNavigation,
  BottomNavigationAction
} from '@mui/material';
import {
  Send as SendIcon,
  CameraAlt as CameraAltIcon,
  Mic as MicIcon,
  VideoCall as VideoCallIcon,
  Call as CallIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  Home as HomeIcon,
  Explore as ExploreIcon,
  AccountCircle as AccountIcon
} from '@mui/icons-material';

const socket = io('http://localhost:5000');

const defaultAvatars = [
  'https://media.gettyimages.com/id/1307064735/vector/people-avatar-round-icon-set-profile-diverse-empty-faces-for-social-network-vector-abstract.jpg?s=612x612&w=gi&k=20&c=Tu6-13XMKm6SwLisKdNr3iNsAX2Tc7aQZ4sXVYRz4BQ=',
  'https://media.gettyimages.com/id/1227566111/vector/people-avatar-icon-set-profile-diverse-faces-for-social-network-vector-abstract-illustration.jpg?s=612x612&w=gi&k=20&c=r3mrnWICWrCH8y_LUNSV_uHxg5vf6tuBeo1Olv4qLMs=',
  'https://media.gettyimages.com/id/1570061111/vector/people-avatar-square-icon-set-profile-diverse-faces-for-social-network-and-applications.jpg?s=612x612&w=gi&k=20&c=9pBfr-qtvOco8SRV9DN1xjbcJCLjjtDaI4RMxWVUG6g=',
  'https://img.freepik.com/free-vector/diverse-people-avatars-man-woman-characters-faces-social-media-profile-vector-flat-illustration-portraits-male-female-person-with-different-hairstyle-square-frame_107791-11841.jpg',
  'https://static.vecteezy.com/system/resources/thumbnails/051/959/812/small/a-collection-of-colorful-avatar-icons-representing-diverse-people-ideal-for-social-media-profiles-user-interfaces-and-online-communities-png.png',
  'https://media.gettyimages.com/id/1570061094/vector/people-avatar-round-icon-set-profile-diverse-empty-faces-for-social-network-and-applications.jpg?s=612x612&w=gi&k=20&c=uNnYl2Fn6W2y20dsBpE-0iMB0NvJKXMx9bFlK0keonM='
];

function App() {
  const [navValue, setNavValue] = useState(0);

  return (
    <Router>
      <Box sx={{ pb: 8 }}>
        <Switch>
          <Route path="/" exact component={Home} />
          <Route path="/explore" component={Explorer} />
          <Route path="/chat/:userId" component={Chat} />
          <Route path="/account" component={Account} />
        </Switch>
      </Box>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation value={navValue} onChange={(e, newValue) => setNavValue(newValue)}>
          <BottomNavigationAction label="Home" icon={<HomeIcon />} component="a" href="/" />
          <BottomNavigationAction label="Explore" icon={<ExploreIcon />} component="a" href="/explore" />
          <BottomNavigationAction label="Account" icon={<AccountIcon />} component="a" href="/account" />
        </BottomNavigation>
      </Paper>
    </Router>
  );
}

// Home Page
function Home() {
  const [users, setUsers] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://localhost:5000/users', { headers: { 'x-auth-token': token } })
        .then(res => {
          setUsers(res.data);
          setIsLoggedIn(true);
          const userId = JSON.parse(atob(token.split('.')[1]))._id;
          socket.emit('join', userId);
        })
        .catch(() => localStorage.removeItem('token'));

      socket.on('user-status', ({ userId, isActive }) => {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive } : u));
      });

      return () => socket.off('user-status');
    }
  }, []);

  const sendFriendRequest = (toId) => {
    const token = localStorage.getItem('token');
    axios.post('http://localhost:5000/friend-request', { toId }, { headers: { 'x-auth-token': token } })
      .then(() => alert('Friend request sent!'))
      .catch(() => alert('Error'));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" align="center" gutterBottom color="primary">
        Welcome!
      </Typography>

      {!isLoggedIn ? (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
          {/* Register Form */}
          <Box sx={{ p: 4, border: '1px solid #ddd', borderRadius: 3, bgcolor: '#f9f9f9', mb: 4 }}>
            <Typography variant="h5" gutterBottom>Register New Account</Typography>
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
                if (!name || !email || !pass) return alert('Fill all fields');
                try {
                  const res = await axios.post('http://localhost:5000/register', { name, email, password: pass });
                  localStorage.setItem('token', res.data.token);
                  setIsLoggedIn(true);
                  alert('Success! Logged in as ' + name);
                  setName(''); setEmail(''); setPass('');
                } catch (err) {
                  alert('Failed. Try different email.');
                }
              }}
            >
              Register
            </Button>
          </Box>

          {/* Login Form */}
          <Box sx={{ p: 4, border: '1px solid #ddd', borderRadius: 3, bgcolor: '#e3f2fd' }}>
            <Typography variant="h5" gutterBottom>Login</Typography>
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
                  alert('Logged in!');
                  setLoginEmail(''); setLoginPass('');
                } catch (err) {
                  alert('Wrong email/password');
                }
              }}
            >
              Login
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button variant="text" size="large" onClick={() => window.location.href = '/explore'}>
              Continue as Guest → Explorer
            </Button>
          </Box>
        </Box>
      ) : (
        <>
          <Typography variant="h5" align="center" gutterBottom>
            Active Users ({users.filter(u => u.isActive).length} online)
          </Typography>

          <List>
            {users.map(user => (
              <ListItem
                key={user._id}
                button
                onClick={() => window.location.href = `/chat/${user._id}`}
                secondaryAction={
                  <Button variant="contained" size="small" onClick={(e) => {
                    e.stopPropagation();
                    sendFriendRequest(user._id);
                  }}>
                    Add Friend
                  </Button>
                }
                sx={{ borderRadius: 2, mb: 1, bgcolor: 'background.paper' }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={user.photo || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]}
                    sx={{ width: 60, height: 60 }}
                  />
                </ListItemAvatar>
                <ListItemText primary={user.name} secondary={user.email} />
                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: user.isActive ? 'success.main' : 'warning.main' }} />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}

// Explorer Page (from your original code)
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

      <Typography variant="h5" gutterBottom sx={{ mt: 6 }}>People Photos</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
        {defaultAvatars.map((url, i) => (
          <img key={i} src={url} alt="person" style={{ width: '100%', borderRadius: 12, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }} />
        ))}
      </Box>
    </Box>
  );
}

// Chat Page (from your original code)
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

// Account Page (from your original code)
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