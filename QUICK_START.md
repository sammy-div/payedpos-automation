# Quick Start Guide - PayedPOS Generic Operations Assistant

## ✅ Refactoring Complete!

Your PayedPOS automation project has been refactored into a **generic, read-only operations platform**. Here's what's ready to use:

## What's New

### 🔒 Safety Layer
- Enforces read-only operations
- Validates every command
- Prevents data modification

### 🔍 Search & Extract
- Auto-detect search fields
- Extract detail pages
- Generic table extraction
- Flexible pagination

### 📊 Analytics
- Count, group, sort any data
- Detect duplicates and missing values
- Statistical analysis
- Dataset comparison

### 📸 Snapshots
- Save timestamped exports
- Compare two snapshots
- Track changes over time
- Detect added/removed/modified records

### 🎛️ Command Framework
- No hardcoded commands
- Execute via plain JSON objects
- 10+ built-in actions
- Easy to extend

### 📈 Enhanced Logging
- Performance metrics
- Security event tracking
- Color-coded output
- Comprehensive reports

## 5-Minute Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with PayedPOS credentials

# 3. Install Playwright
npm run setup:playwright

# 4. Try an example
node src/scripts/generic-command-runner.js export
```

## Basic Usage

### Export to Excel

```javascript
const { main } = require('./src/index');
// Uses default dashboard export to Excel + snapshot
const result = await main();
```

### Custom Command

```javascript
const GenericCommand = require('./src/commands/generic-command');
// ... setup dependencies ...

const command = new GenericCommand({ /* deps */ });
const result = await command.execute({
  action: 'read:full-export',
  route: 'merchants',
  title: 'Merchant Export',
  formats: ['excel', 'snapshot']
});
```

### Search

```javascript
const result = await command.execute({
  action: 'read:search',
  route: 'merchants',
  query: 'coffee shop',
  fieldLabel: 'Merchant Name'
});
```

### Analyze Data

```javascript
const result = await command.execute({
  action: 'read:analyze',
  route: 'pos-terminals',
  operation: 'groupBy',
  field: 'Status'
});
```

## File Structure

```
src/
├── security/               ← Read-only enforcement
├── browser/               ← Core extraction
├── analytics/             ← Data analysis
├── snapshots/             ← Snapshot management
├── commands/              ← Command framework
├── reports/               ← Export formats
└── utils/                 ← Logging and helpers
```

## Documentation

- **README.md** - Complete architecture guide (1000+ lines)
- **REFACTORING_SUMMARY.md** - Changes and enhancements
- **DIRECTORY_STRUCTURE.md** - File organization
- **src/commands/examples.js** - 10+ example commands
- **src/scripts/generic-command-runner.js** - Runnable examples

## Available Commands

### Export
```javascript
{
  action: 'read:full-export',
  route: 'dashboard',
  formats: ['excel', 'word', 'snapshot'],
  paginate: true
}
```

### Extract
```javascript
{
  action: 'read:extract-table',
  route: 'pos-terminals',
  paginate: true
}
```

### Search
```javascript
{
  action: 'read:search',
  route: 'merchants',
  query: 'your query'
}
```

### Analyze
```javascript
{
  action: 'read:analyze',
  operation: 'countBy',
  field: 'Status'
}
```

### Compare
```javascript
{
  action: 'read:compare-snapshots',
  snapshotPath1: 'snapshots/snapshot1.json',
  snapshotPath2: 'snapshots/snapshot2.json'
}
```

## Key Features

✅ **100% Read-Only** - Cannot modify platform data  
✅ **Generic** - Works with any dashboard  
✅ **Dynamic** - Discovers fields and pages automatically  
✅ **Modular** - Reusable components  
✅ **Extensible** - Add features without core changes  
✅ **Safe** - Comprehensive error handling  
✅ **Fast** - Optimized extraction and analysis  
✅ **Logged** - Full audit trail and metrics  

## Outputs

```
output/              ← Excel and Word files
snapshots/           ← JSON snapshots
logs/
  ├── automation.log
  ├── performance.log
  └── security.log
```

## Common Tasks

### Export everything from dashboard
```bash
node src/scripts/generic-command-runner.js export
```

### Search for specific records
```bash
node src/scripts/generic-command-runner.js search
```

### Analyze and group data
```bash
node src/scripts/generic-command-runner.js analyze
```

### Generate professional report
```bash
node src/scripts/generic-command-runner.js report
```

### Compare snapshots
```bash
node src/scripts/generic-command-runner.js compare
```

### View performance metrics
```bash
node src/scripts/generic-command-runner.js performance
```

## Adding Custom Commands

No code changes needed! Create a command definition:

```javascript
// In src/commands/examples.js or new file
const myCommand = {
  action: 'read:full-export',
  route: 'dashboard',
  title: 'My Custom Export',
  summary: 'Custom report for my needs',
  formats: ['excel', 'snapshot'],
  observations: [
    'Custom observation 1',
    'Custom observation 2'
  ]
};
```

Then execute it:

```javascript
const result = await command.execute(myCommand);
```

## Extending the Framework

Add a new module:

1. Create module file (e.g., `src/analytics/my-analyzer.js`)
2. Implement your logic
3. Pass to GenericCommand
4. Use in actions

No other changes needed!

## Troubleshooting

### Authentication fails
- Check `.env` credentials
- Clear `storage/auth-state.json`
- Verify `PAYEDPOS_BASE_URL`

### Data not extracted
- Check selector defaults (try `'table'`)
- Enable headless=false to see browser
- Review logs in `logs/automation.log`

### Reports not generating
- Check `output/` directory permissions
- Verify data was extracted
- Review error in logs

## Next Steps

1. **Read** [README.md](README.md) for complete guide
2. **Explore** [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) for details
3. **Run** examples to understand patterns
4. **Create** your first custom command
5. **Deploy** with confidence!

## Support

- Full architecture documented in README.md
- 10+ examples in src/commands/examples.js
- Runnable examples in src/scripts/generic-command-runner.js
- Enhanced logging in logs/ directory
- Performance metrics available on demand

---

**Your automation platform is ready for production! 🚀**

Start with: `npm start` or `node src/scripts/generic-command-runner.js export`
