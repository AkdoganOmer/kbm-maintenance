// Timesheet Management System
let currentUser = null;
let currentUserRole = null;
let timesheetData = [];
let technicians = [];
let currentTimesheetId = null;

// Debug function
function debugLog(message, data = null) {
    console.log('[Timesheet Debug]', message, data);
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeTimesheet();
});

// Initialize timesheet system
async function initializeTimesheet() {
    try {
        debugLog('Starting timesheet initialization...');
        
        // Check authentication - simplified
        const isAuthenticated = sessionStorage.getItem('isAuthenticated');
        const userStr = sessionStorage.getItem('currentUser');
        const roleStr = sessionStorage.getItem('userRole');
        
        debugLog('Auth check:', { 
            isAuthenticated, 
            hasUser: !!userStr, 
            hasRole: !!roleStr 
        });
        
        // If not authenticated, redirect to login
        if (isAuthenticated !== 'true') {
            debugLog('Not authenticated, redirecting to login');
            alert('Lütfen önce giriş yapın.');
            window.location.href = 'login.html';
            return;
        }
        
        // If missing user data, redirect to login
        if (!userStr || !roleStr) {
            debugLog('Missing user data, redirecting to login');
            alert('Kullanıcı bilgileri eksik. Lütfen tekrar giriş yapın.');
            sessionStorage.clear();
            window.location.href = 'login.html';
            return;
        }
        
        // Parse user data
        try {
            currentUser = JSON.parse(userStr);
            currentUserRole = roleStr;
            debugLog('User data parsed successfully:', { currentUser, currentUserRole });
        } catch (error) {
            debugLog('Error parsing user data:', error);
            alert('Kullanıcı verilerinde sorun var. Lütfen tekrar giriş yapın.');
            sessionStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        debugLog('✅ Authentication successful, proceeding with initialization');

        // Update UI with user info
        updateUserInterface();
        
        // Initialize filters
        initializeFilters();
        
        // Load technicians
        await loadTechnicians();
        
        // Load timesheet data
        await loadTimesheetData();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Puantaj sistemi başlatılırken hata:', error);
        showError('Sistem başlatılırken bir hata oluştu');
    }
}

// Update user interface
function updateUserInterface() {
    const userName = document.getElementById('userName');
    const userInitials = document.getElementById('userInitials');
    
    if (currentUser && userName) {
        userName.textContent = currentUser.name || 'Kullanıcı';
        
        // Set avatar initials
        if (userInitials && currentUser.name) {
            const names = currentUser.name.split(' ');
            const initials = names.length >= 2 
                ? names[0].charAt(0) + names[names.length - 1].charAt(0)
                : names[0].charAt(0) + (names[0].charAt(1) || '');
            userInitials.textContent = initials.toUpperCase();
        }
    }

    // Show/hide tabs based on user role
    updateNavigationTabs();
}

// Update navigation tabs visibility
function updateNavigationTabs() {
    const galleriesTab = document.getElementById('galleriesTabContainer');
    const personnelTab = document.getElementById('personnelTabContainer');
    
    if (currentUserRole === 'admin' || currentUserRole === 'manager') {
        if (galleriesTab) galleriesTab.style.display = 'block';
        if (personnelTab) personnelTab.style.display = 'block';
    } else {
        if (galleriesTab) galleriesTab.style.display = 'none';
        if (personnelTab) personnelTab.style.display = 'none';
    }
    
    // Hide/show edit controls based on role
    updateEditControlsVisibility();
}

// Update edit controls visibility based on user role
function updateEditControlsVisibility() {
    const addButton = document.querySelector('button[onclick="showAddTimesheetModal()"]');
    const exportButton = document.querySelector('button[onclick="exportTimesheet()"]');
    
    const canEdit = ['admin', 'manager'].includes(currentUserRole);
    
    if (addButton) {
        addButton.style.display = canEdit ? 'inline-block' : 'none';
    }
    
    // Export button is always visible
    if (exportButton) {
        exportButton.style.display = 'inline-block';
    }
}

// Initialize filters
function initializeFilters() {
    // Set current month
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        monthFilter.value = currentMonth;
    }
    
    // Initialize year filter
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 2; year <= currentYear + 1; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearFilter.appendChild(option);
        }
    }
}

