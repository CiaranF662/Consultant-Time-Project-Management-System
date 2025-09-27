// #region Widget Types
export interface Widget {
  id: string;
  name: string;
  component: React.ComponentType<WidgetProps>;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  description: string;
  icon: string;
  configurable?: boolean;
}

export interface WidgetProps {
  widgetId: string;
  size: WidgetSize;
  config?: Record<string, any>;
  onConfigChange?: (config: Record<string, any>) => void;
}

export interface DashboardLayout {
  id: string;
  userId: string;
  widgets: DashboardWidget[];
  layout: GridLayout[];
}

export interface DashboardWidget {
  id: string;
  widgetType: string;
  position: { x: number; y: number };
  size: WidgetSize;
  config?: Record<string, any>;
}

export interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
// #endregion

// #region Enums
export type WidgetCategory = 'core' | 'productivity' | 'project' | 'system';

export type WidgetSize = 'small' | 'medium' | 'large' | 'xlarge';

export const WIDGET_SIZES: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 2, h: 2 },
  medium: { w: 3, h: 2 },
  large: { w: 4, h: 3 },
  xlarge: { w: 6, h: 4 }
};
// #endregion