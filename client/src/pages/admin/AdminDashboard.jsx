import { useEffect, useState } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import TasksTable from '../../components/admin/TasksTable';
import CreateTaskModal from '../../components/admin/CreateTaskModal';
import EditTaskModal from '../../components/admin/EditTaskModal';
import { fetchAllTasks } from '../../api/tasks';

/* ── Search icon ── */
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8.5" r="5.5"/>
    <path d="M17 17l-4-4"/>
  </svg>
);

/* ── Plus icon ── */
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 4v12M4 10h12"/>
  </svg>
);

const AdminDashboard = () => {
  const [tasks, setTasks]           = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask]     = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadTasks = async () => {
    try {
      const { data } = await fetchAllTasks();
      setTasks(data);
    } catch {
      alert('Failed to load tasks');
    }
  };

  // eslint-disable-next-line
  useEffect(() => { loadTasks(); }, []);

  const stats = {
    total:     tasks.length,
    open:      tasks.filter((t) => t.status === 'Open').length,
    submitted: tasks.filter((t) => t.status === 'Submitted').length,
    // Approving a submission moves its task to 'Completed' (#8).
    completed: tasks.filter((t) => t.status === 'Completed').length,
  };

  const statCards = [
    { label: 'Total Tasks', value: stats.total,     colorClass: 'stat-card-default', valueColor: 'var(--rt-text-primary)' },
    { label: 'Open',        value: stats.open,      colorClass: 'stat-card-blue',    valueColor: 'var(--rt-primary)' },
    { label: 'Submitted',   value: stats.submitted, colorClass: 'stat-card-info',    valueColor: 'var(--rt-primary)' },
    { label: 'Completed',   value: stats.completed, colorClass: 'stat-card-green',   valueColor: 'var(--rt-badge-approved-tx)' },
  ];

  /* Filter tasks */
  const filteredTasks = tasks.filter((t) => {
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--rt-bg-dark)' }}>
      <Sidebar />

      <main className="ml-[240px] flex-1 px-8 py-8" style={{ maxWidth: 'calc(100vw - 240px)' }}>

        {/* Page header */}
        <div className="flex items-center justify-between mb-7 page-section">
          <div>
            <h1 className="font-display text-[22px] font-semibold tracking-tight"
              style={{ color: 'var(--rt-text-primary)', fontFamily: 'Poppins, sans-serif' }}>
              Task Management
            </h1>
            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--rt-text-muted)' }}>
              Create, assign, and track all tasks across your talent pool.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer font-sans">
            <IconPlus />
            Create Task
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4 mb-6 page-section">
          {statCards.map(({ label, value, colorClass, valueColor }) => (
            <div key={label} className={`stat-card ${colorClass}`}>
              <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] mb-3"
                style={{ color: 'var(--rt-text-dim)', fontFamily: 'Inter, sans-serif' }}>
                {label}
              </span>
              <span className="block text-[32px] font-bold leading-none"
                style={{ color: valueColor, fontFamily: 'Poppins, sans-serif' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Tasks table */}
        <div className="tasks-container page-section">
          {/* Table toolbar */}
          <div className="table-header-bar">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold"
                style={{ color: 'var(--rt-text-secondary)', fontFamily: 'Poppins, sans-serif' }}>
                All Tasks
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--rt-bg-input)',
                  color: 'var(--rt-text-muted)',
                  border: '1px solid var(--rt-border)',
                  fontFamily: 'Inter, sans-serif',
                }}>
                {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search */}
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--rt-text-dim)' }}>
                  <IconSearch />
                </span>
                <input
                  type="text"
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input-glass"
                  style={{ minWidth: '180px' }}
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="search-input-glass custom-select"
                style={{ paddingLeft: '12px', cursor: 'pointer' }}>
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="Claimed">Claimed</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <TasksTable tasks={filteredTasks} onEdit={setEditTask} onRefresh={loadTasks} />
        </div>
      </main>

      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={loadTasks} />
      )}
      {editTask && (
        <EditTaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onUpdated={() => { loadTasks(); setEditTask(null); }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
