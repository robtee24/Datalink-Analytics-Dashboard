export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    uniqueVisitors: null,
    bounceRate: null,
    timeOnPage: null,
    totalLeadSubmissions: null,
    leadSubmissionsByPage: [],
    uniqueVisitorsHistory: [],
    message: 'Serverless function - requires backend server for full functionality'
  });
}

