/* ============================================
   🛠️ ADMIN SHARED UTILITIES & HELPERS
   ============================================ */

// ============================================
// FORMAT & DISPLAY HELPERS
// ============================================

/**
 * Format currency to Vietnamese Dong
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    return (amount || 0).toLocaleString('vi-VN');
}

/**
 * Format currency with ₫ symbol
 */
function formatPrice(amount) {
    return formatCurrency(amount) + '₫';
}

/**
 * Format date to Vietnamese format
 * @param {Date|string} date
 * @returns {string}
 */
function formatDate(date) {
    return new Date(date).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Format datetime to Vietnamese format
 */
function formatDateTime(date) {
    return new Date(date).toLocaleString('vi-VN');
}

/**
 * Get status badge HTML
 * @param {string} status
 * @param {object} statusMap - Map of status values to display configs
 * @returns {string}
 */
function getStatusBadge(status, statusMap = {}) {
    const config = statusMap[status] || { label: status, class: 'badge-info' };
    return `<span class="badge ${config.class}">${config.label}</span>`;
}

// ============================================
// NOTIFICATION HELPERS
// ============================================

/**
 * Show success notification
 */
function showSuccess(message) {
    showNotification(message, 'success');
}

/**
 * Show error notification
 */
function showError(message) {
    showNotification(message, 'danger');
}

/**
 * Show warning notification
 */
function showWarning(message) {
    showNotification(message, 'warning');
}

/**
 * Show info notification
 */
function showInfo(message) {
    showNotification(message, 'info');
}

/**
 * Generic notification
 */
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} mt-3`;
    alertDiv.innerHTML = `
        <span>${getAlertIcon(type)}</span>
        <div>${message}</div>
    `;

    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => alertDiv.remove(), 5000);
}

function getAlertIcon(type) {
    const icons = {
        success: '✅',
        danger: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
}

// ============================================
// TABLE HELPERS
// ============================================

/**
 * Create table row HTML
 */
function createTableRow(data, columns) {
    let html = '<tr>';
    columns.forEach(col => {
        const value = data[col.key];
        const content = col.render ? col.render(value, data) : escapeHtml(value);
        html += `<td>${content}</td>`;
    });
    html += '</tr>';
    return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Clear table body
 */
function clearTable(tableSelector) {
    const tbody = document.querySelector(tableSelector + ' tbody');
    if (tbody) tbody.innerHTML = '';
}

/**
 * Load table data with pagination
 */
async function loadTableData(apiUrl, tableSelector, columns, options = {}) {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.success) {
            showError(data.message || 'Lỗi tải dữ liệu');
            return;
        }

        clearTable(tableSelector);
        const tbody = document.querySelector(tableSelector + ' tbody');

        if (data.data && data.data.length > 0) {
            data.data.forEach(row => {
                tbody.innerHTML += createTableRow(row, columns);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="text-center text-muted">Không có dữ liệu</td></tr>';
        }

        if (options.onComplete) options.onComplete(data);
    } catch (error) {
        console.error('Error loading table:', error);
        showError('Lỗi tải dữ liệu');
    }
}

// ============================================
// API HELPERS
// ============================================

/**
 * Generic fetch wrapper for API calls
 */
async function apiCall(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
        }

        return { success: true, data };
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * POST request
 */
async function apiPost(url, payload) {
    return apiCall(url, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * PUT request
 */
async function apiPut(url, payload) {
    return apiCall(url, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

/**
 * DELETE request
 */
async function apiDelete(url) {
    return apiCall(url, { method: 'DELETE' });
}

// ============================================
// FORM HELPERS
// ============================================

/**
 * Get form data as object
 */
function getFormData(formSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return null;

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    return data;
}

/**
 * Validate form
 */
function validateForm(formSelector, rules) {
    const form = document.querySelector(formSelector);
    if (!form) return false;

    let isValid = true;
    for (const [field, rule] of Object.entries(rules)) {
        const input = form.querySelector(`[name="${field}"]`);
        if (!input) continue;

        if (rule.required && !input.value.trim()) {
            showError(`${field} không được để trống`);
            isValid = false;
            continue;
        }

        if (rule.minLength && input.value.length < rule.minLength) {
            showError(`${field} phải có ít nhất ${rule.minLength} ký tự`);
            isValid = false;
        }

        if (rule.maxLength && input.value.length > rule.maxLength) {
            showError(`${field} không được vượt quá ${rule.maxLength} ký tự`);
            isValid = false;
        }

        if (rule.pattern && !rule.pattern.test(input.value)) {
            showError(`${field} không đúng định dạng`);
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Reset form
 */
function resetForm(formSelector) {
    const form = document.querySelector(formSelector);
    if (form) form.reset();
}

/**
 * Populate form with data
 */
function populateForm(formSelector, data) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    for (const [key, value] of Object.entries(data)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = value;
        }
    }
}

// ============================================
// MODAL HELPERS
// ============================================

/**
 * Show modal
 */
function showModal(modalSelector) {
    const modal = document.querySelector(modalSelector);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'block';
    }
}

/**
 * Hide modal
 */
function hideModal(modalSelector) {
    const modal = document.querySelector(modalSelector);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// ============================================
// CONFIRM HELPERS
// ============================================

/**
 * Show confirm dialog
 */
function confirm(message, onConfirm, onCancel) {
    const confirmed = window.confirm(message);
    if (confirmed && onConfirm) onConfirm();
    else if (!confirmed && onCancel) onCancel();
}

// ============================================
// EXPORT HELPERS
// ============================================

/**
 * Export table to CSV
 */
function exportTableToCSV(tableSelector, filename = 'export.csv') {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    let csv = [];
    table.querySelectorAll('tr').forEach(row => {
        const cols = [];
        row.querySelectorAll('td, th').forEach(col => {
            cols.push(col.textContent.trim());
        });
        csv.push(cols.join(','));
    });

    downloadCSV(csv.join('\n'), filename);
}

/**
 * Download CSV file
 */
function downloadCSV(content, filename) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// ============================================
// DEBOUNCE & THROTTLE
// ============================================

/**
 * Debounce function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// DOM HELPERS
// ============================================

/**
 * Show element
 */
function show(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.style.display = '';
    });
}

/**
 * Hide element
 */
function hide(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
    });
}

/**
 * Toggle element
 */
function toggle(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.style.display = el.style.display === 'none' ? '' : 'none';
    });
}

/**
 * Add class
 */
function addClass(selector, className) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.add(className);
    });
}

/**
 * Remove class
 */
function removeClass(selector, className) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.remove(className);
    });
}

/**
 * Toggle class
 */
function toggleClass(selector, className) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.toggle(className);
    });
}
