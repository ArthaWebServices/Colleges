const BOOKMARKS_KEY = 'gsc_bookmarked_announcements';

/**
 * Get list of bookmarked announcement IDs
 * @returns {string[]} Array of announcement IDs
 */
export const getBookmarks = () => {
  try {
    const data = localStorage.getItem(BOOKMARKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[Bookmarks Error]: Failed to load bookmarks from localStorage', err);
    return [];
  }
};

/**
 * Check if a specific announcement is bookmarked
 * @param {string} id - Announcement ID
 * @returns {boolean}
 */
export const isBookmarked = (id) => {
  if (!id) return false;
  const bookmarks = getBookmarks();
  return bookmarks.includes(id);
};

/**
 * Toggle bookmark status for an announcement
 * @param {string} id - Announcement ID
 * @returns {boolean} New bookmark state (true = bookmarked, false = removed)
 */
export const toggleBookmark = (id) => {
  if (!id) return false;
  const bookmarks = getBookmarks();
  const index = bookmarks.indexOf(id);
  let updated = [];

  if (index >= 0) {
    updated = bookmarks.filter((bId) => bId !== id);
  } else {
    updated = [...bookmarks, id];
  }

  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[Bookmarks Error]: Failed to update localStorage', err);
  }

  return index < 0; // Return true if newly added, false if removed
};
