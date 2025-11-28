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
      ? '0%'
      : Math.round((totalIncome / (totalIncome + totalUnpaid)) * 100) + '%';

  document.getElementById('percentDone').innerText = percent;
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

  // 🔥 顯示 Loading
  document.getElementById('loading').style.display = 'flex';

  fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, project, total, income }),
  })
    .then(() => {
      // 🔥 隱藏 Loading
      document.getElementById('loading').style.display = 'none';

      alert('新增成功！（資料約 2～30 秒後同步）');

      dateInput.value = '';
      projectInput.value = '';
      totalInput.value = '';
      incomeInput.value = '';

      // 等待後重新整理資料
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
   Event (搜尋 & 篩選)
============================ */
document.getElementById('searchInput')?.addEventListener('input', render);
document.getElementById('statusFilter')?.addEventListener('change', render);

/* ============================
   啟動
============================ */
loadSheet();
