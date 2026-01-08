// Admin Module for Merritt's Men

const Admin = {
    currentTab: 'users',

    // ============================================
    // TAB MANAGEMENT
    // ============================================
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === `${tabName}-section`);
        });

        // Load data for the tab
        this.loadTabData(tabName);
    },

    async loadTabData(tabName) {
        switch (tabName) {
            case 'users':
                await this.loadUsers();
                break;
            case 'groups':
                await this.loadGroups();
                break;
            case 'books':
                await this.loadBooks();
                break;
        }
    },

    // ============================================
    // USERS MANAGEMENT
    // ============================================
    async loadUsers() {
        const container = document.getElementById('users-table-body');
        container.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>';

        try {
            const { data: users, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.renderUsers(users, container);
        } catch (error) {
            container.innerHTML = `<tr><td colspan="5" class="alert alert-error">${error.message}</td></tr>`;
        }
    },

    renderUsers(users, container) {
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
            return;
        }

        container.innerHTML = users.map(user => `
            <tr>
                <td>${this.escapeHtml(user.full_name || 'N/A')}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    ${user.approved
                        ? '<span class="badge badge-approved">Approved</span>'
                        : '<span class="badge badge-pending">Pending</span>'}
                    ${user.is_admin ? '<span class="badge badge-admin">Admin</span>' : ''}
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="admin-actions">
                    ${!user.approved ? `
                        <button class="btn btn-sm btn-primary approve-user-btn" data-user-id="${user.id}">
                            Approve
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-ghost revoke-user-btn" data-user-id="${user.id}">
                            Revoke
                        </button>
                    `}
                    ${!user.is_admin ? `
                        <button class="btn btn-sm btn-outline make-admin-btn" data-user-id="${user.id}">
                            Make Admin
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        // Attach event listeners
        container.querySelectorAll('.approve-user-btn').forEach(btn => {
            btn.addEventListener('click', () => this.approveUser(btn.dataset.userId));
        });

        container.querySelectorAll('.revoke-user-btn').forEach(btn => {
            btn.addEventListener('click', () => this.revokeUser(btn.dataset.userId));
        });

        container.querySelectorAll('.make-admin-btn').forEach(btn => {
            btn.addEventListener('click', () => this.makeAdmin(btn.dataset.userId));
        });
    },

    async approveUser(userId) {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({ approved: true })
                .eq('id', userId);

            if (error) throw error;
            await this.loadUsers();
        } catch (error) {
            alert('Failed to approve user: ' + error.message);
        }
    },

    async revokeUser(userId) {
        if (!confirm('Are you sure you want to revoke this user\'s access?')) return;

        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({ approved: false, is_admin: false })
                .eq('id', userId);

            if (error) throw error;
            await this.loadUsers();
        } catch (error) {
            alert('Failed to revoke user: ' + error.message);
        }
    },

    async makeAdmin(userId) {
        if (!confirm('Are you sure you want to make this user an admin?')) return;

        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({ is_admin: true, approved: true })
                .eq('id', userId);

            if (error) throw error;
            await this.loadUsers();
        } catch (error) {
            alert('Failed to make admin: ' + error.message);
        }
    },

    // ============================================
    // GROUPS MANAGEMENT
    // ============================================
    async loadGroups() {
        const container = document.getElementById('groups-list');
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const { data: groups, error: groupsError } = await supabaseClient
                .from('groups')
                .select('*')
                .order('year', { ascending: false });

            if (groupsError) throw groupsError;

            const { data: members, error: membersError } = await supabaseClient
                .from('members')
                .select('*')
                .order('position', { ascending: true });

            if (membersError) throw membersError;

            const groupsWithMembers = groups.map(g => ({
                ...g,
                members: members.filter(m => m.group_id === g.id)
            }));

            this.renderGroupsAdmin(groupsWithMembers, container);
        } catch (error) {
            container.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
        }
    },

    renderGroupsAdmin(groups, container) {
        container.innerHTML = `
            <div class="flex-between" style="margin-bottom: var(--spacing-lg);">
                <h3>Manage Groups</h3>
                <button class="btn btn-accent" id="add-group-btn">+ Add Group</button>
            </div>
            ${groups.length === 0 ? `
                <div class="card"><div class="card-body text-center">No groups yet. Add the first one!</div></div>
            ` : groups.map(group => `
                <div class="card group-card" style="margin-bottom: var(--spacing-lg);">
                    <div class="card-header">
                        <div class="flex-between">
                            <h4>Group ${group.group_number} - ${group.year}</h4>
                            <div class="flex gap-sm">
                                <button class="btn btn-sm btn-ghost edit-group-btn"
                                        data-group-id="${group.id}"
                                        data-group-number="${group.group_number}"
                                        data-year="${group.year}">
                                    Edit
                                </button>
                                <button class="btn btn-sm btn-ghost delete-group-btn"
                                        data-group-id="${group.id}"
                                        style="color: var(--error);">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="flex-between" style="margin-bottom: var(--spacing-md);">
                            <h5>Members</h5>
                            <button class="btn btn-sm btn-outline add-member-btn" data-group-id="${group.id}">
                                + Add Member
                            </button>
                        </div>
                        ${group.members.length === 0 ? `
                            <p style="color: var(--gray-500);">No members yet.</p>
                        ` : `
                            <ul class="member-list">
                                ${group.members.map(member => `
                                    <li class="member-item" style="justify-content: space-between;">
                                        <div class="flex gap-sm" style="align-items: center;">
                                            <span class="member-number">${member.position}</span>
                                            <span class="member-name">${this.escapeHtml(member.name)}</span>
                                        </div>
                                        <div class="flex gap-sm">
                                            <button class="btn btn-sm btn-ghost edit-member-btn"
                                                    data-member-id="${member.id}"
                                                    data-name="${this.escapeHtml(member.name)}"
                                                    data-position="${member.position}"
                                                    data-group-id="${group.id}">
                                                Edit
                                            </button>
                                            <button class="btn btn-sm btn-ghost delete-member-btn"
                                                    data-member-id="${member.id}"
                                                    style="color: var(--error);">
                                                &times;
                                            </button>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        `}
                    </div>
                </div>
            `).join('')}
        `;

        // Event listeners
        document.getElementById('add-group-btn')?.addEventListener('click', () => this.showGroupModal());

        container.querySelectorAll('.edit-group-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showGroupModal(
                btn.dataset.groupId,
                btn.dataset.groupNumber,
                btn.dataset.year
            ));
        });

        container.querySelectorAll('.delete-group-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteGroup(btn.dataset.groupId));
        });

        container.querySelectorAll('.add-member-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showMemberModal(btn.dataset.groupId));
        });

        container.querySelectorAll('.edit-member-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showMemberModal(
                btn.dataset.groupId,
                btn.dataset.memberId,
                btn.dataset.name,
                btn.dataset.position
            ));
        });

        container.querySelectorAll('.delete-member-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteMember(btn.dataset.memberId));
        });
    },

    showGroupModal(id = null, groupNumber = '', year = '') {
        const isEdit = id !== null;
        document.getElementById('group-modal-title').textContent = isEdit ? 'Edit Group' : 'Add Group';
        document.getElementById('group-number').value = groupNumber;
        document.getElementById('group-year').value = year;
        document.getElementById('save-group-btn').dataset.groupId = id || '';
        document.getElementById('group-modal').classList.add('open');
    },

    hideGroupModal() {
        document.getElementById('group-modal').classList.remove('open');
    },

    async saveGroup() {
        const groupId = document.getElementById('save-group-btn').dataset.groupId;
        const groupNumber = parseInt(document.getElementById('group-number').value);
        const year = parseInt(document.getElementById('group-year').value);

        if (!groupNumber || !year) {
            alert('Please fill in all fields');
            return;
        }

        try {
            if (groupId) {
                const { error } = await supabaseClient
                    .from('groups')
                    .update({ group_number: groupNumber, year })
                    .eq('id', groupId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('groups')
                    .insert({ group_number: groupNumber, year });
                if (error) throw error;
            }

            this.hideGroupModal();
            await this.loadGroups();
        } catch (error) {
            alert('Failed to save group: ' + error.message);
        }
    },

    async deleteGroup(groupId) {
        if (!confirm('Are you sure? This will delete all members in this group.')) return;

        try {
            const { error } = await supabaseClient
                .from('groups')
                .delete()
                .eq('id', groupId);
            if (error) throw error;
            await this.loadGroups();
        } catch (error) {
            alert('Failed to delete group: ' + error.message);
        }
    },

    showMemberModal(groupId, memberId = null, name = '', position = '') {
        const isEdit = memberId !== null;
        document.getElementById('member-modal-title').textContent = isEdit ? 'Edit Member' : 'Add Member';
        document.getElementById('member-name').value = name;
        document.getElementById('member-position').value = position;
        document.getElementById('save-member-btn').dataset.memberId = memberId || '';
        document.getElementById('save-member-btn').dataset.groupId = groupId;
        document.getElementById('member-modal').classList.add('open');
    },

    hideMemberModal() {
        document.getElementById('member-modal').classList.remove('open');
    },

    async saveMember() {
        const memberId = document.getElementById('save-member-btn').dataset.memberId;
        const groupId = document.getElementById('save-member-btn').dataset.groupId;
        const name = document.getElementById('member-name').value.trim();
        const position = parseInt(document.getElementById('member-position').value);

        if (!name || !position) {
            alert('Please fill in all fields');
            return;
        }

        try {
            if (memberId) {
                const { error } = await supabaseClient
                    .from('members')
                    .update({ name, position })
                    .eq('id', memberId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('members')
                    .insert({ group_id: groupId, name, position });
                if (error) throw error;
            }

            this.hideMemberModal();
            await this.loadGroups();
        } catch (error) {
            alert('Failed to save member: ' + error.message);
        }
    },

    async deleteMember(memberId) {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            const { error } = await supabaseClient
                .from('members')
                .delete()
                .eq('id', memberId);
            if (error) throw error;
            await this.loadGroups();
        } catch (error) {
            alert('Failed to delete member: ' + error.message);
        }
    },

    // ============================================
    // BOOKS MANAGEMENT
    // ============================================
    async loadBooks() {
        const container = document.getElementById('books-list');
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const { data: books, error } = await supabaseClient
                .from('books')
                .select('*')
                .order('year', { ascending: false });

            if (error) throw error;
            this.renderBooksAdmin(books, container);
        } catch (error) {
            container.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
        }
    },

    renderBooksAdmin(books, container) {
        container.innerHTML = `
            <div class="flex-between" style="margin-bottom: var(--spacing-lg);">
                <h3>Manage Books</h3>
                <button class="btn btn-accent" id="add-book-btn">+ Add Book</button>
            </div>
            ${books.length === 0 ? `
                <div class="card"><div class="card-body text-center">No books yet. Add the first one!</div></div>
            ` : `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Year</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td>${this.escapeHtml(book.title)}</td>
                                <td>${this.escapeHtml(book.author)}</td>
                                <td><span class="book-year">${book.year}</span></td>
                                <td class="admin-actions">
                                    <button class="btn btn-sm btn-ghost edit-book-btn"
                                            data-book-id="${book.id}"
                                            data-title="${this.escapeHtml(book.title)}"
                                            data-author="${this.escapeHtml(book.author)}"
                                            data-year="${book.year}">
                                        Edit
                                    </button>
                                    <button class="btn btn-sm btn-ghost delete-book-btn"
                                            data-book-id="${book.id}"
                                            style="color: var(--error);">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        `;

        // Event listeners
        document.getElementById('add-book-btn')?.addEventListener('click', () => this.showBookModal());

        container.querySelectorAll('.edit-book-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showBookModal(
                btn.dataset.bookId,
                btn.dataset.title,
                btn.dataset.author,
                btn.dataset.year
            ));
        });

        container.querySelectorAll('.delete-book-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteBook(btn.dataset.bookId));
        });
    },

    showBookModal(id = null, title = '', author = '', year = '') {
        const isEdit = id !== null;
        document.getElementById('book-modal-title').textContent = isEdit ? 'Edit Book' : 'Add Book';
        document.getElementById('book-title').value = title;
        document.getElementById('book-author').value = author;
        document.getElementById('book-year').value = year;
        document.getElementById('save-book-btn').dataset.bookId = id || '';
        document.getElementById('book-modal').classList.add('open');
    },

    hideBookModal() {
        document.getElementById('book-modal').classList.remove('open');
    },

    async saveBook() {
        const bookId = document.getElementById('save-book-btn').dataset.bookId;
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim();
        const year = parseInt(document.getElementById('book-year').value);

        if (!title || !author || !year) {
            alert('Please fill in all fields');
            return;
        }

        try {
            if (bookId) {
                const { error } = await supabaseClient
                    .from('books')
                    .update({ title, author, year })
                    .eq('id', bookId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('books')
                    .insert({ title, author, year });
                if (error) throw error;
            }

            this.hideBookModal();
            await this.loadBooks();
        } catch (error) {
            alert('Failed to save book: ' + error.message);
        }
    },

    async deleteBook(bookId) {
        if (!confirm('Are you sure? This will delete all reviews for this book.')) return;

        try {
            const { error } = await supabaseClient
                .from('books')
                .delete()
                .eq('id', bookId);
            if (error) throw error;
            await this.loadBooks();
        } catch (error) {
            alert('Failed to delete book: ' + error.message);
        }
    },

    // ============================================
    // HELPERS
    // ============================================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
