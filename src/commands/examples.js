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
 *
 * NOTE ON ROUTES: only dashboard, pos-terminals-assigned, transactions,
 * and locations are confirmed real routes (see
 * src/browser/navigation/router.js). A 'merchants' route was previously
 * assumed here but was never actually confirmed against the real site;
 * examples that used it now point at 'transactions' instead so they at
 * least target a real, confirmed page - but variable/comment names below
 * still say "merchant" since that was each example's original intent.
 * Retarget these once the real merchant-data route (if any) is confirmed.
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
  route: 'pos-terminals-assigned',
  selector: 'table',
  paginate: false
};

// Extract with pagination and generate snapshot
const extractWithSnapshot = {
  action: 'read:full-export',
  route: 'transactions',
  title: 'Merchants Export',
  summary: 'All merchant records',
  formats: ['snapshot'],
  paginate: true
};

// Search for specific merchant
const searchMerchant = {
  action: 'read:search',
  route: 'transactions',
  query: 'Example Merchant',
  fieldLabel: 'Merchant Name'
};

// Analyze extracted data
const analyzeTerminals = {
  action: 'read:analyze',
  route: 'pos-terminals-assigned',
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
  route: 'pos-terminals-assigned',
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
  route: 'transactions',
  operation: 'groupBy',
  field: 'Status'
};

// Sort terminals by name
const sortTerminals = {
  action: 'read:analyze',
  route: 'pos-terminals-assigned',
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
