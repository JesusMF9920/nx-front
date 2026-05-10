import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, sub, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
