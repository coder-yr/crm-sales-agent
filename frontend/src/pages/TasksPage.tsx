import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasksStore } from '../store/tasksStore';
import { useCRMStore } from '../store/crmStore';
import { tasksService } from '../services/tasks.service';
import { leadsService } from '../services/leads.service';

export const TasksPage: React.FC = () => {
  const { tasks, setTasks, addTask, updateTask, deleteTask } = useTasksStore();
  const { leads, setLeads } = useCRMStore();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, leadsRes] = await Promise.all([
          tasksService.getTasks(),
          leadsService.getLeads()
        ]);
        if (tasksRes.success) setTasks(tasksRes.data);
        if (leadsRes.success) setLeads(leadsRes.data);
      } catch (error) {
        console.error('Failed to fetch tasks/leads', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setTasks, setLeads]);

  const handleAddTask = async () => {
    if (!newTaskTitle || !selectedLeadId) return;
    try {
      const response = await tasksService.createTask({
        title: newTaskTitle,
        leadId: selectedLeadId,
        dueDate: new Date(dueDate).toISOString(),
      });
      if (response.success) {
        addTask(response.data);
        setNewTaskTitle('');
        setSelectedLeadId('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  const handleToggleTask = async (id: string, currentCompleted: boolean) => {
    const isCompleted = !currentCompleted;
    try {
      const response = await tasksService.updateTask(id, { isCompleted });
      if (response.success) {
        updateTask(id, { isCompleted });
      }
    } catch (error) {
      console.error('Failed to update task', error);
    }
  };

  const getLeadName = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    return lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown Lead';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-6"
    >
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-semibold text-on-surface tracking-tight">Tasks & Follow-ups</h1>
          <p className="text-sm mt-1 text-outline">Manage your daily actions and lead follow-ups</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add_task</span>
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-outline">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-outline bg-surface-container-low rounded-3xl border border-dashed border-outline-variant">
              No tasks found. Create one to get started!
            </div>
          ) : (
            tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all group"
              >
                <button
                  onClick={() => handleToggleTask(task.id, task.isCompleted)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.isCompleted 
                      ? 'bg-primary border-primary text-white' 
                      : 'border-outline-variant hover:border-primary'
                  }`}
                >
                  {task.isCompleted && <span className="material-symbols-outlined text-[16px]">check</span>}
                </button>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold transition-all ${task.isCompleted ? 'text-outline line-through' : 'text-on-surface'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {getLeadName(task.leadId)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-outline">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-outline hover:text-error transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <div className="card p-6 bg-primary-container/20 border-none">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-on-surface-variant">Total Tasks</span>
                <span className="text-lg font-black text-primary">{tasks.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-on-surface-variant">Completed</span>
                <span className="text-lg font-black text-emerald-600">
                  {tasks.filter(t => t.isCompleted).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-on-surface-variant">Pending</span>
                <span className="text-lg font-black text-amber-600">
                  {tasks.filter(t => !t.isCompleted).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6"
            >
              <h3 className="text-xl font-black text-on-surface">Create New Task</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Task Title</label>
                  <input 
                    value={newTaskTitle} 
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" 
                    placeholder="e.g. Follow up with client..." 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Link to Lead</label>
                  <select 
                    value={selectedLeadId}
                    onChange={e => setSelectedLeadId(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all"
                  >
                    <option value="">Select a Lead</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.firstName} {lead.lastName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Due Date</label>
                  <input 
                    type="date"
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" 
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-outline hover:text-on-surface transition-all">Cancel</button>
                <button onClick={handleAddTask} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Create</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
