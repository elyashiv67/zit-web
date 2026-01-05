// Auto-format date input with slashes
function formatDateInput(input) {
    // Get the cursor position before formatting
    const cursorPos = input.selectionStart;
    const oldValue = input.value;
    
    // Store previous value for next comparison (before processing)
    const prevValue = input.dataset.prevValue || '';
    input.dataset.prevValue = oldValue;
    
    // Store previous digit count to detect deletion
    const prevDigitCount = prevValue.replace(/\D/g, '').length;
    
    // Remove all non-digit characters
    let value = oldValue.replace(/\D/g, '');
    
    // If user is deleting and cursor is right after a separator, delete the digit before it
    if (value.length < prevDigitCount && cursorPos > 0 && cursorPos <= oldValue.length) {
        const charBeforeCursor = oldValue[cursorPos - 1];
        if (charBeforeCursor === '/') {
            // User is trying to delete a slash, remove the digit before it
            if (cursorPos === 3) {
                // Deleting first slash, remove last digit of day
                value = value.substring(0, 1);
            } else if (cursorPos === 6) {
                // Deleting second slash, remove last digit of month
                value = value.substring(0, 3);
            }
        }
    }
    
    // Count digits before cursor position in old value
    let digitsBeforeCursor = 0;
    for (let i = 0; i < cursorPos && i < oldValue.length; i++) {
        if (/\d/.test(oldValue[i])) {
            digitsBeforeCursor++;
        }
    }
    
    // Limit to 8 digits (DD/MM/YYYY)
    if (value.length > 8) {
        value = value.substring(0, 8);
    }
    
    // Validate and correct values as user types
    if (value.length >= 2) {
        const day = parseInt(value.substring(0, 2));
        if (day > 31) {
            // If day > 31, set to 31
            value = '31' + value.substring(2);
        } else if (day === 0) {
            // Day can't be 0, set to 01
            value = '01' + value.substring(2);
        }
    } else if (value.length === 1) {
        // If first digit of day is > 3, it can't be valid (max day is 31)
        if (value[0] > '3') {
            // Set to 3 (will allow 30-31)
            value = '3';
        }
    }
    
    if (value.length >= 4) {
        const month = parseInt(value.substring(2, 4));
        if (month > 12) {
            // If month > 12, set to 12
            value = value.substring(0, 2) + '12' + value.substring(4);
        } else if (month === 0) {
            // Month can't be 0, set to 01
            value = value.substring(0, 2) + '01' + value.substring(4);
        }
        
        // Validate day based on month (if we have both day and month)
        const day = parseInt(value.substring(0, 2));
        const monthNum = parseInt(value.substring(2, 4));
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const maxDay = daysInMonth[monthNum - 1] || 31;
        if (day > maxDay) {
            // Correct day to max for that month
            const correctedDay = String(maxDay).padStart(2, '0');
            value = correctedDay + value.substring(2);
        }
    } else if (value.length === 3) {
        // Check if first digit of month is > 1
        const firstMonthDigit = value[2];
        if (firstMonthDigit > '1') {
            // Can't have month > 12, set to 1
            value = value.substring(0, 2) + '1';
        }
    }
    
    // Add slashes after 2 digits and 4 digits (immediately when we have 2 or 4 digits)
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        formatted += value[i];
        // Add slash immediately after 2 digits or 4 digits
        if ((i === 1 && value.length >= 2) || (i === 3 && value.length >= 4)) {
            formatted += '/';
        }
    }
    
    // Update the input value
    input.value = formatted;
    
    // Position cursor after the separator if we just added one
    let newCursorPos = formatted.length;
    if (value.length === 2 && formatted.length === 3) {
        // Just added first slash, position after it
        newCursorPos = 3;
    } else if (value.length === 4 && formatted.length === 6) {
        // Just added second slash, position after it
        newCursorPos = 6;
    } else {
        // Calculate cursor position based on digits
        let digitCount = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) {
                digitCount++;
                if (digitCount >= digitsBeforeCursor) {
                    newCursorPos = i + 1;
                    break;
                }
            }
        }
    }
    
    input.setSelectionRange(newCursorPos, newCursorPos);
}

