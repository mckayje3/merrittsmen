// Authentication Module for Merritt's Men

const Auth = {
    // Current user state
    user: null,
    profile: null,

    // Initialize auth state listener
    async init() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.user = session.user;
            await this.loadProfile();
        }

        // Listen for auth changes
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.user = session.user;
                await this.loadProfile();
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
            }
        });
    },

    // Load user profile from database
    async loadProfile() {
        if (!this.user) return null;

        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();

        if (error) {
            console.error('Error loading profile:', error);
            return null;
        }

        this.profile = data;
        return data;
    },

    // Register a new user
    async register(email, password, fullName) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    },

    // Login user
    async login(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error(error.message);
        }

        this.user = data.user;
        await this.loadProfile();
        return data;
    },

    // Logout user
    async logout() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            throw new Error(error.message);
        }
        this.user = null;
        this.profile = null;
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.user !== null;
    },

    // Check if user is approved
    isApproved() {
        return this.profile && this.profile.approved === true;
    },

    // Check if user is admin
    isAdmin() {
        return this.profile && this.profile.is_admin === true && this.profile.approved === true;
    },

    // Get current user
    getUser() {
        return this.user;
    },

    // Get current profile
    getProfile() {
        return this.profile;
    },

    // Protect a page - redirect if not authenticated
    async requireAuth() {
        await this.init();

        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }

        if (!this.isApproved()) {
            window.location.href = 'pending.html';
            return false;
        }

        return true;
    },

    // Protect admin pages
    async requireAdmin() {
        const isAuth = await this.requireAuth();
        if (!isAuth) return false;

        if (!this.isAdmin()) {
            window.location.href = 'groups.html';
            return false;
        }

        return true;
    },

    // Redirect logged-in users away from auth pages
    async redirectIfLoggedIn(destination = 'groups.html') {
        await this.init();

        if (this.isLoggedIn()) {
            if (this.isApproved()) {
                window.location.href = destination;
            } else {
                window.location.href = 'pending.html';
            }
            return true;
        }
        return false;
    }
};

// Navigation helper - update nav based on auth state
function updateNavigation() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    if (Auth.isLoggedIn() && Auth.isApproved()) {
        // Show authenticated navigation
        let adminLink = '';
        if (Auth.isAdmin()) {
            adminLink = '<li><a href="admin.html">Admin</a></li>';
        }

        navLinks.innerHTML = `
            <li><a href="groups.html">Groups</a></li>
            <li><a href="books.html">Books</a></li>
            <li><a href="testimonials.html">Testimonials</a></li>
            ${adminLink}
            <li><a href="#" id="logout-btn">Logout</a></li>
        `;

        // Add logout handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await Auth.logout();
                window.location.href = 'index.html';
            });
        }

        // Mark active link
        const currentPage = window.location.pathname.split('/').pop();
        navLinks.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    } else {
        // Show public navigation
        navLinks.innerHTML = `
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Register</a></li>
        `;
    }
}

// Mobile nav toggle
function initMobileNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
});
