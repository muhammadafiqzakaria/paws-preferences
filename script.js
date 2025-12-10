// App Configuration
const CONFIG = {
    totalCats: 10, // Number of cats to fetch
    apiUrl: 'https://cataas.com/cat', // Base URL for cat API
    apiTagsUrl: 'https://cataas.com/api/tags', // URL to get available tags
    apiCatsUrl: 'https://cataas.com/api/cats', // URL to get cats by tag
    jsonHeader: { 'Accept': 'application/json' }
};

// App State
let appState = {
    cats: [],
    availableTags: [],
    currentIndex: 0,
    likedCats: [],
    dislikedCats: [],
    isDragging: false,
    startX: 0,
    startY: 0,
    dragX: 0,
    dragY: 0,
    isAnimating: false
};

// DOM Elements
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    cardsContainer: document.getElementById('cardsContainer'),
    instructionCard: document.getElementById('instructionCard'),
    startBtn: document.getElementById('startBtn'),
    currentCount: document.getElementById('currentCount'),
    totalCount: document.getElementById('totalCount'),
    likeBtn: document.getElementById('likeBtn'),
    dislikeBtn: document.getElementById('dislikeBtn'),
    progressBar: document.getElementById('progressBar'),
    summaryScreen: document.getElementById('summaryScreen'),
    likedCount: document.getElementById('likedCount'),
    dislikedCount: document.getElementById('dislikedCount'),
    likedCatsCount: document.getElementById('likedCatsCount'),
    likedCatsGrid: document.getElementById('likedCatsGrid'),
    noLikedCats: document.getElementById('noLikedCats'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    shareBtn: document.getElementById('shareBtn'),
    toast: document.getElementById('toast')
};

// Initialize the app
async function initApp() {
    // Show loading screen
    elements.loadingScreen.style.display = 'flex';
    
    try {
        // First, get available tags
        await fetchAvailableTags();
        
        // Then fetch cat images
        await fetchCats();
        
        // Hide loading screen after a short delay for better UX
        setTimeout(() => {
            elements.loadingScreen.style.display = 'none';
            showToast('Welcome to Paws & Preferences! 🐱');
        }, 1500);
        
        // Set up event listeners
        setupEventListeners();
        
        // Update counters
        updateCounters();
        
        // Enhance desktop experience
        enhanceDesktopExperience();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        elements.loadingScreen.style.display = 'none';
        showToast('Failed to load cats. Please refresh the page.');
        // Show error state
        elements.instructionCard.innerHTML = `
            <h2>Oops! 😿</h2>
            <p>We couldn't load the cats. Please check your internet connection and refresh the page.</p>
            <button id="retryBtn" class="btn-start">Retry</button>
        `;
        document.getElementById('retryBtn')?.addEventListener('click', () => location.reload());
    }
}

// Fetch available tags from Cataas API
async function fetchAvailableTags() {
    try {
        const response = await fetch(CONFIG.apiTagsUrl);
        if (!response.ok) throw new Error('Failed to fetch tags');
        const tags = await response.json();
        
        // Filter out empty strings and limit to good cat tags
        appState.availableTags = tags
            .filter(tag => tag && tag.trim() !== '' && tag.length < 20)
            .slice(0, 50); // Limit to first 50 tags
        
        console.log('Available tags:', appState.availableTags);
    } catch (error) {
        console.warn('Could not fetch tags, using default tags:', error);
        // Fallback to default tags
        appState.availableTags = ['cute', 'kitten', 'sleepy', 'playing', 'funny', 
                                 'orange', 'tabby', 'white', 'black', 'gray',
                                 'small', 'baby', 'fun', 'adorable', 'pretty'];
    }
}

