// Browser-only stand-in for the Express API (used when CONFIG.USE_MOCK is true).
const mockDb = {
  get: (k, d) => JSON.parse(localStorage.getItem('mock_' + k) || JSON.stringify(d)),
  set: (k, v) => localStorage.setItem('mock_' + k, JSON.stringify(v))
};

function mockRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try { resolve(mockRoute(method, path, body || {})); } catch (e) { reject(e); }
    }, 120);
  });
}

function mockErr(message, status) { const e = new Error(message); e.status = status; return e; }
const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);
const dayList = (from, to) => {
  const out = []; const d = new Date(from + 'T00:00:00'); const end = new Date(to + 'T00:00:00');
  while (d <= end) { out.push(toISO(d)); d.setDate(d.getDate() + 1); }
  return out;
};

function mockRoute(method, fullPath, body) {
  const [path, qs] = fullPath.split('?');
  const q = new URLSearchParams(qs || '');

  if (path === '/api/auth/register' && method === 'POST') {
    const users = mockDb.get('users', []);
    if (users.find(u => u.email === body.email)) throw mockErr('That email is already registered', 400);
    users.push({ userId: Date.now(), ...body });
    mockDb.set('users', users);
    return { message: 'Registered' };
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const u = mockDb.get('users', []).find(x => x.email === body.email && x.password === body.password);
    if (!u) throw mockErr('Email or password is incorrect', 401);
    mockDb.set('session', { userId: u.userId, name: u.name });
    return { user: { userId: u.userId, name: u.name } };
  }
  if (path === '/api/auth/logout') { mockDb.set('session', null); return { message: 'Logged out' }; }

  const session = mockDb.get('session', null);
  if (!session) throw mockErr('Please log in again', 401);
  const uid = session.userId;
  const allLogs = mockDb.get('logs', []);
  const myLogs = () => allLogs.filter(l => l.userId === uid);

  if (path === '/api/fitness/add' && method === 'POST') {
    const log = { logId: Date.now(), userId: uid, ...body };
    allLogs.push(log); mockDb.set('logs', allLogs); return log;
  }
  if (path === '/api/fitness/logs' && method === 'GET') {
    return myLogs().filter(l => inRange(l.date, q.get('from'), q.get('to')));
  }
  if (path.startsWith('/api/fitness/logs/')) {
    const key = decodeURIComponent(path.split('/').pop());
    if (method === 'GET') return myLogs().filter(l => l.date === key);
    const i = allLogs.findIndex(l => String(l.logId) === key && l.userId === uid);
    if (i < 0) throw mockErr('Log not found', 404);
    if (method === 'PUT') { allLogs[i] = { ...allLogs[i], ...body }; mockDb.set('logs', allLogs); return allLogs[i]; }
    if (method === 'DELETE') { allLogs.splice(i, 1); mockDb.set('logs', allLogs); return { message: 'Deleted' }; }
  }
  if (path === '/api/fitness/summary/weekly') {
    const to = toISO(new Date()); const d = new Date(); d.setDate(d.getDate() - 6); const from = toISO(d);
    const logs = myLogs().filter(l => inRange(l.date, from, to));
    const days = new Set(logs.map(l => l.date)).size;
    const sum = k => logs.reduce((a, l) => a + (Number(l[k]) || 0), 0);
    return { totalSteps: sum('steps'), averageCalories: days ? Math.round(sum('caloriesBurned') / days) : 0,
             totalWater: +sum('waterIntake').toFixed(1), totalWorkoutTime: sum('workoutTime'), days };
  }
  if (path === '/api/fitness/stats') {
    const labels = dayList(q.get('from'), q.get('to'));
    const logs = myLogs();
    const by = k => labels.map(day => logs.filter(l => l.date === day).reduce((a, l) => a + (Number(l[k]) || 0), 0));
    return { labels, steps: by('steps'), calories: by('caloriesBurned'), water: by('waterIntake'), workout: by('workoutTime') };
  }
  if (path === '/api/goals' && method === 'POST') {
    const goals = mockDb.get('goals', []);
    const g = { goalId: Date.now(), userId: uid, ...body }; goals.push(g); mockDb.set('goals', goals); return g;
  }
  if (path === '/api/goals/progress') {
    const field = { steps: 'steps', calories: 'caloriesBurned', water: 'waterIntake' };
    return mockDb.get('goals', []).filter(g => g.userId === uid).map(g => {
      const cur = myLogs().filter(l => inRange(l.date, g.startDate, g.endDate)).reduce((a, l) => a + (Number(l[field[g.goalType]]) || 0), 0);
      return { ...g, currentValue: +cur.toFixed(1), completionPercent: Math.min(100, Math.round(cur / g.targetValue * 100)) };
    });
  }
  throw mockErr('Unknown route ' + method + ' ' + path, 404);
}
