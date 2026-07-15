const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');

/**
 * SafetyLayer enforces read-only operations across the automation framework.
 * 
 * This layer prevents the framework from executing any action that would modify
 * PayedPOS platform data. All commands must pass this safety check before execution.
 */
class SafetyLayer {
  // Forbidden action patterns that modify data
  static FORBIDDEN_ACTION_PATTERNS = [
    // Form submissions
    /^(submit|post|put|patch|delete)/i,
    
    // Data modification
    /^(create|edit|update|modify|change|set|save|delete|remove|add|insert)/i,
    
    // Workflow actions
    /^(approve|reject|assign|unassign|reassign|escalate|resolve|close)/i,
    
    // UI interactions that modify
    /click.*(save|submit|update|delete|approve|reject|confirm)/i,
    
    // Settings changes
    /^(configure|setup|install|enable|disable|toggle)/i,
    
    // Import/bulk operations that modify
    /^(import|bulk|batch).*(create|update|delete)/i,
    
    // Triggering workflows
    /^(trigger|execute|run).*(workflow|action|process)/i
  ];

  // Forbidden element selectors that indicate modify actions
  static FORBIDDEN_SELECTORS = [
    'button[type="submit"]',
    'input[type="submit"]',
    '[data-testid*="delete"]',
    '[data-testid*="remove"]',
    '[aria-label*="delete" i]',
    '[aria-label*="remove" i]',
    '[aria-label*="approve" i]',
    '[aria-label*="reject" i]',
    '[class*="danger"]',
    '[class*="destructive"]',
    'form'
  ];

  // Allowed read-only actions
  static ALLOWED_ACTION_PATTERNS = [
    /^(read|get|fetch|view|display|show|extract|collect)/i,
    /^(navigate|goto|open|go|route)/i,
    /^(search|filter|query|find|lookup)/i,
    /^(analyze|calculate|count|group|aggregate|sort)/i,
    /^(export|generate|create).*(report|snapshot|export)/i,
    /^(wait|pause|timeout|delay|throttle)/i,
    /^(log|record|trace|debug)/i,
    /^(compare|diff|analyze).*(snapshot|version)/i
  ];

  /**
   * Validates whether an action is safe (read-only).
   * @param {string} actionName - Name of the action to validate
   * @param {object} context - Additional context (metadata, description, etc.)
   * @returns {object} { isAllowed: boolean, reason: string }
   */
  static validateAction(actionName, context = {}) {
    if (!actionName || typeof actionName !== 'string') {
      return { isAllowed: false, reason: 'Invalid action name' };
    }

    // Check if action matches allowed patterns
    const isAllowed = this.ALLOWED_ACTION_PATTERNS.some(pattern =>
      pattern.test(actionName)
    );

    if (!isAllowed) {
      // Check if action matches forbidden patterns
      const isForbidden = this.FORBIDDEN_ACTION_PATTERNS.some(pattern =>
        pattern.test(actionName)
      );

      if (isForbidden) {
        logger.warn('security.action.forbidden', { actionName, context });
        return {
          isAllowed: false,
          reason: `Action "${actionName}" is forbidden by read-only safety policy`
        };
      }

      // Unknown action - deny by default
      logger.warn('security.action.unknown', { actionName, context });
      return {
        isAllowed: false,
        reason: `Action "${actionName}" is not recognized as a read-only operation`
      };
    }

    logger.info('security.action.allowed', { actionName });
    return { isAllowed: true, reason: 'Action is read-only safe' };
  }

  /**
   * Validates a command object structure
   * @param {object} command - Command to validate
   * @returns {object} { isValid: boolean, errors: string[] }
   */
  static validateCommand(command) {
    const errors = [];

    if (!command || typeof command !== 'object') {
      return { isValid: false, errors: ['Invalid command object'] };
    }

    if (!command.action || typeof command.action !== 'string') {
      errors.push('Command must have a valid action name');
    } else {
      const validation = this.validateAction(command.action, command);
      if (!validation.isAllowed) {
        errors.push(validation.reason);
      }
    }

    if (command.modifications || command.writes || command.deletes) {
      errors.push('Command contains forbidden modification properties');
    }

    if (command.clickButtons && Array.isArray(command.clickButtons)) {
      const forbiddenButtons = command.clickButtons.filter(btn =>
        this.FORBIDDEN_SELECTORS.some(selector =>
          btn.selector?.includes(selector) ||
          btn.label?.toLowerCase().includes(selector.replace(/[[\]'"]/g, ''))
        )
      );
      if (forbiddenButtons.length > 0) {
        errors.push(`Command contains forbidden button interactions: ${forbiddenButtons.map(b => b.label).join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Enforces safety on an operation.
   * Throws if operation violates read-only policy.
   * @param {string} actionName - Name of the action
   * @param {object} context - Additional context
   * @throws {AutomationError} if action is not allowed
   */
  static enforceReadOnly(actionName, context = {}) {
    const validation = this.validateAction(actionName, context);

    if (!validation.isAllowed) {
      const error = new AutomationError(
        validation.reason,
        {
          code: 'READ_ONLY_VIOLATION',
          action: actionName,
          context
        }
      );
      logger.error('security.violation', { actionName, reason: validation.reason });
      throw error;
    }
  }

  /**
   * Executes a function with read-only enforcement.
   * @param {string} actionName - Name of the action
   * @param {function} operation - Async function to execute
   * @param {object} context - Additional context
   * @returns {Promise<any>} Result from operation
   * @throws {AutomationError} if action is not allowed
   */
  static async executeReadOnly(actionName, operation, context = {}) {
    this.enforceReadOnly(actionName, context);

    if (typeof operation !== 'function') {
      throw new AutomationError('Operation must be a function', { actionName });
    }

    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      logger.info('security.operation.complete', { actionName, duration, context });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('security.operation.failed', { actionName, duration, message: error.message });
      throw error;
    }
  }

  /**
   * Decorator to enforce read-only on class methods
   * @param {string} actionName - Name of the action
   * @returns {function} Decorator function
   */
  static ReadOnlyAction(actionName) {
    return function (target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args) {
        SafetyLayer.enforceReadOnly(actionName, { method: propertyKey });
        return originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  /**
   * Get summary of read-only policy
   * @returns {string} Human-readable summary
   */
  static getPolicySummary() {
    return `
PayedPOS Automation - Read-Only Safety Policy
==============================================

ALLOWED OPERATIONS:
- Read, fetch, view, display data
- Navigate and open pages
- Search, filter, and query
- Analyze, aggregate, and calculate
- Export and generate reports
- Compare snapshots and versions

FORBIDDEN OPERATIONS:
- Create, edit, update, or delete records
- Submit forms or approve/reject requests
- Change assignments or settings
- Trigger workflows
- Click Save, Update, Delete, Approve, Reject buttons

This framework enforces strict read-only access to the PayedPOS platform.
Any attempt to modify platform data will be rejected.
    `.trim();
  }
}

module.exports = SafetyLayer;
