document.addEventListener("DOMContentLoaded", function() {
    const calendar = document.querySelector(".calendar");
    const monthsContainer = document.querySelector(".months");
    const contentContainer = document.querySelector(".content");
    const weeksContainer = document.querySelector(".weeks");
    const tooltip = document.getElementById("tooltip");
    const yearSelector = document.getElementById("yearSelector");
    const manualEntryToggle = document.getElementById("manualEntryToggle");
    const manualEntryPanel = document.getElementById("manualEntryPanel");
    const entryTokenSection = document.getElementById("entryTokenSection");
    const tokenInput = document.getElementById("tokenInput");
    const tokenSave = document.getElementById("tokenSave");
    const tokenClear = document.getElementById("tokenClear");
    const tokenStatus = document.getElementById("tokenStatus");
    const entryDate = document.getElementById("entryDate");
    const entryTypeButtons = document.querySelectorAll(".entry-type-btn");
    const entryRemark = document.getElementById("entryRemark");
    const entrySubmit = document.getElementById("entrySubmit");
    const entryStatus = document.getElementById("entryStatus");
    const onSiteFields = document.getElementById("onSiteFields");
    const entryStartTime = document.getElementById("entryStartTime");
    const entryEndTime = document.getElementById("entryEndTime");
    const entryHours = document.getElementById("entryHours");

    const GITHUB_REPO = "tilipinpin/workt";
    const GITHUB_FILE_PATH = "date/usage_data.csv";
    
    const RAW_DATA_URL = "https://raw.githubusercontent.com/" + GITHUB_REPO + "/main/" + GITHUB_FILE_PATH;
    const CDN_DATA_URL = "https://cdn.jsdelivr.net/gh/" + GITHUB_REPO + "@main/" + GITHUB_FILE_PATH;
    const TOKEN_STORAGE_KEY = "workt_github_token";

    const ENTRY_TYPES = {
        leave: { hours: "17", start: "00:00:00", end: "00:00:00", defaultRemark: "请假" },
        business_trip: { hours: "16", start: "00:00:00", end: "00:00:00", defaultRemark: "出差" },
        on_site: { hours: "8.75", start: " ", end: " ", defaultRemark: "现场服务" }
    };

    let usageData = {};
    let calendarGenerated = false;
    let monthLabelsResizeHandler = null;
    let monthLabelsState = null;

    function isMobilePortrait() {
        return window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
    }

    function syncMonthScroll() {
        const scrollOffset = isMobilePortrait() ? contentContainer.scrollLeft : 0;
        monthsContainer.style.setProperty("--month-scroll-offset", scrollOffset + "px");
    }

    contentContainer.addEventListener("scroll", syncMonthScroll);

    // ==========================================
    // 标准中国时区时间获取函数
    // ==========================================
    function getChinaNow() {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("zh-CN", {
            timeZone: "Asia/Shanghai",
            year: "numeric", month: "numeric", day: "numeric",
            hour: "numeric", minute: "numeric", second: "numeric",
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const map = {};
        parts.forEach(p => map[p.type] = p.value);
        return new Date(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
    }

    function refreshCalendar() {
        const selectedValue = yearSelector.value;
        if (selectedValue === "recent") {
            generateCalendar(null, false);
        } else {
            generateCalendar(parseInt(selectedValue, 10), true);
        }
    }

    function parseUsageCsv(data) {
        usageData = {};
        data.split("\n").forEach(function(row) {
            const trimmed = row.trim();
            if (!trimmed || trimmed.startsWith("日期")) {
                return;
            }

            const [date, startTime, endTime, hours, businessTripAddress] = row.split(",");
            const parsedHours = parseFloat(hours);
            if (!isNaN(parsedHours)) {
                const year = date.split("-")[0];
                if (!usageData[year]) {
                    usageData[year] = {};
                }
                usageData[year][date] = {
                    startTime: startTime || "",
                    endTime: endTime || "",
                    hours: parsedHours,
                    address: businessTripAddress || ""
                };
            } else {
                console.warn("无效的使用时间: " + hours + "，日期: " + date);
            }
        });
    }

    let selectedEntryType = "leave";

    function setEntryStatus(message, type) {
        entryStatus.textContent = message;
        entryStatus.className = "entry-status" + (type ? " " + type : "");
    }

    function normalizeTimeValue(value, fallback) {
        const raw = (value || fallback || "").trim();
        if (!raw) {
            return fallback;
        }
        const parts = raw.split(":");
        if (parts.length === 2) {
            return parts[0] + ":" + parts[1] + ":00";
        }
        return raw;
    }

    function parseTimeToSeconds(timeStr) {
        const normalized = normalizeTimeValue(timeStr, "00:00:00");
        const parts = normalized.split(":");
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2] || "0", 10);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function formatHours(hours) {
        return String(parseFloat(hours.toFixed(2)));
    }

    function calculateOnSiteHours(startTime, endTime) {
        const startSeconds = parseTimeToSeconds(startTime);
        const endSeconds = parseTimeToSeconds(endTime);
        let diffSeconds = endSeconds - startSeconds;
        if (diffSeconds < 0) {
            diffSeconds += 24 * 3600;
        }
        return formatHours(diffSeconds / 3600);
    }

    function updateOnSiteHours() {
        entryHours.value = calculateOnSiteHours(entryStartTime.value, entryEndTime.value);
    }

    function getOnSiteDefaults() {
        return {
            startTime: "8:30:00",
            endTime: "17:31:00"
        };
    }

    function getTodayDateString() {
        const now = getChinaNow();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function resetOnSiteFields() {
        entryStartTime.value = "08:30:00";
        entryEndTime.value = "17:31:00";
        updateOnSiteHours();
    }

    function updateEntryTypeUI(type) {
        selectedEntryType = type;
        onSiteFields.hidden = type !== "on_site";
        if (type === "on_site") {
            entryDate.value = getTodayDateString();
            resetOnSiteFields();
        }
    }

    function getEntryDetails(type, remark) {
        if (type === "on_site") {
            const startTime = normalizeTimeValue(entryStartTime.value, "8:30:00");
            const endTime = normalizeTimeValue(entryEndTime.value, "17:31:00");
            const hours = calculateOnSiteHours(startTime, endTime);
            if (parseFloat(hours) <= 0) {
                throw new Error("关机时间必须晚于开机时间");
            }
            return {
                startTime: startTime,
                endTime: endTime,
                hours: hours,
                remark: remark
            };
        }
        return { remark: remark };
    }

    function buildCsvRow(date, type, remark, details) {
        details = details || getEntryDetails(type, remark);
        const config = ENTRY_TYPES[type];
        if (!config) {
            throw new Error("无效的类型");
        }

        if (type === "on_site") {
            const mark = (details.remark || remark || "").trim() || config.defaultRemark;
            return date + "," + details.startTime + "," + details.endTime + "," + details.hours + "," + mark;
        }

        const mark = (remark || "").trim() || config.defaultRemark;
        return date + "," + config.start + "," + config.end + "," + config.hours + "," + mark;
    }

    function upsertCsvText(text, date, type, remark, details) {
        const lines = text.split(/\r?\n/);
        const header = "日期,开机时间,关机时间,使用时间，备注";
        if (!lines.length || !lines[0].startsWith("日期")) {
            lines.unshift(header);
        }
        const newRow = buildCsvRow(date, type, remark, details);
        let updated = false;
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].trim();
            if (!row) {
                continue;
            }
            if (row.split(",", 1)[0].trim() === date) {
                lines[i] = newRow;
                updated = true;
                break;
            }
        }
        if (!updated) {
            lines.push(newRow);
        }
        return lines.filter(function(line, index) {
            return index === 0 || line.trim();
        }).join("\n") + "\n";
    }

    function base64ToUtf8(base64) {
        return decodeURIComponent(escape(atob(base64.replace(/\n/g, ""))));
    }

    function utf8ToBase64(text) {
        return btoa(unescape(encodeURIComponent(text)));
    }

    function isValidGitHubToken(token) {
        return token &&
            token.indexOf("XXXX") === -1 &&
            token.indexOf("xxxx") === -1 &&
            token.length > 10;
    }

    function getStoredToken() {
        try {
            return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
        } catch (error) {
            return "";
        }
    }

    function setStoredToken(token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }

    function clearStoredToken() {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    function getGitHubConfig() {
        const storedToken = getStoredToken();
        if (!isValidGitHubToken(storedToken)) {
            return null;
        }
        return {
            token: storedToken,
            repo: GITHUB_REPO,
            filePath: GITHUB_FILE_PATH
        };
    }

    function hasGitHubWriteAccess() {
        return !!getGitHubConfig();
    }

    function setTokenStatus(message, type) {
        if (!tokenStatus) {
            return;
        }
        tokenStatus.textContent = message;
        tokenStatus.className = "entry-token-status" + (type ? " " + type : "");
    }

    function updateTokenSectionUI() {
        if (!entryTokenSection || !tokenInput) {
            return;
        }
        const configured = hasGitHubWriteAccess();
        entryTokenSection.classList.toggle("token-configured", configured);
        tokenInput.placeholder = configured
            ? "已配置，输入新 Token 可更换"
            : "ghp_...（需 Contents 读写权限）";
    }

    function focusTokenInput() {
        if (tokenInput) {
            tokenInput.focus({ preventScroll: true });
        }
    }

    function initTokenSettings() {
        if (!tokenInput || !tokenSave || !tokenClear) {
            return;
        }

        updateTokenSectionUI();

        tokenSave.addEventListener("click", function() {
            const token = tokenInput.value.trim();
            if (!isValidGitHubToken(token)) {
                setTokenStatus("请输入有效的 GitHub Token", "error");
                focusTokenInput();
                return;
            }
            setStoredToken(token);
            tokenInput.value = "";
            setTokenStatus("Token 已保存", "success");
            updateTokenSectionUI();
        });

        tokenClear.addEventListener("click", function() {
            clearStoredToken();
            tokenInput.value = "";
            setTokenStatus("已清除 Token", "info");
            updateTokenSectionUI();
            focusTokenInput();
        });
    }

    // 写入依旧走 GitHub 原生 API（带 Token，配额充足，不受 CDN 缓存影响）
    function saveEntryViaGitHub(date, type, remark, details) {
        const config = getGitHubConfig();
        if (!config) {
            return Promise.reject(new Error("未配置 GitHub Token，请在上方填入并保存"));
        }

        const apiUrl = "https://api.github.com/repos/" + config.repo + "/contents/" + config.filePath;
        const headers = {
            Authorization: "token " + config.token,
            Accept: "application/vnd.github.v3+json"
        };

        return fetch(apiUrl, { headers: headers })
            .then(function(response) {
                return response.json().then(function(fileInfo) {
                    if (!response.ok) {
                        throw new Error(fileInfo.message || "读取 GitHub 文件失败");
                    }
                    const sha = fileInfo.sha;
                    const content = base64ToUtf8(fileInfo.content);
                    const lines = content.trim().split("\n");
                    const newRow = buildCsvRow(date, type, remark, details);
                    let found = false;

                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].split(",")[0].trim() === date) {
                            lines[i] = newRow;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        lines.push(newRow);
                    }

                    const newContent = lines.join("\n") + "\n";
                    return fetch(apiUrl, {
                        method: "PUT",
                        headers: Object.assign({ "Content-Type": "application/json" }, headers),
                        body: JSON.stringify({
                            message: "手动录入 " + date,
                            content: utf8ToBase64(newContent),
                            sha: sha
                        })
                    });
                });
            })
            .then(function(response) {
                return response.json().then(function(data) {
                    if (!response.ok) {
                        throw new Error(data.message || "写入 GitHub 失败");
                    }
                    return data;
                });
            });
    }

    function saveEntry(date, type, remark, details) {
        return saveEntryViaGitHub(date, type, remark, details);
    }

    function closeManualEntryPanel() {
        manualEntryToggle.setAttribute("aria-expanded", "false");
        manualEntryPanel.hidden = true;
        setEntryStatus("", "");
    }

    function initManualEntry() {
        entryDate.value = getTodayDateString();

        entryTypeButtons.forEach(function(button) {
            button.addEventListener("click", function() {
                entryTypeButtons.forEach(function(item) { item.classList.remove("active"); });
                button.classList.add("active");
                updateEntryTypeUI(button.getAttribute("data-type"));
            });
        });

        entryStartTime.addEventListener("input", updateOnSiteHours);
        entryStartTime.addEventListener("change", updateOnSiteHours);
        entryEndTime.addEventListener("input", updateOnSiteHours);
        entryEndTime.addEventListener("change", updateOnSiteHours);

        manualEntryToggle.addEventListener("click", function() {
            const expanded = manualEntryToggle.getAttribute("aria-expanded") === "true";
            manualEntryToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
            manualEntryPanel.hidden = expanded;
            if (!expanded){
                entryTypeButtons.forEach(function(item) {
                    item.classList.remove("active");
                });

                const defaultBtn = document.querySelector('.entry-type-btn[data-type="on_site"]');
                if (defaultBtn) {
                    defaultBtn.classList.add("active");
                }

                updateEntryTypeUI("on_site");
                entryDate.value = getTodayDateString();
                entryRemark.value = "";
                resetOnSiteFields();

                if (!hasGitHubWriteAccess()) {
                    setEntryStatus("请先在上方保存 GitHub Token", "error");
                } else {
                    setEntryStatus("", "");
                }

            }
        });

        entrySubmit.addEventListener("click", function() {
            if (!entryDate.value) {
                setEntryStatus("请选择日期", "error");
                return;
            }

            entrySubmit.disabled = true;
            setEntryStatus("保存中...", "");

            let details;
            try {
                details = getEntryDetails(selectedEntryType, entryRemark.value);
            } catch (error) {
                setEntryStatus(error.message, "error");
                return;
            }

            saveEntry(entryDate.value, selectedEntryType, entryRemark.value, details)
                .then(function() {
                    entryRemark.value = "";
                    if (selectedEntryType === "on_site") {
                        resetOnSiteFields();
                    }
                    closeManualEntryPanel();
                    return loadUsageData(true).then(function() {
                        refreshCalendar();
                    });
                })
                .catch(function(error) {
                    setEntryStatus(error.message, "error");
                    if (!hasGitHubWriteAccess()) {
                        focusTokenInput();
                    }
                })
                .finally(function() {
                    entrySubmit.disabled = false;
                });
        });
    }

    initTokenSettings();
    initManualEntry();

    function generateYearSelector() {
        const currentYear = getChinaNow().getFullYear();
        for (let i = 1; i < 10; i++) {
            const year = currentYear - i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelector.appendChild(option);
        }
    }

    generateYearSelector();

    yearSelector.addEventListener('change', function() {
        const selectedValue = this.value;
        if (selectedValue === 'recent') {
            generateCalendar(null, false);
        } else {
            const selectedYear = parseInt(selectedValue);
            generateCalendar(selectedYear, true);
        }
    });

    function loadUsageData(forceReload) {
        function applyData(data) {
            parseUsageCsv(data);
            if (!calendarGenerated) {
                yearSelector.value = "recent";
                generateCalendar(null, false);
                calendarGenerated = true;
            }
        }

        const cacheBuster = forceReload ? "?t=" + Date.now() : "";
        const urls = [RAW_DATA_URL + cacheBuster, CDN_DATA_URL + cacheBuster];

        function fetchCsv(index) {
            return fetch(urls[index], { cache: "no-store" })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error("CSV 读取失败: " + response.status);
                    }
                    return response.text();
                })
                .catch(function(error) {
                    if (index + 1 < urls.length) {
                        console.warn("CSV 读取源失败，切换备用源:", error);
                        return fetchCsv(index + 1);
                    }
                    throw error;
                });
        }

        return fetchCsv(0)
            .then(applyData)
            .catch(function(error) { console.error("Error:", error); });
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
        const today = getChinaNow();

        if (isYearSelected && selectedYear) {
            startDate = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
            endDate = new Date(selectedYear, 11, 31, 0, 0, 0, 0);
        } else {
            endDate = today;
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 364);
        }

        let currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() - currentDate.getDay());

        while (currentDate <= endDate) {
            const weekDiv = document.createElement("div");
            weekDiv.classList.add("week");

            for (let j = 0; j < 7; j++) {
                const dayDiv = document.createElement("div");
                dayDiv.classList.add("day");

                const localYear = currentDate.getFullYear();
                const localMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
                const localDay = String(currentDate.getDate()).padStart(2, "0");
                const dateString = `${localYear}-${localMonth}-${localDay}`;
                
                const year = currentDate.getFullYear();
                const usage = usageData[year] && usageData[year][dateString] ? usageData[year][dateString] : { hours: 0, startTime: '', endTime: '', address: '' };

                if (isYearSelected && year !== selectedYear) {
                    dayDiv.classList.add("future");
                } else if (currentDate > today) {
                    dayDiv.classList.add("future");
                } else {
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

                        if (usage.endTime && usage.endTime.trim()) {
                            const endTime = new Date("1970-01-01T" + usage.endTime.split(":").slice(0, 2).join(":") + ":00");
                            const overtimeThreshold = new Date("1970-01-01T17:30:00");
                            if (endTime > overtimeThreshold) {
                                overtimeDays++;
                            }
                        }
                    }
                }

                // ==========================================
                // 修复原代码 .style.classList 的语法错误
                // ==========================================
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

        updateMonthLabels(startDate, isYearSelected ? selectedYear : getChinaNow().getFullYear());
        updateStats(yearTotalDays, yearTotalHours, daysOver16Hours, daysOver17Hours, overtimeDays, isYearSelected ? selectedYear : null);
    }

    function updateStats(days, hours, daysOver16Hours, daysOver17Hours, overtimeDays, year) {
        const statsContainer = document.getElementById("statsContainer");
        const displayYear = year || getChinaNow().getFullYear();

        statsContainer.innerHTML =
            "<span>" + days + " working days in " + displayYear + "</span>" +
            "<span class=\"hours-text\">(" + hours.toFixed(1) + " hours)</span>";

        let legendOvertime = document.querySelector('.legend-overtime');
        if (!legendOvertime) {
            legendOvertime = document.createElement('div');
            legendOvertime.classList.add('legend-overtime');
            legendOvertime.innerHTML = `
                <div class="legend-square"></div>
                <span class="overtime-text">Work Overtime <span class="days-over-16-text">(0 days)</span></span>
            `;
            const legendLeave = document.querySelector('.legend-leave');
            legendLeave.parentNode.insertBefore(legendOvertime, legendLeave);
        }
        legendOvertime.querySelector('.days-over-16-text').textContent = `(${overtimeDays} days)`;

        const legendLeave = document.querySelector('.legend-leave');
        legendLeave.querySelector('.days-over-17-text').textContent = `(${daysOver17Hours} days)`;

        const legendBusinessTrip = document.querySelector('.legend-business-trip');
        legendBusinessTrip.querySelector('.days-over-16-text').textContent = `(${daysOver16Hours} days)`;
    }

    function updateMonthLabels(startDate, selectedYear) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthLabelsState = { startDate: new Date(startDate), selectedYear: selectedYear };

        const updateLabels = () => {
            if (!monthLabelsState) {
                return;
            }

            monthsContainer.innerHTML = '';
            const weekElements = Array.from(weeksContainer.querySelectorAll('.week'));
            if (!weekElements.length) {
                return;
            }

            calendar.style.setProperty('--calendar-grid-offset', weekElements[0].offsetLeft + 'px');
            syncMonthScroll();
            const topOffset = 10;

            let currentDate = new Date(monthLabelsState.startDate);
            currentDate.setDate(currentDate.getDate() - currentDate.getDay());

            let lastMonth = -1;

            for (let i = 0; i < weekElements.length; i++) {
                const monthIndex = currentDate.getMonth();
                if (monthIndex !== lastMonth) {
                    const firstDayOfMonth = new Date(currentDate.getFullYear(), monthIndex, 1);
                    const daysSinceMonthStart = Math.floor((currentDate - firstDayOfMonth) / (24 * 60 * 60 * 1000));

                    if (daysSinceMonthStart < 14 || (monthLabelsState.selectedYear === 2023 && i === 0)) {
                        const monthDiv = document.createElement('div');
                        monthDiv.textContent = months[monthIndex];
                        monthDiv.style.left = weekElements[i].offsetLeft + 'px';
                        monthDiv.style.top = topOffset + 'px';
                        monthDiv.style.position = 'absolute';
                        monthsContainer.appendChild(monthDiv);
                        lastMonth = monthIndex;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 7);
            }
        };

        const scheduleUpdateLabels = () => {
            requestAnimationFrame(function() {
                requestAnimationFrame(updateLabels);
            });
        };

        if (monthLabelsResizeHandler) {
            window.removeEventListener('resize', monthLabelsResizeHandler);
        }

        monthLabelsResizeHandler = scheduleUpdateLabels;
        scheduleUpdateLabels();
        window.addEventListener('resize', monthLabelsResizeHandler);
    }

    // ==========================================
    // 优化：加入时间安全网防护，彻底杜绝死循环高频 Fetch
    // ==========================================
    function scheduleNextUpdate() {
        const now = getChinaNow();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        let timeUntilMidnight = tomorrow - now;

        // 如果剩余时间算出来小于 10 秒，强行设为 1 小时后再试，不准连续轰炸服务器
        if (timeUntilMidnight <= 10000) {
            timeUntilMidnight = 3600000; 
        }

        setTimeout(function() {
            console.log("执行午夜更新");
            loadUsageData(true).then(function() {
                refreshCalendar();
                scheduleNextUpdate();
            });
        }, timeUntilMidnight);
    }

    loadUsageData().then(() => {
        if (!calendarGenerated) {
            yearSelector.value = 'recent';
            generateCalendar(null, false);
            calendarGenerated = true;
        }
        scheduleNextUpdate();
    });
});
