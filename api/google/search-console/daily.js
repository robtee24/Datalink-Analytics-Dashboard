export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return empty data - full implementation requires persistent token storage
  res.status(200).json({
    dailyData: [],
    message: 'Serverless function - requires backend server for full functionality'
  });
}