// Load technicians from personnel collection
async function loadTechnicians() {
    try {
        if (!window.db) {
            console.warn('Firebase not available, using offline mode');
            technicians = [
                { id: 'tech1', name: 'Ali Veli', role: 'technician' },
                { id: 'tech2', name: 'Ayşe Kaya', role: 'technician' }
            ];
            updateTechnicianSelects();
            return;
        }

        const snapshot = await db.collection('personnel')
            .where('role', 'in', ['technician', 'staff'])
            .get();
        technicians = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            technicians.push({
                id: doc.id,
                name: data.name,
                role: data.role
            });
        });
        
        updateTechnicianSelects();
        
    } catch (error) {
        console.error('Teknisyenler yüklenirken hata:', error);
        showError('Teknisyen listesi yüklenemedi');
    }
}

// Update technician select dropdowns
function updateTechnicianSelects() {
    const technicianFilter = document.getElementById('technicianFilter');
    const technicianSelect = document.getElementById('technicianSelect');
    
    if (technicianFilter) {
        technicianFilter.innerHTML = '<option value="">Tüm Teknisyenler</option>';
        technicians.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.id;
            option.textContent = tech.name;
            technicianFilter.appendChild(option);
        });
    }
    
    if (technicianSelect) {
        technicianSelect.innerHTML = '<option value="">Teknisyen Seçin</option>';
        technicians.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.id;
            option.textContent = tech.name;
            technicianSelect.appendChild(option);
        });
    }
}

// Load timesheet data
async function loadTimesheetData() {
    try {
        showLoading(true);
        
        if (!window.db) {
            console.warn('Firebase not available, using sample data');
            timesheetData = getSampleTimesheetData();
            displayTimesheetData();
            return;
        }

        const snapshot = await db.collection('timesheet').get();
        
        timesheetData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            timesheetData.push({
                id: doc.id,
                ...data,
                date: data.date && data.date.toDate ? data.date.toDate() : new Date(data.date)
            });
        });
        
        // Sort by date (newest first)
        timesheetData.sort((a, b) => b.date - a.date);
        
        displayTimesheetData();
        
    } catch (error) {
        console.error('Puantaj verileri yüklenirken hata:', error);
        showError('Puantaj verileri yüklenemedi');
    } finally {
        showLoading(false);
    }
}

// Get sample timesheet data for offline mode
function getSampleTimesheetData() {
    const today = new Date();
    return [
        {
            id: 'sample1',
            technicianId: 'tech1',
            technicianName: 'Ali Veli',
            date: new Date(today.getTime() - 24 * 60 * 60 * 1000),
            startTime: '08:00',
            endTime: '17:00',
            totalHours: 9,
            overtimeHours: 1,
            status: 'normal',
            notes: 'Normal çalışma günü'
        },
        {
            id: 'sample2',
            technicianId: 'tech2',
            technicianName: 'Ayşe Kaya',
            date: new Date(today.getTime() - 24 * 60 * 60 * 1000),
            startTime: '08:30',
            endTime: '17:30',
            totalHours: 9,
            overtimeHours: 1,
            status: 'normal',
            notes: 'Galeri 1 bakımı'
        }
    ];
}

// Display timesheet data in table
function displayTimesheetData() {
    const tableBody = document.getElementById('timesheetTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (timesheetData.length === 0) {
        if (noDataMessage) noDataMessage.style.display = 'block';
        updateSummaryCards([]);
        return;
    }
    
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    timesheetData.forEach(record => {
        const row = createTimesheetRow(record);
        tableBody.appendChild(row);
    });
    
    updateSummaryCards(timesheetData);
}

