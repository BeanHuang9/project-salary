/* ============================
   Google Sheet CSV URL（讀取）
============================ */
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSi55MdYM55CEQhERa70WFhFbbbz891wKRFMIrVKGvArsto-UUkJrUSK5aTE-7UZ8YRrTnz1lnYubsy/pub?output=csv';

/* ============================
   Google Apps Script API（新增）
============================ */
const API_URL =
  'https://script.google.com/macros/s/AKfycbzobMqEeIkwcxvvqYHle8JghWmRjnnafCGpc44M1mCPxobWDbXJVucLCcyrnUwrDgiM4g/exec';

let allRows = [];

/* ============================
   讀取 Google Sheet
============================ */
function loadSheet() {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      let raw = res.data;
      raw.pop(); // 刪掉最後小計列
      allRows = raw.reverse();
      render();
    },
  });
}

/* ============================
   渲染流程
============================ */
function render() {
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;

  let rows = allRows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    if (!text.includes(keyword)) return false;

    const unpaid = parseMoney(row['未收'] || '');
    const deposit = parseMoney(row['訂金'] || '');

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
   新增資料（修正版）
============================ */
function addNewData() {
  const date = document.getElementById('fDate').value;
  const project = document.getElementById('fProject').value;
  const total = document.getElementById('fTotal').value;
  const income = document.getElementById('fIncome').value;

  if (!date || !project || !total || !income) {
    alert('請完整填寫所有欄位');
    return;
  }

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, project, total, income }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert('新增成功！');
      loadSheet();

      document.getElementById('fDate').value = '';
      document.getElementById('fProject').value = '';
      document.getElementById('fTotal').value = '';
      document.getElementById('fIncome').value = '';
    })
    .catch((err) => alert('連線錯誤：' + err));
}

/* ============================
   工具
============================ */
function parseMoney(str) {
  if (!str) return 0;
  return Number(String(str).replace(/[^\d.-]/g, '')) || 0;
}

function formatMoney(num) {
  return num.toLocaleString();
}

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('statusFilter').addEventListener('change', render);

loadSheet();
