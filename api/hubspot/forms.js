import { API_CONFIG } from '../_config.js';

export default async function handler(req, res) {
  try {
    const token = API_CONFIG.hubspot.privateAppToken;
    const { startDate, endDate } = req.query;
    
    if (!token) {
      return res.status(200).json({
        results: [],
        totalSubmissions: null,
        submissionsByPage: [],
      });
    }

    // Convert dates to timestamps for filtering
    const startTimestamp = startDate ? new Date(startDate).getTime() : null;
    const endTimestamp = endDate ? new Date(endDate + 'T23:59:59').getTime() : null;

    // Get list of forms first
    const formsResponse = await fetch(
      `${API_CONFIG.hubspot.baseUrl}/marketing/v3/forms?limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!formsResponse.ok) {
      const errorText = await formsResponse.text();
      console.error('HubSpot forms list error:', formsResponse.status, errorText);
      return res.status(200).json({
        results: [],
        totalSubmissions: null,
        submissionsByPage: [],
        error: `Failed to fetch forms: ${formsResponse.status}`,
      });
    }

    const formsData = await formsResponse.json();
    const forms = formsData.results || [];
    
    // Fetch submissions for each form
    let allSubmissions = [];
    const submissionsByForm = {};

    for (const form of forms) {
      try {
        // Use the form submissions API endpoint
        const submissionsUrl = `${API_CONFIG.hubspot.baseUrl}/form-integrations/v1/submissions/forms/${form.id}?limit=50`;
        
        const submissionsResponse = await fetch(submissionsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          const submissions = submissionsData.results || [];
          
          // Filter by date range if provided
          const filteredSubmissions = submissions.filter((submission) => {
            const submittedAt = submission.submittedAt;
            if (!submittedAt) return true;
            if (startTimestamp && submittedAt < startTimestamp) return false;
            if (endTimestamp && submittedAt > endTimestamp) return false;
            return true;
          });

          // Track submissions by form/page
          if (filteredSubmissions.length > 0) {
            const formName = form.name || form.id;
            submissionsByForm[formName] = (submissionsByForm[formName] || 0) + filteredSubmissions.length;
            
            allSubmissions = allSubmissions.concat(
              filteredSubmissions.map((sub) => ({
                ...sub,
                formName: form.name,
                formId: form.id,
                pageUrl: sub.pageUrl || form.name,
              }))
            );
          }
        }
      } catch (formError) {
        console.error(`Error fetching submissions for form ${form.id}:`, formError);
      }
    }

    // Convert submissionsByForm to array format
    const submissionsByPage = Object.entries(submissionsByForm)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      results: allSubmissions,
      totalSubmissions: allSubmissions.length,
      submissionsByPage,
    });
  } catch (error) {
    console.error('HubSpot Forms error:', error);
    return res.status(200).json({
      results: [],
      totalSubmissions: null,
      submissionsByPage: [],
      error: error.message,
    });
  }
}
