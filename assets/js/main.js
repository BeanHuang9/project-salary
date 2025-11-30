/* ============================
   Google Sheet CSV URL（讀取）
============================ */
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTocOfradY1JtUvkHjeq9B6lVTqTXPsRPGXBOvsfdwq_iVK6cu6LdZL8sxUfbzjdGevXAsS5YMpgAXZ/pub?output=csv&cb=' +
  Math.random() +
  '&t=' +
  Date.now();

/* ============================
   Google Apps Script API（新增）
============================ */
const API_URL =
  'https://script.google.com/macros/s/AKfycbzobMqEeIkwcxvvqYHle8JghWmRjnnafCGpc44M1mCPxobWDbXJVucLCcyrnUwrDgiM4g/exec';

let allRows = [];

/* ============================
   欄位自動偵測工具
============================ */
function getField(row, key) {
  if (row[key] !== undefined) return row[key];
  const cleanKey = key.replace(/\s+/g, '');
  const found = Object.keys(row).find((k) => k.replace(/\s+/g, '').includes(cleanKey));
  return found ? row[found] : '';
}

/* ============================
   讀取 Google Sheet
============================ */
function loadSheet() {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (res) {
      let raw = res.data;
      raw.pop(); // 移除最後的小計列
      allRows = raw.reverse(); // 新資料排最上面
      render();
    },
  });
}

/* ============================
   主渲染流程
============================ */
function render() {
  const keyword = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('statusFilter')?.value || 'all';

  let rows = allRows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    if (!text.includes(keyword)) return false;

    const unpaid = parseMoney(getField(row, '未收'));
    const deposit = parseMoney(getField(row, '訂金'));

    if (status === 'paid' && unpaid > 0) return false;
    if (status === 'unpaid' && unpaid === 0) return false;
    if (status === 'deposit' && deposit === 0) return false;

    return true;
  });

  renderTable(rows);
  renderCards(rows);
  calcSummary(rows);
  renderMonthlyChart(rows); // ★★★ 新增：每月薪資圖表
}

/* ============================
   Summary 計算
============================ */
function calcSummary(rows) {
  let totalIncome = 0;
  let totalUnpaid = 0;

  rows.forEach((r) => {
    totalIncome += parseMoney(getField(r, '實收'));
    totalUnpaid += parseMoney(getField(r, '未收'));
  });

  document.getElementById('sumIncome').innerText = 'NT$ ' + formatMoney(totalIncome);
  document.getElementById('sumUnpaid').innerText = 'NT$ ' + formatMoney(totalUnpaid);

  const percent =
    totalIncome + totalUnpaid === 0
      ? 0
      : Math.round((totalIncome / (totalIncome + totalUnpaid)) * 100);

  document.getElementById('percentDoneText').innerText = percent + '%';
  document.getElementById('percentDoneFill').style.width = percent + '%';
}

/* ============================
   表格渲染
============================ */
function renderTable(rows) {
  if (!rows.length) return;

  const keys = Object.keys(rows[0]);

  document.getElementById('tableHead').innerHTML =
    '<tr>' + keys.map((k) => `<th>${k}</th>`).join('') + '</tr>';

  let tbody = '';

  rows.forEach((r) => {
    tbody += '<tr>';

    keys.forEach((k) => {
      let v = r[k] || '';
      const isNum = /^[\d,.\-]+$/.test(String(v).trim());

      if (v === 'TRUE') {
        tbody += `<td><span class="icon-yes">✔</span></td>`;
      } else if (v === 'FALSE') {
        tbody += `<td><span class="icon-no">✖</span></td>`;
      } else if (String(v).includes('待收')) {
        tbody += `<td><span class="icon-wait">❗</span></td>`;
      } else if (String(v).includes('已開立')) {
        tbody += `<td><span class="icon-issued">💰</span></td>`;
      } else if (k.includes('未收') && parseMoney(v) > 0) {
        tbody += `<td><span class="tag tag-warn">${v}</span></td>`;
      } else if (k.includes('已收') && parseMoney(v) > 0) {
        tbody += `<td><span class="tag tag-paid">${v}</span></td>`;
      } else if (k.includes('專案')) {
        tbody += `<td class="project-name">${v}</td>`;
      } else {
        tbody += `<td class="${isNum ? 'num-right' : ''}">${v}</td>`;
      }
    });

    tbody += '</tr>';
  });

  document.getElementById('tableBody').innerHTML = tbody;
}

/* ============================
   手機卡片渲染
============================ */
function renderCards(rows) {
  if (window.innerWidth > 768) {
    document.getElementById('cardArea').style.display = 'none';
    return;
  }

  let html = '';
  rows.forEach((r) => {
    html += `
      <div class="card">
        <div class="card-title">${getField(r, '專案')}</div>
        <div class="card-row">📅 ${getField(r, '日期')}</div>
        <div class="card-row">💰 實收：${getField(r, '實收')}</div>
        <div class="card-row">❗ 未收：${getField(r, '未收')}</div>
        <div class="card-row">📝 備註：${getField(r, '附註') || '—'}</div>
      </div>
    `;
  });

  document.getElementById('cardArea').innerHTML = html;
  document.getElementById('cardArea').style.display = 'block';
}

