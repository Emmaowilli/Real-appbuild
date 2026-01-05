const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } } );

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // Hash in production!
  photo: String, // URL to photo
  isActive: { type: Boolean, default: false },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ from: mongoose.Schema.Types.ObjectId, status: String }],
  isAdmin: { type: Boolean, default: false },
  deleteRequests: [{ userId: mongoose.Schema.Types.ObjectId }]
});
const User = mongoose.model('User', userSchema);

// Chat Schema (for messages)
const messageSchema = new mongoose.Schema({
  from: mongoose.Schema.Types.ObjectId,
  to: mongoose.Schema.Types.ObjectId,
  text: String,
  media: String, // URL to photo/video/audio
  type: String, // 'text', 'photo', 'video', 'audio'
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access denied');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) { res.status(400).send('Invalid token'); }
};

// Register API
app.post('/register', async (req, res) => {
  const { name, email, password, photo } = req.body;
  let user = new User({ name, email, password, photo });
  await user.save();
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.send({ token });
});

// Login API
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(400).send('Invalid credentials');
  user.isActive = true;
  await user.save();
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.send({ token });
});

// Get Users for Home (active status)
app.get('/users', auth, async (req, res) => {
  const users = await User.find().select('name photo isActive');
  res.send(users);
});

// Send Friend Request
app.post('/friend-request', auth, async (req, res) => {
  const { toId } = req.body;
  const user = await User.findById(req.user._id);
  const target = await User.findById(toId);
  target.friendRequests.push({ from: user._id, status: 'pending' });
  await target.save();
  res.send('Request sent');
});

// Accept Friend Request (similar for reject)
app.post('/accept-friend', auth, async (req, res) => {
  const { fromId } = req.body;
  const user = await User.findById(req.user._id);
  const request = user.friendRequests.find(r => r.from.toString() === fromId);
  if (request) request.status = 'accepted';
  user.friends.push(fromId);
  await user.save();
  res.send('Accepted');
});

// Chat APIs - Send Message
const storage = multer.diskStorage({ destination: 'uploads/', filename: (req, file, cb) => cb(null, Date.now() + file.originalname) });
const upload = multer({ storage });
app.post('/send-message', auth, upload.single('media'), async (req, res) => {
  const { toId, text, type } = req.body;
  const media = req.file ? `/uploads/${req.file.filename}` : null;
  let msg = new Message({ from: req.user._id, to: toId, text, media, type });
  await msg.save();
  io.to(toId).emit('new-message', msg); // Real-time
  res.send(msg);
});

// Get Chat History
app.get('/chat/:userId', auth, async (req, res) => {
  const messages = await Message.find({
    $or: [{ from: req.user._id, to: req.params.userId }, { from: req.params.userId, to: req.user._id }]
  }).sort('timestamp');
  res.send(messages);
});

// Mark as Read
app.post('/mark-read', auth, async (req, res) => {
  const { msgId } = req.body;
  const msg = await Message.findById(msgId);
  if (msg.to.toString() === req.user._id) msg.read = true;
  await msg.save();
  res.send('Marked');
});

// Account Settings (e.g., update theme, but store in user prefs)
app.put('/account', auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.theme = req.body.theme; // Add theme field to schema
  await user.save();
  res.send('Updated');
});

// Request Account Delete
app.post('/request-delete', auth, async (req, res) => {
  const admin = await User.findOne({ isAdmin: true });
  admin.deleteRequests.push({ userId: req.user._id });
  await admin.save();
  res.send('Request sent');
});

// Admin Delete User
app.delete('/delete-user/:userId', auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.isAdmin) return res.status(403).send('Admin only');
  await User.findByIdAndDelete(req.params.userId);
  res.send('Deleted');
});

// Socket.io for Real-time (online status, chats, calls)
const onlineUsers = {};
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    User.findByIdAndUpdate(userId, { isActive: true });
    io.emit('user-status', { userId, isActive: true });
  });

  socket.on('disconnect', () => {
    const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
    if (userId) {
      delete onlineUsers[userId];
      User.findByIdAndUpdate(userId, { isActive: false });
      io.emit('user-status', { userId, isActive: false });
    }
  });

  // For calls: Use WebRTC signaling
  socket.on('call-user', ({ toId, offer }) => {
    io.to(onlineUsers[toId]).emit('incoming-call', { fromId: socket.userId, offer });
  });
  // Handle answer, ice candidates similarly
});

// Explorer APIs - Use Google/YouTube APIs
const { google } = require('googleapis'); // npm install googleapis
const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
const customsearch = google.customsearch('v1');

app.get('/explore/search', async (req, res) => {
  const { query } = req.query;
  // Google Search
  const searchRes = await customsearch.cse.list({
    auth: process.env.GOOGLE_API_KEY,
    cx: process.env.GOOGLE_CSE_ID,
    q: query
  });
  // YouTube Search
  const ytRes = await youtube.search.list({
    part: 'snippet',
    q: query,
    type: 'video'
  });
  res.send({ google: searchRes.data.items, youtube: ytRes.data.items });
});

server.listen(5000, () => console.log('Server running on 5000'));