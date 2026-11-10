export function readableAction(value) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function safeAuditValue(value) {
  const blocked = /password|secret|token|otp|authorization|cookie|key/i;
  function redact(item) {
    if (Array.isArray(item)) return item.map(redact);
    if (item && typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [
          key,
          blocked.test(key) ? '[REDACTED]' : redact(entry),
        ]),
      );
    }
    return item;
  }
  return value == null ? null : redact(value);
}

function readableField(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayAuditValue(value) {
  if (value == null || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
    !Number.isNaN(Date.parse(value))
  ) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

export function auditValueEntries(value) {
  const entries = [];
  const safeValue = safeAuditValue(value);

  function visit(item, path) {
    if (Array.isArray(item)) {
      const containsOnlyValues = item.every(
        (entry) => entry == null || typeof entry !== 'object',
      );
      if (containsOnlyValues) {
        entries.push({
          label: readableField(path || 'Value'),
          value: item.length
            ? item.map(displayAuditValue).join(', ')
            : 'None',
        });
        return;
      }
      item.forEach((entry, index) => visit(entry, `${path} ${index + 1}`));
      return;
    }
    if (item && typeof item === 'object') {
      Object.entries(item).forEach(([key, entry]) =>
        visit(entry, path ? `${path} ${key}` : key),
      );
      return;
    }
    entries.push({
      label: readableField(path || 'Value'),
      value: displayAuditValue(item),
    });
  }

  visit(safeValue, '');
  return entries;
}