// Auto-format time input with colons
function formatTimeInput(input) {
    // Get the cursor position before formatting
    const cursorPos = input.selectionStart;
    const oldValue = input.value;
    
    // Store previous value for next comparison (before processing)
    const prevValue = input.dataset.prevValue || '';
    input.dataset.prevValue = oldValue;
    
    // Store previous digit count to detect deletion
    const prevDigitCount = prevValue.replace(/\D/g, '').length;
    
    // Remove all non-digit characters
    let value = oldValue.replace(/\D/g, '');
    
    // If user is deleting and cursor is right after a separator, delete the digit before it
    if (value.length < prevDigitCount && cursorPos > 0 && cursorPos <= oldValue.length) {
        const charBeforeCursor = oldValue[cursorPos - 1];
        if (charBeforeCursor === ':') {
            // User is trying to delete a colon, remove the digit before it
            if (cursorPos === 3) {
                // Deleting first colon, remove last digit of hours
                value = value.substring(0, 1);
            } else if (cursorPos === 6) {
                // Deleting second colon, remove last digit of minutes
                value = value.substring(0, 3);
            }
        }
    }
    
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
    
    // Validate and correct values as user types
    if (value.length >= 2) {
        const hours = parseInt(value.substring(0, 2));
        if (hours > 23) {
            // If hours > 23, set to 23
            value = '23' + value.substring(2);
        }
    } else if (value.length === 1) {
        // If first digit of hours is > 2, it can't be valid (max is 23)
        if (value[0] > '2') {
            // Set to 2 (will allow 20-23)
            value = '2';
        }
    }
    
    if (value.length >= 4) {
        const minutes = parseInt(value.substring(2, 4));
        if (minutes > 59) {
            // If minutes > 59, set to 59
            value = value.substring(0, 2) + '59' + value.substring(4);
        }
    } else if (value.length === 3) {
        // Check if first digit of minutes is > 5
        const firstMinuteDigit = value[2];
        if (firstMinuteDigit > '5') {
            // Can't have minutes > 59, set to 5
            value = value.substring(0, 2) + '5';
        }
    }
    
    if (value.length >= 6) {
        const seconds = parseInt(value.substring(4, 6));
        if (seconds > 59) {
            // If seconds > 59, set to 59
            value = value.substring(0, 4) + '59';
        }
    } else if (value.length === 5) {
        // Check if first digit of seconds is > 5
        const firstSecondDigit = value[4];
        if (firstSecondDigit > '5') {
            // Can't have seconds > 59, set to 5
            value = value.substring(0, 4) + '5';
        }
    }
    
    // Add colons immediately after every 2 digits
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        formatted += value[i];
        // Add colon immediately after 2 digits or 4 digits
        if ((i === 1 && value.length >= 2) || (i === 3 && value.length >= 4)) {
            formatted += ':';
        }
    }
    
    // Update the input value
    input.value = formatted;
    
    // Position cursor after the separator if we just added one
    let newCursorPos = formatted.length;
    if (value.length === 2 && formatted.length === 3) {
        // Just added first colon, position after it
        newCursorPos = 3;
    } else if (value.length === 4 && formatted.length === 6) {
        // Just added second colon, position after it
        newCursorPos = 6;
    } else {
        // Calculate cursor position based on digits
        let digitCount = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) {
                digitCount++;
                if (digitCount >= digitsBeforeCursor) {
                    newCursorPos = i + 1;
                    break;
                }
            }
        }
    }
    
    input.setSelectionRange(newCursorPos, newCursorPos);
}

