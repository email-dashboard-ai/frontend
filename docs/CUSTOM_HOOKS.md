# 🪝 Custom Hooks Guide

## 📚 Available Hooks

### 1. **useAuth** - Authentication Logic
### 2. **useEmails** - Email Management Logic
### 3. **useDragDrop** - Drag & Drop State

---

## 🔐 useAuth

**File:** `src/hooks/useAuth.ts`

### **Purpose**
Quản lý toàn bộ authentication logic:
- User info
- Authentication state
- Logout functionality
- Error handling

### **API**

```ts
const {
  // State
  user,              // User object { id, name, email, avatar }
  isAuthenticated,   // boolean
  isLoading,         // boolean
  error,             // string | null
  
  // Actions
  handleLogout,      // () => void
  handleClearError,  // () => void
} = useAuth();
```

### **Usage Example**

```tsx
import { useAuth } from '../hooks';

const Header = () => {
  const { user, isAuthenticated, handleLogout } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <header>
      <span>Welcome, {user?.name}</span>
      <button onClick={handleLogout}>Logout</button>
    </header>
  );
};
```

### **Implementation**

```ts
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = 
    useAppSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    handleLogout,
    handleClearError,
  };
};
```

---

## 📧 useEmails

**File:** `src/hooks/useEmails.ts`

### **Purpose**
Quản lý toàn bộ email logic:
- Fetch emails on mount
- Search functionality
- Column organization (Kanban)
- Email actions (move, snooze, status change)
- Error handling

### **API**

```ts
const {
  // State
  emails,              // Email[]
  emailsByColumn,      // { inbox: Email[], todo: Email[], done: Email[] }
  searchQuery,         // string
  searchResults,       // Email[]
  currentView,         // 'board' | 'search' | 'detail'
  snoozeModalOpen,     // boolean
  error,               // string | null
  isLoading,           // boolean
  
  // Actions
  handleSearch,        // (query: string) => void
  handleClearSearch,   // () => void
  handleMoveEmail,     // (emailId: string, column: Email['column']) => void
  handleReorderEmails, // (dragId: string, hoverId: string, column: Email['column']) => void
  handleSnoozeEmail,   // (email: Email) => void
  handleCloseSnoozeModal, // () => void
  handleStatusChange,  // (emailId: string, newColumn: Email['column']) => void
  handleClearError,    // () => void
} = useEmails();
```

### **Usage Example**

```tsx
import { useEmails } from '../hooks';

const InboxPage = () => {
  const {
    emailsByColumn,
    searchQuery,
    handleSearch,
    handleMoveEmail,
    handleSnoozeEmail,
  } = useEmails();

  return (
    <div>
      <SearchBar query={searchQuery} onSearch={handleSearch} />
      
      <KanbanBoard>
        <Column 
          title="Inbox" 
          emails={emailsByColumn.inbox}
          onMove={handleMoveEmail}
          onSnooze={handleSnoozeEmail}
        />
        <Column 
          title="To Do" 
          emails={emailsByColumn.todo}
          onMove={handleMoveEmail}
        />
        <Column 
          title="Done" 
          emails={emailsByColumn.done}
          onMove={handleMoveEmail}
        />
      </KanbanBoard>
    </div>
  );
};
```

### **Key Features**

#### **Auto Fetch on Mount**
```ts
useEffect(() => {
  dispatch(fetchEmails());
}, [dispatch]);
```

#### **Organize by Column**
```ts
const emailsByColumn = useMemo(() => ({
  inbox: emails.filter(e => e.column === 'inbox').sort((a, b) => a.order - b.order),
  todo: emails.filter(e => e.column === 'todo').sort((a, b) => a.order - b.order),
  done: emails.filter(e => e.column === 'done').sort((a, b) => a.order - b.order),
}), [emails]);
```

#### **Search with View Change**
```ts
const handleSearch = (query: string) => {
  dispatch(setSearchQuery(query));
  if (query.trim()) {
    dispatch(setCurrentView('search'));
  } else {
    dispatch(setCurrentView('board'));
  }
};
```

---

## 🎯 useDragDrop

**File:** `src/hooks/useDragDrop.ts`

### **Purpose**
Quản lý drag & drop state và handlers:
- Dragging over state
- Drag over email tracking
- Drop handlers
- Visual feedback

### **API**

```ts
const {
  // State
  isDraggingOver,      // boolean
  dragOverEmailId,     // string | null
  
  // Handlers
  handleDragOver,      // (e: React.DragEvent) => void
  handleDragLeave,     // (e: React.DragEvent) => void
  handleDrop,          // (e: React.DragEvent) => void
  handleEmailDragOver, // (emailId: string) => void
  handleEmailDragLeave,// () => void
} = useDragDrop(onDropEmail, onReorderEmails, columnId);
```

