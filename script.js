document.addEventListener("DOMContentLoaded", function() {
    const calendar = document.querySelector(".calendar");
    const monthsContainer = document.querySelector(".months");
    const weeksContainer = document.querySelector(".weeks");
    const tooltip = document.getElementById("tooltip");

    const today = new Date(2024, 7, 22); // 假设今天是2024年8月22日
    let currentDate = new Date(today);

    // 调整currentDate到今天所在周的周日
    currentDate.setDate(today.getDate() - today.getDay());

    const months = [];
    let lastMonth = currentDate.getMonth();

    // 创建日期方格，从52周前的周日开始生成，确保从周日开始
    for (let i = 0; i < 52; i++) {
        const weekDiv = document.createElement("div");
        weekDiv.classList.add("week");

        // 生成一周的日期方格，从周日到周六
        for (let j = 0; j < 7; j++) {
            const dayDiv = document.createElement("div");
            dayDiv.classList.add("day");

            const specificDate = new Date(currentDate);

            // 只显示今天及以前的日期
            if (specificDate <= today) {
                const day = specificDate.getDate();
                const month = specificDate.getMonth();

                // 只在每个月的第一天显示月份标签
                if (day === 1 || (i === 0 && j === 0)) {
                    if (lastMonth !== month) {
                        months.push(specificDate.toLocaleString('default', { month: 'short' }));
                        lastMonth = month;
                    } else {
                        months.push("");
                    }
                } else {
                    months.push("");
                }

                // 模拟随机使用数据，并设置颜色等级
                const randomUsage = Math.floor(Math.random() * 13);
                let level = 0;
                if (randomUsage > 0) level = 1;
                if (randomUsage > 4) level = 2;
                if (randomUsage > 8) level = 3;
                if (randomUsage > 10) level = 4;

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

    // 生成月份标签，确保只在每个月的第一天显示
    months.reverse();
    months.forEach(month => {
        const monthDiv = document.createElement("div");
        monthDiv.innerText = month;
        monthsContainer.appendChild(monthDiv);
    });
});
