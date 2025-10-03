# Dark Mode Migration Guide

## Color Class Mapping

Replace hardcoded Tailwind colors with theme-aware classes:

### Backgrounds
- `bg-white` → `bg-background` or `bg-card`
- `bg-gray-50` → `bg-muted`
- `bg-gray-100` → `bg-muted`
- `bg-gray-900` → `bg-background` (for dark)
- `bg-slate-50` → `bg-background`

### Text Colors
- `text-gray-900` → `text-foreground`
- `text-gray-800` → `text-foreground`
- `text-gray-700` → `text-card-foreground`
- `text-gray-600` → `text-muted-foreground`
- `text-gray-500` → `text-muted-foreground`
- `text-gray-400` → `text-muted-foreground`
- `text-white` → `text-foreground` (in dark contexts)

### Borders
- `border-gray-200` → `border-border`
- `border-gray-300` → `border-border`
- `border-gray-600` → `border-border` (dark)

### Buttons & Interactive Elements
- Primary: `bg-blue-600 text-white` → `bg-primary text-primary-foreground`
- Secondary: `bg-gray-200` → `bg-secondary text-secondary-foreground`
- Destructive: `bg-red-600` → `bg-destructive text-destructive-foreground`

### Cards & Panels
- `bg-white border-gray-200` → `bg-card border-border text-card-foreground`

### Hover States
- `hover:bg-gray-100` → `hover:bg-accent`
- `hover:bg-gray-50` → `hover:bg-muted`

## Example Conversions

### Before:
```tsx
<div className="bg-white border border-gray-200 rounded-lg shadow">
  <h2 className="text-gray-900 font-bold">Title</h2>
  <p className="text-gray-600">Description</p>
  <button className="bg-blue-600 text-white hover:bg-blue-700">
    Click me
  </button>
</div>
```

### After:
```tsx
<div className="bg-card border border-border rounded-lg shadow">
  <h2 className="text-foreground font-bold">Title</h2>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Click me
  </button>
</div>
```

## Keep Original Colors For:
- Status colors: `bg-green-100`, `bg-red-100`, `bg-yellow-100` (these are semantic)
- Chart colors: Keep as-is
- Brand colors: Keep blue-600 for branding if needed
