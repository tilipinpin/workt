document.addEventListener("DOMContentLoaded", function() {
    const calendar = document.querySelector(".calendar");
    const monthsContainer = document.querySelector(".months");
    const weeksContainer = document.querySelector(".weeks");
    const tooltip = document.getElementById("tooltip");

    let usageData = {}; // 添加这行来存储使用数据
    let calendarGenerated = false; // 添加此标志

    // 从 GitHub 获取使用数据
    fetch('https://raw.githubusercontent.com/tilipinpin/workt/main/date/usage_data.csv')
        .then(response => response.text())
        .then(data => {
            // 解析 CSV 数据
            const rows = data.split('\n');
            rows.forEach(row => {
                const [date, startTime, endTime, hours] = row.split(','); // 增加开机时间和关机时间
                usageData[date] = {
                    startTime: startTime, // 开机时间
                    endTime: endTime,     // 关机时间
                    hours: parseFloat(hours) // 使用时间
                };
            });
            if (!calendarGenerated) { // 只在第一次生成日历
                generateCalendar();
                calendarGenerated = true;
            }
        })
        .catch(error => console.error('Error:', error));

    function generateCalendar() {
        // 清空现有内容
        weeksContainer.innerHTML = '';
        monthsContainer.innerHTML = '';
        totalDays = 0;
        totalHours = 0;

        const today = new Date(); // 获取当前日期
        const thisSunday = new Date(today);
        thisSunday.setDate(today.getDate() - today.getDay()); // 计算本周日

        let currentDate = new Date(thisSunday);

        const months = [];
        let lastMonth = -1;

        // 创建日期方格，从52周前的周日开始生成
        for (let i = 0; i < 52; i++) {
            const weekDiv = document.createElement("div");
            weekDiv.classList.add("week");

            // 生成一周的日期方格，从周日到周
            for (let j = 0; j < 7; j++) {
                const dayDiv = document.createElement("div");
                dayDiv.classList.add("day");

                const specificDate = new Date(currentDate);

                // 检是需要添加月份标签
                if (specificDate.getDate() <= 7 && specificDate.getDay() === 0) {
                    const monthName = specificDate.toLocaleString('en-US', { month: 'short' });
                    if (!months.includes(monthName)) {
                        months.push(monthName);
                    }
                }

                // 只显示今天及以前的日期
                if (specificDate <= today) {
                    const dateString = specificDate.toISOString().split('T')[0];
                    const usage = usageData[dateString].hours || 0;

                    let level = 0;
                    if (usage > 0) level = 1;
                    if (usage > 4) level = 2;
                    if (usage > 8.75) level = 3;
                    if (usage > 10.75) level = 4;

                    dayDiv.setAttribute("data-level", level);
                    dayDiv.setAttribute("data-date", dateString);
                    dayDiv.setAttribute("data-usage", usage);

                    // 统计使用天数和小时数
                    if (usage > 0) {
                        totalDays++;
                        totalHours += usage;
                    }

                    // 工具提示功能
                    dayDiv.addEventListener("mouseenter", function() {
                        const usage = this.getAttribute("data-usage");
                        const date = this.getAttribute("data-date");
                        const startTime = this.getAttribute("data-start-time"); // 获取开机时间
                        const endTime = this.getAttribute("data-end-time"); // 获取关机时间

                        // 更新工具提示内容
                        tooltip.innerText = `${date}\n开机时间: ${startTime}\n关机时间: ${endTime}\n使用时间: ${usage} hours`;
                        tooltip.style.left = `${this.getBoundingClientRect().left + window.scrollX}px`;
                        tooltip.style.top = `${this.getBoundingClientRect().top + window.scrollY - 30}px`;
                        tooltip.classList.add("show");
                    });

                    dayDiv.addEventListener("mouseleave", function() {
                        tooltip.classList.remove("show");
                    });

                } else {
                    dayDiv.classList.add("future");
                }

                weekDiv.appendChild(dayDiv);
                currentDate.setDate(currentDate.getDate() + 1); // 生下一天
            }

            weeksContainer.prepend(weekDiv); // 从右向左插入
            currentDate.setDate(currentDate.getDate() - 14);  // 回到上周日
        }

        // 替换调用updateMonthLabels函数，传入第一个日期方格的日期
        updateMonthLabels(currentDate);

        // 更新统计结果
        updateStats(totalDays, totalHours);
    }

    let totalDays = 0;
    let totalHours = 0;

    function updateStats(days, hours) {
        const statsContainer = document.createElement('div');
        statsContainer.classList.add('stats-container');
        statsContainer.innerHTML = `
           <span>最近一年工作——${days}天——${hours.toFixed(1)}小时</span>
        `;
        calendar.appendChild(statsContainer);
    }

    // 每24小时更新一次日历
    setInterval(function() {
        if (Object.keys(usageData).length > 0) {
            generateCalendar();
        }
    }, 24 * 60 * 60 * 1000);

    function updateMonthLabels(startDate) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthsContainer.innerHTML = ''; // 清空现有标签

        let currentDate = new Date(startDate);
        let lastMonth = -1;
        let monthsAdded = new Set();

        for (let i = 0; i < 53; i++) { // 53周以确保覆盖整个年份
            const monthIndex = currentDate.getMonth();
            if (monthIndex !== lastMonth && !monthsAdded.has(monthIndex)) {
                const monthDiv = document.createElement('div');
                monthDiv.textContent = months[monthIndex];
                monthDiv.style.flex = '1'; // 使月份标签均匀分布
                monthDiv.style.textAlign = 'center';
                monthsContainer.appendChild(monthDiv);
                lastMonth = monthIndex;
                monthsAdded.add(monthIndex);
            }
            currentDate.setDate(currentDate.getDate() + 7); // 移动到下一周

            // 如果已经添加了12个月份，就退出循环
            if (monthsAdded.size === 12) {
                break;
            }
        }
    }

    // 每天午夜更新一次
    setInterval(updateMonthLabels, 24 * 60 * 60 * 1000);
});
