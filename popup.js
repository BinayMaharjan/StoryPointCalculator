document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const calculateIcon = document.getElementById('calculateIcon');
    const calculateText = document.getElementById('calculateText');
    const totalPointsEl = document.getElementById('totalPoints');
    const remainingPointsEl = document.getElementById('remainingPoints');
    const processedTasksEl = document.getElementById('processedTasks');
    const reloadBtn = document.getElementById('reloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const copyIcon = document.getElementById('copyIcon');

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

    calculateBtn.addEventListener('click', () => {
        // Clear previous results and show loading
        totalPointsEl.textContent = '...';
        remainingPointsEl.textContent = '...';
        processedTasksEl.textContent = '...';
        totalPointsEl.classList.add('loading');
        remainingPointsEl.classList.add('loading');
        processedTasksEl.classList.add('loading');


        setLoadingState(true);
        copyBtn.classList.add('hidden');

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
                        totalPointsEl.classList.remove('loading');
                        remainingPointsEl.classList.remove('loading');
                        processedTasksEl.classList.remove('loading');
                        setLoadingState(false);
                    }
                });
            } else {
                totalPointsEl.textContent = '—';
                remainingPointsEl.textContent = '—';
                processedTasksEl.textContent = '—';
                totalPointsEl.classList.remove('loading');
                remainingPointsEl.classList.remove('loading');
                processedTasksEl.classList.remove('loading');
                setLoadingState(false);
            }
        });
    });

    reloadBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const tabId = tabs[0].id;
                // 2. Create a listener to watch for the page load to finish
                const onPageLoad = (updatedTabId, changeInfo) => {
                    // Check if the updated tab is the one we reloaded AND if it is complete
                    if (updatedTabId === tabId && changeInfo.status === 'complete') {
                        // 4. Remove this listener (clean up) so it doesn't keep running
                        chrome.tabs.onUpdated.removeListener(onPageLoad);
                    }
                };

                // 5. Add the listener BEFORE triggering reload
                chrome.tabs.onUpdated.addListener(onPageLoad);

                // 6. Trigger the reload
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
            // Fallback: show error feedback
            copyIcon.classList.add('text-red-500');
            setTimeout(() => {
                copyIcon.classList.remove('text-red-500');
                copyIcon.classList.add('text-gray-500', 'hover:text-indigo-600');
            }, 2000);
        }
    });


    // Listen for messages from the content.js script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "sendTotal") {
            setLoadingState(false);
            totalPointsEl.classList.remove('loading');
            remainingPointsEl.classList.remove('loading');
            processedTasksEl.classList.remove('loading');

            // Display total story points
            const total = request.total !== undefined ? request.total : 0;
            const formattedTotal = total % 1 === 0
                ? total.toString()
                : total.toFixed(2);
            totalPointsEl.textContent = formattedTotal;

            // Display original estimate
            const originalEstimate = request.originalEstimate !== undefined ? request.originalEstimate : 0;
            const formattedOriginal = originalEstimate % 1 === 0
                ? originalEstimate.toString()
                : originalEstimate.toFixed(1);
            document.getElementById('totalOriginalEstimate').textContent = formattedOriginal + 'h';

            // Display time spent
            const timeSpent = request.timeSpent !== undefined ? request.timeSpent : 0;
            const formattedSpent = timeSpent % 1 === 0
                ? timeSpent.toString()
                : timeSpent.toFixed(1);
            document.getElementById('timeSpent').textContent = formattedSpent + 'h';

            // Show copy button if total points > 0
            if (total > 0) {
                copyBtn.classList.remove('hidden');
            } else {
                copyBtn.classList.add('hidden');
            }

            // Display remaining count
            const remaining = request.remaining !== undefined ? request.remaining : 0;
            remainingPointsEl.textContent = remaining.toString();

            // Display processed tasks count
            const processed = request.processed !== undefined ? request.processed : 0;
            processedTasksEl.textContent = processed.toString();

            // Animate both cards
            const resultCards = document.querySelectorAll('.bg-white.rounded-2xl');
            resultCards.forEach(card => {
                card.classList.add('result-animate');
                setTimeout(() => {
                    card.classList.remove('result-animate');
                }, 300);
            });
        }
    });
});