// Fetch cat images from Cataas API - USE PORTRAIT DIMENSIONS
async function fetchCats() {
    const cats = [];
    const usedIds = new Set();
    
    // Use PORTRAIT dimensions - taller than wide
    const isDesktop = window.innerWidth >= 768;
    const width = isDesktop ? 1000 : 320;
    const height = isDesktop ? 800 : 420; // Portrait: 450x600 or 350x500
    
    for (let i = 0; i < CONFIG.totalCats; i++) {
        try {
            let catUrl, tag, catId;
            
            if (appState.availableTags.length > 0) {
                tag = appState.availableTags[Math.floor(Math.random() * appState.availableTags.length)];
                
                const tagResponse = await fetch(`${CONFIG.apiCatsUrl}?tags=${tag}&limit=1`);
                if (tagResponse.ok) {
                    const tagData = await tagResponse.json();
                    if (tagData && tagData.length > 0) {
                        catId = tagData[0]._id || tagData[0].id;
                        if (!usedIds.has(catId)) {
                            usedIds.add(catId);
                            // Use PORTRAIT dimensions: width=450, height=600 (desktop)
                            catUrl = `${CONFIG.apiUrl}/${catId}?width=${width}&height=${height}`;
                        }
                    }
                }
            }
            
            if (!catUrl) {
                const timestamp = Date.now();
                // Use PORTRAIT dimensions
                catUrl = `${CONFIG.apiUrl}?width=${width}&height=${height}&timestamp=${timestamp + i}`;
                
                tag = appState.availableTags.length > 0 
                    ? appState.availableTags[Math.floor(Math.random() * appState.availableTags.length)]
                    : 'cat';
            }
            
            cats.push({
                id: i + 1,
                url: catUrl,
                tag: tag || 'cat',
                liked: null
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.warn(`Failed to fetch cat ${i + 1}:`, error);
            // Use PORTRAIT dimensions for fallback too
            cats.push({
                id: i + 1,
                url: `https://cataas.com/cat?width=${width}&height=${height}&cache=${Date.now() + i}`,
                tag: 'mystery',
                liked: null
            });
        }
    }
    
    appState.cats = cats;
    console.log('Fetched PORTRAIT cats:', cats);
}

// Create a cat card element - USING BACKGROUND IMAGE
function createCatCard(cat, index) {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.dataset.id = cat.id;
    card.dataset.index = index;
    
    // Set z-index for stacking (first card on top)
    card.style.zIndex = CONFIG.totalCats - index;
    
    // Set the cat image as background
    card.style.backgroundImage = `url('${cat.url}')`;
    card.style.backgroundColor = '#f0f0f0'; // Loading placeholder
    
    // Create a separate image for preloading
    const preloadImg = new Image();
    preloadImg.src = cat.url;
    preloadImg.onload = function() {
        // When image loads, ensure background is visible
        card.style.backgroundImage = `url('${cat.url}')`;
        console.log(`Image loaded: ${cat.id}`);
    };
    preloadImg.onerror = function() {
        console.warn(`Image failed to load: ${cat.url}`);
        // Fallback background
        card.style.backgroundImage = `url('https://cataas.com/cat?width=350&height=500&cache=${Date.now()}')`;
    };
    
    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    
    const idSpan = document.createElement('div');
    idSpan.className = 'card-id';
    idSpan.textContent = `Kitty #${cat.id}`;
    
    const tagSpan = document.createElement('div');
    tagSpan.className = 'card-tag';
    tagSpan.textContent = `#${cat.tag}`;
    
    // Decision indicators
    const likeIndicator = document.createElement('div');
    likeIndicator.className = 'decision-indicator like-indicator';
    likeIndicator.textContent = 'LIKE';
    likeIndicator.style.display = 'none';
    
    const dislikeIndicator = document.createElement('div');
    dislikeIndicator.className = 'decision-indicator dislike-indicator';
    dislikeIndicator.textContent = 'PASS';
    dislikeIndicator.style.display = 'none';
    
    overlay.appendChild(idSpan);
    overlay.appendChild(tagSpan);
    
    card.appendChild(overlay);
    card.appendChild(likeIndicator);
    card.appendChild(dislikeIndicator);
    
    // Add drag event listeners
    setupDragEvents(card);
    
    return card;
}

// Set up drag events for a card
function setupDragEvents(card) {
    let startX, startY, isDragging = false;
    
    card.addEventListener('touchstart', handleDragStart, { passive: false });
    card.addEventListener('mousedown', handleDragStart);
    
    function handleDragStart(e) {
        if (appState.isAnimating) return;
        
        isDragging = true;
        appState.isDragging = true;
        card.classList.add('dragging');
        
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        startX = clientX;
        startY = clientY;
        appState.startX = clientX;
        appState.startY = clientY;
        
        // Add move and end listeners
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('touchend', handleDragEnd);
        document.addEventListener('mouseup', handleDragEnd);
        
        e.preventDefault();
    }
    
    function handleDragMove(e) {
        if (!isDragging || appState.isAnimating) return;
        
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        
        appState.dragX = deltaX;
        appState.dragY = deltaY;
        
        // Update card position
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX * 0.1}deg)`;
        
        // Show decision indicator based on swipe direction
        const likeIndicator = card.querySelector('.like-indicator');
        const dislikeIndicator = card.querySelector('.dislike-indicator');
        
        if (deltaX > 50) {
            // Swiping right (like)
            likeIndicator.style.display = 'block';
            likeIndicator.style.opacity = Math.min(Math.abs(deltaX) / 100, 0.9);
            dislikeIndicator.style.display = 'none';
        } else if (deltaX < -50) {
            // Swiping left (dislike)
            dislikeIndicator.style.display = 'block';
            dislikeIndicator.style.opacity = Math.min(Math.abs(deltaX) / 100, 0.9);
            likeIndicator.style.display = 'none';
        } else {
            // Not enough swipe
            likeIndicator.style.display = 'none';
            dislikeIndicator.style.display = 'none';
        }
        
        e.preventDefault();
    }
    
    function handleDragEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        appState.isDragging = false;
        card.classList.remove('dragging');
        
        // Remove event listeners
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
        document.removeEventListener('mouseup', handleDragEnd);
        
        // Check if swipe threshold was reached
        const threshold = 100;
        
        if (appState.dragX > threshold) {
            // Swiped right - like
            handleSwipeDecision(card, true);
        } else if (appState.dragX < -threshold) {
            // Swiped left - dislike
            handleSwipeDecision(card, false);
        } else {
            // Return to original position
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = 'translate(0, 0) rotate(0deg)';
            
            // Hide indicators
            const likeIndicator = card.querySelector('.like-indicator');
            const dislikeIndicator = card.querySelector('.dislike-indicator');
            likeIndicator.style.display = 'none';
            dislikeIndicator.style.display = 'none';
            
            // Remove transition after animation
            setTimeout(() => {
                card.style.transition = '';
            }, 300);
        }
        
        // Reset drag state
        appState.dragX = 0;
        appState.dragY = 0;
    }
}

// Handle swipe decision
function handleSwipeDecision(card, liked) {
    if (appState.isAnimating) return;
    
    appState.isAnimating = true;
    const cardId = parseInt(card.dataset.id);
    const cardIndex = parseInt(card.dataset.index);
    
    // Update cat's liked status
    const cat = appState.cats.find(c => c.id === cardId);
    if (cat) {
        cat.liked = liked;
        
        if (liked) {
            appState.likedCats.push(cat);
            showToast(`You liked Kitty #${cat.id}! ❤️`);
        } else {
            appState.dislikedCats.push(cat);
            showToast(`You passed on Kitty #${cat.id}`);
        }
    }
    
    // Animate card off screen
    card.classList.add(liked ? 'liked' : 'disliked');
    
    // Update counters and progress
    updateCounters();
    
    // Move to next card after animation
    setTimeout(() => {
        // Remove the card from DOM
        card.remove();
        
        // Check if we've reached the end
        appState.currentIndex++;
        
        if (appState.currentIndex >= CONFIG.totalCats) {
            // All cats have been shown - show summary
            setTimeout(showSummary, 500);
        } else {
            // Show next card
            showNextCard();
        }
        
        appState.isAnimating = false;
    }, 300);
}

