document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const calculateIcon = document.getElementById('calculateIcon');
    const calculateText = document.getElementById('calculateText');
    const totalPointsEl = document.getElementById('totalPoints');
    const remainingPointsEl = document.getElementById('remainingPoints');
    const processedTasksEl = document.getElementById('processedTasks');
    const totalBugsEl = document.getElementById('totalBugs');
    const totalBugStoryPointsEl = document.getElementById('totalBugStoryPoints');
    const totalOriginalEstimateEl = document.getElementById('totalOriginalEstimate');
    const timeSpentEl = document.getElementById('timeSpent');
    const reloadBtn = document.getElementById('reloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const copyIcon = document.getElementById('copyIcon');
    const clearBtn = document.getElementById('clearBtn');
    const savedBadgeEl = document.getElementById('savedBadge');
    const savedTimeEl = document.getElementById('savedTime');

    // Helper function to show loading state
    function setLoadingState(isLoading) {
        if (isLoading) {
            calculateBtn.disabled = true;
            calculateBtn.classList.add('opacity-75', 'cursor-not-allowed');
            calculateBtn.classList.remove('hover:scale-[1.02]', 'active:scale-[0.98]');

            reloadBtn.disabled = true;
            reloadBtn.classList.add('opacity-75', 'cursor-not-allowed');
            reloadBtn.classList.remove('hover:scale-[1.02]', 'active:scale-[0.98]');

            // Show spinner
            calculateIcon.innerHTML = `
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" d="M12 2a10 10 0 0 1 10 10"></path>
            `;
            calculateIcon.classList.add('animate-spin');
            calculateText.textContent = 'Calculating...';
        } else {
            calculateBtn.disabled = false;
            calculateBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            calculateBtn.classList.add('hover:scale-[1.02]', 'active:scale-[0.98]');

            reloadBtn.disabled = false;
            reloadBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            reloadBtn.classList.add('hover:scale-[1.02]', 'active:scale-[0.98]');

            // Restore original icon
            calculateIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            `;
            calculateIcon.classList.remove('animate-spin');
            calculateText.textContent = 'Calculate Total';
        }
    }

    // Format timestamp with date and time (e.g., "Sep 4, 10:42 AM")
    function formatSavedDateTime(dateInput) {
        if (!dateInput) return '';
        const d = typeof dateInput === 'number' || typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

        const now = new Date();
        const isSameYear = d.getFullYear() === now.getFullYear();
        const datePart = d.toLocaleDateString(undefined, isSameYear
            ? { month: 'short', day: 'numeric' }
            : { month: 'short', day: 'numeric', year: 'numeric' }
        );
        const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${datePart}, ${timePart}`;
    }

    // Render calculation results into DOM
    function renderResults(data, animate = true) {
        totalPointsEl.classList.remove('loading');
        remainingPointsEl.classList.remove('loading');
        processedTasksEl.classList.remove('loading');
        if (totalBugsEl) totalBugsEl.classList.remove('loading');
        if (totalBugStoryPointsEl) totalBugStoryPointsEl.classList.remove('loading');
        totalOriginalEstimateEl.classList.remove('loading');
        timeSpentEl.classList.remove('loading');

        // Display total story points
        const total = data.total !== undefined && data.total !== null ? data.total : 0;
        const formattedTotal = total % 1 === 0
            ? total.toString()
            : total.toFixed(2);
        totalPointsEl.textContent = formattedTotal;

        // Display original estimate
        const originalEstimate = data.originalEstimate !== undefined && data.originalEstimate !== null ? data.originalEstimate : 0;
        const formattedOriginal = originalEstimate % 1 === 0
            ? originalEstimate.toString()
            : originalEstimate.toFixed(1);
        totalOriginalEstimateEl.textContent = formattedOriginal + 'h';

        // Display time spent
        const timeSpent = data.timeSpent !== undefined && data.timeSpent !== null ? data.timeSpent : 0;
        const formattedSpent = timeSpent % 1 === 0
            ? timeSpent.toString()
            : timeSpent.toFixed(1);
        timeSpentEl.textContent = formattedSpent + 'h';

        // Show copy and clear buttons if results exist
        const hasData = total > 0 || (data.processed && data.processed > 0) || data.timestamp;
        if (total > 0) {
            copyBtn.classList.remove('hidden');
        } else {
            copyBtn.classList.add('hidden');
        }

        if (clearBtn) {
            if (hasData) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        }

        // Display remaining count
        const remaining = data.remaining !== undefined && data.remaining !== null ? data.remaining : 0;
        remainingPointsEl.textContent = remaining.toString();

        // Display processed tasks count
        const processed = data.processed !== undefined && data.processed !== null ? data.processed : 0;
        processedTasksEl.textContent = processed.toString();

        // Display total bugs count
        if (totalBugsEl) {
            const bugs = data.bugs !== undefined && data.bugs !== null ? data.bugs : 0;
            totalBugsEl.textContent = bugs.toString();
        }

        // Display total bug story points
        if (totalBugStoryPointsEl) {
            const bugSP = data.bugStoryPoints !== undefined && data.bugStoryPoints !== null ? data.bugStoryPoints : 0;
            const formattedBugSP = bugSP % 1 === 0 ? bugSP.toString() : bugSP.toFixed(2);
            totalBugStoryPointsEl.textContent = formattedBugSP;
        }

        // Saved calculation badge
        if (savedBadgeEl && savedTimeEl) {
            if (data.timestamp || data.savedAt) {
                savedBadgeEl.classList.remove('hidden');
                const displayTime = data.savedAt ? formatSavedDateTime(data.savedAt) : data.timestamp;
                savedTimeEl.textContent = `Saved: ${displayTime}`;
            } else {
                savedBadgeEl.classList.add('hidden');
            }
        }

        // Animate cards if requested
        if (animate) {
            const resultCards = document.querySelectorAll('.bg-white.rounded-xl, .bg-white.rounded-2xl');
            resultCards.forEach(card => {
                card.classList.add('result-animate');
                setTimeout(() => {
                    card.classList.remove('result-animate');
                }, 300);
            });
        }
    }

    // Persist calculation results to storage
    async function saveCalculation(data) {
        const now = new Date();
        const formattedDateTime = formatSavedDateTime(now);
        const payload = {
            total: data.total !== undefined ? data.total : 0,
            originalEstimate: data.originalEstimate !== undefined ? data.originalEstimate : 0,
            timeSpent: data.timeSpent !== undefined ? data.timeSpent : 0,
            remaining: data.remaining !== undefined ? data.remaining : 0,
            processed: data.processed !== undefined ? data.processed : 0,
            bugs: data.bugs !== undefined ? data.bugs : 0,
            bugStoryPoints: data.bugStoryPoints !== undefined ? data.bugStoryPoints : 0,
            timestamp: formattedDateTime,
            savedAt: now.getTime()
        };

        try {
            if (chrome?.storage?.local) {
                await chrome.storage.local.set({ lastCalculation: payload });
            }
        } catch (e) {
            console.warn('chrome.storage.local error:', e);
        }

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('lastCalculation', JSON.stringify(payload));
            }
        } catch (e) {
            console.warn('localStorage error:', e);
        }
    }

    // Load persisted calculation results when popup is opened
    async function loadSavedCalculation() {
        let savedData = null;

        try {
            if (chrome?.storage?.local) {
                const res = await chrome.storage.local.get('lastCalculation');
                if (res && res.lastCalculation) {
                    savedData = res.lastCalculation;
                }
            }
        } catch (e) {
            console.warn('Failed to load from chrome.storage.local:', e);
        }

        if (!savedData) {
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem('lastCalculation');
                    if (raw) savedData = JSON.parse(raw);
                }
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
            }
        }

        if (savedData) {
            renderResults(savedData, false);
        }
    }

    // Load any saved calculation on startup
    loadSavedCalculation();

    calculateBtn.addEventListener('click', () => {
        // Clear previous results and show loading
        totalPointsEl.textContent = '...';
        remainingPointsEl.textContent = '...';
        processedTasksEl.textContent = '...';
        if (totalBugsEl) totalBugsEl.textContent = '...';
        if (totalBugStoryPointsEl) totalBugStoryPointsEl.textContent = '...';
        totalOriginalEstimateEl.textContent = '...';
        timeSpentEl.textContent = '...';

        totalPointsEl.classList.add('loading');
        remainingPointsEl.classList.add('loading');
        processedTasksEl.classList.add('loading');
        if (totalBugsEl) totalBugsEl.classList.add('loading');
        if (totalBugStoryPointsEl) totalBugStoryPointsEl.classList.add('loading');
        totalOriginalEstimateEl.classList.add('loading');
        timeSpentEl.classList.add('loading');

        if (savedBadgeEl) savedBadgeEl.classList.add('hidden');

        setLoadingState(true);
        copyBtn.classList.add('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');

        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Inject the content.js script into the active tab
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        totalPointsEl.textContent = '—';
                        remainingPointsEl.textContent = '—';
                        processedTasksEl.textContent = '—';
                        if (totalBugsEl) totalBugsEl.textContent = '—';
                        if (totalBugStoryPointsEl) totalBugStoryPointsEl.textContent = '—';
                        totalOriginalEstimateEl.textContent = '—';
                        timeSpentEl.textContent = '—';

                        totalPointsEl.classList.remove('loading');
                        remainingPointsEl.classList.remove('loading');
                        processedTasksEl.classList.remove('loading');
                        if (totalBugsEl) totalBugsEl.classList.remove('loading');
                        if (totalBugStoryPointsEl) totalBugStoryPointsEl.classList.remove('loading');
                        totalOriginalEstimateEl.classList.remove('loading');
                        timeSpentEl.classList.remove('loading');

                        setLoadingState(false);
                    }
                });
            } else {
                totalPointsEl.textContent = '—';
                remainingPointsEl.textContent = '—';
                processedTasksEl.textContent = '—';
                if (totalBugsEl) totalBugsEl.textContent = '—';
                if (totalBugStoryPointsEl) totalBugStoryPointsEl.textContent = '—';
                totalOriginalEstimateEl.textContent = '—';
                timeSpentEl.textContent = '—';

                totalPointsEl.classList.remove('loading');
                remainingPointsEl.classList.remove('loading');
                processedTasksEl.classList.remove('loading');
                if (totalBugsEl) totalBugsEl.classList.remove('loading');
                if (totalBugStoryPointsEl) totalBugStoryPointsEl.classList.remove('loading');
                totalOriginalEstimateEl.classList.remove('loading');
                timeSpentEl.classList.remove('loading');

                setLoadingState(false);
            }
        });
    });

    reloadBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const tabId = tabs[0].id;
                // Create a listener to watch for the page load to finish
                const onPageLoad = (updatedTabId, changeInfo) => {
                    if (updatedTabId === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(onPageLoad);
                    }
                };

                chrome.tabs.onUpdated.addListener(onPageLoad);
                chrome.tabs.reload(tabId);
            }
        });
    });

    // Copy total points to clipboard
    copyBtn.addEventListener('click', async () => {
        const totalPoints = totalPointsEl.textContent.trim();

        // Don't copy if it's a placeholder
        if (totalPoints === '-' || totalPoints === '...' || !totalPoints) {
            return;
        }

        try {
            await navigator.clipboard.writeText(totalPoints);

            // Visual feedback: change icon to checkmark temporarily
            const originalIcon = copyIcon.innerHTML;
            copyIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            `;
            copyIcon.classList.remove('text-gray-500', 'hover:text-indigo-600');
            copyIcon.classList.add('text-green-500');

            // Restore original icon after 2 seconds
            setTimeout(() => {
                copyIcon.innerHTML = originalIcon;
                copyIcon.classList.remove('text-green-500');
                copyIcon.classList.add('text-gray-500', 'hover:text-indigo-600');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            copyIcon.classList.add('text-red-500');
            setTimeout(() => {
                copyIcon.classList.remove('text-red-500');
                copyIcon.classList.add('text-gray-500', 'hover:text-indigo-600');
            }, 2000);
        }
    });

    // Clear saved calculation from storage and reset UI
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            try {
                if (chrome?.storage?.local) {
                    await chrome.storage.local.remove('lastCalculation');
                }
            } catch (e) {
                console.warn('Error clearing chrome.storage.local:', e);
            }

            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('lastCalculation');
                }
            } catch (e) {
                console.warn('Error clearing localStorage:', e);
            }

            // Reset UI displays to placeholder
            totalPointsEl.textContent = '-';
            remainingPointsEl.textContent = '-';
            processedTasksEl.textContent = '-';
            if (totalBugsEl) totalBugsEl.textContent = '-';
            if (totalBugStoryPointsEl) totalBugStoryPointsEl.textContent = '-';
            totalOriginalEstimateEl.textContent = '-';
            timeSpentEl.textContent = '-';

            copyBtn.classList.add('hidden');
            clearBtn.classList.add('hidden');
            if (savedBadgeEl) savedBadgeEl.classList.add('hidden');
        });
    }

    // Listen for messages from the content.js script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "sendTotal") {
            setLoadingState(false);
            const now = new Date();
            const formattedDateTime = formatSavedDateTime(now);
            const dataWithTime = {
                ...request,
                timestamp: formattedDateTime,
                savedAt: now.getTime()
            };

            renderResults(dataWithTime, true);
            saveCalculation(request);
        }
    });
});