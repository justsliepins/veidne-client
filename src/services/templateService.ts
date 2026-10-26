import { API_BASE_URL } from '@/config/constants';

export interface TemplateItem {
  id: number; slug: string; name: string; description: string; category: string; fields?: string[];
}

export const STATIC_TEMPLATES: TemplateItem[] = [
  { id: 1, slug: 'acceptance-delivery-act', name: 'Acceptance & Delivery Act', description: 'Formal record of goods or services accepted upon delivery', category: 'Business', fields: ['CITY', 'DATE', 'CONTRACT_TYPE', 'CONTRACT_NUMBER', 'CONTRACT_DATE', 'SUPPLIER_COMPANY', 'SUPPLIER_NAME', 'CLIENT_COMPANY', 'CLIENT_NAME', 'DESCRIPTION', 'QUANTITY', 'UNIT', 'UNIT_PRICE', 'TOTAL_PRICE', 'SUPPLIER_SIGNATURE', 'CLIENT_SIGNATURE'] },
  { id: 2, slug: 'application', name: 'Application', description: 'General-purpose application form with personal details', category: 'Employment', fields: ['INSTITUTION_NAME', 'RECIPIENT_TITLE', 'RECIPIENT_NAME', 'APPLICANT_NAME', 'APPLICANT_ID', 'APPLICANT_ADDRESS', 'APPLICANT_PHONE', 'APPLICANT_EMAIL', 'SUBJECT', 'BODY_TEXT', 'DATE', 'SIGNATURE'] },
  { id: 3, slug: 'complaint-letter', name: 'Complaint Letter', description: 'Formal complaint letter with issue details and resolution request', category: 'Business', fields: ['SENDER_NAME', 'SENDER_ADDRESS', 'SENDER_PHONE', 'SENDER_EMAIL', 'DATE', 'RECIPIENT_NAME', 'RECIPIENT_COMPANY', 'RECIPIENT_ADDRESS', 'SUBJECT', 'PRODUCT_SERVICE', 'PURCHASE_DATE', 'ISSUE_DESCRIPTION', 'RESOLUTION_REQUEST', 'DEADLINE_DATE', 'SIGNATURE'] },
  { id: 4, slug: 'contract-amendment', name: 'Contract Amendment', description: 'Amendment to modify terms of an existing contract', category: 'Legal', fields: ['AMENDMENT_NUMBER', 'DATE', 'ORIGINAL_CONTRACT_DATE', 'ORIGINAL_CONTRACT_TITLE', 'PARTY_A_NAME', 'PARTY_A_ID', 'PARTY_A_ADDRESS', 'PARTY_B_NAME', 'PARTY_B_ID', 'PARTY_B_ADDRESS', 'CLAUSE_NUMBER', 'ORIGINAL_TEXT', 'AMENDED_TEXT', 'EFFECTIVE_DATE', 'PARTY_A_SIGNATURE', 'PARTY_B_SIGNATURE'] },
  { id: 5, slug: 'contractor-agreement', name: 'Contractor Agreement', description: 'Agreement between a company and an independent contractor', category: 'Business', fields: ['DATE', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_REP_NAME', 'COMPANY_REP_TITLE', 'CONTRACTOR_NAME', 'CONTRACTOR_ADDRESS', 'CONTRACTOR_ID', 'SCOPE_OF_WORK', 'START_DATE', 'END_DATE', 'PAYMENT_AMOUNT', 'PAYMENT_SCHEDULE', 'COMPANY_SIGNATURE', 'CONTRACTOR_SIGNATURE'] },
  { id: 6, slug: 'cover-letter', name: 'Cover Letter', description: 'Professional cover letter for job applications', category: 'Employment', fields: ['YOUR_NAME', 'YOUR_ADDRESS', 'YOUR_PHONE', 'YOUR_EMAIL', 'DATE', 'HIRING_MANAGER_NAME', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'JOB_TITLE', 'BODY_PARAGRAPH_1', 'BODY_PARAGRAPH_2', 'BODY_PARAGRAPH_3', 'SIGNATURE'] },
  { id: 7, slug: 'cv', name: 'CV', description: 'Curriculum vitae with work experience and education', category: 'Employment', fields: ['FULL_NAME', 'ADDRESS', 'PHONE', 'EMAIL', 'LINKEDIN', 'PROFESSIONAL_SUMMARY', 'JOB_TITLE_1', 'COMPANY_1', 'PERIOD_1', 'RESPONSIBILITIES_1', 'JOB_TITLE_2', 'COMPANY_2', 'PERIOD_2', 'RESPONSIBILITIES_2', 'DEGREE', 'UNIVERSITY', 'GRADUATION_YEAR', 'SKILLS', 'LANGUAGES', 'CERTIFICATIONS'] },
  { id: 8, slug: 'employment-contract', name: 'Employment Contract', description: 'Employment agreement with job terms and compensation', category: 'Employment', fields: ['DATE', 'EMPLOYER_NAME', 'EMPLOYER_ADDRESS', 'EMPLOYER_REP_NAME', 'EMPLOYER_REP_TITLE', 'EMPLOYEE_NAME', 'EMPLOYEE_ID', 'EMPLOYEE_ADDRESS', 'JOB_TITLE', 'DEPARTMENT', 'START_DATE', 'SALARY', 'PAYMENT_FREQUENCY', 'WORK_HOURS', 'VACATION_DAYS', 'PROBATION_PERIOD', 'EMPLOYER_SIGNATURE', 'EMPLOYEE_SIGNATURE'] },
  { id: 9, slug: 'gift-agreement', name: 'Gift Agreement', description: 'Agreement to formalize a gift between parties', category: 'Legal', fields: ['DATE', 'DONOR_NAME', 'DONOR_ID', 'DONOR_ADDRESS', 'RECIPIENT_NAME', 'RECIPIENT_ID', 'RECIPIENT_ADDRESS', 'GIFT_DESCRIPTION', 'GIFT_VALUE', 'TRANSFER_DATE', 'DONOR_SIGNATURE', 'RECIPIENT_SIGNATURE', 'WITNESS_NAME', 'WITNESS_SIGNATURE'] },
  { id: 10, slug: 'gratuitous-use-agreement', name: 'Gratuitous Use Agreement', description: 'Agreement for free use of property or assets', category: 'Legal', fields: ['DATE', 'OWNER_NAME', 'OWNER_ID', 'OWNER_ADDRESS', 'USER_NAME', 'USER_ID', 'USER_ADDRESS', 'PROPERTY_DESCRIPTION', 'PROPERTY_ADDRESS', 'PURPOSE', 'START_DATE', 'END_DATE', 'OWNER_SIGNATURE', 'USER_SIGNATURE'] },
  { id: 11, slug: 'guarantee-letter', name: 'Guarantee Letter', description: 'Letter guaranteeing obligations or payment', category: 'Legal', fields: ['DATE', 'GUARANTOR_NAME', 'GUARANTOR_ID', 'GUARANTOR_ADDRESS', 'BENEFICIARY_NAME', 'BENEFICIARY_ADDRESS', 'DEBTOR_NAME', 'OBLIGATION_DESCRIPTION', 'GUARANTEE_AMOUNT', 'GUARANTEE_PERIOD', 'EXPIRY_DATE', 'GUARANTOR_SIGNATURE'] },
  { id: 12, slug: 'invoice', name: 'Invoice', description: 'Professional invoice with client details and line items', category: 'Business', fields: ['INVOICE_NUMBER', 'INVOICE_DATE', 'DUE_DATE', 'SELLER_NAME', 'SELLER_ADDRESS', 'SELLER_TAX_ID', 'SELLER_BANK', 'SELLER_ACCOUNT', 'BUYER_NAME', 'BUYER_ADDRESS', 'BUYER_TAX_ID', 'ITEM_DESCRIPTION', 'QUANTITY', 'UNIT_PRICE', 'TOTAL', 'SUBTOTAL', 'TAX_RATE', 'TAX_AMOUNT', 'GRAND_TOTAL'] },
  { id: 13, slug: 'job-description', name: 'Job Description', description: 'Job posting with role responsibilities and requirements', category: 'Employment', fields: ['JOB_TITLE', 'DEPARTMENT', 'REPORTS_TO', 'LOCATION', 'EMPLOYMENT_TYPE', 'COMPANY_NAME', 'COMPANY_DESCRIPTION', 'ROLE_SUMMARY', 'RESPONSIBILITIES', 'REQUIREMENTS', 'PREFERRED_QUALIFICATIONS', 'SALARY_RANGE', 'BENEFITS', 'APPLICATION_DEADLINE', 'CONTACT_EMAIL'] },
  { id: 14, slug: 'last-will', name: 'Last Will', description: 'Last will and testament with estate distribution', category: 'Legal', fields: ['TESTATOR_NAME', 'TESTATOR_ID', 'TESTATOR_ADDRESS', 'DATE', 'EXECUTOR_NAME', 'EXECUTOR_ADDRESS', 'BENEFICIARY_1_NAME', 'BENEFICIARY_1_SHARE', 'BENEFICIARY_2_NAME', 'BENEFICIARY_2_SHARE', 'SPECIFIC_BEQUEST_ITEM', 'SPECIFIC_BEQUEST_RECIPIENT', 'GUARDIAN_NAME', 'WITNESS_1_NAME', 'WITNESS_1_SIGNATURE', 'WITNESS_2_NAME', 'WITNESS_2_SIGNATURE', 'TESTATOR_SIGNATURE'] },
  { id: 15, slug: 'lease-agreement', name: 'Lease Agreement', description: 'Property lease agreement with terms and conditions', category: 'Real Estate', fields: ['DATE', 'LANDLORD_NAME', 'LANDLORD_ID', 'LANDLORD_ADDRESS', 'TENANT_NAME', 'TENANT_ID', 'TENANT_ADDRESS', 'PROPERTY_ADDRESS', 'PROPERTY_TYPE', 'LEASE_START', 'LEASE_END', 'MONTHLY_RENT', 'DEPOSIT', 'PAYMENT_DAY', 'LANDLORD_SIGNATURE', 'TENANT_SIGNATURE'] },
  { id: 16, slug: 'loan-agreement', name: 'Loan Agreement', description: 'Loan terms between lender and borrower', category: 'Legal', fields: ['DATE', 'LENDER_NAME', 'LENDER_ID', 'LENDER_ADDRESS', 'BORROWER_NAME', 'BORROWER_ID', 'BORROWER_ADDRESS', 'LOAN_AMOUNT', 'INTEREST_RATE', 'REPAYMENT_PERIOD', 'MONTHLY_PAYMENT', 'FIRST_PAYMENT_DATE', 'LAST_PAYMENT_DATE', 'LATE_FEE', 'LENDER_SIGNATURE', 'BORROWER_SIGNATURE'] },
  { id: 17, slug: 'meeting-minutes', name: 'Meeting Minutes', description: 'Record of meeting discussions and decisions', category: 'Business', fields: ['MEETING_TITLE', 'DATE', 'TIME', 'LOCATION', 'CHAIRPERSON', 'SECRETARY', 'ATTENDEES', 'ABSENT', 'AGENDA_ITEM_1', 'DISCUSSION_1', 'DECISION_1', 'AGENDA_ITEM_2', 'DISCUSSION_2', 'DECISION_2', 'ACTION_ITEMS', 'NEXT_MEETING_DATE', 'CHAIRPERSON_SIGNATURE', 'SECRETARY_SIGNATURE'] },
  { id: 18, slug: 'nda', name: 'NDA', description: 'Non-disclosure agreement to protect confidential information', category: 'Legal', fields: ['DATE', 'DISCLOSER_NAME', 'DISCLOSER_ADDRESS', 'RECIPIENT_NAME', 'RECIPIENT_ADDRESS', 'PURPOSE', 'CONFIDENTIAL_INFO_DESCRIPTION', 'TERM_YEARS', 'EFFECTIVE_DATE', 'EXPIRY_DATE', 'JURISDICTION', 'DISCLOSER_SIGNATURE', 'RECIPIENT_SIGNATURE'] },
  { id: 19, slug: 'partnership-agreement', name: 'Partnership Agreement', description: 'Agreement establishing a business partnership', category: 'Business', fields: ['DATE', 'PARTNERSHIP_NAME', 'BUSINESS_PURPOSE', 'PARTNER_A_NAME', 'PARTNER_A_ID', 'PARTNER_A_ADDRESS', 'PARTNER_A_CONTRIBUTION', 'PARTNER_A_SHARE', 'PARTNER_B_NAME', 'PARTNER_B_ID', 'PARTNER_B_ADDRESS', 'PARTNER_B_CONTRIBUTION', 'PARTNER_B_SHARE', 'START_DATE', 'PARTNER_A_SIGNATURE', 'PARTNER_B_SIGNATURE'] },
  { id: 20, slug: 'power-of-attorney', name: 'Power of Attorney', description: 'Authorization for someone to act on your behalf', category: 'Legal', fields: ['DATE', 'PRINCIPAL_NAME', 'PRINCIPAL_ID', 'PRINCIPAL_ADDRESS', 'AGENT_NAME', 'AGENT_ID', 'AGENT_ADDRESS', 'POWERS_GRANTED', 'EFFECTIVE_DATE', 'EXPIRY_DATE', 'PRINCIPAL_SIGNATURE', 'WITNESS_1_NAME', 'WITNESS_1_SIGNATURE', 'WITNESS_2_NAME', 'WITNESS_2_SIGNATURE', 'NOTARY_NAME', 'NOTARY_SIGNATURE'] },
  { id: 21, slug: 'purchase-agreement', name: 'Purchase Agreement', description: 'Agreement for the sale and purchase of goods or property', category: 'Business', fields: ['DATE', 'SELLER_NAME', 'SELLER_ID', 'SELLER_ADDRESS', 'BUYER_NAME', 'BUYER_ID', 'BUYER_ADDRESS', 'ITEM_DESCRIPTION', 'QUANTITY', 'UNIT_PRICE', 'TOTAL_PRICE', 'DELIVERY_DATE', 'DELIVERY_ADDRESS', 'PAYMENT_TERMS', 'SELLER_SIGNATURE', 'BUYER_SIGNATURE'] },
  { id: 22, slug: 'residential-lease', name: 'Residential Lease', description: 'Lease agreement for residential property rental', category: 'Real Estate', fields: ['DATE', 'LANDLORD_NAME', 'LANDLORD_ID', 'LANDLORD_ADDRESS', 'LANDLORD_PHONE', 'TENANT_NAME', 'TENANT_ID', 'TENANT_ADDRESS', 'TENANT_PHONE', 'PROPERTY_ADDRESS', 'APARTMENT_NUMBER', 'LEASE_START', 'LEASE_END', 'MONTHLY_RENT', 'DEPOSIT', 'PAYMENT_DAY', 'UTILITIES_INCLUDED', 'PET_POLICY', 'LANDLORD_SIGNATURE', 'TENANT_SIGNATURE'] },
  { id: 23, slug: 'resignation-letter', name: 'Resignation Letter', description: 'Formal letter of resignation from a position', category: 'Employment', fields: ['YOUR_NAME', 'YOUR_ADDRESS', 'YOUR_PHONE', 'YOUR_EMAIL', 'DATE', 'MANAGER_NAME', 'MANAGER_TITLE', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'JOB_TITLE', 'LAST_WORKING_DAY', 'REASON', 'SIGNATURE'] },
  { id: 24, slug: 'royalty-agreement', name: 'Royalty Agreement', description: 'Agreement for royalty payments on intellectual property', category: 'Legal', fields: ['DATE', 'LICENSOR_NAME', 'LICENSOR_ID', 'LICENSOR_ADDRESS', 'LICENSEE_NAME', 'LICENSEE_ID', 'LICENSEE_ADDRESS', 'IP_DESCRIPTION', 'ROYALTY_RATE', 'PAYMENT_FREQUENCY', 'MINIMUM_ROYALTY', 'EFFECTIVE_DATE', 'TERM_YEARS', 'TERRITORY', 'LICENSOR_SIGNATURE', 'LICENSEE_SIGNATURE'] },
  { id: 25, slug: 'service-agreement', name: 'Service Agreement', description: 'Agreement for professional services between parties', category: 'Business', fields: ['DATE', 'PROVIDER_NAME', 'PROVIDER_ID', 'PROVIDER_ADDRESS', 'CLIENT_NAME', 'CLIENT_ID', 'CLIENT_ADDRESS', 'SERVICE_DESCRIPTION', 'DELIVERABLES', 'START_DATE', 'END_DATE', 'FEE', 'PAYMENT_TERMS', 'PROVIDER_SIGNATURE', 'CLIENT_SIGNATURE'] },
];

export async function getTemplates(): Promise<TemplateItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/templates`, { credentials: 'include' });
    if (!res.ok) return STATIC_TEMPLATES;
    const data = await res.json();
    if (data.templates?.length) {
      return data.templates.map((t: any) => {
        const staticMatch = STATIC_TEMPLATES.find(s => s.slug === t.slug);
        return { ...t, fields: t.fields || staticMatch?.fields || [] };
      });
    }
    return STATIC_TEMPLATES;
  } catch {
    return STATIC_TEMPLATES;
  }
}

export async function downloadTemplate(slug: string): Promise<ArrayBuffer> {
  try {
    const res = await fetch(`${API_BASE_URL}/templates/${slug}/download`, { credentials: 'include' });
    if (res.ok) return res.arrayBuffer();
  } catch { /* fall through to static file */ }
  const res = await fetch(`/templates/${slug}.docx`);
  if (!res.ok) throw new Error(`Failed to download template: ${slug}`);
  return res.arrayBuffer();
}
