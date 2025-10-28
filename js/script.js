/*
  Beginner-friendly script: fetches the class-provided APOD-like feed and renders a 9-day gallery.
  Fixes syntax errors and adds debug logging so the "Fetch Space Images" button works.
*/
const FEED_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json'; // class feed URL
const USE_APOD = false;                // set true to use NASA APOD API instead of class feed
const APOD_API_KEY = 'DEMO_KEY';       // replace with your API key when USE_APOD = true

document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const startDateInput = document.getElementById('startDate');
  const getImageBtn = document.getElementById('getImageBtn');
  const galleryEl = document.getElementById('gallery');
  const loadingEl = document.getElementById('loading');
  const didYouKnowEl = document.getElementById('didYouKnow');
  const modalEl = document.getElementById('modal');
  const modalImage = document.getElementById('modalImage');
  const modalTitle = document.getElementById('modalTitle');
  const modalDate = document.getElementById('modalDate');
  const modalExplanation = document.getElementById('modalExplanation');
  const modalClose = document.getElementById('modalClose');

  // Fun facts for the "Did You Know?" box
  const FACTS = [
    "Jupiter's Great Red Spot is a storm larger than Earth.",
    "A day on Venus is longer than its year.",
    "Neutron stars can spin hundreds of times per second.",
    "Moon footprints may last millions of years because there's no wind to erase them."
  ];

  // Helper: safely escape text inserted into HTML
  const escapeHtml = (s) => (s ? String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '');

  // Helper: format Date object to YYYY-MM-DD
  const formatDate = (date) => {
    const d = (date instanceof Date) ? date : new Date(date);
    return d.toISOString().slice(0, 10);
  };

  // Show one random "Did you know?" fact
  function showRandomFact() {
    if (!didYouKnowEl) return;
    const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
    didYouKnowEl.textContent = `💡 ${fact}`;
  }

  // Toggle loading message visibility and button state
  function setLoading(show) {
    if (!loadingEl || !getImageBtn) return;
    loadingEl.hidden = !show;
    getImageBtn.disabled = show;
    if (show) getImageBtn.classList.add('loading');
    else getImageBtn.classList.remove('loading');
  }

  // Fetch the class feed (returns array). On failure returns empty array.
  async function fetchClassFeed() {
    try {
      const res = await fetch(FEED_URL, { cache: 'no-store' });
      if (!res.ok) {
        console.warn(`Feed fetch failed: ${res.status}`);
        return [];
      }
      const json = await res.json();
      if (!Array.isArray(json)) {
        console.warn('Feed format unexpected (expected array)');
        return [];
      }
      return json.map(item => ({ ...item, date: formatDate(item.date) }));
    } catch (err) {
      console.warn('Could not fetch class feed. Error:', err && err.message);
      return [];
    }
  }

  // (Optional) Fetch APOD range from NASA API (startIso inclusive, returns up to 9 items)
  async function fetchApodRange(startIso) {
    try {
      const start = new Date(startIso);
      const end = new Date(start);
      end.setDate(start.getDate() + 8); // 9 days
      const url = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(APOD_API_KEY)}&start_date=${formatDate(start)}&end_date=${formatDate(end)}&thumbs=true`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`APOD API ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error('APOD response unexpected');
      return json.map(item => ({ ...item, date: formatDate(item.date) }));
    } catch (err) {
      console.warn('APOD fetch failed:', err && err.message);
      return [];
    }
  }

  // Given a start date string (YYYY-MM-DD), produce 9 consecutive date strings (start -> start+8)
  function nineDatesFrom(startIso) {
    const arr = [];
    const start = new Date(startIso);
    for (let i = 0; i < 9; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(formatDate(d));
    }
    return arr;
  }

  // Render gallery cards
  function renderGallery(items) {
    galleryEl.innerHTML = ''; // clear existing content

    if (!items || items.length === 0) {
      galleryEl.innerHTML = `<div class="placeholder"><p>No images found for the selected dates in the class feed.</p></div>`;
      return;
    }

    // Always display up to 9 items (trim or pad if necessary)
    const tiles = items.slice(0, 9);

    tiles.forEach((item) => {
      const imgUrl = item.url || '';
      const title = item.title || `Image ${item.date || ''}`;
      const explanation = item.explanation || '';

      const card = document.createElement('article');
      card.className = 'gallery-item';
      card.innerHTML = `
        <div class="thumb" role="button" tabindex="0" aria-label="Open ${escapeHtml(title)}">
          <img src="${imgUrl}" alt="${escapeHtml(title)}" loading="lazy" />
        </div>
        <div class="meta">
          <h3>${escapeHtml(title)}</h3>
          <time datetime="${item.date || ''}">${item.date || ''}</time>
        </div>
      `;

      const thumb = card.querySelector('.thumb');
      thumb.addEventListener('click', () => openModal({ ...item, url: imgUrl, title, explanation }));
      thumb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); thumb.click(); }
      });

      galleryEl.appendChild(card);
    });
  }

  // Open modal and populate details (supports image or video)
  function openModal(item) {
    if (!modalEl) return;

    // remove any previous embed
    const existingEmbed = modalEl.querySelector('.modal-embed');
    if (existingEmbed) existingEmbed.remove();

    if (item.media_type === 'video') {
      // hide image element and inject embed/link
      modalImage.style.display = 'none';
      const embed = document.createElement('div');
      embed.className = 'modal-embed';
      embed.style.marginBottom = '12px';
      // If youtube-like link try to embed
      if (item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))) {
        const vidId = item.url.includes('v=') ? item.url.split('v=')[1].split('&')[0] : item.url.split('/').pop();
        embed.innerHTML = `<iframe width="100%" height="480" src="https://www.youtube.com/embed/${encodeURIComponent(vidId)}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        embed.innerHTML = `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Open video in new tab</a>`;
      }
      modalEl.querySelector('.modal-content').insertBefore(embed, modalEl.querySelector('.modal-meta'));
    } else {
      modalImage.style.display = '';
      modalImage.src = item.url || '';
      modalImage.alt = item.title || '';
    }

    modalTitle.textContent = item.title || '';
    modalDate.textContent = item.date || '';
    modalExplanation.textContent = item.explanation || '';
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // Close modal and cleanup
  function closeModal() {
    if (!modalEl) return;
    modalEl.hidden = true;
    modalImage.src = '';
    const existingEmbed = modalEl.querySelector('.modal-embed');
    if (existingEmbed) existingEmbed.remove();
    document.body.style.overflow = '';
  }

  // Main handler for the "Fetch Space Images" button
  async function handleFetch() {
    try {
      const startIso = startDateInput && startDateInput.value;
      if (!startIso) {
        alert('Please choose a start date first.');
        return;
      }

      setLoading(true);

      // Fetch either NASA APOD or class feed
      let feed = [];
      if (USE_APOD) {
        feed = await fetchApodRange(startIso);
      } else {
        feed = await fetchClassFeed();
      }

      // DEBUG: log feed info
      try {
        console.log('feed length:', Array.isArray(feed) ? feed.length : typeof feed);
        const dates = (Array.isArray(feed) ? feed.map(e => formatDate(e.date)).filter(Boolean).sort() : []);
        console.log('feed date range:', dates[0], '→', dates[dates.length - 1]);
      } catch (e) { /* ignore */ }

      // Map feed items by date for fast lookup
      const feedByDate = new Map();
      feed.forEach((entry) => {
        if (entry && entry.date) feedByDate.set(formatDate(entry.date), entry);
      });

      // Build results for the requested 9-day range — include only feed entries (no generated placeholders)
      const wantedDates = nineDatesFrom(startIso);
      const results = wantedDates
        .map(date => feedByDate.get(date))
        .filter(Boolean); // remove missing dates

      renderGallery(results);
    } catch (err) {
      console.error('Error fetching/rendering gallery:', err);
      alert('An error occurred while fetching images. See the console for details.');
    } finally {
      setLoading(false);
    }
  }

  // Attach event listeners if elements exist
  if (getImageBtn) getImageBtn.addEventListener('click', handleFetch);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalEl) {
    modalEl.addEventListener('click', (ev) => {
      if (ev.target === modalEl) closeModal();
    });
  }
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && modalEl && !modalEl.hidden) closeModal();
  });

  // Initialize UI: default start date (8 days before today) and show a random fact
  (function init() {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - 8);
    if (startDateInput) startDateInput.value = formatDate(defaultStart);
    showRandomFact();
    if (modalEl) modalEl.hidden = true;
    if (loadingEl) loadingEl.hidden = true;
  })();
});