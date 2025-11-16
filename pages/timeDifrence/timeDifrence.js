// Auto-format time input with colons
function formatTimeInput(input) {
    // Get the cursor position before formatting
    const cursorPos = input.selectionStart;
    const oldValue = input.value;
    
    // Remove all non-digit characters
    let value = oldValue.replace(/\D/g, '');
    
    // Count digits before cursor position in old value
    let digitsBeforeCursor = 0;
    for (let i = 0; i < cursorPos && i < oldValue.length; i++) {
        if (/\d/.test(oldValue[i])) {
            digitsBeforeCursor++;
        }
    }
    
    // Limit to 6 digits (HH:MM:SS)
    if (value.length > 6) {
        value = value.substring(0, 6);
    }
    
    // Add colons after every 2 digits
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 2 === 0) {
            formatted += ':';
        }
        formatted += value[i];
    }
    
    // Update the input value
    input.value = formatted;
    
    // Calculate new cursor position
    // Find position after the same number of digits in formatted string
    let newCursorPos = 0;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
            digitCount++;
            if (digitCount >= digitsBeforeCursor) {
                newCursorPos = i + 1;
                break;
            }
        }
        newCursorPos = i + 1;
    }
    
    // If we're at the end, position cursor at the end
    if (digitCount < digitsBeforeCursor) {
        newCursorPos = formatted.length;
    }
    
    input.setSelectionRange(newCursorPos, newCursorPos);
}

// Get current time and set it in the current time input
function setCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentTimeInput = document.getElementById('time2');
    currentTimeInput.value = `${hours}:${minutes}:${seconds}`;
}

// Calculate time difference
function calculateTimeDifference() {
    const dvrTimeInput = document.getElementById('time1');
    const currentTimeInput = document.getElementById('time2');
    const resultDiv = document.getElementById('result');
    
    const dvrTime = dvrTimeInput.value.trim();
    const currentTime = currentTimeInput.value.trim();
    
    // Validate time format (HH:MM:SS)
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
    
    if (!dvrTime || !currentTime) {
        resultDiv.textContent = 'time to go to';
        resultDiv.style.color = 'black';
        return;
    }
    
    if (!timeRegex.test(dvrTime) || !timeRegex.test(currentTime)) {
        resultDiv.textContent = 'time to go to';
        resultDiv.style.color = 'black';
        return;
    }
    
    // Parse times
    const [dvrHours, dvrMinutes, dvrSeconds] = dvrTime.split(':').map(Number);
    const [currentHours, currentMinutes, currentSeconds] = currentTime.split(':').map(Number);
    
    // Convert to total seconds
    const dvrTotalSeconds = dvrHours * 3600 + dvrMinutes * 60 + dvrSeconds;
    const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;
    
    // Calculate difference
    let diffSeconds = dvrTotalSeconds - currentTotalSeconds;
    
    // Handle day rollover (if DVR time is next day)
    if (diffSeconds < 0) {
        diffSeconds += 24 * 3600; // Add 24 hours
    }
    
    // Convert back to hours, minutes, seconds
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    
    // Format result
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    
    resultDiv.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    resultDiv.style.color = 'black';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Button next to current time input - gets current time
    const calculateTimeDifferenceBtn = document.getElementById('calculateTimeDifferenceBtn');
    calculateTimeDifferenceBtn.addEventListener('click', setCurrentTime);
    
    // Button to calculate time difference
    const getCurrentTimeBtn = document.getElementById('getCurrentTimeBtn');
    getCurrentTimeBtn.addEventListener('click', calculateTimeDifference);
    
    // Automatically calculate when either input changes
    const dvrTimeInput = document.getElementById('time1');
    const currentTimeInput = document.getElementById('time2');
    
    // Auto-format time inputs
    dvrTimeInput.addEventListener('input', function(e) {
        formatTimeInput(e.target);
        calculateTimeDifference();
    });
    dvrTimeInput.addEventListener('blur', calculateTimeDifference);
    
    currentTimeInput.addEventListener('input', function(e) {
        formatTimeInput(e.target);
        calculateTimeDifference();
    });
    currentTimeInput.addEventListener('blur', calculateTimeDifference);
});

