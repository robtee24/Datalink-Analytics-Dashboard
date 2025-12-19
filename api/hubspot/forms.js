import { API_CONFIG } from '../_config.js';

export default async function handler(req, res) {
  try {
    const token = API_CONFIG.hubspot.privateAppToken;
    
    if (!token) {
      return res.status(200).json({
        forms: [],
        totalSubmissions: 0,
      });
    }

    // Get list of forms
    const formsResponse = await fetch(
      `${API_CONFIG.hubspot.baseUrl}/marketing/v3/forms`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!formsResponse.ok) {
      console.error('HubSpot forms error:', formsResponse.status);
      return res.status(200).json({
        forms: [],
        totalSubmissions: 0,
      });
    }

    const formsData = await formsResponse.json();
    const forms = (formsData.results || []).map(form => ({
      id: form.id,
      name: form.name,
      submissionCount: 0, // Would need separate API call per form
    }));

    res.status(200).json({
      forms,
      totalSubmissions: forms.length,
    });
  } catch (error) {
    console.error('HubSpot Forms error:', error);
    res.status(200).json({
      forms: [],
      totalSubmissions: 0,
    });
  }
}