### **Parameters**

- `onDropEmail: (emailId: string, targetColumn: Email['column']) => void`
- `onReorderEmails: (draggedId: string, hoveredId: string, column: Email['column']) => void`
- `columnId: Email['column']` - Current column ID ('inbox', 'todo', 'done')

### **Usage Example**

```tsx
import { useDragDrop } from '../hooks';

const KanbanColumn = ({ 
  id, 
  emails, 
  onDropEmail, 
  onReorderEmails 
}) => {
  const {
    isDraggingOver,
    dragOverEmailId,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEmailDragOver,
    handleEmailDragLeave,
  } = useDragDrop(onDropEmail, onReorderEmails, id);

  return (
    <div
      className={isDraggingOver ? 'dragging-over' : ''}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {emails.map(email => (
        <EmailCard
          key={email.id}
          email={email}
          isDraggedOver={dragOverEmailId === email.id}
          onDragOver={() => handleEmailDragOver(email.id)}
          onDragLeave={handleEmailDragLeave}
        />
      ))}
    </div>
  );
};
```

### **Implementation**

```ts
export const useDragDrop = (
  onDropEmail: (emailId: string, targetColumn: Email['column']) => void,
  onReorderEmails: (draggedId: string, hoveredId: string, column: Email['column']) => void,
  columnId: Email['column']
) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragOverEmailId, setDragOverEmailId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
      setDragOverEmailId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDragOverEmailId(null);
    
    const emailId = e.dataTransfer.getData("emailId");
    if (emailId && dragOverEmailId) {
      // Reorder within column or move between columns
      onReorderEmails(emailId, dragOverEmailId, columnId);
    } else if (emailId) {
      // Just move to column (append at end)
      onDropEmail(emailId, columnId);
    }
  };

  const handleEmailDragOver = (emailId: string) => {
    setDragOverEmailId(emailId);
  };

  const handleEmailDragLeave = () => {
    setDragOverEmailId(null);
  };

  return {
    isDraggingOver,
    dragOverEmailId,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEmailDragOver,
    handleEmailDragLeave,
  };
};
```

---

## 🎨 Creating New Custom Hooks

### **Best Practices**

1. **One Responsibility** - Mỗi hook làm 1 việc cụ thể
2. **Prefix with `use`** - React convention
3. **Return Object** - Dễ destructure
4. **Group Related Logic** - State + handlers liên quan
5. **Clear Naming** - `handle` prefix cho actions

### **Template**

```ts
// src/hooks/useFeature.ts
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';

export const useFeature = (param?: string) => {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useAppSelector(state => state.feature);
  
  // Local state if needed
  const [localState, setLocalState] = useState(false);

  // Effects
  useEffect(() => {
    // Auto fetch, subscriptions, etc
  }, [param]);

  // Computed values
  const computedValue = useMemo(() => {
    // ...
  }, [data]);

  // Actions
  const handleAction = () => {
    dispatch(someAction());
  };

  return {
    // State
    data,
    isLoading,
    error,
    localState,
    computedValue,
    
    // Actions
    handleAction,
  };
};
```

---

## ✅ Benefits of Custom Hooks

| Benefit | Description |
|---------|-------------|
| **Reusability** | Share logic across components |
| **Separation of Concerns** | UI separate from business logic |
| **Testability** | Test hooks independently |
| **Readability** | Components more concise |
| **Maintainability** | Change logic in one place |

---

## 📊 Comparison

### ❌ Without Custom Hooks

```tsx
const InboxPage = () => {
  const dispatch = useAppDispatch();
  const emails = useAppSelector(state => state.email.emails);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    dispatch(fetchEmails());
  }, []);
  
  const emailsByColumn = useMemo(() => ({
    inbox: emails.filter(e => e.column === 'inbox'),
    todo: emails.filter(e => e.column === 'todo'),
    done: emails.filter(e => e.column === 'done'),
  }), [emails]);
  
  const handleMove = (id, col) => {
    dispatch(moveEmail({ emailId: id, column: col }));
  };
  
  // ... 500+ more lines
};
```

### ✅ With Custom Hooks

```tsx
const InboxPage = () => {
  const { user, handleLogout } = useAuth();
  const { emailsByColumn, handleMoveEmail } = useEmails();

  return (
    <div>
      <Header user={user} onLogout={handleLogout} />
      <KanbanBoard emails={emailsByColumn} onMove={handleMoveEmail} />
    </div>
  );
};
```

**Result:** 617 dòng → ~100 dòng! 🎉
