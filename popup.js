document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const calculateIcon = document.getElementById('calculateIcon');
    const calculateText = document.getElementById('calculateText');
    const totalPointsEl = document.getElementById('totalPoints');
    const remainingPointsEl = document.getElementById('remainingPoints');
    const processedTasksEl = document.getElementById('processedTasks');
    const totalBugsEl = document.getElementById('totalBugs');
    const totalBugStoryPointsEl = document.getElementById('totalBugStoryPoints');
    const totalExtraLogsEl = document.getElementById('totalExtraLogs');
    const totalExtraLogPointsEl = document.getElementById('totalExtraLogPoints');
    const totalOriginalEstimateEl = document.getElementById('totalOriginalEstimate');
    const timeSpentEl = document.getElementById('timeSpent');
    const reloadBtn = document.getElementById('reloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const copyIcon = document.getElementById('copyIcon');
    const clearBtn = document.getElementById('clearBtn');
    const savedBadgeEl = document.getElementById('savedBadge');
    const savedTimeEl = document.getElementById('savedTime');
    const roleSelectEl = document.getElementById('roleSelect');
    const manageRolesBtn = document.getElementById('manageRolesBtn');
    const manageRolesIconEl = document.getElementById('manageRolesIcon');
    const roleManagerEl = document.getElementById('roleManager');
    const roleNameInput = document.getElementById('roleNameInput');
    const roleWeightInput = document.getElementById('roleWeightInput');
    const addRoleBtn = document.getElementById('addRoleBtn');
    const roleListEl = document.getElementById('roleList');
    const taskWeightPercentEl = document.getElementById('taskWeightPercent');
    const taskWeightDetailEl = document.getElementById('taskWeightDetail');
    const taskWeightBarEl = document.getElementById('taskWeightBar');

    // Task weight state: user-defined roles with their 100% target weight
    let roles = [];
    let activeRoleId = null;
    let lastTotal = null;
    let editingRoleId = null;

    const EDIT_ICON_PATH = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
    const CHECK_ICON_PATH = 'M5 13l4 4L19 7';

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
            calculateText.textContent = 'Calculate';
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
        lastTotal = total;

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

        // Display total extra logs count
        if (totalExtraLogsEl) {
            const extraLogs = data.extraLogs !== undefined && data.extraLogs !== null ? data.extraLogs : 0;
            totalExtraLogsEl.textContent = extraLogs.toString();
        }

        // Display extra log story points
        if (totalExtraLogPointsEl) {
            const extraLogPts = data.extraLogPoints !== undefined && data.extraLogPoints !== null ? data.extraLogPoints : 0;
            const formattedExtraLogPts = extraLogPts % 1 === 0 ? extraLogPts.toString() : extraLogPts.toFixed(2);
            totalExtraLogPointsEl.textContent = formattedExtraLogPts;
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

        renderTaskWeight();

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

    function formatNumber(value) {
        return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }

    function getActiveRole() {
        return roles.find(role => role.id === activeRoleId) || null;
    }

    // Load user-defined roles and the selected role from storage
    async function loadRoles() {
        try {
            if (chrome?.storage?.local) {
                const res = await chrome.storage.local.get(['taskWeightRoles', 'activeRoleId']);
                roles = Array.isArray(res.taskWeightRoles) ? res.taskWeightRoles : [];
                activeRoleId = res.activeRoleId ?? null;
            }
        } catch (e) {
            console.warn('Failed to load roles from chrome.storage.local:', e);
        }

        if (!getActiveRole()) {
            activeRoleId = roles.length > 0 ? roles[0].id : null;
        }
    }

    async function saveRoles() {
        try {
            if (chrome?.storage?.local) {
                await chrome.storage.local.set({ taskWeightRoles: roles, activeRoleId: activeRoleId });
            }
        } catch (e) {
            console.warn('chrome.storage.local error:', e);
        }
    }

    function refreshTaskWeight() {
        renderRoleSelect();
        renderRoleList();
        renderTaskWeight();
    }

    async function addRole(name, weight) {
        const trimmedName = (name || '').trim();
        const parsedWeight = parseFloat(weight);
        if (!trimmedName || isNaN(parsedWeight) || parsedWeight <= 0) return false;

        const role = { id: Date.now(), name: trimmedName, weight: parsedWeight };
        roles.push(role);
        activeRoleId = role.id;
        await saveRoles();
        refreshTaskWeight();
        return true;
    }

    async function updateRole(id, name, weight) {
        const trimmedName = (name || '').trim();
        const parsedWeight = parseFloat(weight);
        if (!trimmedName || isNaN(parsedWeight) || parsedWeight <= 0) return false;

        roles = roles.map(role => role.id === id ? { ...role, name: trimmedName, weight: parsedWeight } : role);
        editingRoleId = null;
        await saveRoles();
        refreshTaskWeight();
        return true;
    }

    async function deleteRole(id) {
        roles = roles.filter(role => role.id !== id);
        if (activeRoleId === id) {
            activeRoleId = roles.length > 0 ? roles[0].id : null;
        }
        await saveRoles();
        refreshTaskWeight();
    }

    async function setActiveRole(id) {
        activeRoleId = id;
        await saveRoles();
        renderTaskWeight();
    }

    // Rebuild the role dropdown (textContent only, names are user input)
    function renderRoleSelect() {
        roleSelectEl.replaceChildren();
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = `${role.name} (${formatNumber(role.weight)})`;
            option.selected = role.id === activeRoleId;
            roleSelectEl.appendChild(option);
        });
        roleSelectEl.classList.toggle('hidden', roles.length === 0);
    }

    function createIconButton(pathD, title, hoverClass, onClick) {
        const button = document.createElement('button');
        button.className = `cursor-pointer text-gray-400 ${hoverClass} focus:outline-none`;
        button.title = title;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-3.5 h-3.5');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('d', pathD);

        svg.appendChild(path);
        button.appendChild(svg);
        button.addEventListener('click', onClick);
        return button;
    }

    // Inline edit form for a single role row
    function renderRoleEditItem(role) {
        const item = document.createElement('li');
        item.className = 'flex items-center gap-1.5 text-xs';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = role.name;
        nameInput.className = 'flex-1 min-w-0 text-xs text-gray-700 border border-gray-200 rounded-md px-2 py-0.5 focus:outline-none focus:border-blue-400';

        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.step = '0.01';
        weightInput.value = role.weight;
        weightInput.className = 'w-16 text-xs text-gray-700 border border-gray-200 rounded-md px-2 py-0.5 focus:outline-none focus:border-blue-400';

        const save = () => updateRole(role.id, nameInput.value, weightInput.value);
        const cancel = () => {
            editingRoleId = null;
            renderRoleList();
        };

        [nameInput, weightInput].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') cancel();
            });
        });

        const saveBtn = createIconButton(CHECK_ICON_PATH, 'Save role', 'hover:text-green-500', save);
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cursor-pointer text-gray-400 hover:text-rose-500 focus:outline-none';
        cancelBtn.title = 'Cancel';
        cancelBtn.textContent = '×';
        cancelBtn.addEventListener('click', cancel);

        item.append(nameInput, weightInput, saveBtn, cancelBtn);
        setTimeout(() => nameInput.focus(), 0);
        return item;
    }

    // Rebuild the role list inside the manage panel
    function renderRoleList() {
        roleListEl.replaceChildren();
        roles.forEach(role => {
            if (role.id === editingRoleId) {
                roleListEl.appendChild(renderRoleEditItem(role));
                return;
            }

            const item = document.createElement('li');
            item.className = 'flex items-center justify-between text-xs text-gray-600 px-1';

            const label = document.createElement('span');
            label.className = 'truncate';
            label.textContent = role.name;

            const right = document.createElement('div');
            right.className = 'flex items-center gap-2';

            const weight = document.createElement('span');
            weight.className = 'font-semibold text-gray-700';
            weight.textContent = formatNumber(role.weight);

            const editBtn = createIconButton(EDIT_ICON_PATH, 'Edit role', 'hover:text-blue-500', () => {
                editingRoleId = role.id;
                renderRoleList();
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'cursor-pointer text-gray-400 hover:text-rose-500 focus:outline-none';
            removeBtn.title = 'Remove role';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => deleteRole(role.id));

            right.append(weight, editBtn, removeBtn);
            item.append(label, right);
            roleListEl.appendChild(item);
        });
    }

    // Open/close the role manager; header icon shows a tick while editing
    function setRoleManagerOpen(isOpen) {
        roleManagerEl.classList.toggle('hidden', !isOpen);
        manageRolesIconEl.setAttribute('d', isOpen ? CHECK_ICON_PATH : EDIT_ICON_PATH);
        manageRolesBtn.title = isOpen ? 'Done editing' : 'Manage roles & task weight';
        if (!isOpen && editingRoleId !== null) {
            editingRoleId = null;
            renderRoleList();
        }
    }

    // Show achieved story points as a percentage of the active role's task weight
    function renderTaskWeight() {
        const activeRole = getActiveRole();
        taskWeightBarEl.classList.remove('bg-red-500', 'bg-amber-500', 'bg-green-500');

        if (!activeRole) {
            taskWeightPercentEl.textContent = '-';
            taskWeightDetailEl.textContent = 'Add your role & task weight';
            taskWeightBarEl.classList.add('bg-red-500');
            taskWeightBarEl.style.width = '0%';
            return;
        }

        if (lastTotal === null || lastTotal === undefined) {
            taskWeightPercentEl.textContent = '-';
            taskWeightDetailEl.textContent = `- / ${formatNumber(activeRole.weight)}`;
            taskWeightBarEl.classList.add('bg-red-500');
            taskWeightBarEl.style.width = '0%';
            return;
        }

        const percent = (lastTotal / activeRole.weight) * 100;
        taskWeightPercentEl.textContent = `${percent.toFixed(1)}%`;
        taskWeightDetailEl.textContent = `${formatNumber(lastTotal)} / ${formatNumber(activeRole.weight)}`;
        taskWeightBarEl.style.width = `${Math.min(percent, 100)}%`;
        if (percent >= 100) {
            taskWeightBarEl.classList.add('bg-green-500');
        } else if (percent >= 50) {
            taskWeightBarEl.classList.add('bg-amber-500');
        } else {
            taskWeightBarEl.classList.add('bg-red-500');
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
            extraLogs: data.extraLogs !== undefined ? data.extraLogs : 0,
            extraLogPoints: data.extraLogPoints !== undefined ? data.extraLogPoints : 0,
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

    // Load roles first so the saved calculation renders its task weight percentage
    loadRoles().then(() => {
        refreshTaskWeight();
        if (roles.length === 0) {
            setRoleManagerOpen(true);
        }
        loadSavedCalculation();
    });

    roleSelectEl.addEventListener('change', () => {
        setActiveRole(Number(roleSelectEl.value));
    });

    manageRolesBtn.addEventListener('click', () => {
        setRoleManagerOpen(roleManagerEl.classList.contains('hidden'));
    });

    async function handleAddRole() {
        const added = await addRole(roleNameInput.value, roleWeightInput.value);
        if (added) {
            roleNameInput.value = '';
            roleWeightInput.value = '';
            roleNameInput.focus();
        }
    }

    addRoleBtn.addEventListener('click', handleAddRole);
    [roleNameInput, roleWeightInput].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAddRole();
        });
    });

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
            if (totalExtraLogsEl) totalExtraLogsEl.textContent = '-';
            if (totalExtraLogPointsEl) totalExtraLogPointsEl.textContent = '-';
            totalOriginalEstimateEl.textContent = '-';
            timeSpentEl.textContent = '-';

            copyBtn.classList.add('hidden');
            clearBtn.classList.add('hidden');
            if (savedBadgeEl) savedBadgeEl.classList.add('hidden');

            lastTotal = null;
            renderTaskWeight();
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