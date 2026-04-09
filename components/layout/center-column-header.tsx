type CenterColumnHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

export const CenterColumnHeader = ({
  title,
  description,
  action,
  children,
}: CenterColumnHeaderProps) => {
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-background/85 backdrop-blur">
      <div className="flex min-h-[53px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <h1 className="text-[31px] leading-[36px] font-extrabold tracking-tight text-white">
          {title}
        </h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description || children ? (
        <div className="px-4 pb-4 sm:px-6">
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-copy-muted">
              {description}
            </p>
          ) : null}
          {children ? <div className={description ? "mt-4" : ""}>{children}</div> : null}
        </div>
      ) : null}
    </div>
  );
};
