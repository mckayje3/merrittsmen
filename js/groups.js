// Groups Module for Merritt's Men

const Groups = {
    // Fetch all groups with their members
    async fetchGroups() {
        const { data: groups, error: groupsError } = await supabaseClient
            .from('groups')
            .select('*')
            .order('year', { ascending: false });

        if (groupsError) {
            throw new Error(groupsError.message);
        }

        // Fetch members for all groups
        const { data: members, error: membersError } = await supabaseClient
            .from('members')
            .select('*')
            .order('position', { ascending: true });

        if (membersError) {
            throw new Error(membersError.message);
        }

        // Organize members by group
        const groupsWithMembers = groups.map(group => ({
            ...group,
            members: members.filter(m => m.group_id === group.id)
        }));

        return groupsWithMembers;
    },

    // Render groups to the page
    renderGroups(groups, container) {
        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body text-center">
                        <p style="color: var(--gray-500);">No groups have been added yet.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = groups.map(group => `
            <div class="card group-card">
                <div class="card-header card-header-accent">
                    <h3>Group ${group.group_number}</h3>
                    <span class="group-year">${group.year}</span>
                </div>
                <div class="card-body">
                    ${group.members && group.members.length > 0 ? `
                        <ul class="member-list">
                            ${group.members.map(member => `
                                <li class="member-item">
                                    <span class="member-number">${member.position}</span>
                                    <span class="member-name">${member.name}</span>
                                </li>
                            `).join('')}
                        </ul>
                    ` : `
                        <p style="color: var(--gray-500); text-align: center;">No members added yet.</p>
                    `}
                </div>
            </div>
        `).join('');
    },

    // Render loading skeleton
    renderLoading(container) {
        container.innerHTML = `
            <div class="card group-card">
                <div class="card-header">
                    <div class="skeleton" style="height: 24px; width: 100px;"></div>
                </div>
                <div class="card-body">
                    <div class="member-list">
                        ${Array(8).fill('').map(() => `
                            <div class="member-item">
                                <div class="skeleton" style="height: 28px; width: 28px; border-radius: 50%;"></div>
                                <div class="skeleton" style="height: 20px; width: 120px;"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="card group-card">
                <div class="card-header">
                    <div class="skeleton" style="height: 24px; width: 100px;"></div>
                </div>
                <div class="card-body">
                    <div class="member-list">
                        ${Array(8).fill('').map(() => `
                            <div class="member-item">
                                <div class="skeleton" style="height: 28px; width: 28px; border-radius: 50%;"></div>
                                <div class="skeleton" style="height: 20px; width: 120px;"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
};