// Create timesheet table row
function createTimesheetRow(record) {
    const row = document.createElement('tr');
    
    const technicianName = record.technicianName || getTechnicianName(record.technicianId);
    const formattedDate = record.date.toLocaleDateString('tr-TR');
    const statusText = getStatusText(record.status);
    const statusBadge = getStatusBadge(record.status);
    
    row.innerHTML = `
        <td>${technicianName}</td>
        <td>${formattedDate}</td>
        <td>${record.startTime}</td>
        <td>${record.endTime}</td>
        <td>${record.totalHours} saat</td>
        <td>${record.overtimeHours || 0} saat</td>
        <td><span class="badge ${statusBadge}">${statusText}</span></td>
        <td>${record.notes || '-'}</td>
        <td>
            <div class="btn-group btn-group-sm">
                ${['admin', 'manager'].includes(currentUserRole) ? `
                    <button class="btn btn-outline-primary" onclick="editTimesheet('${record.id}')" title="Düzenle">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteTimesheet('${record.id}')" title="Sil">
                        <i class="bi bi-trash"></i>
                    </button>
                ` : `
                    <span class="text-muted">Görüntüleme</span>
                `}
            </div>
        </td>
    `;
    
    return row;
}

// Get technician name by ID
function getTechnicianName(technicianId) {
    const technician = technicians.find(t => t.id === technicianId);
    return technician ? technician.name : 'Bilinmiyor';
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'normal': 'Normal Mesai',
        'overtime': 'Mesai',
        'weekend': 'Hafta Sonu',
        'holiday': 'Tatil Günü',
        'sick': 'İzinli',
        'absent': 'Devamsız'
    };
    return statusMap[status] || status;
}

// Get status badge class
function getStatusBadge(status) {
    const badgeMap = {
        'normal': 'bg-success',
        'overtime': 'bg-warning',
        'weekend': 'bg-info',
        'holiday': 'bg-primary',
        'sick': 'bg-secondary',
        'absent': 'bg-danger'
    };
    return badgeMap[status] || 'bg-secondary';
}

// Update summary cards
function updateSummaryCards(data) {
    const totalWorkHours = document.getElementById('totalWorkHours');
    const totalOvertimeHours = document.getElementById('totalOvertimeHours');
    const totalWorkDays = document.getElementById('totalWorkDays');
    const averageDailyHours = document.getElementById('averageDailyHours');
    
    const summary = calculateSummary(data);
    
    if (totalWorkHours) totalWorkHours.textContent = summary.totalHours;
    if (totalOvertimeHours) totalOvertimeHours.textContent = summary.overtimeHours;
    if (totalWorkDays) totalWorkDays.textContent = summary.workDays;
    if (averageDailyHours) averageDailyHours.textContent = summary.averageHours;
}

// Calculate summary statistics
function calculateSummary(data) {
    if (data.length === 0) {
        return {
            totalHours: '0',
            overtimeHours: '0',
            workDays: '0',
            averageHours: '0'
        };
    }
    
    const totalHours = data.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const overtimeHours = data.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const workDays = data.filter(record => record.status !== 'absent').length;
    const averageHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : '0';
    
    return {
        totalHours: totalHours.toString(),
        overtimeHours: overtimeHours.toString(),
        workDays: workDays.toString(),
        averageHours: averageHours
    };
}

// Setup event listeners
function setupEventListeners() {
    // Time calculation when times change
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    
    if (startTime && endTime) {
        startTime.addEventListener('change', calculateWorkHours);
        endTime.addEventListener('change', calculateWorkHours);
    }
}

// Calculate work hours
function calculateWorkHours() {
    const startTime = document.getElementById('startTime')?.value;
    const endTime = document.getElementById('endTime')?.value;
    const calculatedHours = document.getElementById('calculatedHours');
    const calculatedOvertime = document.getElementById('calculatedOvertime');
    
    if (!startTime || !endTime || !calculatedHours || !calculatedOvertime) return;
    
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    
    let diffMs = end - start;
    if (diffMs < 0) {
        // Next day
        diffMs += 24 * 60 * 60 * 1000;
    }
    
    const totalHours = diffMs / (1000 * 60 * 60);
    const regularHours = 8; // Standard work day
    const overtimeHours = totalHours > regularHours ? totalHours - regularHours : 0;
    
    calculatedHours.value = totalHours.toFixed(1) + ' saat';
    calculatedOvertime.value = overtimeHours.toFixed(1) + ' saat';
}

