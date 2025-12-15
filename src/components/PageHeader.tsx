import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="bg-card shadow-dp01 px-xmedium py-medium">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{title}</h1>
        {actions && <div className="flex items-center gap-sml">{actions}</div>}
      </div>
    </header>
  );
}
