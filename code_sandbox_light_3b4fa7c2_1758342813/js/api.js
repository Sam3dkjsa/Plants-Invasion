// API utility functions for interacting with the RESTful Table API
class InvasiveSpeciesAPI {
    constructor() {
        this.baseURL = '';  // Use relative URLs
        this.currentUser = null;
    }

    // Generic API request handler
    async makeRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle empty responses (e.g., DELETE requests)
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Species API methods
    async getSpecies(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `tables/invasive_species${queryString ? '?' + queryString : ''}`;
        return await this.makeRequest(endpoint);
    }

    async getSpeciesById(id) {
        return await this.makeRequest(`tables/invasive_species/${id}`);
    }

    async createSpecies(speciesData) {
        return await this.makeRequest('tables/invasive_species', {
            method: 'POST',
            body: JSON.stringify(speciesData)
        });
    }

    async updateSpecies(id, speciesData) {
        return await this.makeRequest(`tables/invasive_species/${id}`, {
            method: 'PUT',
            body: JSON.stringify(speciesData)
        });
    }

    // Sighting Reports API methods
    async getReports(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `tables/sighting_reports${queryString ? '?' + queryString : ''}`;
        return await this.makeRequest(endpoint);
    }

    async getReportById(id) {
        return await this.makeRequest(`tables/sighting_reports/${id}`);
    }

    async createReport(reportData) {
        // Add timestamp to report
        reportData.report_date = new Date().toISOString();
        return await this.makeRequest('tables/sighting_reports', {
            method: 'POST',
            body: JSON.stringify(reportData)
        });
    }

    async updateReport(id, reportData) {
        return await this.makeRequest(`tables/sighting_reports/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(reportData)
        });
    }

    async verifyReport(id, verifierName, status) {
        return await this.updateReport(id, {
            verification_status: status,
            verified_by: verifierName
        });
    }

    // Monitoring Locations API methods
    async getMonitoringLocations(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `tables/monitoring_locations${queryString ? '?' + queryString : ''}`;
        return await this.makeRequest(endpoint);
    }

    async getLocationById(id) {
        return await this.makeRequest(`tables/monitoring_locations/${id}`);
    }

    async createLocation(locationData) {
        return await this.makeRequest('tables/monitoring_locations', {
            method: 'POST',
            body: JSON.stringify(locationData)
        });
    }

    async updateLocation(id, locationData) {
        return await this.makeRequest(`tables/monitoring_locations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(locationData)
        });
    }

    // Users API methods
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `tables/users${queryString ? '?' + queryString : ''}`;
        return await this.makeRequest(endpoint);
    }

    async getUserById(id) {
        return await this.makeRequest(`tables/users/${id}`);
    }

    async createUser(userData) {
        userData.registration_date = new Date().toISOString();
        userData.last_login = new Date().toISOString();
        userData.reports_submitted = 0;
        userData.reports_verified = 0;
        userData.active_status = true;
        
        return await this.makeRequest('tables/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id, userData) {
        return await this.makeRequest(`tables/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(userData)
        });
    }

    // Search and filtering methods
    async searchSpecies(query) {
        const params = {
            search: query,
            limit: 20
        };
        return await this.getSpecies(params);
    }

    async getReportsByThreatLevel(threatLevel) {
        const params = {
            search: threatLevel,
            limit: 100
        };
        return await this.getReports(params);
    }

    async getRecentReports(limit = 10) {
        const params = {
            limit: limit,
            sort: 'created_at'
        };
        return await this.getReports(params);
    }

    // Analytics methods
    async getSpeciesStats() {
        const species = await this.getSpecies({ limit: 1000 });
        const reports = await this.getReports({ limit: 1000 });
        const locations = await this.getMonitoringLocations({ limit: 1000 });
        const users = await this.getUsers({ limit: 1000 });

        return {
            totalSpecies: species.total || species.data?.length || 0,
            activeReports: reports.data?.filter(r => r.verification_status === 'Pending' || r.verification_status === 'Verified').length || 0,
            totalReports: reports.total || reports.data?.length || 0,
            monitoringSites: locations.total || locations.data?.length || 0,
            contributors: users.total || users.data?.length || 0,
            species: species.data || [],
            reports: reports.data || [],
            locations: locations.data || [],
            users: users.data || []
        };
    }

    // Threat level distribution
    getThreatLevelDistribution(species) {
        const distribution = {};
        species.forEach(s => {
            const threat = s.threat_level || 'Unknown';
            distribution[threat] = (distribution[threat] || 0) + 1;
        });
        return distribution;
    }

    // Habitat type distribution
    getHabitatDistribution(reports) {
        const distribution = {};
        reports.forEach(r => {
            // Extract habitat from habitat_description or use a default
            let habitat = 'Other';
            if (r.habitat_description) {
                const desc = r.habitat_description.toLowerCase();
                if (desc.includes('forest')) habitat = 'Forest';
                else if (desc.includes('wetland') || desc.includes('pond') || desc.includes('marsh')) habitat = 'Wetland';
                else if (desc.includes('grassland') || desc.includes('field')) habitat = 'Grassland';
                else if (desc.includes('coastal') || desc.includes('dune')) habitat = 'Coastal';
                else if (desc.includes('riparian') || desc.includes('stream') || desc.includes('river')) habitat = 'Riparian';
                else if (desc.includes('urban') || desc.includes('road') || desc.includes('parking')) habitat = 'Urban';
                else if (desc.includes('agricultural') || desc.includes('crop') || desc.includes('farm')) habitat = 'Agricultural';
            }
            distribution[habitat] = (distribution[habitat] || 0) + 1;
        });
        return distribution;
    }

    // Monthly reports trend
    getMonthlyReports(reports) {
        const monthly = {};
        const now = new Date();
        
        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = date.toISOString().substring(0, 7); // YYYY-MM format
            monthly[key] = 0;
        }

        // Count reports by month
        reports.forEach(report => {
            if (report.report_date || report.created_at) {
                const date = new Date(report.report_date || report.created_at);
                const key = date.toISOString().substring(0, 7);
                if (monthly.hasOwnProperty(key)) {
                    monthly[key]++;
                }
            }
        });

        return monthly;
    }

    // Verification status distribution
    getVerificationDistribution(reports) {
        const distribution = {};
        reports.forEach(r => {
            const status = r.verification_status || 'Unknown';
            distribution[status] = (distribution[status] || 0) + 1;
        });
        return distribution;
    }

    // User authentication simulation (simplified for static site)
    async authenticateUser(email, name, userType) {
        try {
            // Try to find existing user
            const users = await this.getUsers({ search: email, limit: 1 });
            let user;

            if (users.data && users.data.length > 0) {
                // User exists, update last login
                user = users.data[0];
                await this.updateUser(user.id, { last_login: new Date().toISOString() });
            } else {
                // Create new user
                const userData = {
                    username: email.split('@')[0], // Use email prefix as username
                    email: email,
                    full_name: name,
                    user_type: userType,
                    organization: 'Not specified',
                    expertise_level: 'Beginner',
                    location: 'Not specified',
                    specialization: [],
                    verified_identifier: false
                };
                user = await this.createUser(userData);
            }

            this.currentUser = user;
            return user;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Logout
    logout() {
        this.currentUser = null;
    }
}

// Create global API instance
const invasiveSpeciesAPI = new InvasiveSpeciesAPI();