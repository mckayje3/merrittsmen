// Testimonials Module for Merritt's Men

const Testimonials = {
    // Fetch all testimonials
    async fetchTestimonials() {
        const { data, error } = await supabaseClient
            .from('testimonials')
            .select(`
                *,
                profiles:user_id (full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    },

    // Create a new testimonial
    async createTestimonial(title, content) {
        const userId = Auth.getUser().id;

        const { data, error } = await supabaseClient
            .from('testimonials')
            .insert({
                user_id: userId,
                title,
                content
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data;
    },

    // Update a testimonial
    async updateTestimonial(id, title, content) {
        const { data, error } = await supabaseClient
            .from('testimonials')
            .update({ title, content })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data;
    },

    // Delete a testimonial
    async deleteTestimonial(id) {
        const { error } = await supabaseClient
            .from('testimonials')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(error.message);
        }
    },

    // Render testimonials to the page
    renderTestimonials(testimonials, container) {
        const currentUserId = Auth.getUser().id;
        const isAdmin = Auth.isAdmin();

        if (!testimonials || testimonials.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body text-center">
                        <p style="color: var(--gray-500);">No testimonials have been shared yet. Be the first!</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = testimonials.map(testimonial => `
            <div class="card testimonial-card" data-testimonial-id="${testimonial.id}">
                <div class="card-body">
                    <h4 style="margin-bottom: var(--spacing-sm);">${this.escapeHtml(testimonial.title)}</h4>
                    <div class="testimonial-content">
                        ${this.escapeHtml(testimonial.content).replace(/\n/g, '<br>')}
                    </div>
                    <div class="testimonial-author">
                        <div class="testimonial-author-info">
                            ${testimonial.profiles?.full_name || 'Anonymous'}
                            <span>${new Date(testimonial.created_at).toLocaleDateString()}</span>
                        </div>
                        ${testimonial.user_id === currentUserId || isAdmin ? `
                            <div class="flex gap-sm" style="margin-left: auto;">
                                ${testimonial.user_id === currentUserId ? `
                                    <button class="btn btn-sm btn-ghost edit-testimonial-btn"
                                            data-testimonial-id="${testimonial.id}"
                                            data-title="${this.escapeHtml(testimonial.title)}"
                                            data-content="${this.escapeHtml(testimonial.content)}">
                                        Edit
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-ghost delete-testimonial-btn"
                                        data-testimonial-id="${testimonial.id}"
                                        style="color: var(--error);">
                                    Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        this.attachEventListeners(container);
    },

    // Attach event listeners
    attachEventListeners(container) {
        // Edit buttons
        container.querySelectorAll('.edit-testimonial-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.testimonialId;
                const title = btn.dataset.title;
                const content = btn.dataset.content;
                this.showEditModal(id, title, content);
            });
        });

        // Delete buttons
        container.querySelectorAll('.delete-testimonial-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to delete this testimonial?')) return;

                const id = btn.dataset.testimonialId;

                btn.disabled = true;
                btn.textContent = 'Deleting...';

                try {
                    await this.deleteTestimonial(id);
                    window.loadTestimonials();
                } catch (error) {
                    alert('Delete failed: ' + error.message);
                    btn.disabled = false;
                    btn.textContent = 'Delete';
                }
            });
        });
    },

    // Show the create/edit modal
    showEditModal(id = null, title = '', content = '') {
        const isEdit = id !== null;
        const modal = document.getElementById('testimonial-modal');
        const modalTitle = document.getElementById('modal-title');
        const titleInput = document.getElementById('testimonial-title');
        const contentInput = document.getElementById('testimonial-content');
        const submitBtn = document.getElementById('submit-testimonial-btn');

        modalTitle.textContent = isEdit ? 'Edit Testimonial' : 'Share Your Story';
        titleInput.value = title;
        contentInput.value = content;
        submitBtn.textContent = isEdit ? 'Save Changes' : 'Share Testimonial';
        submitBtn.dataset.testimonialId = id || '';

        modal.classList.add('open');
    },

    // Hide modal
    hideModal() {
        const modal = document.getElementById('testimonial-modal');
        modal.classList.remove('open');
    },

    // Handle form submission
    async handleSubmit(e) {
        e.preventDefault();

        const titleInput = document.getElementById('testimonial-title');
        const contentInput = document.getElementById('testimonial-content');
        const submitBtn = document.getElementById('submit-testimonial-btn');
        const testimonialId = submitBtn.dataset.testimonialId;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            alert('Please fill in all fields');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            if (testimonialId) {
                await this.updateTestimonial(testimonialId, title, content);
            } else {
                await this.createTestimonial(title, content);
            }

            this.hideModal();
            window.loadTestimonials();
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }

        submitBtn.disabled = false;
        submitBtn.textContent = testimonialId ? 'Save Changes' : 'Share Testimonial';
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Render loading skeleton
    renderLoading(container) {
        container.innerHTML = Array(3).fill('').map(() => `
            <div class="card testimonial-card">
                <div class="card-body">
                    <div class="skeleton" style="height: 24px; width: 60%; margin-bottom: var(--spacing-md);"></div>
                    <div class="skeleton" style="height: 80px; width: 100%; margin-bottom: var(--spacing-md);"></div>
                    <div class="skeleton" style="height: 20px; width: 40%;"></div>
                </div>
            </div>
        `).join('');
    }
};
