# 🏗️ Kiến trúc Dự án

## 📁 Cấu trúc Thư mục

```
src/
├── components/             # Reusable UI components
│   ├── auth/              # AuthGuard, ProtectedRoute, PublicRoute
│   ├── email/             # EmailCard, KanbanColumn, SnoozeModal
│   ├── common/            # Button, Modal, Input, Loading
│   └── layout/            # Header, Sidebar, Footer
├── config/
│   └── apiConfig.ts       # API configuration manager
├── constants/
│   └── index.ts           # TOKEN_KEYS, ROUTES, etc
├── hooks/                 # Custom hooks (Business logic)
│   ├── useAuth.ts         # Auth logic (logout, user info)
│   ├── useEmails.ts       # Email logic (fetch, search, move)
│   ├── useDragDrop.ts     # Drag & drop state
│   └── index.ts
├── pages/                 # CHỈ render UI + gọi hooks
│   ├── LoginPage.tsx
│   ├── InboxPage.tsx
│   └── index.ts
├── routes/
│   └── AppRoutes.tsx
├── services/              # API calls
│   ├── authService.ts
│   ├── emailService.ts
│   └── index.ts
├── store/                 # Redux state
│   ├── index.ts
│   └── slices/
│       ├── authSlice.ts
│       └── emailSlice.ts
├── types/                 # TypeScript types
│   ├── auth.ts
│   ├── email.ts
│   └── index.ts
└── utils/                 # Helper functions
    └── helpers.ts
```

---

## 🎯 Nguyên tắc Tách biệt Concerns

```
┌─────────────┐
│   Pages     │  ← CHỈ render UI, gọi hooks
└──────┬──────┘
       │
┌──────▼──────┐
│   Hooks     │  ← Business logic, state management
└──────┬──────┘
       │
┌──────▼──────┐
│ Redux Store │  ← Global state (async thunks)
└──────┬──────┘
       │
┌──────▼──────┐
│   Services  │  ← API calls
└──────┬──────┘
       │
┌──────▼──────┐
│  apiConfig  │  ← Axios + interceptors
└─────────────┘
```

---

## 🪝 Custom Hooks Pattern

### **useEmails.ts** - Quản lý email logic

```ts
export const useEmails = () => {
  const dispatch = useAppDispatch();
  const { emails, searchQuery, ... } = useAppSelector(state => state.email);

  // Fetch on mount
  useEffect(() => {
    dispatch(fetchEmails());
  }, [dispatch]);

  // Organize by column
  const emailsByColumn = useMemo(() => ({
    inbox: emails.filter(e => e.column === 'inbox'),
    todo: emails.filter(e => e.column === 'todo'),
    done: emails.filter(e => e.column === 'done'),
  }), [emails]);

  return { 
    emails, 
    emailsByColumn, 
    handleSearch, 
    handleMove, 
    ... 
  };
};
```

### **useAuth.ts** - Quản lý auth logic

```ts
export const useAuth = () => {
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const handleLogout = () => dispatch(logout());
  
  return { user, isAuthenticated, handleLogout };
};
```

### **useDragDrop.ts** - Quản lý drag & drop

```ts
export const useDragDrop = (onDrop, onReorder, columnId) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragOverEmailId, setDragOverEmailId] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  // ... more handlers

  return {
    isDraggingOver,
    dragOverEmailId,
    handleDragOver,
    handleDrop,
    ...
  };
};
```

---

## 📦 Sử dụng trong Component

### ❌ Trước (Không có hooks) - 617 dòng

```tsx
const InboxPage = () => {
  const dispatch = useAppDispatch();
  const { emails } = useAppSelector(...);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  
  useEffect(() => { 
    dispatch(fetchEmails()) 
  }, []);
  
  const emailsByColumn = useMemo(() => { 
    // 30 dòng logic...
  }, [emails]);
  
  const handleMove = (id, col) => { 
    dispatch(moveEmail(...)) 
  };
  
  const handleDragStart = (e) => { ... };
  const handleDragOver = (e) => { ... };
  const handleDrop = (e) => { ... };
  
  return (
    <div>
      {/* 500+ dòng UI */}
    </div>
  );
};
```

### ✅ Sau (Có hooks) - ~100 dòng

```tsx
const InboxPage = () => {
  // Sử dụng custom hooks
  const { user, handleLogout } = useAuth();
  const { 
    emailsByColumn, 
    searchQuery,
    handleSearch,
    handleMoveEmail,
    handleSnoozeEmail 
  } = useEmails();

  return (
    <div>
      <Header user={user} onLogout={handleLogout} />
      <SearchBar query={searchQuery} onSearch={handleSearch} />
      <KanbanBoard 
        emails={emailsByColumn} 
        onMove={handleMoveEmail}
        onSnooze={handleSnoozeEmail}
      />
    </div>
  );
};
```

---

## ✅ Lợi ích của Architecture này

| Yếu tố | Lợi ích |
|--------|---------|
| **Custom Hooks** | Logic tái sử dụng, component ngắn gọn |
| **Service Layer** | Tách biệt API calls, dễ test |
| **Redux Store** | Global state, async handling |
| **apiConfig** | Tập trung config, auto token injection |
| **TypeScript** | Type safety, autocomplete |

---

## 🎯 Best Practices

### 1. **Pages chỉ render UI**
- Không có business logic
- Chỉ gọi hooks và render components

### 2. **Hooks chứa business logic**
- State management
- Side effects (useEffect)
- Event handlers
- Computed values (useMemo)

### 3. **Services chỉ gọi API**
- Không có state
- Throw error cho caller xử lý
- Return clean data

### 4. **Redux cho global state**
- Auth state (user, tokens)
- Emails state (list, filters)
- Async thunks cho API calls

### 5. **Components nhỏ, tái sử dụng**
- Mỗi component ~50-100 dòng
- Props interface rõ ràng
- Có thể test độc lập
