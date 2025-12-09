const connectDB = require('../lib/mongodb');
const Website = require('../lib/models/Website');
const verifyToken = require('../lib/authMiddleware');

module.exports = async function handler(req, res) {
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

  try {
    await connectDB();

    if (req.method === 'GET') {
      // Get all websites
      const websites = await Website.find().populate('createdBy', 'username');
      return res.json(websites);
    }

    if (req.method === 'POST') {
      // Create new website
      const { name, url, riskLevel, isProtected } = req.body;

      const newWebsite = new Website({
        name,
        url,
        riskLevel,
        isProtected,
        createdBy: auth.user.id
      });

      const website = await newWebsite.save();
      return res.status(201).json(website);
    }

    return res.status(405).json({ msg: 'Method not allowed' });
  } catch (err) {
    console.error('Websites error:', err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
};
