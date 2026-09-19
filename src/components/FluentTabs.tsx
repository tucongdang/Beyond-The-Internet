import React, { createContext, useContext } from 'react';

interface TabListContextValue {
  selectedValue?: string;
  onTabSelect?: (e: React.MouseEvent, data: { value: string }) => void;
  size?: 'small' | 'medium' | 'large';
}

const TabListContext = createContext<TabListContextValue>({});

export interface TabListProps {
  id?: string;
  selectedValue?: string;
  onTabSelect?: (e: React.MouseEvent, data: { value: string }) => void;
  size?: 'small' | 'medium' | 'large';
  appearance?: 'transparent' | 'subtle' | string;
  className?: string;
  onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}

export const TabList: React.FC<TabListProps> = ({
  id,
  selectedValue,
  onTabSelect,
  size = 'medium',
  className = '',
  onWheel,
  children
}) => {
  return (
    <TabListContext.Provider value={{ selectedValue, onTabSelect, size }}>
      <div
        id={id}
        role="tablist"
        className={`fluent-tablist ${className}`}
        onWheel={onWheel}
      >
        {children}
      </div>
    </TabListContext.Provider>
  );
};

export interface TabProps {
  value: string;
  id?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Tab: React.FC<TabProps> = ({
  value,
  id,
  icon,
  className = '',
  children
}) => {
  const { selectedValue, onTabSelect } = useContext(TabListContext);
  const isSelected = selectedValue === value;

  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={(e) => onTabSelect?.(e, { value })}
      className={`fui-Tab inline-flex items-center justify-center gap-2 cursor-pointer select-none outline-none ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};

export interface FluentProviderProps {
  theme?: any;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}

export const FluentProvider: React.FC<FluentProviderProps> = ({
  style,
  className = '',
  children
}) => {
  return (
    <div className={`fui-FluentProvider ${className}`} style={style}>
      {children}
    </div>
  );
};
