/**
 * This script is injected into the web page.
 * It finds all elements that represent story points, sums their values,
 * and sends the total back to the popup.
 */
(function () {

    /**
     * Parses Jira time strings like "2h 30m", "1 hour, 30 minutes", "3d", etc.
     * Converts to hours.
     */
    function parseJiraTime(timeStr) {
        if (!timeStr || timeStr === 'None') return 0;
        
        let totalHours = 0;
        // Match numbers followed by units. Handle "1 day, 4 hours" as well as "1d 4h"
        const regex = /(\d+(?:\.\d+)?)\s*(weeks?|w|days?|d|hours?|h|minutes?|m)/gi;
        let match;
        
        // Clean up the string a bit (remove commas)
        const cleanStr = timeStr.replace(/,/g, '');
        
        while ((match = regex.exec(cleanStr)) !== null) {
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            
            if (unit.startsWith('w')) {
                totalHours += value * 40; // Assuming 5-day work week, 8h/day
            } else if (unit.startsWith('d')) {
                totalHours += value * 8; // Assuming 8h/day
            } else if (unit.startsWith('h')) {
                totalHours += value;
            } else if (unit.startsWith('m')) {
                totalHours += value / 60;
            }
        }
        
        return totalHours;
    }

    function getColumnIndices() {
        const headers = document.querySelectorAll('thead th');
        const indices = {
            originalEstimate: -1,
            timeSpent: -1,
            storyPoints: -1
        };

        headers.forEach((th, index) => {
            const label = th.getAttribute('aria-label') || th.textContent.trim();
            if (label.toLowerCase().includes('original estimate')) indices.originalEstimate = index;
            if (label.toLowerCase().includes('time spent')) indices.timeSpent = index;
            if (label.toLowerCase().includes('story points')) indices.storyPoints = index;
        });

        return indices;
    }

    // Helper to determine if a table row or issue is a bug or sub-task bug
    function isBugRow(row) {
        // 1. Check specific issue type icon selectors
        const typeImg = row.querySelector('img[data-vc="native-issue-table-ui-icon-cell-img"]')
            || row.querySelector('[data-vc="merged-cell"] img[alt]')
            || row.querySelector('[data-testid*="issue-row.merged-cell"] img[alt]')
            || row.querySelector('td.issuetype img[alt]')
            || row.querySelector('td[data-cell-type="issuetype"] img[alt]');

        if (typeImg) {
            const alt = (typeImg.getAttribute('alt') || '').toLowerCase();
            const title = (typeImg.getAttribute('title') || '').toLowerCase();
            const ariaLabel = (typeImg.getAttribute('aria-label') || '').toLowerCase();
            if (alt.includes('bug') || title.includes('bug') || ariaLabel.includes('bug')) {
                return true;
            }
        }

        // 2. Check the first 2 cells (checkbox and merged cell with key/type)
        const cells = row.querySelectorAll('td');
        for (let i = 0; i < Math.min(cells.length, 2); i++) {
            const imgs = cells[i].querySelectorAll('img');
            for (const img of imgs) {
                const alt = (img.getAttribute('alt') || '').toLowerCase();
                const title = (img.getAttribute('title') || '').toLowerCase();
                const ariaLabel = (img.getAttribute('aria-label') || '').toLowerCase();
                if (alt.includes('bug') || title.includes('bug') || ariaLabel.includes('bug')) {
                    return true;
                }
            }
        }

        return false;
    }

    // Helper to determine if a table row or issue is an extra log task (indicated by DEV in task link/key)
    function isExtraLogRow(row) {
        // 1. Check issue key link in the row
        const issueKeyLinks = row.querySelectorAll('a[data-testid*="issue-key"], a[data-testid*="issue-cells.issue-key"], a[href*="/browse/"]');
        for (const link of issueKeyLinks) {
            const href = (link.getAttribute('href') || '').toUpperCase();
            const text = (link.textContent || '').trim().toUpperCase();
            const ariaLabel = (link.getAttribute('aria-label') || '').toUpperCase();
            if (href.includes('/BROWSE/DEV') || text.startsWith('DEV-') || text.includes('DEV-') || ariaLabel.includes('DEV-') || /\bDEV-\d+\b/i.test(text)) {
                return true;
            }
        }

        // 2. Fallback: inspect any link in the row
        const allLinks = row.querySelectorAll('a');
        for (const link of allLinks) {
            const href = (link.getAttribute('href') || '').toUpperCase();
            const text = (link.textContent || '').trim().toUpperCase();
            if (href.includes('/BROWSE/DEV') || /\bDEV-\d+\b/i.test(text)) {
                return true;
            }
        }

        return false;
    }

    // Helper for single issue view fallback
    function isExtraLogIssue() {
        const issueKeyEl = document.querySelector('[data-testid="issue-field-key.ui.debug.info-element"], a[href*="/browse/"]');
        if (issueKeyEl) {
            const text = (issueKeyEl.textContent || '').trim().toUpperCase();
            const href = (issueKeyEl.getAttribute('href') || '').toUpperCase();
            if (text.includes('DEV-') || href.includes('/BROWSE/DEV') || /\bDEV-\d+\b/i.test(text)) {
                return true;
            }
        }
        if (typeof window !== 'undefined' && window.location && window.location.pathname) {
            if (/\/browse\/DEV-/i.test(window.location.pathname)) {
                return true;
            }
        }
        return false;
    }

    // Function to calculate story points and time tracking from current DOM
    function calculateStoryPoints(processedElements) {
        let total = 0;
        let totalOriginalEstimate = 0;
        let totalTimeSpent = 0;
        let remainingCount = 0;
        let bugCount = 0;
        let bugStoryPoints = 0;
        let extraLogCount = 0;
        let extraLogStoryPoints = 0;
        const newProcessed = new Set();

        const indices = getColumnIndices();
        const rows = document.querySelectorAll('tbody tr[data-vc="issue-row"]');

        if (rows.length > 0) {
            // Table view extraction
            rows.forEach(row => {
                const elementId = getElementId(row);
                if (!elementId || processedElements.has(elementId)) return;
                processedElements.add(elementId);
                newProcessed.add(elementId);

                // Detect bugs and sub bugs
                const isBug = isBugRow(row);
                if (isBug) {
                    bugCount++;
                }

                // Detect extra log tasks (DEV in task link)
                const isExtraLog = isExtraLogRow(row);
                if (isExtraLog) {
                    extraLogCount++;
                }

                const cells = row.querySelectorAll('td');

                // Story Points
                if (indices.storyPoints !== -1 && cells[indices.storyPoints]) {
                    const text = cells[indices.storyPoints].textContent.trim();
                    if (text && text !== 'None' && !isNaN(parseFloat(text))) {
                        const points = parseFloat(text);
                        total += points;
                        if (isBug) {
                            bugStoryPoints += points;
                        }
                        if (isExtraLog) {
                            extraLogStoryPoints += points;
                        }
                    } else if (text === 'None' || text === '') {
                        remainingCount++;
                    }
                }

                // Original Estimate
                if (indices.originalEstimate !== -1 && cells[indices.originalEstimate]) {
                    const text = cells[indices.originalEstimate].textContent.trim();
                    totalOriginalEstimate += parseJiraTime(text);
                }

                // Time Spent
                if (indices.timeSpent !== -1 && cells[indices.timeSpent]) {
                    const text = cells[indices.timeSpent].textContent.trim();
                    totalTimeSpent += parseJiraTime(text);
                }
            });
        } else {
            // Fallback for single issue view or non-standard table
            // 1. Find story point elements
            const storyPointElements = document.querySelectorAll('[data-testid="issue-field-story-point-estimate-readview-full.ui.story-point-estimate"]');
            storyPointElements.forEach((element) => {
                const elementId = getElementId(element);
                if (!elementId || processedElements.has(elementId)) return;
                processedElements.add(elementId);
                newProcessed.add(elementId);

                const text = element.textContent.trim();
                if (text && text !== 'None' && !isNaN(parseFloat(text))) {
                    total += parseFloat(text);
                } else if (text === 'None' || text === '') {
                    remainingCount++;
                }
            });

            // 2. Find Time Tracking containers
            const timeTrackingContainers = document.querySelectorAll('[data-testid="issue-field-inline-edit-read-view-container.ui.container"]');
            timeTrackingContainers.forEach((container) => {
                const editButton = container.querySelector('button[aria-label="Edit Time tracking"]');
                if (!editButton) return;

                const elementId = getElementId(container) + "-oe";
                if (processedElements.has(elementId)) return;
                processedElements.add(elementId);
                newProcessed.add(elementId);

                const text = container.textContent.trim();
                totalOriginalEstimate += parseJiraTime(text);
            });

            // 3. Find Time Spent
            const fallbackDivs = document.querySelectorAll('[data-testid="native-issue-table.common.ui.issue-cells.fallback.div"]');
            fallbackDivs.forEach((div) => {
                const text = div.textContent.trim();
                // Match patterns like "2h", "30m", "2d", "1w", "2h 30m", "1 hour", "30 minutes"
                const timePattern = /\d+\s*(weeks?|days?|hours?|minutes?|w|d|h|m)\b/i;
                if (!timePattern.test(text)) {
                    return;
                }

                const elementId = getElementId(div) + "-ts";
                if (processedElements.has(elementId)) return;
                processedElements.add(elementId);
                newProcessed.add(elementId);

                totalTimeSpent += parseJiraTime(text);
            });

            // Check if single issue view is a bug
            const issueTypeImg = document.querySelector('[data-testid="issue.views.issue-base.foundation.change-issue-type.button"] img, [data-testid*="issue-type"] img, img[data-vc="native-issue-table-ui-icon-cell-img"]');
            if (issueTypeImg) {
                const alt = (issueTypeImg.getAttribute('alt') || '').toLowerCase();
                const title = (issueTypeImg.getAttribute('title') || '').toLowerCase();
                if (alt.includes('bug') || title.includes('bug')) {
                    bugCount = 1;
                    bugStoryPoints = total;
                }
            }

            // Check if single issue view is an extra log
            if (isExtraLogIssue()) {
                extraLogCount = 1;
                extraLogStoryPoints = total;
            }
        }

        return { 
            total, 
            totalOriginalEstimate,
            totalTimeSpent,
            remainingCount, 
            bugCount,
            bugStoryPoints,
            extraLogCount,
            extraLogStoryPoints,
            newProcessed, 
            processedCount: processedElements.size 
        };
    }

    // Helper to get a unique ID for an element
    function getElementId(element) {
        // Try to find the parent row and get issue key
        const row = element.closest('tr') || element.closest('[role="row"]');
        if (row) {
            const issueLink = row.querySelector('a[href*="/browse/"]');
            if (issueLink) {
                return issueLink.href || issueLink.textContent.trim();
            }
            const firstCell = row.querySelector('td, [role="gridcell"]');
            if (firstCell) {
                return firstCell.textContent.trim().substring(0, 50);
            }
        }
        
        // If not in a row, try to find issue key in the whole document (for issue view)
        const issueKeyEl = document.querySelector('[data-testid="issue-field-key.ui.debug.info-element"], a[href*="/browse/"]');
        if (issueKeyEl) {
            return issueKeyEl.textContent.trim();
        }

        return Array.from(element.parentElement?.children || []).indexOf(element).toString();
    }

    // Function to load all table data by scrolling and accumulate story points incrementally
    async function loadAllTableData() {
        const processedElements = new Set(); // Track processed rows to avoid duplicates
        let accumulatedTotal = 0;
        let accumulatedOriginalEstimate = 0;
        let accumulatedTimeSpent = 0;
        let accumulatedRemaining = 0;
        let accumulatedBugs = 0;
        let accumulatedBugStoryPoints = 0;
        let accumulatedExtraLogs = 0;
        let accumulatedExtraLogStoryPoints = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 200; // Prevent infinite loops
        const scrollDelay = 400; // Wait 400ms between scrolls for content to load
        const scrollStep = 500; // Scroll in increments of 500px

        // Find the Jira scroll container
        const jiraScrollContainer = document.querySelector('[data-testid="native-issue-table.ui.scroll-container.scroll-container"]');

        if (!jiraScrollContainer) {
            // Fallback calculation
            const result = calculateStoryPoints(processedElements);
            return { 
                total: result.total, 
                totalOriginalEstimate: result.totalOriginalEstimate,
                totalTimeSpent: result.totalTimeSpent,
                remainingCount: result.remainingCount, 
                bugs: result.bugCount,
                bugStoryPoints: result.bugStoryPoints,
                extraLogs: result.extraLogCount,
                extraLogPoints: result.extraLogStoryPoints,
                processedCount: result.processedCount 
            };
        }

        let maxScrollHeight = jiraScrollContainer.scrollHeight;
        let lastScrollPosition = 0;
        let noNewDataCount = 0;
        const maxNoNewDataCount = 3; // Stop after 3 consecutive scrolls with no new data

        // Start from top and scroll incrementally
        jiraScrollContainer.scrollTop = 0;
        await new Promise(resolve => setTimeout(resolve, scrollDelay));

        while (scrollAttempts < maxScrollAttempts) {
            // Calculate story points from currently visible rows
            const result = calculateStoryPoints(processedElements);
            accumulatedTotal += result.total;
            accumulatedOriginalEstimate += result.totalOriginalEstimate;
            accumulatedTimeSpent += result.totalTimeSpent;
            accumulatedRemaining += result.remainingCount;
            accumulatedBugs += result.bugCount;
            accumulatedBugStoryPoints += result.bugStoryPoints;
            accumulatedExtraLogs += result.extraLogCount;
            accumulatedExtraLogStoryPoints += result.extraLogStoryPoints;

            // If no new data found, increment counter
            if (result.newProcessed.size === 0) {
                noNewDataCount++;
                if (noNewDataCount >= maxNoNewDataCount) {
                    break;
                }
            } else {
                noNewDataCount = 0; // Reset counter if we found new data
            }

            // Scroll down incrementally
            const currentScrollTop = jiraScrollContainer.scrollTop;
            const nextScrollTop = Math.min(currentScrollTop + scrollStep, maxScrollHeight);

            // Check if we've reached the bottom (can't scroll further)
            if (nextScrollTop >= maxScrollHeight - 10) {
                // One final check for any remaining items
                const finalResult = calculateStoryPoints(processedElements);
                accumulatedTotal += finalResult.total;
                accumulatedOriginalEstimate += finalResult.totalOriginalEstimate;
                accumulatedTimeSpent += finalResult.totalTimeSpent;
                accumulatedRemaining += finalResult.remainingCount;
                accumulatedBugs += finalResult.bugCount;
                accumulatedBugStoryPoints += finalResult.bugStoryPoints;
                accumulatedExtraLogs += finalResult.extraLogCount;
                accumulatedExtraLogStoryPoints += finalResult.extraLogStoryPoints;
                break;
            }

            lastScrollPosition = currentScrollTop;
            jiraScrollContainer.scrollTop = nextScrollTop;
            await new Promise(resolve => setTimeout(resolve, scrollDelay));

            // Update maxScrollHeight in case it increased (more content loaded)
            const newMaxScrollHeight = jiraScrollContainer.scrollHeight;
            if (newMaxScrollHeight > maxScrollHeight) {
                maxScrollHeight = newMaxScrollHeight;
            }

            scrollAttempts++;
        }

        // Final scroll to bottom and one last calculation
        jiraScrollContainer.scrollTop = maxScrollHeight;
        await new Promise(resolve => setTimeout(resolve, scrollDelay * 2));

        const finalResult = calculateStoryPoints(processedElements);
        accumulatedTotal += finalResult.total;
        accumulatedOriginalEstimate += finalResult.totalOriginalEstimate;
        accumulatedTimeSpent += finalResult.totalTimeSpent;
        accumulatedRemaining += finalResult.remainingCount;
        accumulatedBugs += finalResult.bugCount;
        accumulatedBugStoryPoints += finalResult.bugStoryPoints;
        accumulatedExtraLogs += finalResult.extraLogCount;
        accumulatedExtraLogStoryPoints += finalResult.extraLogStoryPoints;

        return { 
            total: accumulatedTotal, 
            totalOriginalEstimate: accumulatedOriginalEstimate,
            totalTimeSpent: accumulatedTimeSpent,
            remainingCount: accumulatedRemaining, 
            bugs: accumulatedBugs,
            bugStoryPoints: accumulatedBugStoryPoints,
            extraLogs: accumulatedExtraLogs,
            extraLogPoints: accumulatedExtraLogStoryPoints,
            processedCount: processedElements.size 
        };
    }

    // Main execution: Load all data incrementally and accumulate totals
    (async () => {
        try {
            const { total, totalOriginalEstimate, totalTimeSpent, remainingCount, bugs, bugStoryPoints, extraLogs, extraLogPoints, processedCount } = await loadAllTableData();
            // Send totals back to the popup.js
            chrome.runtime.sendMessage({
                action: "sendTotal",
                total: total,
                originalEstimate: totalOriginalEstimate,
                timeSpent: totalTimeSpent,
                remaining: remainingCount,
                processed: processedCount,
                bugs: bugs,
                bugStoryPoints: bugStoryPoints,
                extraLogs: extraLogs,
                extraLogPoints: extraLogPoints
            });
        } catch (error) {
            console.error("Storypoint calculation error:", error);
            // Fallback: calculate with whatever is available
            const processedElements = new Set();
            const { total, totalOriginalEstimate, totalTimeSpent, remainingCount, bugCount, bugStoryPoints, extraLogCount, extraLogStoryPoints, processedCount } = calculateStoryPoints(processedElements);
            chrome.runtime.sendMessage({
                action: "sendTotal",
                total: total,
                originalEstimate: totalOriginalEstimate,
                timeSpent: totalTimeSpent,
                remaining: remainingCount,
                processed: processedCount,
                bugs: bugCount,
                bugStoryPoints: bugStoryPoints,
                extraLogs: extraLogCount,
                extraLogPoints: extraLogStoryPoints
            });
        }
    })();

})();
