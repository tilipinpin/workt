document.addEventListener("DOMContentLoaded", function() {
    const calendar = document.querySelector(".calendar");
    const monthsContainer = document.querySelector(".months");
    const weeksContainer = document.querySelector(".weeks");
    const tooltip = document.getElementById("tooltip");
    const yearSelector = document.getElementById("yearSelector");

    let usageData = {};
    let calendarGenerated = false;

    // 生成年份选择器
    function generateYearSelector() {
        const currentYear = new Date().getFullYear();
        for (let i = 1; i < 10; i++) {
            const year = currentYear - i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelector.appendChild(option);
        }
    }

    generateYearSelector();

    // 年份选择事件
    yearSelector.addEventListener('change', function() {
        const selectedValue = this.value;
        if (selectedValue === 'recent') {
            generateCalendar(null, false);
        } else {
            const selectedYear = parseInt(selectedValue);
            generateCalendar(selectedYear, true);
        }
    });

    // 数据加载逻辑
    fetch('https://raw.githubusercontent.com/tilipinpin/workt/main/date/usage_data.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n');
            rows.forEach(row => {
                const [date, startTime, endTime, hours, businessTripAddress] = row.split(',');
                const parsedHours = parseFloat(hours);
                if (!isNaN(parsedHours)) {
                    const year = date.split('-')[0];
                    if (!usageData[year]) {
                        usageData[year] = {};
                    }
                    usageData[year][date] = {
                        startTime: startTime,
                        endTime: endTime,
                        hours: parsedHours,
                        address: businessTripAddress
                    };
                } else {
                    console.warn(`无效的使用时间: ${hours}，日期: ${date}`);
                }
            });
            if (!calendarGenerated) {
                yearSelector.value = 'recent';
                generateCalendar(null, false);
                calendarGenerated = true;
            }
        })
        .catch(error => console.error('Error:', error));

    function toChinaTime(date) {
        // 将日期转换为中国时区（UTC+8）
        const utcOffset = 8 * 60; // UTC的分钟数
        return new Date(date.getTime() + (utcOffset * 60 * 1000));
    }

    function generateCalendar(selectedYear, isYearSelected) {
        weeksContainer.innerHTML = '';
        monthsContainer.innerHTML = '';
        let yearTotalDays = 0;
        let yearTotalHours = 0;
        let daysOver16Hours = 0;
        let daysOver17Hours = 0;
        let overtimeDays = 0;

        let startDate, endDate;
        const today = toChinaTime(new Date()); // 获取今天的日期
        if (isYearSelected && selectedYear) {
            startDate = toChinaTime(new Date(selectedYear, 0, 1));
            endDate = toChinaTime(new Date(selectedYear, 11, 31));
        } else {
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 364); // 从今天往前53周
            endDate = today; // 结束日期为今天
        }

        // 确保从当前日期的周日开始生成方格
        let currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // 从当前日期的周日开始

        while (currentDate <= endDate) {
            const weekDiv = document.createElement("div");
            weekDiv.classList.add("week");

            for (let j = 0; j < 7; j++) {
                const dayDiv = document.createElement("div");
                dayDiv.classList.add("day");

                const dateString = currentDate.toISOString().split('T')[0];
                const year = currentDate.getFullYear();
                const usage = usageData[year] && usageData[year][dateString] ? usageData[year][dateString] : { hours: 0, startTime: '', endTime: '', address: '' };

                // 只生成属于选定年份的日期方格
                if (isYearSelected && year !== selectedYear) {
                    dayDiv.classList.add("future"); // 不属于选中年份的方格
                } else if (currentDate > today) {
                    // 不生成今天之后的方格
                    dayDiv.classList.add("future"); // 可以选择添加样式以标识
                } else {
                    // 设置颜色等级和属性
                    let level = 0;
                    if (usage.hours > 0) level = 1;
                    if (usage.hours > 4) level = 2;
                    if (usage.hours > 8.7) level = 3;
                    if (usage.hours > 10.7) level = 4;
                    if (usage.hours >= 16 && usage.hours < 17) level = 5;
                    if (usage.hours >= 17) level = 6;

                    dayDiv.setAttribute("data-level", level);
                    dayDiv.setAttribute("data-date", dateString);
                    dayDiv.setAttribute("data-usage", usage.hours);
                    dayDiv.setAttribute("data-start-time", usage.startTime);
                    dayDiv.setAttribute("data-end-time", usage.endTime);
                    dayDiv.setAttribute("data-address", usage.address);

                    // 统计逻辑
                    if (usage.hours > 0) {
                        if (usage.hours < 16) {
                            yearTotalDays++;
                            yearTotalHours += usage.hours;
                        }
                        if (usage.hours >= 16 && usage.hours < 17) {
                            daysOver16Hours++;
                            yearTotalDays++;
                        }
                        if (usage.hours >= 17) {
                            daysOver17Hours++;
                        }

                        const endTime = new Date(`1970-01-01T${usage.endTime.split(':').slice(0, 2).join(':')}:00`);
                        const overtimeThreshold = new Date(`1970-01-01T17:30:00`);
                        if (endTime > overtimeThreshold) {
                            overtimeDays++;
                        }
                    }
                }

                // 工具提示功能
                dayDiv.addEventListener("mouseenter", function() {
                    const usage = this.getAttribute("data-usage");
                    const date = this.getAttribute("data-date");
                    const startTime = this.getAttribute("data-start-time");
                    const endTime = this.getAttribute("data-end-time");
                    const businessTripAddress = this.getAttribute("data-address");

                    let tooltipContent = `${date}\n开机时间: ${startTime}\n关机时间: ${endTime}\n总计时间: ${usage} hours`;
                    if (businessTripAddress && businessTripAddress.trim() !== "") {
                        tooltipContent += `\n备注: ${businessTripAddress}`;
                    }

                    tooltip.innerText = tooltipContent;
                    const rect = this.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
                    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
                    tooltip.classList.add("show");
                });

                dayDiv.addEventListener("mouseleave", function() {
                    tooltip.classList.remove("show");
                });

                weekDiv.appendChild(dayDiv);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            weeksContainer.appendChild(weekDiv);
        }

        updateMonthLabels(startDate, isYearSelected ? selectedYear : new Date().getFullYear());
        updateStats(yearTotalDays, yearTotalHours, daysOver16Hours, daysOver17Hours, overtimeDays, isYearSelected ? selectedYear : null);
    }

    function updateStats(days, hours, daysOver16Hours, daysOver17Hours, overtimeDays, year) {
        const statsContainer = document.querySelector('.stats-container') || document.createElement('div');
        statsContainer.classList.add('stats-container');
        
        const displayYear = year || new Date().getFullYear();
        
        statsContainer.innerHTML = `
           <span>${days} working days in ${displayYear}</span><span class="hours-text">(${hours.toFixed(1)} hours)</span>
        `;
        calendar.appendChild(statsContainer);

        // 更新加班统计图例
        let legendOvertime = document.querySelector('.legend-overtime');
        if (!legendOvertime) {
            legendOvertime = document.createElement('div');
            legendOvertime.classList.add('legend-overtime');
            legendOvertime.innerHTML = `
                <div class="legend-square"></div>
                <span class="overtime-text">Work Overtime <span class="days-over-16-text">(0 days)</span></span>
            `;
            // 将加班图例插入到请假图例之前
            const legendLeave = document.querySelector('.legend-leave');
            legendLeave.parentNode.insertBefore(legendOvertime, legendLeave);
        }
        legendOvertime.querySelector('.days-over-16-text').textContent = `(${overtimeDays} days)`;

        // 更新请假图例
        const legendLeave = document.querySelector('.legend-leave');
        legendLeave.querySelector('.days-over-17-text').textContent = `(${daysOver17Hours} days)`;

        // 更新出差图例
        const legendBusinessTrip = document.querySelector('.legend-business-trip');
        legendBusinessTrip.querySelector('.days-over-16-text').textContent = `(${daysOver16Hours} days)`;
    }

    function updateMonthLabels(startDate, selectedYear) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthsContainer.innerHTML = '';

        const updateLabels = () => {
            monthsContainer.innerHTML = '';
            const containerWidth = weeksContainer.offsetWidth;
            const squareWidth = containerWidth / 53;
            const labelOffset = 25;
            const topOffset = 10;

            let currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // 从周日开

            let lastMonth = -1;

            for (let i = 0; i < 53; i++) {
                const monthIndex = currentDate.getMonth();
                // 生成53周方格的月份标签
                if (monthIndex !== lastMonth) {
                    const firstDayOfMonth = new Date(currentDate.getFullYear(), monthIndex, 1);
                    const daysSinceMonthStart = Math.floor((currentDate - firstDayOfMonth) / (24 * 60 * 60 * 1000));
                    
                    // 确保每个年份都显示12个月份的标签
                    if (daysSinceMonthStart < 14 || (selectedYear === 2023 && i === 0)) {
                        const monthDiv = document.createElement('div');
                        monthDiv.textContent = months[monthIndex];
                        const leftOffset = i * squareWidth + labelOffset;
                        monthDiv.style.left = `${leftOffset}px`;
                        monthDiv.style.top = `${topOffset}px`;
                        monthDiv.style.position = 'absolute';
                        monthsContainer.appendChild(monthDiv);
                        lastMonth = monthIndex; // 更新最后一个月份
                    }
                }
                currentDate.setDate(currentDate.getDate() + 7); // 每次增加一周
            }
        };

        updateLabels();
        window.addEventListener('resize', updateLabels);
    }

    function scheduleNextUpdate() {
        const now = new Date();
        const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为中国时间
        const tomorrow = new Date(chinaTime.getFullYear(), chinaTime.getMonth(), chinaTime.getDate() + 1);
        const timeUntilMidnight = tomorrow - chinaTime;

        setTimeout(function() {
            if (Object.keys(usageData).length > 0) {
                const selectedValue = yearSelector.value;
                if (selectedValue === 'recent') {
                    generateCalendar(null, false);
                } else {
                    const selectedYear = parseInt(selectedValue);
                    generateCalendar(selectedYear, true);
                }
            }
            scheduleNextUpdate(); // 安排下一次更新
        }, timeUntilMidnight);
    }

    // 初始调用以开始定时更新
    scheduleNextUpdate();
});
