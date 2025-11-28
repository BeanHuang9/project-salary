/* ============================
   Google Sheet CSV URL（讀取）
============================ */
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSi55MdYM55CEQhERa70WFhFbbbz891wKRFMIrVKGvArsto-UUkJrUSK5aTE-7UZ8YRrTnz1lnYubsy/pub?output=csv';

/* ============================
   Google Apps Script API（新增）
============================ */
const API_URL =
  'https://script.google.com/macros/s/AKfycbwy_jd5jqVynet1oSbwb5xm52jPj9lC2btqwG8T2Lg8iLq85PpTs5nfZOEEL24CYFvQHw/exec';

let allRows = [];

/* 讀取 Google Sheet */
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

/* 主渲染流程 */
function render() {
  const keyword = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('statusFilter')?.value || 'all';

  let rows = allRows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    if (!text.includes(keyword)) return false;

    const unpaid = parseMoney(row['未收']);
    const deposit = parseMoney(row['訂金']);

    if (status === 'paid' && unpaid > 0) return false;
    if (status === 'unpaid' && unpaid === 0) return false;
    if (status === 'deposit' && deposit === 0) return false;

    return true;
  });

  renderTable(rows);
  renderCards(rows);
  calcSummary(rows);
}

/* Summary */
function calcSummary(rows) {
  let totalIncome = 0;
  let totalUnpaid = 0;

  rows.forEach((r) => {
    totalIncome += parseMoney(r['實收']);
    totalUnpaid += parseMoney(r['未收']);
  });

  document.getElementById('sumIncome').innerText = 'NT$ ' + formatMoney(totalIncome);
  document.getElementById('sumUnpaid').innerText = 'NT$ ' + formatMoney(totalUnpaid);

  const percent =
    totalIncome + totalUnpaid === 0
      ? '0%'
      : Math.round((totalIncome / (totalIncome + totalUnpaid)) * 100) + '%';

  document.getElementById('percentDone').innerText = percent;
}

/* 表格渲染 */
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

      tbody += `<td class="${isNum ? 'num-right' : ''}">${v}</td>`;
    });

    tbody += '</tr>';
  });

  document.getElementById('tableBody').innerHTML = tbody;
}

/* 手機卡片渲染 */
function renderCards(rows) {
  if (window.innerWidth > 768) {
    document.getElementById('cardArea').style.display = 'none';
    return;
  }

  let html = '';
  rows.forEach((r) => {
    html += `
      <div class="card">
        <div class="card-title">${r['專案']}</div>
        <div class="card-row">📅 ${r['日期']}</div>
        <div class="card-row">💰 實收：${r['實收']}</div>
        <div class="card-row">❗ 未收：${r['未收']}</div>
        <div class="card-row">📝 備註：${r['附註'] || '—'}</div>
      </div>
    `;
  });

  document.getElementById('cardArea').innerHTML = html;
  document.getElementById('cardArea').style.display = 'block';
}

/* 新增資料 → 傳到 Google Sheet */
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

  fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, project, total, income }),
  })
    .then(() => {
      alert('新增成功！（Google Sheet 寫入需要 1~2 秒）');

      dateInput.value = '';
      projectInput.value = '';
      totalInput.value = '';
      incomeInput.value = '';

      setTimeout(loadSheet, 1200); // 避免 Sheet 還沒更新
    })
    .catch((err) => alert('連線錯誤：' + err));
}

/* 小工具 */
function parseMoney(str) {
  if (!str) return 0;
  return Number(String(str).replace(/[^\d.-]/g, '')) || 0;
}

function formatMoney(num) {
  return num.toLocaleString();
}

/* Event */
document.getElementById('searchInput')?.addEventListener('input', render);
document.getElementById('statusFilter')?.addEventListener('change', render);

/* 啟動 */
loadSheet();
