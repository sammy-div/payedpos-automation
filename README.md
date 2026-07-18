# PayedPOS Generic Read-Only Operations Assistant

A production-ready, modular automation platform for the PayedPOS dashboard that adheres to strict read-only principles.

**This platform is 100% READ-ONLY and will never modify PayedPOS data.**

## Web Dashboard (Next.js, deployed on Vercel)

`app/`, `components/`, and `lib/` at the repo root are a Next.js (App Router + TypeScript) operations dashboard: Dashboard, Automations, Reports, Snapshots, Logs, Configuration, and Health pages.

It's deliberately decoupled from the Playwright automation:

- **This Next.js app** — the UI. Deploys to Vercel. Renders every page dynamically (no stale build-time data) so it always reflects live state once connected.
- **The actual automation** — Playwright never runs on Vercel itself (serverless functions aren't built for a persistent headless browser). Two ways to run it, in priority order:
  1. **GitHub Actions** (primary) — a workflow that runs on demand or on a schedule, triggered from the dashboard's "Run" button or the GitHub REST API, storing results in Supabase. See **[docs/github-actions-automation.md](docs/github-actions-automation.md)** for the full architecture, required secrets, deployment steps, and troubleshooting.
  2. **`src/server.js`** (fallback) — the original always-on Express server, for anyone who'd rather run a persistent host (Railway, Fly.io, a VPS, Docker) instead of GitHub Actions. Set `AUTOMATION_API_URL` (see `.env.example`) to point the dashboard at one.

With neither configured, every page runs on realistic demo data (clearly marked with a "DEMO DATA" badge) so the UI is fully explorable with zero setup.

```bash
npm install
npm run dev              # Next.js dashboard, http://localhost:3000
npx tsx automation/index.ts      # Run the automation locally (see docs/github-actions-automation.md)
npm run automation:server        # Or: the always-on server, separately
```

## Overview

This project is a **reusable, platform-wide automation framework** designed as a long-term foundation for PayedPOS operations. Instead of one-time scrapers, we built:

- A **generic, extensible framework** that works with any PayedPOS dashboard without hardcoded assumptions
- **Dynamic discovery** of fields, pages, and operations from the live dashboard
- **Multiple export formats** (Excel, Word, JSON snapshots)
- **Powerful analytics** (grouping, filtering, sorting, statistics)
- **Snapshot comparison** for change detection
- **Strict read-only enforcement** via a safety layer
- **Professional logging** with performance metrics
- **Command framework** for flexible operation definition

## Architecture Overview

The platform follows a **modular, layered architecture** with clear separation of concerns:

```
src/
├── browser/                    # Browser and page interaction
│   ├── browser-manager.js      # Launch, configure, manage browser lifecycle
│   ├── auth/
│   │   └── auth-manager.js     # Login, session management, state persistence
│   ├── navigation/
│   │   └── router.js           # Route-based navigation (generic, not hardcoded)
│   ├── extractors/
│   │   ├── table-extractor.js  # Auto-detect and extract table data
│   │   └── detail-extractor.js # Extract detail pages and modals
│   ├── pagination/
│   │   └── pagination-engine.js # Detect and handle pagination (Next/Previous or numbered)
│   └── search/
│       └── search-engine.js    # Auto-detect search fields, search and filter
│
├── security/
│   └── safety-layer.js         # Enforce read-only operations
│
├── analytics/
│   └── analytics-engine.js     # Generic data analysis (group, sort, stats, etc.)
│
├── snapshots/
│   ├── snapshot-manager.js     # Save timestamped JSON snapshots
│   └── snapshot-comparison.js  # Compare snapshots, detect changes
│
├── commands/
│   ├── generic-command.js      # Base command framework (all operations inherit this)
│   ├── examples.js             # Example command definitions
│   └── base-command.js         # Legacy base (kept for compatibility)
│
├── reports/
│   ├── excel/
│   │   └── report-generator.js # Generate professional .xlsx files
│   └── word/
│       └── report-generator.js # Generate professional .docx files
│
├── config/
│   └── env.js                  # Environment configuration
│
├── utils/
│   ├── logger.js               # Enhanced logging with performance metrics
│   ├── errors.js               # Custom error types
│   ├── retry.js                # Retry logic
│   └── file.js                 # File utilities
│
├── scripts/
│   ├── generic-command-runner.js # Execute example commands
│   └── (other scripts)
│
└── index.js                    # Main entry point
```

## Core Principles

### 1. **Strictly Read-Only**

The framework **never modifies PayedPOS platform data**:

✅ **Allowed:**
- Read, fetch, view, display data
- Navigate pages
- Search and filter
- Extract data
- Generate reports
- Compare snapshots

❌ **Forbidden:**
- Create, edit, update, or delete records
- Submit forms
- Approve/reject requests
- Change assignments
- Trigger workflows
- Click Save, Update, Delete, Approve, Reject buttons

Every command passes through the **SafetyLayer** which validates that operations are read-only.

### 2. **Generic and Dynamic**

No hardcoded assumptions:

- Routes are discovered, not hardcoded
- Search fields are auto-detected
- Table columns are extracted from headers
- Pagination is detected automatically
- Navigation adapts to the dashboard structure

### 3. **Modular and Extensible**

Each module is:

- **Reusable** - Used independently or combined
- **Well-tested** - Clear inputs and outputs
- **Documented** - Code comments and examples
- **Maintainable** - Single responsibility

### 4. **Production-Ready**

Built for reliability:

- Retry logic for network failures
- Comprehensive logging and metrics
- Graceful error handling
- Resource cleanup
- Type safety

## Module Documentation

### BrowserManager

Manages Playwright browser lifecycle:

```javascript
const browserManager = new BrowserManager();
const { browser, context, page } = await browserManager.launch();
// ... use page ...
await browserManager.close(browser, context);
```

**Configuration:**
- `PAYEDPOS_HEADLESS` - Run headless (default: true)
- `PAYEDPOS_VIEWPORT` - Viewport size (default: 1440x900)
- `PAYEDPOS_TIMEOUT` - Page timeout in ms (default: 30000)
- `PAYEDPOS_MAX_RETRIES` - Retry attempts (default: 2)

### AuthManager

Manages authentication and session state:

```javascript
const authManager = new AuthManager();
await authManager.ensureAuthenticated(page);
```

**Configuration:**
- `PAYEDPOS_BASE_URL` - Dashboard URL
- `PAYEDPOS_USERNAME` - Your username
- `PAYEDPOS_PASSWORD` - Your password
- `PAYEDPOS_STORAGE_STATE_PATH` - Auth cache location (default: `storage/auth-state.json`)

### NavigationRouter

Navigate to any dashboard page:

```javascript
const router = new NavigationRouter();
await router.navigate(page, 'dashboard');
await router.navigate(page, 'pos-terminals');
```

**Supported routes:**
- `dashboard` - Main dashboard
- `pos-terminals` - POS terminals
- `merchants` - Merchant records
- `assigned` - Assigned terminals
- `unassigned` - Unassigned terminals

Or navigate to any URL:

```javascript
await page.goto('https://payedpos.vercel.app/custom-page');
```

### TableExtractor

Auto-detect and extract table data:

```javascript
const extractor = new TableExtractor();
const { headers, rows } = await extractor.extract(page, 'table');
// rows = [ { column1: value, column2: value }, ... ]
```

Features:
- Auto-detects table structure
- Extracts headers from `<thead>` or first row
- Handles empty cells
- Returns structured JSON

### DetailExtractor

Extract structured data from detail/modal pages:

```javascript
const detailExtractor = new DetailExtractor();
const detail = await detailExtractor.extract(page, {
  selector: '.detail-panel',
  keyValueSelectors: [{ label: 'label', value: 'span' }]
});
// detail = { fields: { key: value }, tables: {}, lists: {} }
```

### SearchEngine

Auto-detect search fields and search:

```javascript
const searchEngine = new SearchEngine();

// Detect available search fields
const fields = await searchEngine.detectSearchFields(page);

// Perform search
const results = await searchEngine.search(page, 'merchant name', {
  fieldLabel: 'Merchant Name'
});
```

### PaginationEngine

Handle pagination automatically:

```javascript
const paginationEngine = new PaginationEngine();
const allRows = await paginationEngine.paginate(page, async () => {
  const { headers, rows } = await tableExtractor.extract(page);
  return { headers, rows };
});
```

Features:
- Detects Next/Previous buttons
- Detects numbered pagination
- Avoids duplicate extraction
- Stops at final page automatically

### AnalyticsEngine

Static methods for powerful data analysis:

```javascript
// Count records
AnalyticsEngine.count(data);

// Group by field
AnalyticsEngine.groupBy(data, 'Status');

// Sort
AnalyticsEngine.sort(data, 'Name', 'asc');

// Top N
AnalyticsEngine.topN(data, 'Revenue', 10, 'desc');

// Detect duplicates
AnalyticsEngine.detectDuplicates(data, ['ID']);

// Detect missing values
AnalyticsEngine.detectMissingValues(data);

// Filter with conditions
AnalyticsEngine.filterByConditions(data, [
  { field: 'Status', operator: 'equals', value: 'Active' }
]);

// Numeric statistics
AnalyticsEngine.numericStats(data, 'Amount');

// Compare two datasets
AnalyticsEngine.compare(data1, data2, 'ID');
```

### SnapshotManager

Save and manage data snapshots:

```javascript
const snapshotManager = new SnapshotManager();
const path = snapshotManager.save({
  title: 'Dashboard Export',
  rows: data,
  timestamp: new Date().toISOString()
});
```

**Configuration:**
- `PAYEDPOS_SNAPSHOT_DIR` - Where to save snapshots (default: `snapshots/`)

### SnapshotComparison

Compare snapshots and detect changes:

```javascript
const comparison = SnapshotComparison.compareFiles(
  'snapshots/snapshot1.json',
  'snapshots/snapshot2.json'
);
// comparison = {
//   added: { count, records },
//   removed: { count, records },
//   modified: { count, records, changes },
//   unchanged: { count }
// }
```

### SafetyLayer

Enforce read-only operations:

```javascript
// Validate an action
SafetyLayer.validateAction('read:extract-table');
// { isAllowed: true, reason: 'Action is read-only safe' }

// Validate a command
SafetyLayer.validateCommand(commandDef);
// { isValid: true, errors: [] }

// Enforce read-only on operation
SafetyLayer.enforceReadOnly('read:extract-table');

// Execute with enforcement
await SafetyLayer.executeReadOnly('read:extract-table', async () => {
  // Your operation here
});
```

### GenericCommand Framework

The **most powerful and flexible** way to execute operations:

```javascript
const command = new GenericCommand({
  browserManager,
  authManager,
  navigationRouter,
  paginationEngine,
  tableExtractor,
  detailExtractor,
  searchEngine,
  analyticsEngine,
  excelReportGenerator,
  wordReportGenerator,
  snapshotManager,
  snapshotComparison
});

// Execute any command
const result = await command.execute(commandDefinition);
```

### Available Actions

All actions are read-only and validated by SafetyLayer:

#### `read:full-export`
Export data with multiple formats:
```javascript
{
  action: 'read:full-export',
  route: 'dashboard',
  title: 'Dashboard Export',
  summary: 'Complete export',
  formats: ['excel', 'word', 'snapshot'],
  paginate: true
}
```

#### `read:extract-table`
Extract table data:
```javascript
{
  action: 'read:extract-table',
  route: 'pos-terminals',
  selector: 'table',
  paginate: true,
  maxPages: 5
}
```

#### `read:extract-detail`
Extract detail page:
```javascript
{
  action: 'read:extract-detail',
  route: 'dashboard',
  selector: '.detail-panel'
}
```

#### `read:search`
Search and extract results:
```javascript
{
  action: 'read:search',
  route: 'merchants',
  query: 'cafe',
  fieldLabel: 'Merchant Name'
}
```

#### `read:analyze`
Analyze data:
```javascript
{
  action: 'read:analyze',
  operation: 'countBy',
  field: 'Status',
  data: [...] // or route: 'dashboard'
}
```

Supported operations: `count`, `countBy`, `groupBy`, `sort`, `topN`, `detectDuplicates`, `detectMissingValues`, `summarize`, `numericStats`

#### `read:export-excel`
Export to Excel:
```javascript
{
  action: 'read:export-excel',
  route: 'dashboard',
  title: 'Export',
  summary: 'Dashboard data'
}
```

#### `read:export-word`
Export to Word:
```javascript
{
  action: 'read:export-word',
  route: 'dashboard',
  title: 'Report',
  summary: 'Dashboard data',
  observations: ['Note 1', 'Note 2']
}
```

#### `read:export-snapshot`
Export JSON snapshot:
```javascript
{
  action: 'read:export-snapshot',
  route: 'dashboard',
  title: 'Snapshot',
  summary: 'Data snapshot'
}
```

#### `read:compare-snapshots`
Compare two snapshots:
```javascript
{
  action: 'read:compare-snapshots',
  snapshotPath1: 'snapshots/snapshot1.json',
  snapshotPath2: 'snapshots/snapshot2.json',
  keyField: 'ID'
}
```

## Usage

### Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run default export
npm start

# Generate Playwright browser
npm run setup:playwright
```

### Environment Variables

Create a `.env` file:

```env
# Dashboard
PAYEDPOS_BASE_URL=https://payedpos.vercel.app
PAYEDPOS_USERNAME=your_username
PAYEDPOS_PASSWORD=your_password

# Browser
PAYEDPOS_HEADLESS=true
PAYEDPOS_VIEWPORT=1440,900
PAYEDPOS_TIMEOUT=30000
PAYEDPOS_MAX_RETRIES=2

# Storage
PAYEDPOS_STORAGE_STATE_PATH=storage/auth-state.json
PAYEDPOS_OUTPUT_DIR=output/
PAYEDPOS_SNAPSHOT_DIR=snapshots/
PAYEDPOS_LOG_DIR=logs/
```

### Running Examples

```bash
# Export dashboard to Excel
node src/scripts/generic-command-runner.js export

# Search and extract
node src/scripts/generic-command-runner.js search

# Analyze data
node src/scripts/generic-command-runner.js analyze

# Generate word report
node src/scripts/generic-command-runner.js report

# Compare snapshots
node src/scripts/generic-command-runner.js compare

# Show performance metrics
node src/scripts/generic-command-runner.js performance
```

### Programmatic Usage

```javascript
const GenericCommand = require('./src/commands/generic-command');
const BrowserManager = require('./src/browser/browser-manager');
// ... import other modules ...

const command = new GenericCommand({
  browserManager: new BrowserManager(),
  // ... other dependencies ...
});

const result = await command.execute({
  action: 'read:full-export',
  route: 'dashboard',
  formats: ['excel', 'snapshot']
});

console.log(result);
```

## Creating New Commands

You don't need to modify source code! Just create a new command definition:

```javascript
// In src/commands/examples.js or your own file
const myCustomCommand = {
  action: 'read:full-export',
  route: 'merchants',
  title: 'Merchant Report',
  summary: 'All merchants',
  formats: ['excel', 'word'],
  paginate: true,
  observations: [
    'Generated on ' + new Date().toLocaleDateString()
  ]
};

// Execute it
const command = new GenericCommand({ /* dependencies */ });
const result = await command.execute(myCustomCommand);
```

## Outputs

The framework generates organized outputs:

```
output/
├── report-2026-07-14T19-17-24-991Z.xlsx
├── report-2026-07-14T19-20-02-718Z.docx
snapshots/
├── snapshot-2026-07-14T19-17-24-991Z.json
├── snapshot-2026-07-14T19-20-02-718Z.json
logs/
├── automation.log
├── performance.log
└── security.log
```

## Logging

The logger provides comprehensive information:

```javascript
// Logs are automatically saved and printed with color-coding
logger.info('operation.start', { context });
logger.warn('operation.warning', { details });
logger.error('operation.error', { message });
logger.success('operation.complete', { result });

// Performance tracking
logger.startMetric('myOperation');
// ... do work ...
logger.endMetric('myOperation', { status: 'success' });

// Get summaries
const summary = logger.getSummary();
const perfMetrics = logger.getPerformanceSummary();
```

## Safety and Validation

The framework ensures read-only operations:

```javascript
// Any command is validated before execution
const validation = SafetyLayer.validateCommand(commandDef);
if (!validation.isValid) {
  console.log(validation.errors);
}

// Forbidden operations are rejected
SafetyLayer.enforceReadOnly('read:create-record'); // Throws error

// Get policy summary
console.log(SafetyLayer.getPolicySummary());
```

## Extending the Framework

### Add a New Extractor

1. Create `src/browser/extractors/my-extractor.js`:
```javascript
class MyExtractor {
  async extract(page, options) {
    // Your extraction logic
  }
}
module.exports = MyExtractor;
```

2. Pass to GenericCommand:
```javascript
new GenericCommand({
  myExtractor: new MyExtractor(),
  // ...
});
```

### Add a New Report Format

1. Create `src/reports/myformat/report-generator.js`:
```javascript
class MyReportGenerator {
  async generate({ title, summary, rows }) {
    // Your generation logic
  }
}
module.exports = MyReportGenerator;
```

2. Add action handler in GenericCommand:
```javascript
async actionExportMyFormat(page, commandDef) {
  // Your handler
}
```

### Add a New Action

1. Add handler method to GenericCommand:
```javascript
async actionMyNewAction(page, commandDef) {
  // Your action logic
}
```

2. Register in `getActionHandler()`:
```javascript
getActionHandler(action) {
  const handlers = {
    'read:my-new-action': this.actionMyNewAction,
    // ...
  };
}
```

3. Use it:
```javascript
await command.execute({
  action: 'read:my-new-action',
  // parameters
});
```

## Architecture Decisions

### Why Generic?

- **Scalability**: Works for any PayedPOS dashboard without changes
- **Maintainability**: Single source of truth for each operation
- **Extensibility**: Add new features without touching existing code
- **Reliability**: Tested patterns apply everywhere

### Why Modular?

- **Testability**: Each module can be tested independently
- **Reusability**: Use modules in any combination
- **Clarity**: Clear responsibilities and interfaces
- **Flexibility**: Replace modules with minimal changes

### Why Read-Only?

- **Safety**: Prevents accidental data modification
- **Compliance**: Audit trail shows no changes were made
- **Trust**: Platform operators know data is safe
- **Focus**: Framework is for reporting, not operations

## Performance Metrics

The framework tracks performance:

```javascript
const summary = logger.getPerformanceSummary();
// {
//   totalMetrics: 45,
//   metrics: {
//     'extraction': { count: 10, avg: 2341, min: 1000, max: 5000 },
//     'pagination': { count: 15, avg: 3421, ... },
//     ...
//   }
// }
```

## Troubleshooting

### Authentication fails
- Check credentials in `.env`
- Verify `PAYEDPOS_BASE_URL`
- Clear `storage/auth-state.json` and try again

### Tables not extracted
- Check table selector (default: `table`)
- Verify page loaded fully
- Check browser logs for errors

### Pagination not working
- Verify pagination buttons exist
- Check page load state
- May need custom pagination configuration

### Reports not generating
- Ensure data was extracted
- Check file permissions in `output/` directory
- Review logs for specific errors

## Best Practices

1. **Define commands clearly** - Include title, summary, observations
2. **Use pagination** - Ensure you get all data across pages
3. **Validate snapshots** - Review generated data before relying on it
4. **Monitor logs** - Watch automation.log and performance.log
5. **Test with small datasets first** - Verify operations work before scaling
6. **Use snapshots for change tracking** - Compare exports over time
7. **Leverage analytics** - Use built-in analysis instead of manual inspection

## Read-Only Guarantee

This framework implements a **strict read-only policy**:

✅ The framework **will never**:
- Create records
- Edit records
- Delete records
- Submit forms
- Approve requests
- Change assignments
- Trigger workflows
- Click Save, Update, Delete, Approve buttons

Every operation passes validation. Attempts to modify data are rejected with clear error messages.

## Future Enhancements

Potential additions without breaking changes:

- [ ] Machine learning-based pattern detection
- [ ] Advanced data validation
- [ ] Multi-dashboard support
- [ ] Scheduled exports
- [ ] Webhook notifications
- [ ] Database integration
- [ ] REST API wrapper
- [ ] UI dashboard for command management

## Contributing

To extend the framework:

1. Create new modules following existing patterns
2. Ensure all operations are read-only
3. Add comprehensive logging
4. Include error handling and retry logic
5. Update documentation
6. Add examples

## License

This project is provided as-is for PayedPOS automation.

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review examples in `src/commands/examples.js`
3. Run with `PAYEDPOS_HEADLESS=false` to see browser
4. Enable debug logging in logger.js

Adding new routes is simple — just edit the `ROUTES` object.

### Pagination Engine (`src/browser/pagination/pagination-engine.js`)

Automatically handles pagination:
- Detects "Next" button pagination
- Detects numbered pagination
- Avoids duplicate extraction
- Waits for page loads between clicks
- Collects all rows across pages
- Returns combined dataset

### Table Extractor (`src/browser/extractors/table-extractor.js`)

Generic table data extraction:
- Auto-detects table headers
- Extracts all rows from `<tbody>`
- Converts rows to structured JSON objects
- Handles missing values gracefully
- Returns `{ headers: [...], rows: [{...}, ...] }`

### Report Generators

#### Excel (`src/reports/excel/report-generator.js`)
Generates `.xlsx` files with:
- Title and generation timestamp
- Summary and record count
- Full data table
- Optional observations

#### Word (`src/reports/word/report-generator.js`)
Generates `.docx` files with:
- Formatted title
- Generation date/time
- Summary and statistics
- Data table (one row per line)
- Optional observations

### Snapshot Manager (`src/snapshots/snapshot-manager.js`)

Saves extracted data as JSON snapshots:
- Timestamp-indexed JSON files
- Stored in `snapshots/` directory
- Enables historical comparison
- Useful for debugging and auditing

### Logger (`src/utils/logger.js`)

Structured logging:
- Writes to `logs/automation.log`
- JSON format for machine parsing
- Console output for real-time monitoring
- Supports info, warn, error levels

### Error Handling (`src/utils/errors.js`)

Custom error class with metadata:
```javascript
throw new AutomationError('Message', { cause: 'Details' });
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required
PAYEDPOS_BASE_URL=https://payedpos.yoursite.com
PAYEDPOS_USERNAME=your-username
PAYEDPOS_PASSWORD=your-password

# Optional
PAYEDPOS_HEADLESS=true              # Run in headless mode
PAYEDPOS_VIEWPORT=1440,900          # Browser viewport
PAYEDPOS_TIMEOUT=30000              # Page timeout (ms)
PAYEDPOS_MAX_RETRIES=2              # Retry attempts
PAYEDPOS_STORAGE_STATE_PATH=storage/auth-state.json
PAYEDPOS_OUTPUT_DIR=output
PAYEDPOS_SNAPSHOT_DIR=snapshots
PAYEDPOS_LOG_DIR=logs
```

## Getting Started

### 1. Install in Codespaces

```bash
npm install
npm run setup:playwright
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your PayedPOS credentials
```

### 3. Run Commands

```bash
# Export dashboard
npm run export:dashboard

# Export POS terminals
npm run export:terminals

# Export merchants
npm run export:merchants

# Or run the main entry point
npm start
```

### 4. Check Output

- **Reports**: `output/report-*.xlsx` and `output/report-*.docx`
- **Snapshots**: `snapshots/snapshot-*.json`
- **Logs**: `logs/automation.log`

## Adding New Automations

### 1. Create a Command Class

Create `src/commands/export-assigned-command.js`:

```javascript
const BaseCommand = require('./base-command');
const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');

class ExportAssignedCommand extends BaseCommand {
  async execute({ title = 'Assigned Terminals', summary = 'Export of assigned terminals' } = {}) {
    let browser, context, page;

    try {
      ({ browser, context, page } = await this.browserManager.launch());
      await this.authManager.ensureAuthenticated(page);
      await this.navigationRouter.navigate(page, 'assigned');

      const tableData = await this.tableExtractor.extract(page);
      const rows = tableData.rows;
      const snapshotPath = this.snapshotManager.save({ route: 'assigned', title, summary, rows, generatedAt: new Date().toISOString() });

      const excelPath = this.excelReportGenerator.generate({ title, summary, rows });
      const wordPath = await this.wordReportGenerator.generate({ title, summary, rows });

      logger.info('command.export-assigned.complete', { excelPath, wordPath, snapshotPath });
      return { route: 'assigned', excelPath, wordPath, snapshotPath, rows };
    } catch (error) {
      logger.error('command.export-assigned.failed', { message: error.message });
      throw new AutomationError('Export assigned command failed', { cause: error.message });
    } finally {
      await this.browserManager.close(browser, context);
    }
  }
}

module.exports = ExportAssignedCommand;
```

### 2. Create a Script

Create `src/scripts/export-assigned.js`:

```javascript
const BrowserManager = require('../browser/browser-manager');
const AuthManager = require('../browser/auth/auth-manager');
const { NavigationRouter } = require('../browser/navigation/router');
const PaginationEngine = require('../browser/pagination/pagination-engine');
const TableExtractor = require('../browser/extractors/table-extractor');
const ExcelReportGenerator = require('../reports/excel/report-generator');
const WordReportGenerator = require('../reports/word/report-generator');
const SnapshotManager = require('../snapshots/snapshot-manager');
const ExportAssignedCommand = require('../commands/export-assigned-command');
const logger = require('../utils/logger');

async function main() {
  const command = new ExportAssignedCommand({
    browserManager: new BrowserManager(),
    authManager: new AuthManager(),
    navigationRouter: new NavigationRouter(),
    paginationEngine: new PaginationEngine(),
    tableExtractor: new TableExtractor(),
    excelReportGenerator: new ExcelReportGenerator(),
    wordReportGenerator: new WordReportGenerator(),
    snapshotManager: new SnapshotManager()
  });

  logger.info('script.export-assigned.start', {});
  const result = await command.execute();
  logger.info('script.export-assigned.complete', result);
}

main().catch((error) => {
  logger.error('script.export-assigned.failed', { message: error.message });
  process.exit(1);
});
```

### 3. Add to package.json

```json
{
  "scripts": {
    "export:assigned": "node src/scripts/export-assigned.js"
  }
}
```

### 4. Update Routes (if needed)

Add new routes to `src/browser/navigation/router.js`:

```javascript
const ROUTES = {
  dashboard: '/',
  'pos-terminals': '/pos-terminals',
  assigned: '/assigned',
  unassigned: '/unassigned',
  merchants: '/merchants',
  'your-new-page': '/your-new-path'  // Add here
};
```

## Production Considerations

- **Live Data Only**: Every run fetches fresh data from the dashboard
- **No Hardcoding**: All credentials and configuration come from `.env`
- **Error Recovery**: Automatic retries and graceful failure handling
- **Structured Logs**: JSON logs for integration with monitoring systems
- **Storage State**: Authentication is cached for performance
- **Snapshot History**: All extractions are timestamped and saved locally

## Troubleshooting

### Browser Won't Launch
```bash
npm run setup:playwright
```

### Authentication Failed
- Verify `PAYEDPOS_USERNAME` and `PAYEDPOS_PASSWORD` in `.env`
- Check that the PayedPOS base URL is correct
- Delete `storage/auth-state.json` to force re-login

### No Data Extracted
- Verify the table selector is correct
- Check `logs/automation.log` for details
- Run with `PAYEDPOS_HEADLESS=false` to see the browser

### Slow Pagination
- Increase `PAYEDPOS_TIMEOUT` in `.env` if pages load slowly
- Reduce `PAYEDPOS_MAX_RETRIES` to fail faster on timeouts

## Files and Directories

- `src/` - Source code (modules, commands, scripts)
- `output/` - Generated Excel and Word reports
- `snapshots/` - JSON snapshots of extracted data
- `logs/` - Automation execution logs
- `storage/` - Browser storage state (auth cache)
- `.env` - Environment configuration (do not commit)
- `package.json` - NPM dependencies and scripts
- `README.md` - This file
