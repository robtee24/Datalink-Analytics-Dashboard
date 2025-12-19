export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface HubSpotMetrics {
  uniqueVisitors: number | null;
  bounceRate: number | null;
  timeOnPage: number | null;
  totalLeadSubmissions: number | null;
  leadSubmissionsByPage: Array<{ page: string; count: number }>;
  uniqueVisitorsHistory: Array<{ date: string; value: number }>;
}

export interface GoogleSearchConsoleMetrics {
  pagesIndexed: number | null;
  impressions: number | null;
  clicks: number | null;
  keywords: Array<{
    keyword: string;
    position: number | null;
    impressions: number | null;
    clicks: number | null;
    ctr: number | null;
  }>;
  impressionsHistory: Array<{ date: string; value: number }>;
  clicksHistory: Array<{ date: string; value: number }>;
  pagesIndexedHistory: Array<{ date: string; value: number }>;
}

export interface GoogleMyBusinessLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  verified: boolean;
  impressions: number | null;
  clicks: number | null;
  calls: number | null;
  reviews: number | null;
}

export interface GoogleMyBusinessMetrics {
  impressions: number | null;
  clicks: number | null;
  calls: number | null;
  reviews: number | null;
  locations: GoogleMyBusinessLocation[];
}

export interface Campaign {
  id: string;
  name: string;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  costPerClick: number | null;
  totalLeads: number | null;
  costPerLead: number | null;
  totalSpend: number | null;
}

export interface AdsMetrics {
  totalImpressions: number | null;
  totalClicks: number | null;
  totalCtr: number | null;
  totalCostPerClick: number | null;
  totalLeads: number | null;
  totalCostPerLead: number | null;
  totalSpend: number | null;
  campaigns: Campaign[];
}

