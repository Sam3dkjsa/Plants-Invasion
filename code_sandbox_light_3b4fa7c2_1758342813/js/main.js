// Main JavaScript functionality for Invasive Plant Species Monitoring System

// Global variables
let currentSection = 'dashboard';
let currentPage = 1;
let speciesData = [];
let reportsData = [];
let currentUser = null;

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initializeApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
});

// Initialize the application
function initializeApp() {
    console.log('Initializing Invasive Plant Species Monitoring System...');
    
    // Show the dashboard section by default
    showSection('dashboard');
    
    // Initialize Tailwind config
    tailwind.config = {
        theme: {
            extend: {
                fontFamily: {
                    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
                }
            }
        }
    };
}

// Set up event listeners
function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Mobile navigation links
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            toggleMobileMenu(); // Close mobile menu
        });
    });
    
    // Species search and filters
    const speciesSearch = document.getElementById('species-search');
    if (speciesSearch) {
        speciesSearch.addEventListener('input', debounce(filterSpecies, 300));
    }
    
    const threatFilter = document.getElementById('threat-filter');
    if (threatFilter) {
        threatFilter.addEventListener('change', filterSpecies);
    }
    
    const habitatFilter = document.getElementById('habitat-filter');
    if (habitatFilter) {
        habitatFilter.addEventListener('change', filterSpecies);
    }
    
    // Report form
    const reportForm = document.getElementById('sighting-report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmission);
    }
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        currentSection = sectionName;
        
        // Update navigation active state
        updateNavigationState(sectionName);
        
        // Load section-specific data
        loadSectionData(sectionName);
    }
}

// Update navigation active state
function updateNavigationState(activeSection) {
    document.querySelectorAll('.nav-link').forEach(link => {
        const section = link.getAttribute('data-section');
        if (section === activeSection) {
            link.classList.add('text-green-600');
            link.classList.remove('text-gray-700');
        } else {
            link.classList.remove('text-green-600');
            link.classList.add('text-gray-700');
        }
    });
}

// Load section-specific data
async function loadSectionData(sectionName) {
    showLoading();
    
    try {
        switch (sectionName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'species':
                await loadSpeciesData();
                break;
            case 'map':
                await loadMapData();
                break;
            case 'report':
                await loadReportFormData();
                break;
            case 'analytics':
                await loadAnalyticsData();
                break;
        }
    } catch (error) {
        console.error('Error loading section data:', error);
        showError('Failed to load data. Please try again.');
    } finally {
        hideLoading();
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const stats = await invasiveSpeciesAPI.getSpeciesStats();
        
        // Update statistics cards
        document.getElementById('total-species').textContent = stats.totalSpecies;
        document.getElementById('active-reports').textContent = stats.activeReports;
        document.getElementById('total-contributors').textContent = stats.contributors;
        document.getElementById('monitoring-sites').textContent = stats.monitoringSites;
        
        // Load recent reports
        await loadRecentReports();
        
        // Load priority alerts
        await loadPriorityAlerts();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set fallback values
        document.getElementById('total-species').textContent = '0';
        document.getElementById('active-reports').textContent = '0';
        document.getElementById('total-contributors').textContent = '0';
        document.getElementById('monitoring-sites').textContent = '0';
    }
}

