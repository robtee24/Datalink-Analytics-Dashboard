export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Datalink Analytics API is running',
    timestamp: new Date().toISOString()
  });
}