/* ============================
   ★ 前端新增資料 → 傳給 Google Apps Script
============================ */
function addNewData() {
  const dateInput = document.getElementById('fDate');
  const projectInput = document.getElementById('fProject');
  const totalInput = document.getElementById('fTotal');
  const incomeInput = document.getElementById('fIncome');

  const date = dateInput.value;
  const project = projectInput.value;
  const total = totalInput.value;
  const income = incomeInput.value;

  if (!date || !project || !total || !income) {
    alert('請完整填寫所有欄位');
    return;
  }

  document.getElementById('loading').style.display = 'flex';

  fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, project, total, income }),
  })
    .then(() => {
      document.getElementById('loading').style.display = 'none';

      alert('新增成功！（資料約 2～30 秒後同步）');

      dateInput.value = '';
      projectInput.value = '';
      totalInput.value = '';
      incomeInput.value = '';

      setTimeout(loadSheet, 5000);
    })
    .catch((err) => {
      document.getElementById('loading').style.display = 'none';
      alert('連線錯誤：' + err);
    });
}

/* ============================
   小工具
============================ */
function parseMoney(str) {
  if (!str) return 0;
  return Number(String(str).replace(/[^\d.-]/g, '')) || 0;
}

function formatMoney(num) {
  return num.toLocaleString();
}

/* ============================
   📊 每月薪資圖表
============================ */

// 月份統整
function calcMonthlyIncome(rows) {
  const monthMap = {};

  rows.forEach((row) => {
    let dateStr = getField(row, '日期') || '';
    const income = parseMoney(getField(row, '實收'));

    if (!dateStr) return;

    // ⭐ 自動修正日期格式：統一成 yyyy/mm/dd
    dateStr = dateStr.replace(/-/g, '/');

    const parts = dateStr.split('/');
    if (parts.length < 2) return; // 防呆

    const [y, m] = parts;
    const key = `${y}-${m.padStart(2, '0')}`; // 統一為 yyyy-mm

    if (!monthMap[key]) monthMap[key] = 0;
    monthMap[key] += income;
  });

  return monthMap;
}

let monthlyChartInstance = null;

// 渲染圖表
function renderMonthlyChart(rows) {
  const map = calcMonthlyIncome(rows);

  // 最近 12 個月份
  let months = Object.keys(map).sort().slice(-12);
  const values = months.map((m) => map[m]);

  const canvas = document.getElementById('monthlySalaryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // 如果有舊 chart → 清掉
  if (monthlyChartInstance) monthlyChartInstance.destroy();

  // ⭐ 手機版固定圓餅圖
  const isMobile = window.innerWidth <= 768;
  const chartType = isMobile ? 'pie' : 'bar';

  // Pie 顏色組
  const pieColors = [
    '#FFCD56',
    '#FF9F40',
    '#4BC0C0',
    '#36A2EB',
    '#9966FF',
    '#C9CBCF',
    '#FFD95C',
    '#EFB45C',
    '#BA9C5A',
    '#93C7EA',
    '#FFDE87',
    '#C4A86B',
  ];

  // ⭐ Pie 與 Bar 的 dataset
  const data = {
    labels: months,
    datasets: [
      {
        label: '每月收入 (NT$)',
        data: values,
        backgroundColor: isMobile ? pieColors : '#ffd95c',
        borderColor: isMobile ? '#ffffff' : '#d6b74b',
        borderWidth: isMobile ? 2 : 1,
        borderRadius: isMobile ? 0 : 8,
      },
    ],
  };

  // ⭐ 手機版 tooltip 顯示百分比
  const total = values.reduce((a, b) => a + b, 0);

  const options = isMobile
    ? {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.raw;
                const percent = ((value / total) * 100).toFixed(1);
                return `${context.label}: NT$${value.toLocaleString()} (${percent}%)`;
              },
            },
          },
          legend: {
            position: 'bottom',
            labels: { font: { size: 12 } },
          },
        },
        // 手機版不做任何 onclick 行為
      }
    : {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => 'NT$ ' + v.toLocaleString(),
            },
          },
        },
      };

  monthlyChartInstance = new Chart(ctx, {
    type: chartType,
    data,
    options,
  });
}

/* ============================
   📊 圖表顯示 / 隱藏切換
============================ */
function toggleChart() {
  const box = document.getElementById('chartBox');
  const isHidden = box.style.display === 'none';

  if (isHidden) {
    // 顯示
    box.style.display = 'block';
    renderMonthlyChart(allRows); // 確保顯示時重新渲染
  } else {
    // 隱藏
    box.style.display = 'none';
  }
}



/* ============================
   Event (搜尋 & 篩選)
============================ */
document.getElementById('searchInput')?.addEventListener('input', render);
document.getElementById('statusFilter')?.addEventListener('change', render);

/* ============================
   啟動
============================ */
loadSheet();
