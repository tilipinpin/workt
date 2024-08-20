document.addEventListener('DOMContentLoaded', function () {
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate()); // Start from today

    const monthsContainer = document.getElementById('months');
    const daysOfWeekContainer = document.getElementById('days-of-week');
    const gridContainer = document.getElementById('contribution-grid');

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let months = [];

    // Populate days of the week
    weekDays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        daysOfWeekContainer.appendChild(dayElement);
    });

    // Generate the contribution grid
    for (let week = 0; week < 52; week++) {
        for (let day = 6; day >= 0; day--) { // Start from the last day (Saturday) back to Sunday
            const dayElement = document.createElement('div');
            dayElement.classList.add('day');

            // Random usage time (for demonstration)
            const usageTime = Math.floor(Math.random() * 13);

            // Set color based on usage time
            let level = 0;
            if (usageTime > 0) level = 1;
            if (usageTime > 3) level = 2;
            if (usageTime > 6) level = 3;
            if (usageTime > 9) level = 4;
            dayElement.setAttribute('data-level', level);

            // Tooltips
            dayElement.setAttribute('data-date', currentDate.toDateString());
            dayElement.setAttribute('data-usage', `${usageTime} hours`);
            dayElement.addEventListener('mouseenter', showTooltip);
            dayElement.addEventListener('mouseleave', hideTooltip);

            gridContainer.appendChild(dayElement);

            // Store the month of the current day
            if (currentDate.getDate() === 1 || (week === 0 && day === 6)) {
                months.push({ month: monthNames[currentDate.getMonth()], week: 51 - week });
            }

            // Move to the previous day
            currentDate.setDate(currentDate.getDate() - 1);
        }
    }

    // Generate month labels
    months.forEach(month => {
        const monthElement = document.createElement('div');
        monthElement.textContent = month.month;
        monthElement.style.gridColumnStart = month.week + 1;
        monthsContainer.appendChild(monthElement);
    });

    function showTooltip(e) {
        const tooltip = document.getElementById('tooltip');
        tooltip.textContent = `${e.target.getAttribute('data-date')}: ${e.target.getAttribute('data-usage')}`;
        tooltip.style.display = 'block';
        tooltip.style.top = `${e.pageY + 10}px`;
        tooltip.style.left = `${e.pageX + 10}px`;
    }

    function hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.display = 'none';
    }
});