// Show the next cat card
function showNextCard() {
    // Clear the cards container except for instruction card
    const existingCards = document.querySelectorAll('.cat-card');
    existingCards.forEach(card => card.remove());
    
    // Get the current cat
    const currentCat = appState.cats[appState.currentIndex];
    
    if (currentCat) {
        // Create and add the card
        const card = createCatCard(currentCat, appState.currentIndex);
        elements.cardsContainer.appendChild(card);
    }
}

// Update counters and progress
function updateCounters() {
    // Update current count
    elements.currentCount.textContent = Math.min(appState.currentIndex + 1, CONFIG.totalCats);
    elements.totalCount.textContent = CONFIG.totalCats;
    
    // Update progress bar
    const progress = ((appState.currentIndex + 1) / CONFIG.totalCats) * 100;
    elements.progressBar.style.width = `${progress}%`;
}

// Show summary screen
function showSummary() {
    // Update summary stats
    elements.likedCount.textContent = appState.likedCats.length;
    elements.dislikedCount.textContent = appState.dislikedCats.length;
    elements.likedCatsCount.textContent = appState.likedCats.length;
    
    // Clear liked cats grid
    elements.likedCatsGrid.innerHTML = '';
    
    // Show/hide "no liked cats" message
    if (appState.likedCats.length === 0) {
        elements.noLikedCats.style.display = 'block';
    } else {
        elements.noLikedCats.style.display = 'none';
        
        // Add liked cat images to grid
        appState.likedCats.forEach(cat => {
            const catItem = document.createElement('div');
            catItem.className = 'liked-cat-item';
            
            const img = document.createElement('img');
            img.src = cat.url;
            img.alt = `Liked cat #${cat.id}`;
            img.loading = 'lazy';
            
            // Add error handling for summary images too
            img.onerror = function() {
                this.src = `https://cataas.com/cat?width=200&height=200&cache=${Date.now()}`;
            };
            
            const heartOverlay = document.createElement('div');
            heartOverlay.className = 'heart-overlay';
            heartOverlay.innerHTML = '<i class="fas fa-heart"></i>';
            
            catItem.appendChild(img);
            catItem.appendChild(heartOverlay);
            elements.likedCatsGrid.appendChild(catItem);
        });
    }
    
    // Show summary screen with animation
    elements.summaryScreen.classList.add('active');
}

