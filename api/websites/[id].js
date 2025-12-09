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

  const { id } = req.query;

  try {
    await connectDB();

    if (req.method === 'GET') {
      // Get website by ID
      const website = await Website.findById(id).populate('createdBy', 'username');
      if (!website) {
        return res.status(404).json({ msg: 'Website not found' });
      }
      return res.json(website);
    }

    if (req.method === 'PUT') {
      // Update website
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

      website = await Website.findByIdAndUpdate(
        id,
        { $set: websiteFields },
        { new: true }
      );

      return res.json(website);
    }

    if (req.method === 'DELETE') {
      // Delete website
      const website = await Website.findById(id);
      if (!website) {
        return res.status(404).json({ msg: 'Website not found' });
      }

      await Website.findByIdAndDelete(id);
      return res.json({ msg: 'Website removed' });
    }

    return res.status(405).json({ msg: 'Method not allowed' });
  } catch (err) {
    console.error('Website error:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Website not found' });
    }
    return res.status(500).json({ msg: 'Server error' });
  }
};
