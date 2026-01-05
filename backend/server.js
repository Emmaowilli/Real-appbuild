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
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// User Schema (added hideProfile, fixed photo)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  photo: String, // URL to photo
  isActive: { type: Boolean, default: false },
  hideProfile: { type: Boolean, default: false },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ from: mongoose.Schema.Types.ObjectId, status: String }],
  isAdmin: { type: Boolean, default: false },
  deleteRequests: [{ userId: mongoose.Schema.Types.ObjectId }]
});
const User = mongoose.model('User', userSchema);

// Message Schema
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

// Register
app.post('/register', async (req, res) => {
  const { name, email, password, photo } = req.body;
  let user = new User({ name, email, password, photo });
  await user.save();
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.send({ token });
});

// Login (set isActive true)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(400).send('Invalid credentials');
  user.isActive = true;
  await user.save();
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.send({ token });
});

// Update Profile (name, photo, hideProfile)
const storage = multer.diskStorage({ destination: 'uploads/', filename: (req, file, cb) => cb(null, Date.now() + file.originalname) });
const upload = multer({ storage });
app.put('/profile', auth, upload.single('photo'), async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.name) user.name = req.body.name;
  if (req.file) user.photo = `/uploads/${req.file.filename}`;
  user.hideProfile = req.body.hideProfile === 'true';
  await user.save();
  res.send(user);
});

// Get Users (exclude hidden profiles)
app.get('/users', auth, async (req, res) => {
  const users = await User.find({ hideProfile: false }).select('name photo isActive _id');
  res.send(users);
});

// Other APIs remain the same (friend-request, send-message, etc.)

// Socket.io (online status, join with userId)
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.userId = userId;
    User.findByIdAndUpdate(userId, { isActive: true });
    io.emit('user-status', { userId, isActive: true });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, { isActive: false });
      io.emit('user-status', { userId: socket.userId, isActive: false });
    }
  });

  // ... other socket code ...
});

server.listen(5000, () => console.log('Server running on 5000'));