// Reset the game
function resetGame() {
    // Reset app state
    appState.currentIndex = 0;
    appState.likedCats = [];
    appState.dislikedCats = [];
    appState.isAnimating = false;
    
    // Reset cat liked status
    appState.cats.forEach(cat => {
        cat.liked = null;
        // Refresh URLs with smaller dimensions
        const isDesktop = window.innerWidth >= 768;
        const width = isDesktop ? 400 : 320;
        const height = isDesktop ? 500 : 420;
        cat.url = `https://cataas.com/cat?width=${width}&height=${height}&cache=${Date.now() + cat.id}`;
    });
    
    // Hide summary screen
    elements.summaryScreen.classList.remove('active');
    
    // Clear cards container
    const existingCards = document.querySelectorAll('.cat-card');
    existingCards.forEach(card => card.remove());
    
    // Show instruction card
    elements.instructionCard.style.display = 'block';
    
    // Update counters
    updateCounters();
    
    showToast('New round started! Good luck! 🐾');
}

// Share results
function shareResults() {
    const totalCats = appState.cats.length;
    const likedCats = appState.likedCats.length;
    const percentage = Math.round((likedCats / totalCats) * 100);
    
    const shareText = `I just discovered my purr-fect matches on Paws & Preferences! 🐱\n\n` +
                     `I liked ${likedCats} out of ${totalCats} cats (${percentage}% match rate).\n\n` +
                     `Can you beat my score? Play at: ${window.location.href}`;
    
    if (navigator.share) {
        // Use Web Share API if available
        navigator.share({
            title: 'My Cat Preferences',
            text: shareText,
            url: window.location.href
        })
        .catch(error => {
            console.log('Error sharing:', error);
            // Fallback to clipboard
            copyToClipboard(shareText);
        });
    } else {
        // Fallback to clipboard
        copyToClipboard(shareText);
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('Results copied to clipboard! 📋');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy to clipboard.');
        });
}

