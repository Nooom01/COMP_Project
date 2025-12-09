import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

// Website Schema
const WebsiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'High' },
  isProtected: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Website = mongoose.models.Website || mongoose.model('Website', WebsiteSchema);

// Database connection
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

function verifyToken(req) {
  let token = req.headers['x-auth-token'];
  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  if (!token) return { error: 'No token, authorization denied', status: 401 };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: decoded.user };
  } catch (err) {
    return { error: 'Token is not valid', status: 401 };
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-auth-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify token
  const auth = verifyToken(req);
  if (auth.error) {
    return res.status(auth.status).json({ msg: auth.error });
  }

  const { id } = req.query;

  try {
    await connectDB();

    if (req.method === 'GET') {
      const website = await Website.findById(id).populate('createdBy', 'username');
      if (!website) {
        return res.status(404).json({ msg: 'Website not found' });
      }
      return res.json(website);
    }

    if (req.method === 'PUT') {
      const { name, url, riskLevel, isProtected } = req.body;
      const websiteFields = {};
      if (name) websiteFields.name = name;
      if (url) websiteFields.url = url;
      if (riskLevel) websiteFields.riskLevel = riskLevel;
      if (isProtected !== undefined) websiteFields.isProtected = isProtected;

      let website = await Website.findById(id);
      if (!website) {
        return res.status(404).json({ msg: 'Website not found' });
      }

      website = await Website.findByIdAndUpdate(id, { $set: websiteFields }, { new: true });
      return res.json(website);
    }

    if (req.method === 'DELETE') {
      const website = await Website.findById(id);
      if (!website) {
        return res.status(404).json({ msg: 'Website not found' });
      }
      await Website.findByIdAndDelete(id);
      return res.json({ msg: 'Website removed' });
    }

    return res.status(405).json({ msg: 'Method not allowed' });
  } catch (err) {
    console.error('Website error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Website not found' });
    }
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
}
