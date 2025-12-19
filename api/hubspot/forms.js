export default async function handler(req, res) {
  res.status(200).json({
    forms: [],
    totalSubmissions: 0,
    message: 'Serverless function - requires backend server for full functionality'
  });
}

