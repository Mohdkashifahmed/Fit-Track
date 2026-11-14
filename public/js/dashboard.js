const user = JSON.parse(sessionStorage.getItem('ft_user') || 'null');
if (!user) location.replace('index.html');
$('user-name').textContent = user ? user.name : '';

let editingId = null, trendChart = null, mixChart = null, lastStats = null;
const COLORS = { steps: '#0F766E', calories: '#F97316', water: '#4F46E5', workout: '#0B3D3A' };
const LABELS = { steps: 'Steps', calories: 'Calories burned', water: 'Water (L)', workout: 'Workout (min)' };

// ---- Date range (default: last 7 days) ----
const today = new Date(); const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 6);
$('range-from').value = toISO(weekAgo); $('range-to').value = toISO(today);
$('log-date').value = toISO(today); $('goal-start').value = toISO(today);

function handleError(err) {
  if (err.status === 401) { sessionStorage.removeItem('ft_user'); location.replace('index.html'); return; }
  toast(err.message, true);
}

async function loadAll() {
  const from = $('range-from').value, to = $('range-to').value;
  if (from > to) { toast('Start date must be before the end date.', true); return; }
  try {
    const [logs, summary, stats, goals] = await Promise.all([
      api('GET', `/api/fitness/logs?from=${from}&to=${to}`),
      api('GET', '/api/fitness/summary/weekly'),
      api('GET', `/api/fitness/stats?from=${from}&to=${to}`),
      api('GET', '/api/goals/progress')
    ]);
    renderSummary(summary, goals); renderCharts(stats); renderLogs(logs); renderGoals(goals);
  } catch (err) { handleError(err); }
}

// ---- Summary band ----
function renderSummary(s, goals) {
  $('sum-steps').textContent = nf(s.totalSteps);
  $('sum-cal').textContent = nf(s.averageCalories);
  $('sum-water').textContent = (s.totalWater || 0) + ' L';
  $('sum-goal').textContent = goals.length ? Math.round(goals.reduce((a, g) => a + g.completionPercent, 0) / goals.length) + '%' : 'No goals yet';
}

