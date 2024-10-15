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
                const [date, startTime, endTime, hours, businessTripAddress] = row.split(','); // 假设第四列是出差地址
                
                // 检查 hours 是否有效
                const parsedHours = parseFloat(hours);
                if (!isNaN(parsedHours)) { // 确保 hours 是有效数字
                    usageData[date] = {
                        startTime: startTime, // 开机时间
                        endTime: endTime,     // 关机时间
                        hours: parsedHours,   // 使用时间
                        address: businessTripAddress // 出差地址
                    };
                } else {
                    console.warn(`无效的使用时间: ${hours}，日期: ${date}`); // 输出警告信息
                }
            });
            console.log(usageData); // 调试信息，查看数据是否正确
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
        let yearTotalDays = 0;
        let yearTotalHours = 0;
        let daysOver16Hours = 0; // 统计大于等于16小时的天数
        let daysOver17Hours = 0; // 新增：统计大于等于17小时的天数

        const today = new Date();
        today.setHours(today.getHours() + 8); // 将时间调整为中国时区
        const startOfYear = new Date(today.getFullYear(), 0, 1); // 获取当年1月1日

        const thisSunday = new Date(today);
        thisSunday.setDate(today.getDate() - today.getDay()); // 计算本周日

        let currentDate = new Date(thisSunday);
        currentDate.setHours(8, 0, 0, 0); // 设置为午夜（00:00:00.000）

        const months = [];
        let lastMonth = -1;

        // 创建日方格，从52周前的周日开始生成
        for (let i = 0; i < 52; i++) {
            const weekDiv = document.createElement("div");
            weekDiv.classList.add("week");

            // 生成一周的日期方格，从周日到周六
            for (let j = 0; j < 7; j++) {
                const dayDiv = document.createElement("div");
                dayDiv.classList.add("day");

                const specificDate = new Date(currentDate);

                // 检查是否需要添加月份标签
                if (specificDate.getDate() <= 7 && specificDate.getDay() === 0) {
                    const monthName = specificDate.toLocaleString('en-US', { month: 'short' });
                    if (!months.includes(monthName)) {
                        months.push(monthName);
                    }
                }

                // 只显示今天及以前的日期
                if (specificDate <= today) {
                    const dateString = specificDate.toISOString().split('T')[0];
                    const usage = usageData[dateString] ? usageData[dateString] : { hours: 0, startTime: '', endTime: '', address: '' };

                    // 根据使用时间设置颜色
                    let level = 0;
                    if (usage.hours > 0) level = 1;
                    if (usage.hours > 4) level = 2;
                    if (usage.hours > 8.7) level = 3;
                    if (usage.hours > 10.7) level = 4;
                    if (usage.hours >= 16 && usage.hours < 17) level = 5;
                    if (usage.hours >= 17) level = 6; // 新增：等级6

                    dayDiv.setAttribute("data-level", level);
                    dayDiv.setAttribute("data-date", dateString);
                    dayDiv.setAttribute("data-usage", usage.hours);
                    dayDiv.setAttribute("data-start-time", usage.startTime); // 设置开机时间
                    dayDiv.setAttribute("data-end-time", usage.endTime); // 设置关机时间
                    dayDiv.setAttribute("data-address", usage.address); // 设置出差地址

                    // 统计当年的使用天数和小时数
                    if (specificDate >= startOfYear && specificDate <= today) {
                        if (usage.hours > 0 && usage.hours < 16) {
                            yearTotalDays++;
                            yearTotalHours += usage.hours;
                        }
                        if (usage.hours >= 16 && usage.hours < 17) {
                            daysOver16Hours++;
                            yearTotalDays++; // 大于等于16小时的日期仍计入工作日，但不计入工作时间
                        }
                        if (usage.hours >= 17) {
                            daysOver17Hours++;
                            // 不计入工作日和工作时间
                        }
                    }

                    // 工具提示功能
                    dayDiv.addEventListener("mouseenter", function() {
                        const usage = this.getAttribute("data-usage");
                        const date = this.getAttribute("data-date");
                        const startTime = this.getAttribute("data-start-time"); // 获取开机时间
                        const endTime = this.getAttribute("data-end-time"); // 获取关机时间
                        const businessTripAddress = this.getAttribute("data-address"); // 获取出差地址

                        // 更新工具提示内容
                        let tooltipContent = `${date}\n开机时间: ${startTime}\n关机时间: ${endTime}\n使用时间: ${usage} hours`;
                        
                        // 如果存在出差地址且不为空，则添加到工具提示内容中
                        if (businessTripAddress && businessTripAddress.trim() !== "") {
                            tooltipContent += `\n备注: ${businessTripAddress}`; // 追加出差地址
                        }

                        tooltip.innerText = tooltipContent;

                        // 计算工具提示位置
                        const rect = this.getBoundingClientRect();
                        tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`; // 居中
                        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`; // 在方格上方，留出5px的间距
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
        updateStats(yearTotalDays, yearTotalHours, daysOver16Hours, daysOver17Hours);
    }

    function updateStats(days, hours, daysOver16Hours, daysOver17Hours) {
        const statsContainer = document.createElement('div');
        statsContainer.classList.add('stats-container');
        const currentYear = new Date().getFullYear();
        statsContainer.innerHTML = `
           <span>${days} working days in ${currentYear}<span class="hours-text">(${hours.toFixed(1)} hours)</span></span>
        `;
        calendar.appendChild(statsContainer);

        // Update legend
        const legendLeave = document.querySelector('.legend-leave');
        legendLeave.innerHTML = `
            <div class="legend-square" data-level="6"></div>
            <span class="leave-text">Days of leave <span class="days-over-17-text">(${daysOver17Hours} days)</span></span>
        `;

        const legendBusinessTrip = document.querySelector('.legend-business-trip');
        legendBusinessTrip.innerHTML = `
            <div class="legend-square" data-level="5"></div>
            <span class="business-trip-text">Business trip <span class="days-over-16-text">(${daysOver16Hours} days)</span></span>
        `;
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

        const updateLabels = () => {
            monthsContainer.innerHTML = ''; // 清空现有标签
            const containerWidth = weeksContainer.offsetWidth;
            const squareWidth = containerWidth / 52; // 动态计算方格宽度
            const labelOffset = 19; // 标签左偏移量
            const topOffset = 10; // 标签上下偏移量

            let currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() - 364); // 从一年前开始
            let lastMonth = -1;

            for (let i = 0; i < 53; i++) {
                const monthIndex = currentDate.getMonth();
                if (monthIndex !== lastMonth && currentDate.getDay() === 0) {
                    // 检查是否是本月的第一个或第二个周日
                    const firstDayOfMonth = new Date(currentDate.getFullYear(), monthIndex, 1);
                    const daysSinceMonthStart = Math.floor((currentDate - firstDayOfMonth) / (24 * 60 * 60 * 1000));
                    
                    if (daysSinceMonthStart < 14) { // 允许月份的前两个周日
                        const monthDiv = document.createElement('div');
                        monthDiv.textContent = months[monthIndex];
                        const leftOffset = i * squareWidth + labelOffset;
                        monthDiv.style.left = `${leftOffset}px`;
                        monthDiv.style.top = `${topOffset}px`;
                        monthDiv.style.position = 'absolute';
                        monthsContainer.appendChild(monthDiv);
                        lastMonth = monthIndex;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 7);
            }
        };

        updateLabels();

        // 添加窗口大小变化事件监听器
        window.addEventListener('resize', updateLabels);
    }

    // 每天午夜更新一次
    setInterval(updateMonthLabels, 24 * 60 * 60 * 1000);
});
