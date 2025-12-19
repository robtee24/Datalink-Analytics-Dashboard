export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    impressions: null,
    clicks: null,
    calls: null,
    reviews: null,
    locations: [],
    message: 'Serverless function - requires backend server for full functionality'
  });
}