// Show add timesheet modal
function showAddTimesheetModal() {
    currentTimesheetId = null;
    const modal = document.getElementById('timesheetModal');
    const modalTitle = document.getElementById('timesheetModalTitle');
    const form = document.getElementById('timesheetForm');
    
    if (modalTitle) modalTitle.textContent = 'Puantaj Ekle';
    if (form) form.reset();
    
    // Set today as default date
    const workDate = document.getElementById('workDate');
    if (workDate) {
        workDate.value = new Date().toISOString().split('T')[0];
    }
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Edit timesheet
function editTimesheet(timesheetId) {
    const record = timesheetData.find(r => r.id === timesheetId);
    if (!record) return;
    
    currentTimesheetId = timesheetId;
    const modal = document.getElementById('timesheetModal');
    const modalTitle = document.getElementById('timesheetModalTitle');
    
    if (modalTitle) modalTitle.textContent = 'Puantaj Düzenle';
    
    // Fill form with existing data
    const technicianSelect = document.getElementById('technicianSelect');
    const workDate = document.getElementById('workDate');
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    const workStatus = document.getElementById('workStatus');
    const workNotes = document.getElementById('workNotes');
    
    if (technicianSelect) technicianSelect.value = record.technicianId;
    if (workDate) workDate.value = record.date.toISOString().split('T')[0];
    if (startTime) startTime.value = record.startTime;
    if (endTime) endTime.value = record.endTime;
    if (workStatus) workStatus.value = record.status;
    if (workNotes) workNotes.value = record.notes || '';
    
    // Calculate hours
    calculateWorkHours();
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Save timesheet
async function saveTimesheet() {
    try {
        const form = document.getElementById('timesheetForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const technicianId = document.getElementById('technicianSelect')?.value;
        const workDate = document.getElementById('workDate')?.value;
        const startTime = document.getElementById('startTime')?.value;
        const endTime = document.getElementById('endTime')?.value;
        const workStatus = document.getElementById('workStatus')?.value;
        const workNotes = document.getElementById('workNotes')?.value;
        
        if (!technicianId || !workDate || !startTime || !endTime) {
            showError('Lütfen tüm gerekli alanları doldurun');
            return;
        }
        
        // Calculate hours
        const start = new Date(`1970-01-01T${startTime}:00`);
        const end = new Date(`1970-01-01T${endTime}:00`);
        let diffMs = end - start;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
        
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        const overtimeHours = Math.max(0, Math.round((totalHours - 8) * 10) / 10);
        
        const timesheetRecord = {
            technicianId,
            technicianName: getTechnicianName(technicianId),
            date: new Date(workDate),
            startTime,
            endTime,
            totalHours,
            overtimeHours,
            status: workStatus,
            notes: workNotes.trim(),
            updatedBy: currentUser.id,
            updatedAt: new Date()
        };
        
        if (!window.db) {
            // Offline mode
            if (currentTimesheetId) {
                const index = timesheetData.findIndex(r => r.id === currentTimesheetId);
                if (index !== -1) {
                    timesheetData[index] = { ...timesheetRecord, id: currentTimesheetId };
                }
            } else {
                timesheetRecord.id = 'offline_' + Date.now();
                timesheetData.unshift(timesheetRecord);
            }
            
            displayTimesheetData();
            showSuccess('Puantaj kaydı başarıyla ' + (currentTimesheetId ? 'güncellendi' : 'eklendi'));
        } else {
            // Firebase mode
            if (currentTimesheetId) {
                await db.collection('timesheet').doc(currentTimesheetId).update(timesheetRecord);
                showSuccess('Puantaj kaydı başarıyla güncellendi');
            } else {
                await db.collection('timesheet').add(timesheetRecord);
                showSuccess('Puantaj kaydı başarıyla eklendi');
            }
            
            await loadTimesheetData();
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('timesheetModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Puantaj kaydedilirken hata:', error);
        showError('Puantaj kaydedilemedi');
    }
}

// Delete timesheet
async function deleteTimesheet(timesheetId) {
    if (!confirm('Bu puantaj kaydını silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        if (!window.db) {
            // Offline mode
            const index = timesheetData.findIndex(r => r.id === timesheetId);
            if (index !== -1) {
                timesheetData.splice(index, 1);
                displayTimesheetData();
                showSuccess('Puantaj kaydı silindi');
            }
        } else {
            // Firebase mode
            await db.collection('timesheet').doc(timesheetId).delete();
            await loadTimesheetData();
            showSuccess('Puantaj kaydı başarıyla silindi');
        }
    } catch (error) {
        console.error('Puantaj silinirken hata:', error);
        showError('Puantaj kaydı silinemedi');
    }
}

// Filter timesheet
function filterTimesheet() {
    const technicianFilter = document.getElementById('technicianFilter')?.value;
    const monthFilter = document.getElementById('monthFilter')?.value;
    const yearFilter = document.getElementById('yearFilter')?.value;
    
    let filteredData = [...timesheetData];
    
    // Filter by technician
    if (technicianFilter) {
        filteredData = filteredData.filter(record => record.technicianId === technicianFilter);
    }
    
    // Filter by month
    if (monthFilter) {
        const [year, month] = monthFilter.split('-');
        filteredData = filteredData.filter(record => {
            const recordDate = record.date;
            return recordDate.getFullYear() == year && (recordDate.getMonth() + 1) == month;
        });
    }
    
    // Filter by year
    if (yearFilter && !monthFilter) {
        filteredData = filteredData.filter(record => record.date.getFullYear() == yearFilter);
    }
    
    // Update table with filtered data
    const tableBody = document.getElementById('timesheetTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (filteredData.length === 0) {
            if (noDataMessage) noDataMessage.style.display = 'block';
        } else {
            if (noDataMessage) noDataMessage.style.display = 'none';
            filteredData.forEach(record => {
                const row = createTimesheetRow(record);
                tableBody.appendChild(row);
            });
        }
    }
    
    updateSummaryCards(filteredData);
}

// Export timesheet
function exportTimesheet() {
    try {
        const technicianFilter = document.getElementById('technicianFilter')?.value;
        const monthFilter = document.getElementById('monthFilter')?.value;
        const yearFilter = document.getElementById('yearFilter')?.value;
        
        let dataToExport = [...timesheetData];
        
        // Apply same filters as display
        if (technicianFilter) {
            dataToExport = dataToExport.filter(record => record.technicianId === technicianFilter);
        }
        
        if (monthFilter) {
            const [year, month] = monthFilter.split('-');
            dataToExport = dataToExport.filter(record => {
                const recordDate = record.date;
                return recordDate.getFullYear() == year && (recordDate.getMonth() + 1) == month;
            });
        }
        
        if (yearFilter && !monthFilter) {
            dataToExport = dataToExport.filter(record => record.date.getFullYear() == yearFilter);
        }
        
        if (dataToExport.length === 0) {
            showError('Dışa aktarılacak veri bulunamadı');
            return;
        }
        
        // Create CSV content
        const headers = ['Teknisyen', 'Tarih', 'Giriş Saati', 'Çıkış Saati', 'Toplam Saat', 'Mesai Saati', 'Durum', 'Notlar'];
        const csvContent = [
            headers.join(','),
            ...dataToExport.map(record => [
                record.technicianName || getTechnicianName(record.technicianId),
                record.date.toLocaleDateString('tr-TR'),
                record.startTime,
                record.endTime,
                record.totalHours,
                record.overtimeHours || 0,
                getStatusText(record.status),
                (record.notes || '').replace(/,/g, ';')
            ].join(','))
        ].join('\n');
        
        // Download file
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `puantaj_raporu_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showSuccess('Rapor başarıyla indirildi');
        
    } catch (error) {
        console.error('Rapor oluşturulurken hata:', error);
        showError('Rapor oluşturulamadı');
    }
}

// Show loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

// Show error message
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 3000);
}

// Navigation functions (from other pages)
function showGalleriesModal() {
    window.location.href = 'index.html#galleries';
}

function showPersonnelModal() {
    window.location.href = 'index.html#personnel';
}

// User profile functions
function showUserProfileModal() {
    if (!currentUser) return;
    
    const modal = document.getElementById('userProfileModal');
    const profileUserName = document.getElementById('profileUserName');
    const profileUserRole = document.getElementById('profileUserRole');
    const profileUserInitials = document.getElementById('profileUserInitials');
    
    if (profileUserName) profileUserName.textContent = currentUser.name || 'Kullanıcı';
    if (profileUserRole) profileUserRole.textContent = getRoleText(currentUserRole);
    
    if (profileUserInitials && currentUser.name) {
        const names = currentUser.name.split(' ');
        const initials = names.length >= 2 
            ? names[0].charAt(0) + names[names.length - 1].charAt(0)
            : names[0].charAt(0) + (names[0].charAt(1) || '');
        profileUserInitials.textContent = initials.toUpperCase();
    }
    
    // Clear form
    const form = document.getElementById('profileForm');
    if (form) form.reset();
    
    // Hide messages
    const errorMsg = document.getElementById('profileErrorMessage');
    const successMsg = document.getElementById('profileSuccessMessage');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

function getRoleText(role) {
    const roleMap = {
        'admin': 'Yönetici',
        'manager': 'Müdür',
        'technician': 'Teknisyen',
        'staff': 'Personel'
    };
    return roleMap[role] || role;
}

async function updateUserPassword() {
    try {
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const errorMsg = document.getElementById('profileErrorMessage');
        const successMsg = document.getElementById('profileSuccessMessage');
        
        // Hide previous messages
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            if (errorMsg) {
                errorMsg.textContent = 'Lütfen tüm alanları doldurun';
                errorMsg.style.display = 'block';
            }
            return;
        }
        
        if (newPassword !== confirmPassword) {
            if (errorMsg) {
                errorMsg.textContent = 'Yeni şifreler eşleşmiyor';
                errorMsg.style.display = 'block';
            }
            return;
        }
        
        if (newPassword.length < 6) {
            if (errorMsg) {
                errorMsg.textContent = 'Yeni şifre en az 6 karakter olmalıdır';
                errorMsg.style.display = 'block';
            }
            return;
        }
        
        // Verify current password
        if (currentUser.password !== currentPassword) {
            if (errorMsg) {
                errorMsg.textContent = 'Mevcut şifre hatalı';
                errorMsg.style.display = 'block';
            }
            return;
        }
        
        if (!window.db) {
            // Offline mode - simulate success
            if (successMsg) {
                successMsg.textContent = 'Şifre başarıyla güncellendi (offline mod)';
                successMsg.style.display = 'block';
            }
            
            // Clear form
            const form = document.getElementById('profileForm');
            if (form) form.reset();
            return;
        }
        
        // Update password in Firebase
        await db.collection('personnel').doc(currentUser.id).update({
            password: newPassword,
            updatedAt: new Date()
        });
        
        // Update current user data
        currentUser.password = newPassword;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        if (successMsg) {
            successMsg.textContent = 'Şifre başarıyla güncellendi';
            successMsg.style.display = 'block';
        }
        
        // Clear form
        const form = document.getElementById('profileForm');
        if (form) form.reset();
        
    } catch (error) {
        console.error('Şifre güncellenirken hata:', error);
        const errorMsg = document.getElementById('profileErrorMessage');
        if (errorMsg) {
            errorMsg.textContent = 'Şifre güncellenemedi';
            errorMsg.style.display = 'block';
        }
    }
}

// Logout function
function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// Check authentication without auth.js interference
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    debugLog('Timesheet auth check:', {
        isAuthenticated,
        currentPath
    });
    
    return isAuthenticated;
} 