/**
 * Example Commands for PayedPOS Generic Command Framework
 * 
 * These examples show how to use the GenericCommand to execute
 * various read-only operations on the PayedPOS dashboard.
 * 
 * Each command is defined as a plain JavaScript object with:
 * - action: read-only action name
 * - parameters specific to the action
 * 
 * No need to modify source code - just create new command definitions!
 */

// Export all records from a specific page to Excel
const exportDashboardToExcel = {
  action: 'read:full-export',
  route: 'dashboard',
  title: 'Dashboard Export',
  summary: 'All records from dashboard',
  formats: ['excel'],
  paginate: true
};

// Extract table data without pagination
const extractCurrentPage = {
  action: 'read:extract-table',
  route: 'pos-terminals',
  selector: 'table',
  paginate: false
};

// Extract with pagination and generate snapshot
const extractWithSnapshot = {
  action: 'read:full-export',
  route: 'merchants',
  title: 'Merchants Export',
  summary: 'All merchant records',
  formats: ['snapshot'],
  paginate: true
};

// Search for specific merchant
const searchMerchant = {
  action: 'read:search',
  route: 'merchants',
  query: 'Example Merchant',
  fieldLabel: 'Merchant Name'
};

// Analyze extracted data
const analyzeTerminals = {
  action: 'read:analyze',
  route: 'pos-terminals',
  operation: 'countBy',
  field: 'Status'
};

// Generate word report with observations
const generateDetailedReport = {
  action: 'read:full-export',
  route: 'dashboard',
  title: 'Dashboard Detailed Report',
  summary: 'Complete dashboard data export',
  formats: ['word', 'excel', 'snapshot'],
  paginate: true,
  observations: [
    'Data extracted from live PayedPOS dashboard',
    'Includes all visible records at time of export',
    'Generated for reporting purposes only'
  ]
};

// Get top terminals by activity
const getTopTerminals = {
  action: 'read:analyze',
  route: 'pos-terminals',
  operation: 'topN',
  field: 'Activity Count',
  topN: 10
};

// Detect duplicates in dataset
const detectDuplicates = {
  action: 'read:analyze',
  operation: 'detectDuplicates',
  data: [] // Would be populated from extracted data
};

// Compare two snapshots
const compareSnapshots = {
  action: 'read:compare-snapshots',
  snapshotPath1: 'snapshots/snapshot-2026-07-14T19-17-24-991Z.json',
  snapshotPath2: 'snapshots/snapshot-2026-07-14T19-20-02-718Z.json',
  keyField: 'ID' // Unique field to match records
};

// Extract detail page information
const extractDetailPage = {
  action: 'read:extract-detail',
  route: 'dashboard',
  selector: '.detail-panel, .modal, [data-testid="detail"]'
};

// Group merchants by status
const groupByStatus = {
  action: 'read:analyze',
  route: 'merchants',
  operation: 'groupBy',
  field: 'Status'
};

// Sort terminals by name
const sortTerminals = {
  action: 'read:analyze',
  route: 'pos-terminals',
  operation: 'sort',
  field: 'Terminal Name'
};

module.exports = {
  exportDashboardToExcel,
  extractCurrentPage,
  extractWithSnapshot,
  searchMerchant,
  analyzeTerminals,
  generateDetailedReport,
  getTopTerminals,
  detectDuplicates,
  compareSnapshots,
  extractDetailPage,
  groupByStatus,
  sortTerminals
};
