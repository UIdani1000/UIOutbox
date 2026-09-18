// =============================================================================
// CSV Parser & Column Mapping Utility
// Robust parsing with automatic header detection and domain normalization
// =============================================================================

import { CRMService } from '../services/crmService';
import { SourcedLeadPayload } from '../services/interfaces/leadSource';
import { EmailStatus } from '../types';

export interface ColumnMapping {
  company_name: string;
  website?: string;
  domain?: string;
  industry?: string;
  country?: string;
  city?: string;
  description?: string;
  contact_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  job_title?: string;
  linkedin_url?: string;
}

export interface ParsedCsvData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  detectedMapping: Partial<ColumnMapping>;
}

/**
 * Parses raw CSV string into headers and records, respecting quoted fields.
 */
export function parseCsvString(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [] };
  }

  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Intelligent column header auto-detection
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    const lower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (const cand of candidates) {
      const idx = lower.findIndex(h => h === cand || h.includes(cand));
      if (idx !== -1) return headers[idx];
    }
    return '';
  };

  return {
    company_name: findMatch(['companyname', 'company', 'organization', 'account', 'business']) || headers[0] || '',
    website: findMatch(['website', 'companywebsite', 'url', 'webpage', 'web']),
    domain: findMatch(['domain', 'companydomain']),
    industry: findMatch(['industry', 'niche', 'vertical', 'category', 'sector']),
    country: findMatch(['country', 'location', 'hqcountry', 'region']),
    city: findMatch(['city', 'hqcity']),
    description: findMatch(['description', 'about', 'summary', 'notes', 'overview']),
    contact_name: findMatch(['contactname', 'fullname', 'name', 'personname', 'decisionmaker']),
    first_name: findMatch(['firstname', 'first']),
    last_name: findMatch(['lastname', 'last']),
    email: findMatch(['email', 'contactemail', 'workemail', 'personemail', 'emailaddress']),
    job_title: findMatch(['jobtitle', 'title', 'role', 'position', 'designation']),
    linkedin_url: findMatch(['linkedin', 'linkedinurl', 'personlinkedin', 'profile']),
  };
}

/**
 * Convert parsed CSV rows into normalized SourcedLeadPayload array
 */
export function convertRowsToPayloads(
  rows: Record<string, string>[],
  mapping: Partial<ColumnMapping>,
  defaultNiche: string = 'Design / Creative'
): SourcedLeadPayload[] {
  return rows.map((row) => {
    const companyName = (mapping.company_name ? row[mapping.company_name] : '')?.trim() || '';
    const website = (mapping.website ? row[mapping.website] : '')?.trim() || '';
    const rawDomain = (mapping.domain ? row[mapping.domain] : '')?.trim() || '';

    const domain = rawDomain 
      ? CRMService.cleanDomain(rawDomain) 
      : website 
      ? CRMService.cleanDomain(website) 
      : CRMService.cleanDomain(companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com');

    const formattedWebsite = website 
      ? (website.startsWith('http') ? website : `https://${website}`) 
      : (domain ? `https://${domain}` : undefined);

    let fullName = (mapping.contact_name ? row[mapping.contact_name] : '')?.trim() || '';
    let firstName = (mapping.first_name ? row[mapping.first_name] : '')?.trim() || '';
    let lastName = (mapping.last_name ? row[mapping.last_name] : '')?.trim() || '';

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (fullName && !firstName && !lastName) {
      const parts = fullName.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const email = (mapping.email ? row[mapping.email] : '')?.trim().toLowerCase() || '';
    const jobTitle = (mapping.job_title ? row[mapping.job_title] : '')?.trim() || '';
    const linkedinUrl = (mapping.linkedin_url ? row[mapping.linkedin_url] : '')?.trim() || '';

    const hasContact = Boolean(fullName || email || jobTitle);

    const emailStatus: EmailStatus = 'unverified';

    return {
      company: {
        company_name: companyName || domain,
        website: formattedWebsite,
        domain: domain,
        industry: (mapping.industry && row[mapping.industry] ? row[mapping.industry].trim() : '') || defaultNiche,
        country: (mapping.country && row[mapping.country] ? row[mapping.country].trim() : '') || 'Worldwide',
        city: (mapping.city && row[mapping.city] ? row[mapping.city].trim() : '') || undefined,
        description: (mapping.description && row[mapping.description] ? row[mapping.description].trim() : '') || undefined,
        source: 'csv_import',
        source_reference: 'CSV Ingestion Pipeline',
        qualification_status: 'unqualified',
        contact_status: 'not_contacted',
      },
      contact: hasContact ? {
        full_name: fullName || 'Decision Maker',
        first_name: firstName || (fullName ? fullName.split(' ')[0] : 'Decision'),
        last_name: lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : 'Maker'),
        job_title: jobTitle || 'Creative Director',
        email: email || undefined,
        email_status: emailStatus,
        linkedin_url: linkedinUrl || undefined,
        is_primary_contact: true,
      } : undefined,
      sourceReference: 'CSV Ingestion',
    };
  }).filter(p => p.company.company_name && p.company.domain);
}
