document.addEventListener("DOMContentLoaded", function() {
    const calendar = document.querySelector(".calendar");
    const monthsContainer = document.querySelector(".months");
    const weeksContainer = document.querySelector(".weeks");
    const tooltip = document.getElementById("tooltip");

    function generateCalendar() {
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

            // 生成一周的日期方格，从周日到周六
            for (let j = 0; j < 7; j++) {
                const dayDiv = document.createElement("div");
                dayDiv.classList.add("day");

                const specificDate = new Date(currentDate);

                // 检是否需要添加月份标签
                if (specificDate.getDate() <= 7 && specificDate.getDay() === 0) {
                    const monthName = specificDate.toLocaleString('en-US', { month: 'short' });
                    if (!months.includes(monthName)) {
                        months.push(monthName);
                    }
                }

                // 只显示今天及以前的日期
                if (specificDate <= today) {
                    const day = specificDate.getDate();
                    const month = specificDate.getMonth();

                    // 模拟随机使用数据，并设置颜色等级
                    const randomUsage = Math.floor(Math.random() * 13);
                    let level = 0;
                    if (randomUsage > 0) level = 1;
                    if (randomUsage > 4) level = 2;
                    if (randomUsage > 8.75) level = 3;
                    if (randomUsage > 10.75) level = 4;

                    dayDiv.setAttribute("data-level", level);
                    dayDiv.setAttribute("data-date", specificDate.toISOString().split('T')[0]);
                    dayDiv.setAttribute("data-usage", randomUsage);

                    // 工具提示功能
                    dayDiv.addEventListener("mouseenter", function() {
                        const usage = this.getAttribute("data-usage");
                        const date = this.getAttribute("data-date");
                        tooltip.innerText = `${date}: ${usage} hours`;
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
                currentDate.setDate(currentDate.getDate() + 1); // 生成下一天
            }

            weeksContainer.prepend(weekDiv); // 从右向左插入
            currentDate.setDate(currentDate.getDate() - 14);  // 回到上周日
        }

        // 确保显示所有12个月份
        const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        allMonths.forEach(month => {
            if (!months.includes(month)) {
                months.push(month);
            }
        });

        // 生成月份标签
        months.reverse();
        months.forEach(month => {
            const monthDiv = document.createElement("div");
            monthDiv.innerText = month;
            monthsContainer.appendChild(monthDiv);
        });
    }

    generateCalendar();

    // 每24小时更新一次日历
    setInterval(generateCalendar, 24 * 60 * 60 * 1000);

    function updateMonthLabels() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthsContainer = document.querySelector('.months');
        monthsContainer.innerHTML = ''; // 清空现有标签

        const today = new Date();
        const startMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);

        for (let i = 0; i < 12; i++) {
            const monthDiv = document.createElement('div');
            const currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
            monthDiv.textContent = months[currentMonth.getMonth()];
            monthsContainer.appendChild(monthDiv);
        }
    }

    // 初始更新
    updateMonthLabels();

    // 每天午夜更新一次
    setInterval(updateMonthLabels, 24 * 60 * 60 * 1000);
});