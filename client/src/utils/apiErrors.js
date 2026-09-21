/**
 * API Error Mapper Utility — Frontend
 *
 * Provides a single, reusable function to convert normalized API error
 * responses (from the BugBoard backend errorHandler) into form-level
 * inline field errors and/or top-level form error banners.
 *
 * Usage:
 *   import { applyApiErrorsToForm, formatApiErrorMessage } from '../utils/apiErrors.js';
 *
 *   catch (err) {
 *     applyApiErrorsToForm(err, setFieldErrors, setFormError);
 *   }
 */

/**
 * Map a normalized API error response into per-field errors and/or a
 * top-level form banner message.
 *
 * @param {Object} err - The rejected value from apiClient (already normalized by axios interceptor)
 * @param {Function} setFieldErrors - State setter that receives a partial field-error map: { [fieldName]: message }
 * @param {Function} setFormError - State setter for top-level string error banner
 */
export function applyApiErrorsToForm(err, setFieldErrors, setFormError) {
  const fieldMap = {};
  const fieldErrors = Array.isArray(err?.errors) ? err.errors : [];

  // Map { field, message } entries to inline field error state
  const nonFieldMessages = [];
  fieldErrors.forEach((e) => {
    if (e.field && e.field !== 'auth') {
      fieldMap[e.field] = e.message;
    } else if (e.message) {
      nonFieldMessages.push(e.message);
    }
  });

  // Apply field-level errors if any were found
  if (Object.keys(fieldMap).length > 0) {
    setFieldErrors((prev) => ({ ...prev, ...fieldMap }));
  }

  // Set form-level error: prefer field-derived message, then non-field messages, then generic message
  const formMessage =
    nonFieldMessages.length > 0
      ? nonFieldMessages.join(' · ')
      : err?.message || 'An unexpected error occurred. Please try again.';

  if (setFormError) {
    setFormError(formMessage);
  }
}

/**
 * Extract a user-friendly single-string message from a normalized API error.
 *
 * @param {Object} err - The rejected value from apiClient
 * @returns {string} A human-readable error message
 */
export function formatApiErrorMessage(err) {
  if (!err) return 'An unexpected error occurred.';

  // If there are field-level errors, combine them into a readable message
  const fieldErrors = Array.isArray(err?.errors) ? err.errors : [];
  if (fieldErrors.length > 0) {
    return fieldErrors.map((e) => e.message).join(' · ');
  }

  return err.message || 'An unexpected error occurred. Please try again.';
}
