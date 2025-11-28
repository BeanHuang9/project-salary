// ===================
//  你的 CSV 來源
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

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

// ===================
// 千分位
// ===================
function formatNumber(num) {
  if (num === '' || num === null || num === undefined) return '';
  const n = Number(String(num).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? num : n.toLocaleString();
}

// ===================
// 從 CSV 載入資料
// ===================
async function loadCSV() {
  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    const rows = Papa.parse(text, { header: true }).data;

    window.projectData = rows.filter((r) => r['日期']); // 避免空列
    renderTable(window.projectData);
    updateSummary(window.projectData);
  } catch (err) {
    console.error('載入 CSV 錯誤：', err);
  }
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
  const tbody = document.querySelector('#table-body');
  tbody.innerHTML = '';

  data.forEach((row) => {
    const unpaid = row['未收款項'];
    const collected = row['已收款項'];

    tbody.innerHTML += `
      <tr>
        <td class="date-cell">${formatDate(row['日期'])}</td>
        <td class="project-name">${row['專案名稱'] || ''}</td>
        <td class="num-right">NT$${formatNumber(row['總費用(簽約)'])}</td>
        <td class="num-right">NT$${formatNumber(row['實收(扣勞健保)'])}</td>
        <td>${tagColor(unpaid)}</td>
        <td>${tagColor(collected)}</td>
        <td class="num-right">NT$${formatNumber(row['訂金'])}</td>
        <td>${formatDate(row['訂金收款日期'] || '')}</td>
        <td>${row['待訂金'] ? '✔' : '✘'}</td>
        <td>${formatNumber(row['第一期']) ? '✔' : '✘'}</td>
        <td>${formatDate(row['第一期收款日期'] || '')}</td>
      </tr>
    `;
  });
}

// ===================
// 更新三個 summary 區塊
// ===================
function updateSummary(data) {
  let totalIncome = 0;
  let totalUnpaid = 0;

  data.forEach((r) => {
    const inc = Number(String(r['實收(扣勞健保)']).replace(/[^0-9.-]/g, ''));
    const unp = Number(String(r['未收款項']).replace(/[^0-9.-]/g, ''));
    if (!isNaN(inc)) totalIncome += inc;
    if (!isNaN(unp)) totalUnpaid += unp;
  });

  document.querySelector('#summary-income').innerText = `NT$ ${formatNumber(totalIncome)}`;
  document.querySelector('#summary-unpaid').innerText = `NT$ ${formatNumber(totalUnpaid)}`;

  const total = totalIncome + totalUnpaid;
  const percent = total ? Math.round((totalIncome / total) * 100) : 0;
  document.querySelector('#summary-rate').innerText = percent + '%';
}

// ===================
// 新增資料（POST 到 Apps Script）
// ===================
async function addProject() {
  const date = document.querySelector('#input-date').value;
  const project = document.querySelector('#input-project').value.trim();
  const total = document.querySelector('#input-total').value.trim();
  const income = document.querySelector('#input-income').value.trim();

  if (!date || !project || !total || !income) {
    alert('四項都要填喔！');
    return;
  }

  const payload = { date, project, total, income };

  try {
    const res = await fetch(
      'https://script.google.com/macros/s/AKfycbwy_jd5jqVynet1oSbwb5xm52jPj9lC2btqwG8T2Lg8iLq85PpTs5nfZOEEL24CYFvQHw/exec',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    const result = await res.json();
    if (result.status === 'success') {
      alert('新增成功！');
      await loadCSV();
    } else {
      alert('新增失敗：' + result.message);
    }
  } catch (err) {
    console.error(err);
    alert('新增失敗，請稍後再試！');
  }
}

// ===================
// 初始啟動
// ===================
window.onload = () => {
  loadCSV();
  document.querySelector('#btn-add').addEventListener('click', addProject);
};
