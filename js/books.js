// Books Module for Merritt's Men

const Books = {
    // Fetch all books with their reviews
    async fetchBooks() {
        const { data: books, error: booksError } = await supabaseClient
            .from('books')
            .select(`
                *,
                groups:group_id (id, group_number, year)
            `)
            .order('created_at', { ascending: false });

        if (booksError) {
            throw new Error(booksError.message);
        }

        // Fetch reviews with user profiles
        const { data: reviews, error: reviewsError } = await supabaseClient
            .from('book_reviews')
            .select(`
                *,
                profiles:user_id (full_name)
            `)
            .order('created_at', { ascending: false });

        if (reviewsError) {
            throw new Error(reviewsError.message);
        }

        // Organize reviews by book
        const booksWithReviews = books.map(book => ({
            ...book,
            reviews: reviews.filter(r => r.book_id === book.id)
        }));

        // Group books by group (using group_id as key)
        const booksByGroup = {};
        booksWithReviews.forEach(book => {
            const groupKey = book.group_id || 'unassigned';
            if (!booksByGroup[groupKey]) {
                booksByGroup[groupKey] = {
                    group: book.groups,
                    books: []
                };
            }
            booksByGroup[groupKey].books.push(book);
        });

        return booksByGroup;
    },

    // Upload a review file
    async uploadReview(bookId, file) {
        const userId = Auth.getUser().id;
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${bookId}_${Date.now()}.${fileExt}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('reviews')
            .upload(fileName, file);

        if (uploadError) {
            throw new Error(uploadError.message);
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from('reviews')
            .getPublicUrl(fileName);

        // Create review record
        const { data: review, error: reviewError } = await supabaseClient
            .from('book_reviews')
            .insert({
                book_id: bookId,
                user_id: userId,
                file_url: fileName,
                file_name: file.name
            })
            .select()
            .single();

        if (reviewError) {
            throw new Error(reviewError.message);
        }

        return review;
    },

    // Download a review file
    async downloadReview(fileUrl, fileName) {
        const { data, error } = await supabaseClient.storage
            .from('reviews')
            .download(fileUrl);

        if (error) {
            throw new Error(error.message);
        }

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Delete a review
    async deleteReview(reviewId, fileUrl) {
        // Delete file from storage
        const { error: storageError } = await supabaseClient.storage
            .from('reviews')
            .remove([fileUrl]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
        }

        // Delete review record
        const { error: dbError } = await supabaseClient
            .from('book_reviews')
            .delete()
            .eq('id', reviewId);

        if (dbError) {
            throw new Error(dbError.message);
        }
    },

    // Render books to the page
    renderBooks(booksByGroup, container) {
        const groupKeys = Object.keys(booksByGroup).sort((a, b) => {
            // Sort by year descending, with unassigned at the end
            if (a === 'unassigned') return 1;
            if (b === 'unassigned') return -1;
            const groupA = booksByGroup[a].group;
            const groupB = booksByGroup[b].group;
            return (groupB?.year || 0) - (groupA?.year || 0);
        });

        if (groupKeys.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body text-center">
                        <p style="color: var(--gray-500);">No books have been added yet.</p>
                    </div>
                </div>
            `;
            return;
        }

        const currentUserId = Auth.getUser().id;
        const isAdmin = Auth.isAdmin();

        container.innerHTML = groupKeys.map(groupKey => {
            const { group, books } = booksByGroup[groupKey];
            const groupLabel = group ? `Group ${group.group_number} - ${group.year}` : 'Unassigned';

            return `
            <div class="year-section" style="margin-bottom: var(--spacing-2xl);">
                <h2 style="margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-sm);">
                    <span class="book-year">${groupLabel}</span>
                    Books
                </h2>
                <div class="grid grid-2">
                    ${books.map(book => `
                        <div class="card book-card" data-book-id="${book.id}">
                            <div class="card-body">
                                <div class="book-info">
                                    <h4>${book.title}</h4>
                                    <p class="book-author">by ${book.author}</p>
                                </div>

                                <div class="reviews-list">
                                    <h5>Reviews (${book.reviews.length})</h5>
                                    ${book.reviews.length > 0 ? book.reviews.map(review => `
                                        <div class="review-item">
                                            <div class="review-info">
                                                <span class="review-author">${review.profiles?.full_name || 'Unknown'}</span>
                                                <span class="review-date"> - ${new Date(review.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div class="flex gap-sm">
                                                <button class="btn btn-sm btn-ghost download-review-btn"
                                                        data-file-url="${review.file_url}"
                                                        data-file-name="${review.file_name}">
                                                    Download
                                                </button>
                                                ${review.user_id === currentUserId || isAdmin ? `
                                                    <button class="btn btn-sm btn-ghost delete-review-btn"
                                                            data-review-id="${review.id}"
                                                            data-file-url="${review.file_url}"
                                                            style="color: var(--error);">
                                                        Delete
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <p style="color: var(--gray-500); font-size: 0.875rem;">No reviews yet. Be the first!</p>
                                    `}
                                </div>

                                <div class="upload-section" style="margin-top: var(--spacing-md);">
                                    <div class="file-input-wrapper">
                                        <input type="file"
                                               class="file-input review-file-input"
                                               data-book-id="${book.id}"
                                               accept=".pdf,.doc,.docx,.txt">
                                        <div class="file-input-label">
                                            <span>+ Upload Review (PDF, DOC, TXT)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `}).join('');

        // Add event listeners
        this.attachEventListeners(container);
    },

    // Attach event listeners for buttons
    attachEventListeners(container) {
        // Download buttons
        container.querySelectorAll('.download-review-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const fileUrl = btn.dataset.fileUrl;
                const fileName = btn.dataset.fileName;

                btn.disabled = true;
                btn.textContent = 'Downloading...';

                try {
                    await this.downloadReview(fileUrl, fileName);
                } catch (error) {
                    alert('Download failed: ' + error.message);
                }

                btn.disabled = false;
                btn.textContent = 'Download';
            });
        });

        // Delete buttons
        container.querySelectorAll('.delete-review-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to delete this review?')) return;

                const reviewId = btn.dataset.reviewId;
                const fileUrl = btn.dataset.fileUrl;

                btn.disabled = true;
                btn.textContent = 'Deleting...';

                try {
                    await this.deleteReview(reviewId, fileUrl);
                    // Reload books
                    window.loadBooks();
                } catch (error) {
                    alert('Delete failed: ' + error.message);
                    btn.disabled = false;
                    btn.textContent = 'Delete';
                }
            });
        });

        // File upload inputs
        container.querySelectorAll('.review-file-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const bookId = input.dataset.bookId;
                const label = input.nextElementSibling;

                label.innerHTML = '<span>Uploading...</span>';

                try {
                    await this.uploadReview(bookId, file);
                    // Reload books
                    window.loadBooks();
                } catch (error) {
                    alert('Upload failed: ' + error.message);
                    label.innerHTML = '<span>+ Upload Review (PDF, DOC, TXT)</span>';
                }

                input.value = '';
            });
        });
    },

    // Render loading skeleton
    renderLoading(container) {
        container.innerHTML = `
            <div class="year-section">
                <div class="skeleton" style="height: 32px; width: 150px; margin-bottom: var(--spacing-lg);"></div>
                <div class="grid grid-2">
                    ${Array(4).fill('').map(() => `
                        <div class="card book-card">
                            <div class="card-body">
                                <div class="skeleton" style="height: 24px; width: 80%; margin-bottom: var(--spacing-sm);"></div>
                                <div class="skeleton" style="height: 18px; width: 50%; margin-bottom: var(--spacing-lg);"></div>
                                <div class="skeleton" style="height: 100px; width: 100%;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};