// Get current date and set it in the current date input
function setCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const currentDateInput = document.getElementById('date2');
    currentDateInput.value = `${day}/${month}/${year}`;
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
    const dateInputsDiv = document.getElementById('dateInputs');
    const useDate = dateInputsDiv.style.display !== 'none';
    
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
    
    if (useDate) {
        // Calculate with dates
        const dvrDateInput = document.getElementById('date1');
        const currentDateInput = document.getElementById('date2');
        const dvrDate = dvrDateInput.value.trim();
        const currentDate = currentDateInput.value.trim();
        
        // Validate date format (DD/MM/YYYY)
        const dateRegex = /^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/(\d{4})$/;
        
        if (!dvrDate || !currentDate) {
            resultDiv.textContent = 'time to go to';
            resultDiv.style.color = 'black';
            return;
        }
        
        if (!dateRegex.test(dvrDate) || !dateRegex.test(currentDate)) {
            resultDiv.textContent = 'time to go to';
            resultDiv.style.color = 'black';
            return;
        }
        
        // Parse dates
        const [dvrDay, dvrMonth, dvrYear] = dvrDate.split('/').map(Number);
        const [currentDay, currentMonth, currentYear] = currentDate.split('/').map(Number);
        
        // Create Date objects
        const dvrDateTime = new Date(dvrYear, dvrMonth - 1, dvrDay, dvrHours, dvrMinutes, dvrSeconds);
        const currentDateTime = new Date(currentYear, currentMonth - 1, currentDay, currentHours, currentMinutes, currentSeconds);
        
        // Calculate difference in milliseconds
        let diffMs = dvrDateTime.getTime() - currentDateTime.getTime();
        
        // If negative, DVR time is in the past
        if (diffMs < 0) {
            resultDiv.textContent = 'time to go to';
            resultDiv.style.color = 'black';
            return;
        }
        
        // Convert to total seconds
        const diffSeconds = Math.floor(diffMs / 1000);
        
        // Calculate days, hours, minutes, seconds
        const days = Math.floor(diffSeconds / 86400);
        const remainingSeconds = diffSeconds % 86400;
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        
        // Format result
        const formattedDays = String(days).padStart(2, '0');
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        
        resultDiv.textContent = `${formattedDays} days ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        resultDiv.style.color = 'black';
    } else {
        // Calculate without dates (time only)
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
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Toggle date inputs visibility
    const dateFormatBtn = document.getElementById('dateFormat');
    const dateInputsDiv = document.getElementById('dateInputs');
    dateFormatBtn.addEventListener('click', function() {
        if (dateInputsDiv.style.display === 'none') {
            dateInputsDiv.style.display = 'block';
            dateFormatBtn.textContent = 'remove date';
        } else {
            dateInputsDiv.style.display = 'none';
            dateFormatBtn.textContent = 'add date';
            // Clear date inputs when hiding
            document.getElementById('date1').value = '';
            document.getElementById('date2').value = '';
        }
    });
    
    // Button to get current date
    const getCurrentDateBtn = document.getElementById('getCurrentDateBtn');
    getCurrentDateBtn.addEventListener('click', setCurrentDate);
    
    // Button next to current time input - gets current time
    const calculateTimeDifferenceBtn = document.getElementById('calculateTimeDifferenceBtn');
    calculateTimeDifferenceBtn.addEventListener('click', setCurrentTime);
    
    // Button to calculate time difference
    const getCurrentTimeBtn = document.getElementById('getCurrentTimeBtn');
    getCurrentTimeBtn.addEventListener('click', calculateTimeDifference);
    
    // Auto-format time inputs (without calculating)
    const dvrTimeInput = document.getElementById('time1');
    const currentTimeInput = document.getElementById('time2');
    
    // Handle backspace/delete on separators for time inputs
    function handleTimeKeydown(e) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const cursorPos = e.target.selectionStart;
            const value = e.target.value;
            
            if (cursorPos > 0 && cursorPos <= value.length) {
                const charAtCursor = value[cursorPos - 1];
                if (charAtCursor === ':') {
                    // User is trying to delete a colon, delete the digit before it
                    e.preventDefault();
                    if (cursorPos === 3) {
                        // Delete last digit of hours
                        e.target.value = value.substring(0, 1) + value.substring(3);
                        e.target.setSelectionRange(1, 1);
                    } else if (cursorPos === 6) {
                        // Delete last digit of minutes
                        e.target.value = value.substring(0, 4) + value.substring(6);
                        e.target.setSelectionRange(4, 4);
                    }
                    formatTimeInput(e.target);
                }
            }
        }
    }
    
    dvrTimeInput.addEventListener('keydown', handleTimeKeydown);
    dvrTimeInput.addEventListener('input', function(e) {
        formatTimeInput(e.target);
    });
    
    currentTimeInput.addEventListener('keydown', handleTimeKeydown);
    currentTimeInput.addEventListener('input', function(e) {
        formatTimeInput(e.target);
    });
    
    // Auto-format date inputs (without calculating)
    const dvrDateInput = document.getElementById('date1');
    const currentDateInput = document.getElementById('date2');
    
    // Handle backspace/delete on separators for date inputs
    function handleDateKeydown(e) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const cursorPos = e.target.selectionStart;
            const value = e.target.value;
            
            if (cursorPos > 0 && cursorPos <= value.length) {
                const charAtCursor = value[cursorPos - 1];
                if (charAtCursor === '/') {
                    // User is trying to delete a slash, delete the digit before it
                    e.preventDefault();
                    if (cursorPos === 3) {
                        // Delete last digit of day
                        e.target.value = value.substring(0, 1) + value.substring(3);
                        e.target.setSelectionRange(1, 1);
                    } else if (cursorPos === 6) {
                        // Delete last digit of month
                        e.target.value = value.substring(0, 4) + value.substring(6);
                        e.target.setSelectionRange(4, 4);
                    }
                    formatDateInput(e.target);
                }
            }
        }
    }
    
    dvrDateInput.addEventListener('keydown', handleDateKeydown);
    dvrDateInput.addEventListener('input', function(e) {
        formatDateInput(e.target);
    });
    
    currentDateInput.addEventListener('keydown', handleDateKeydown);
    currentDateInput.addEventListener('input', function(e) {
        formatDateInput(e.target);
    });
});

