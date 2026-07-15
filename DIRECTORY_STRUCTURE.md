# PayedPOS Automation - Complete Directory Structure

```
payedpos-automation/
│
├── README.md                              # Comprehensive documentation (UPDATED)
├── REFACTORING_SUMMARY.md                 # Detailed summary of changes (NEW)
├── package.json                           # Dependencies and scripts
├── .env.example                           # Environment template
│
├── src/
│   │
│   ├── index.js                           # Main entry point (UPDATED)
│   │
│   ├── security/                          # NEW: Read-only enforcement
│   │   └── safety-layer.js               # Validates all operations are read-only
│   │
│   ├── browser/                           # Browser interaction layer
│   │   ├── browser-manager.js            # Playwright browser lifecycle
│   │   ├── auth/
│   │   │   └── auth-manager.js           # Login and session management
│   │   ├── navigation/
│   │   │   └── router.js                 # Route-based navigation
│   │   ├── pagination/
│   │   │   └── pagination-engine.js      # Handle pagination (Next/Previous or numbered)
│   │   ├── extractors/
│   │   │   ├── table-extractor.js        # Auto-detect and extract table data
│   │   │   └── detail-extractor.js       # NEW: Extract detail pages and modals
│   │   └── search/                        # NEW: Search functionality
│   │       └── search-engine.js          # Auto-detect search fields and search
│   │
│   ├── analytics/                         # NEW: Data analysis
│   │   └── analytics-engine.js           # Count, group, sort, analyze any data
│   │
│   ├── snapshots/                         # Snapshot management
│   │   ├── snapshot-manager.js           # Save timestamped JSON snapshots
│   │   └── snapshot-comparison.js        # NEW: Compare snapshots and detect changes
│   │
│   ├── commands/                          # Command framework
│   │   ├── generic-command.js            # NEW: Unified command execution system
│   │   ├── examples.js                   # NEW: 10+ example command definitions
│   │   ├── base-command.js               # Legacy base (kept for compatibility)
│   │   ├── export-dashboard-command.js   # Legacy (still works)
│   │   ├── export-merchants-command.js   # Legacy (still works)
│   │   └── export-terminals-command.js   # Legacy (still works)
│   │
│   ├── reports/                           # Report generation
│   │   ├── excel/
│   │   │   └── report-generator.js       # Generate .xlsx files with data tables
│   │   └── word/
│   │       └── report-generator.js       # Generate .docx files with formatting (ENHANCED)
│   │
│   ├── config/                            # Configuration
│   │   └── env.js                         # Environment variable parsing
│   │
│   ├── utils/                             # Utilities
│   │   ├── logger.js                     # Enhanced logging with performance metrics (UPDATED)
│   │   ├── errors.js                     # Custom error types
│   │   ├── retry.js                      # Retry logic for failed operations
│   │   └── file.js                       # File system utilities
│   │
│   └── scripts/                           # Executable scripts
│       ├── generic-command-runner.js     # NEW: Run example commands
│       ├── export-dashboard.js           # Legacy script
│       ├── export-merchants.js           # Legacy script
│       └── export-terminals.js           # Legacy script
│
├── storage/                               # Authentication storage
│   └── auth-state.json                   # Browser session state (auto-generated)
│
├── output/                                # Generated reports
│   ├── report-2026-07-14T19-17-24-991Z.xlsx
│   ├── report-2026-07-14T19-20-02-718Z.docx
│   └── ...
│
├── snapshots/                             # Data snapshots
│   ├── snapshot-2026-07-14T19-17-24-991Z.json
│   ├── snapshot-2026-07-14T19-20-02-718Z.json
│   └── ...
│
└── logs/                                  # Application logs
    ├── automation.log                    # Main operations log
    ├── performance.log                   # Performance metrics
    ├── security.log                      # Security events
    └── ...
```

## Key Organization

### By Responsibility

**Browser & Extraction (`src/browser/`)**
- Core browser automation
- Data extraction from pages
- Navigation and pagination
- Search functionality

**Processing & Analysis (`src/analytics/`, `src/security/`, `src/snapshots/`)**
- Data transformation
- Read-only enforcement
- Change tracking

**Output & Reporting (`src/reports/`)**
- Excel generation
- Word document generation
- Structured data export

**Orchestration (`src/commands/`)**
- Command execution
- Dependency injection
- Error handling

**Utilities (`src/utils/`, `src/config/`)**
- Logging and metrics
- Configuration management
- Error definitions
- File operations

### By Layer

**Layer 1: Core Browser (Lowest Level)**
```
browser-manager.js
auth-manager.js
```

**Layer 2: Extraction & Navigation**
```
table-extractor.js
detail-extractor.js
search-engine.js
pagination-engine.js
router.js
```

**Layer 3: Processing**
```
analytics-engine.js
snapshot-comparison.js
safety-layer.js
```

**Layer 4: Reporting**
```
excel/report-generator.js
word/report-generator.js
snapshot-manager.js
```

**Layer 5: Commands (Highest Level)**
```
generic-command.js
```

