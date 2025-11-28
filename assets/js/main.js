// ===================
//  CSV 來源
// ===================
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTocOfradY1JtUvkHjeq9B6lVTqTXPsRPGXBOvsfdwq_iVK6cu6LdZL8sxUfbzjdGevXAsS5YMpgAXZ/pub?output=csv&t=' +
  Date.now();

// ===================
// 日期格式統一 yyyy/mm/dd
// ===================
function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return value;

  return (
    d.getFullYear() +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    String(d.getDate()).padStart(2, '0')
  );
}

// ===================
// 千分位
// ===================
function formatNumber(num) {
  if (num === '' || num == null) return '';
  const n = Number(String(num).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? num : n.toLocaleString();
}

// ===================
// 顏色標籤
// ===================
function tagColor(value) {
  const num = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '';

  if (num > 0) return `<span class="tag-green">NT$${formatNumber(num)}</span>`;
  if (num < 0) return `<span class="tag-red">NT$${formatNumber(num)}</span>`;
  return `<span class="tag-gray">NT$0</span>`;
}

// ===================
// 渲染主表格
// ===================
function renderTable(data) {
  const tbody = document.querySelector('#tableArea');
  tbody.innerHTML = '';

  data.forEach((row) => {
    tbody.innerHTML += `
      <tr>
        <td class="date-cell">${formatDate(row['日期'])}</td>
        <td>${row['專案名稱'] || ''}</td>
        <td class="num-right">NT$${formatNumber(row['總費用(簽約)'])}</td>
        <td class="num-right">NT$${formatNumber(row['實收(扣勞健保)'])}</td>
        <td>${tagColor(row['未收款項'])}</td>
        <td>${tagColor(row['已收款項'])}</td>
        <td class="num-right">NT$${formatNumber(row['訂金'])}</td>
        <td>${formatDate(row['訂金收款日期'])}</td>
        <td>${row['待訂金'] ? '✔' : '✘'}</td>
        <td>${row['第一期'] ? '✔' : '✘'}</td>
        <td>${formatDate(row['第一期收款日期'])}</td>
      </tr>
    `;
  });
}

// ===================
// 更新 Summary 區塊
// ===================
function updateSummary(data) {
  let totalIncome = 0;
  let totalUnpaid = 0;

  data.forEach((r) => {
    const inc = Number(String(r['實收(扣勞健保)']).replace(/[^0-9.-]/g, '')) || 0;
    const unp = Number(String(r['未收款項']).replace(/[^0-9.-]/g, '')) || 0;
    totalIncome += inc;
    totalUnpaid += unp;
  });

  document.querySelector('#sumIncome').textContent = 'NT$ ' + formatNumber(totalIncome);

  document.querySelector('#sumUnpaid').textContent = 'NT$ ' + formatNumber(totalUnpaid);

  const total = totalIncome + totalUnpaid;
  const rate = total ? Math.round((totalIncome / total) * 100) : 0;
  document.querySelector('#sumRate').textContent = rate + '%';
}

// ===================
// 載入 CSV
// ===================
async function loadCSV() {
  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    const rows = Papa.parse(text, { header: true }).data;
    const cleaned = rows.filter((r) => r['日期']); // 移除空行

    window.projectData = cleaned;

    renderTable(cleaned);
    updateSummary(cleaned);
  } catch (err) {
    console.error('讀取 CSV 失敗：', err);
  }
}

// ===================
// 新增資料 → Google Apps Script
// ===================
async function addNewData() {
  const date = document.querySelector('#input-date').value;
  const project = document.querySelector('#input-project').value;
  const total = document.querySelector('#input-total').value;
  const income = document.querySelector('#input-income').value;

  if (!date || !project || !total || !income) {
    alert('四個欄位都要填喔！');
    return;
  }

  try {
    const res = await fetch(
      'https://script.google.com/macros/s/AKfycbwy_jd5jqVynet1oSbwb5xm52jPj9lC2btqwG8T2Lg8iLq85PpTs5nfZOEEL24CYFvQHw/exec',
      {
        method: 'POST',
        body: JSON.stringify({ date, project, total, income }),
      }
    );

    const result = await res.json();
    if (result.status === 'success') {
      alert('新增成功！');
      loadCSV();
    } else {
      alert('新增失敗：' + result.message);
    }
  } catch (err) {
    console.error(err);
    alert('新增資料失敗，請稍後再試！');
  }
}

// ===================
// 初始化
// ===================
window.onload = () => {
  loadCSV();
};