// Show toast notification
function showToast(message, duration = 3000) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

// Set up event listeners
function setupEventListeners() {
    // Start button
    elements.startBtn.addEventListener('click', () => {
        elements.instructionCard.style.display = 'none';
        showNextCard();
        showToast('Swipe right to like, left to pass! 👈👉');
    });
    
    // Like button
    elements.likeBtn.addEventListener('click', () => {
        const currentCard = document.querySelector('.cat-card');
        if (currentCard && !appState.isAnimating) {
            handleSwipeDecision(currentCard, true);
        }
    });
    
    // Dislike button
    elements.dislikeBtn.addEventListener('click', () => {
        const currentCard = document.querySelector('.cat-card');
        if (currentCard && !appState.isAnimating) {
            handleSwipeDecision(currentCard, false);
        }
    });
    
    // Play again button
    elements.playAgainBtn.addEventListener('click', resetGame);
    
    // Share button
    elements.shareBtn.addEventListener('click', shareResults);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'd') {
            // Like with right arrow or 'd' key
            elements.likeBtn.click();
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
            // Dislike with left arrow or 'a' key
            elements.dislikeBtn.click();
            e.preventDefault();
        } else if (e.key === 'r' && elements.summaryScreen.classList.contains('active')) {
            // Reset with 'r' key when summary is shown
            resetGame();
        }
    });
    
    // Prevent pull-to-refresh on mobile during swipes
    document.addEventListener('touchmove', (e) => {
        if (appState.isDragging) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Enhanced desktop features
function enhanceDesktopExperience() {
    if (window.innerWidth >= 768) {
        console.log('Enhancing desktop experience...');
        
        // Add keyboard shortcuts help
        document.addEventListener('keydown', (e) => {
            if (e.key === 'h' && e.ctrlKey) {
                showKeyboardShortcuts();
                e.preventDefault();
            }
        });
        
        // Add mouse wheel support for swiping
        const cardsContainer = elements.cardsContainer;
        cardsContainer.addEventListener('wheel', (e) => {
            const currentCard = document.querySelector('.cat-card');
            if (currentCard && !appState.isAnimating && Math.abs(e.deltaX) > 50) {
                if (e.deltaX > 0) {
                    // Wheel right = like
                    handleSwipeDecision(currentCard, true);
                } else {
                    // Wheel left = dislike
                    handleSwipeDecision(currentCard, false);
                }
                e.preventDefault();
            }
        }, { passive: false });
        
        // Add double-click to like
        cardsContainer.addEventListener('dblclick', (e) => {
            const currentCard = document.querySelector('.cat-card');
            if (currentCard && !appState.isAnimating && e.target.closest('.cat-card')) {
                handleSwipeDecision(currentCard, true);
            }
        });
    }
}

// Show keyboard shortcuts help
function showKeyboardShortcuts() {
    const shortcuts = [
        '← or A: Dislike',
        '→ or D: Like',
        'R: Restart game',
        'Ctrl+H: Show this help'
    ];
    
    const helpText = shortcuts.join('\n');
    showToast(`Keyboard Shortcuts:\n${helpText}`, 5000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);