// Load recent reports for dashboard
async function loadRecentReports() {
    try {
        const recentReports = await invasiveSpeciesAPI.getRecentReports(5);
        const container = document.getElementById('recent-reports');
        
        if (recentReports.data && recentReports.data.length > 0) {
            container.innerHTML = recentReports.data.map(report => `
                <div class="border-l-4 border-blue-500 pl-4 py-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-medium text-gray-900">Report #${report.id?.substring(0, 8) || 'Unknown'}</p>
                            <p class="text-sm text-gray-600">${report.location_description || 'Location not specified'}</p>
                            <p class="text-xs text-gray-500">${formatDate(report.report_date || report.created_at)}</p>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${getStatusColor(report.verification_status)}">
                            ${report.verification_status || 'Pending'}
                        </span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No recent reports available</p>';
        }
    } catch (error) {
        console.error('Error loading recent reports:', error);
        document.getElementById('recent-reports').innerHTML = '<p class="text-red-500 text-center py-4">Error loading reports</p>';
    }
}

// Load priority alerts for dashboard
async function loadPriorityAlerts() {
    try {
        const highRiskReports = await invasiveSpeciesAPI.getReportsByThreatLevel('High Risk');
        const immediateActionReports = await invasiveSpeciesAPI.getReportsByThreatLevel('Immediate Action Required');
        
        const allAlerts = [
            ...(highRiskReports.data || []),
            ...(immediateActionReports.data || [])
        ].slice(0, 5); // Show top 5 alerts
        
        const container = document.getElementById('priority-alerts');
        
        if (allAlerts.length > 0) {
            container.innerHTML = allAlerts.map(alert => `
                <div class="border-l-4 border-red-500 pl-4 py-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-medium text-gray-900">${alert.threat_assessment || 'High Priority'}</p>
                            <p class="text-sm text-gray-600">${alert.location_description || 'Location not specified'}</p>
                            <p class="text-xs text-gray-500">Population: ${alert.population_size || 'Unknown'}</p>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Alert
                        </span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No priority alerts at this time</p>';
        }
    } catch (error) {
        console.error('Error loading priority alerts:', error);
        document.getElementById('priority-alerts').innerHTML = '<p class="text-red-500 text-center py-4">Error loading alerts</p>';
    }
}

// Load species data for species section
async function loadSpeciesData() {
    try {
        const species = await invasiveSpeciesAPI.getSpecies({ limit: 50 });
        speciesData = species.data || [];
        displaySpecies(speciesData);
    } catch (error) {
        console.error('Error loading species data:', error);
        showError('Failed to load species data');
    }
}

// Display species in grid format
function displaySpecies(species) {
    const container = document.getElementById('species-grid');
    
    if (!species || species.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500">No species found</div>';
        return;
    }
    
    container.innerHTML = species.map(s => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden card-hover">
            <div class="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <i class="fas fa-seedling text-white text-4xl"></i>
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-semibold text-gray-900">${s.scientific_name || 'Unknown Species'}</h3>
                    <span class="px-2 py-1 text-xs rounded-full ${getThreatColor(s.threat_level)}">
                        ${s.threat_level || 'Unknown'}
                    </span>
                </div>
                <p class="text-gray-600 text-sm mb-3 line-clamp-3">${(s.description || '').substring(0, 150)}${s.description?.length > 150 ? '...' : ''}</p>
                <div class="space-y-2">
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-map-marked-alt mr-2"></i>
                        <span>Native to: ${s.native_range || 'Unknown'}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-calendar mr-2"></i>
                        <span>Flowers: ${s.flowering_period || 'Unknown'}</span>
                    </div>
                </div>
                <button onclick="showSpeciesDetail('${s.id}')" class="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Filter species based on search and filters
function filterSpecies() {
    const searchTerm = document.getElementById('species-search').value.toLowerCase();
    const threatFilter = document.getElementById('threat-filter').value;
    const habitatFilter = document.getElementById('habitat-filter').value;
    
    let filtered = speciesData;
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(s => 
            (s.scientific_name || '').toLowerCase().includes(searchTerm) ||
            (s.description || '').toLowerCase().includes(searchTerm) ||
            (s.common_names || []).some(name => name.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply threat level filter
    if (threatFilter) {
        filtered = filtered.filter(s => s.threat_level === threatFilter);
    }
    
    // Apply habitat filter
    if (habitatFilter) {
        filtered = filtered.filter(s => 
            (s.habitat_types || []).includes(habitatFilter)
        );
    }
    
    displaySpecies(filtered);
}

// Load report form data
async function loadReportFormData() {
    try {
        const species = await invasiveSpeciesAPI.getSpecies({ limit: 100 });
        const speciesSelect = document.getElementById('species-select');
        
        if (speciesSelect && species.data) {
            speciesSelect.innerHTML = '<option value="">Select a species...</option>' +
                species.data.map(s => `<option value="${s.id}">${s.scientific_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading report form data:', error);
    }
}

// Handle report form submission
async function handleReportSubmission(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const formData = new FormData(event.target);
        const reportData = {
            species_id: document.getElementById('species-select').value,
            confidence_level: document.getElementById('confidence-level').value,
            latitude: parseFloat(document.getElementById('latitude').value),
            longitude: parseFloat(document.getElementById('longitude').value),
            location_description: document.getElementById('location-description').value,
            population_size: document.getElementById('population-size').value,
            threat_assessment: document.getElementById('threat-assessment').value,
            reporter_name: document.getElementById('reporter-name').value,
            reporter_email: document.getElementById('reporter-email').value,
            reporter_type: document.getElementById('reporter-type').value,
            habitat_description: document.getElementById('habitat-description').value,
            notes: document.getElementById('additional-notes').value,
            follow_up_required: document.getElementById('follow-up-required').checked,
            verification_status: 'Pending'
        };
        
        await invasiveSpeciesAPI.createReport(reportData);
        showSuccess('Report submitted successfully! Thank you for your contribution.');
        event.target.reset();
        
        // Optionally redirect to dashboard
        setTimeout(() => showSection('dashboard'), 2000);
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showError('Failed to submit report. Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle login/registration
async function handleLogin(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const email = document.getElementById('login-email').value;
        const name = document.getElementById('login-name').value;
        const userType = document.getElementById('login-user-type').value;
        
        const user = await invasiveSpeciesAPI.authenticateUser(email, name, userType);
        currentUser = user;
        
        showSuccess(`Welcome, ${user.full_name}!`);
        hideLogin();
        
        // Update UI to show logged-in state
        updateLoginState(user);
        
    } catch (error) {
        console.error('Login failed:', error);
        showError('Login failed. Please try again.');
    } finally {
        hideLoading();
    }
}

// Update UI for logged-in user
function updateLoginState(user) {
    // This would update the UI to show user info, logout button, etc.
    console.log('User logged in:', user);
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
                document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
                showSuccess('Location detected successfully!');
            },
            function(error) {
                console.error('Error getting location:', error);
                showError('Unable to get current location. Please enter coordinates manually.');
            }
        );
    } else {
        showError('Geolocation is not supported by this browser.');
    }
}

// Show species detail modal (placeholder)
function showSpeciesDetail(speciesId) {
    // This would show a detailed modal with full species information
    console.log('Show species detail for:', speciesId);
    showSuccess('Species detail view coming soon!');
}

// Export data functionality
function exportData(dataType) {
    // This would implement data export functionality
    console.log('Export data:', dataType);
    showSuccess(`Exporting ${dataType} data... Feature coming soon!`);
}

// Utility functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
}

function showLogin() {
    document.getElementById('login-modal').classList.remove('hidden');
}

function hideLogin() {
    document.getElementById('login-modal').classList.add('hidden');
}

function showLoading() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

function showSuccess(message) {
    const element = document.getElementById('success-message');
    document.getElementById('success-text').textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
}

function showError(message) {
    const element = document.getElementById('error-message');
    document.getElementById('error-text').textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getStatusColor(status) {
    switch (status) {
        case 'Verified': return 'bg-green-100 text-green-800';
        case 'Pending': return 'bg-yellow-100 text-yellow-800';
        case 'Rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getThreatColor(threatLevel) {
    switch (threatLevel) {
        case 'Severe': return 'bg-red-100 text-red-800';
        case 'High': return 'bg-orange-100 text-orange-800';
        case 'Moderate': return 'bg-yellow-100 text-yellow-800';
        case 'Low': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function debounce(func, wait) {
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