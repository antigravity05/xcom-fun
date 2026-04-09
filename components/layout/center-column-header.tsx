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
    <div className="sticky top-[53px] z-20 border-b border-white/[0.08] bg-background/85 backdrop-blur lg:top-0">
      <div className="flex min-h-[53px] items-center justify-between gap-4 px-4 sm:px-6">
        <h1 className="text-[20px] font-extrabold text-white">{title}</h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description || children ? (
        <div className="px-4 pb-3 sm:px-6">
          {description ? (
            <p className="text-[14px] leading-5 text-copy-muted">
              {description}
            </p>
          ) : null}
          {children ? (
            <div className={description ? "mt-3" : ""}>{children}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