// ---- Charts (Chart.js) ----
function renderCharts(stats) {
  lastStats = stats;
  const metric = $('trend-metric').value, type = $('trend-type').value;
  const short = stats.labels.map(d => d.slice(5));
  if (trendChart) trendChart.destroy();
  trendChart = new Chart($('trend-chart'), {
    type,
    data: { labels: short, datasets: [{ label: LABELS[metric], data: stats[metric], borderColor: COLORS[metric], backgroundColor: COLORS[metric] + (type === 'bar' ? 'CC' : '22'), tension: 0.3, fill: type === 'line', borderWidth: 2.5, pointRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
  if (mixChart) mixChart.destroy();
  mixChart = new Chart($('mix-chart'), {
    type: 'bar',
    data: { labels: short, datasets: [
      { label: LABELS.calories, data: stats.calories, backgroundColor: COLORS.calories, yAxisID: 'y' },
      { label: LABELS.workout, data: stats.workout, backgroundColor: COLORS.workout, yAxisID: 'y1' } ] },
    options: { responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Calories' } },
                y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Minutes' } } } }
  });
}
$('trend-metric').onchange = $('trend-type').onchange = () => lastStats && renderCharts(lastStats);

// ---- Log form (add + edit) ----
$('log-form').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    date: $('log-date').value, steps: Number($('log-steps').value) || 0, caloriesBurned: Number($('log-cal').value) || 0,
    waterIntake: Number($('log-water').value) || 0, workoutTime: Number($('log-workout').value) || 0, notes: $('log-notes').value.trim()
  };
  if (!body.date) { toast('Pick a date for this entry.', true); return; }
  if ([body.steps, body.caloriesBurned, body.waterIntake, body.workoutTime].some(v => v < 0)) { toast('Values cannot be negative.', true); return; }
  try {
    if (editingId) { await api('PUT', '/api/fitness/logs/' + editingId, body); toast('Entry updated'); }
    else { await api('POST', '/api/fitness/add', body); toast('Entry saved'); }
    resetForm(); loadAll();
  } catch (err) { handleError(err); }
});

function resetForm() {
  editingId = null; $('log-form').reset(); $('log-date').value = toISO(new Date());
  $('log-submit').textContent = 'Save entry'; $('log-cancel').hidden = true; $('form-title').textContent = 'Log your activity';
}
$('log-cancel').onclick = resetForm;

// ---- Log table ----
const idOf = l => l.logId ?? l._id;
function renderLogs(logs) {
  const body = $('log-rows');
  if (!logs.length) { body.innerHTML = '<tr><td colspan="7" class="empty">No entries in this date range. Add your first entry in the form.</td></tr>'; body.dataset.logs = '[]'; return; }
  body.innerHTML = [...logs].sort((a, b) => b.date.localeCompare(a.date)).map(l => `
    <tr><td>${esc(l.date)}</td><td>${nf(l.steps)}</td><td>${nf(l.caloriesBurned)}</td><td>${esc(l.waterIntake)}</td><td>${esc(l.workoutTime)}</td>
    <td class="notes">${esc(l.notes)}</td>
    <td class="actions"><button class="link" data-edit="${esc(idOf(l))}">Edit</button><button class="link danger" data-del="${esc(idOf(l))}">Delete</button></td></tr>`).join('');
  body.dataset.logs = JSON.stringify(logs);
}
$('log-rows').addEventListener('click', async e => {
  const logs = JSON.parse($('log-rows').dataset.logs || '[]');
  const editId = e.target.dataset.edit, delId = e.target.dataset.del;
  if (editId) {
    const l = logs.find(x => String(idOf(x)) === editId); if (!l) return;
    editingId = editId; $('log-date').value = l.date; $('log-steps').value = l.steps; $('log-cal').value = l.caloriesBurned;
    $('log-water').value = l.waterIntake; $('log-workout').value = l.workoutTime; $('log-notes').value = l.notes || '';
    $('log-submit').textContent = 'Update entry'; $('log-cancel').hidden = false; $('form-title').textContent = 'Edit entry for ' + l.date;
    $('log-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (delId && confirm('Delete this entry? This cannot be undone.')) {
    try { await api('DELETE', '/api/fitness/logs/' + delId); toast('Entry deleted'); if (editingId === delId) resetForm(); loadAll(); }
    catch (err) { handleError(err); }
  }
});

// ---- Goals ----
const UNIT = { steps: 'steps', calories: 'kcal', water: 'L' };
$('goal-form').addEventListener('submit', async e => {
  e.preventDefault();
  const body = { goalType: $('goal-type').value, targetValue: Number($('goal-target').value), startDate: $('goal-start').value, endDate: $('goal-end').value };
  if (!(body.targetValue > 0)) { toast('Enter a target above zero.', true); return; }
  if (!body.endDate || body.endDate < body.startDate) { toast('Choose an end date on or after the start date.', true); return; }
  try { await api('POST', '/api/goals', body); toast('Goal saved'); $('goal-form').reset(); $('goal-start').value = toISO(new Date()); loadAll(); }
  catch (err) { handleError(err); }
});
function renderGoals(goals) {
  $('goal-list').innerHTML = goals.length ? goals.map(g => `
    <li><div class="goal-head"><strong>${esc(LABELS[g.goalType] || g.goalType)}</strong><span>${esc(g.completionPercent)}%</span></div>
    <div class="bar" role="progressbar" aria-valuenow="${esc(g.completionPercent)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100, g.completionPercent)}%;background:${g.goalType === 'calories' ? COLORS.calories : g.goalType === 'water' ? COLORS.water : COLORS.steps}"></i></div>
    <small>${nf(g.currentValue)} of ${nf(g.targetValue)} ${UNIT[g.goalType] || ''}, ${esc(g.startDate)} to ${esc(g.endDate)}</small></li>`).join('')
    : '<li class="empty">Set a daily or weekly goal to track your completion here.</li>';
}

// ---- Misc ----
$('range-apply').onclick = loadAll;
$('logout').onclick = async () => { try { await api('POST', '/api/auth/logout'); } catch (_) {} sessionStorage.removeItem('ft_user'); location.href = 'index.html'; };
loadAll();
