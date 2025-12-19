export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    totalImpressions: null,
    totalClicks: null,
    totalCtr: null,
    totalCostPerClick: null,
    totalLeads: null,
    totalCostPerLead: null,
    totalSpend: null,
    campaigns: [],
    message: 'Serverless function - requires backend server for full functionality'
  });
}