**Cross-cutting: Utils**
```
logger.js
errors.js
retry.js
file.js
```

## File Statistics

### Size Summary
```
Security:              ~350 lines (safety-layer.js)
Extractors:           ~400 lines (detail-extractor.js)
Search:               ~350 lines (search-engine.js)
Analytics:            ~700 lines (analytics-engine.js)
Snapshots:            ~500 lines (snapshot-comparison.js)
Commands:             ~700 lines (generic-command.js)
Reports:              ~350 lines (enhanced word-generator)
Logger:               ~350 lines (enhanced logger.js)

Total New Code:      ~3,700 lines
Existing Code:       ~1,500 lines (legacy + core)
Documentation:       ~2,000 lines (README + SUMMARY)

Total Project:       ~7,200 lines
```

### Module Counts
```
Browser Modules:      6
Processing Modules:   3
Report Modules:       2
Command Modules:      7
Utility Modules:      4

Total Modules:        22
```

## Import Hierarchy

```
index.js
  ├── BrowserManager
  ├── AuthManager
  ├── NavigationRouter
  ├── PaginationEngine
  ├── TableExtractor
  ├── DetailExtractor
  ├── SearchEngine
  ├── AnalyticsEngine
  ├── ExcelReportGenerator
  ├── WordReportGenerator
  ├── SnapshotManager
  ├── SnapshotComparison
  ├── GenericCommand
  │   └── (all of the above)
  ├── SafetyLayer
  └── logger
       └── (config/env.js)
       └── (utils/file.js)
```

## Data Flow

```
User Command
    ↓
GenericCommand.execute(commandDef)
    ↓
SafetyLayer.validateCommand()
    ├─ if invalid → Throw error
    └─ if valid ↓
BrowserManager.launch()
    ↓
AuthManager.ensureAuthenticated()
    ↓
[Router | Extractor | Search | Analyze]
    ├── Router.navigate()
    ├── TableExtractor.extract()
    ├── SearchEngine.search()
    ├── AnalyticsEngine.analyze()
    ├── DetailExtractor.extract()
    └── SnapshotComparison.compare()
    ↓
[ExcelReportGenerator | WordReportGenerator | SnapshotManager]
    ↓
BrowserManager.close()
    ↓
Return Result
    ↓
logger.info()
```

## Configuration Cascade

```
Environment Variables (.env)
    ↓
config/env.js (getConfig())
    ↓
BrowserManager
AuthManager
SnapshotManager
Logger
```

## Output Structure

```
{
  status: 'success',
  extracted: { rowCount, timestamp },
  excel: { path, format },
  word: { path, format },
  snapshot: { path, format }
}
```

## Error Propagation

```
Module-level Error
    ↓
Catch and enhance with context
    ↓
Log to logger (info/warn/error)
    ↓
Log to files (automation.log, security.log, performance.log)
    ↓
Throw AutomationError with details
    ↓
GenericCommand catches in finally block
    ↓
BrowserManager.close() runs
    ↓
Error propagates to caller
```

## New Versus Updated Files Summary

### NEW Files (8)
1. `src/security/safety-layer.js` - Read-only enforcement
2. `src/browser/extractors/detail-extractor.js` - Detail extraction
3. `src/browser/search/search-engine.js` - Search functionality
4. `src/analytics/analytics-engine.js` - Data analysis
5. `src/snapshots/snapshot-comparison.js` - Snapshot comparison
6. `src/commands/generic-command.js` - Command framework
7. `src/commands/examples.js` - Command examples
8. `src/scripts/generic-command-runner.js` - Example runner

### UPDATED Files (3)
1. `src/utils/logger.js` - Enhanced with metrics
2. `src/reports/word/report-generator.js` - Enhanced with tables
3. `src/index.js` - Updated to use new framework

### UNCHANGED Files (Preserved)
1. `src/browser/browser-manager.js` - Core Playwright management
2. `src/browser/auth/auth-manager.js` - Authentication
3. `src/browser/navigation/router.js` - Navigation
4. `src/browser/pagination/pagination-engine.js` - Pagination
5. `src/browser/extractors/table-extractor.js` - Table extraction
6. `src/commands/base-command.js` - Legacy base
7. `src/commands/export-*.js` - Legacy commands (3 files)
8. `src/reports/excel/report-generator.js` - Excel generation
9. `src/config/env.js` - Configuration
10. `src/utils/errors.js`, `retry.js`, `file.js` - Utilities
11. `package.json` - No changes needed

## Backwards Compatibility

✅ All existing code continues to work
✅ Old commands still execute
✅ Old scripts still function
✅ Configuration unchanged
✅ Output directories unchanged
✅ No breaking changes

## Next Steps for Users

1. **Review** the architecture in README.md
2. **Understand** core modules via inline documentation
3. **Try** examples using `generic-command-runner.js`
4. **Build** custom commands as plain objects
5. **Extend** the framework with new modules
6. **Deploy** with confidence knowing it's read-only safe

---

**This is a production-ready, maintainable foundation for long-term PayedPOS automation!**
