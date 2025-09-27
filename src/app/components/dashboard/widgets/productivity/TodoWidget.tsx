'use client';

import { useState } from 'react';
import { CheckSquare, Plus, X } from 'lucide-react';
import { WidgetProps } from '../../types';

// #region Todo Widget Component
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoWidget({ size }: WidgetProps) {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: 'Review project proposals', completed: false },
    { id: '2', text: 'Update team allocations', completed: true },
    { id: '3', text: 'Prepare sprint planning', completed: false }
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [showInput, setShowInput] = useState(false);

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, {
        id: Date.now().toString(),
        text: newTodo.trim(),
        completed: false
      }]);
      setNewTodo('');
      setShowInput(false);
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const removeTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const visibleTodos = size === 'small' ? todos.slice(0, 2) : todos.slice(0, 5);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-gray-800">Tasks</span>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {showInput && (
        <div className="mb-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add new task..."
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
            autoFocus
          />
        </div>
      )}

      <div className="space-y-2 overflow-y-auto flex-1">
        {visibleTodos.map((todo) => (
          <div key={todo.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              className="w-4 h-4 text-green-600"
            />
            <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
              {todo.text}
            </span>
            <button
              onClick={() => removeTodo(todo.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
            >
              <X className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {todos.length > visibleTodos.length && (
        <div className="text-xs text-gray-500 mt-2">
          +{todos.length - visibleTodos.length} more tasks
        </div>
      )}
    </div>
  );
}
// #endregion