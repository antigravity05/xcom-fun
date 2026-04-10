import Image from "next/image";

type LogoProps = {
  /** Show full "x-com.fun" or just the "x-c" icon */
  variant?: "full" | "icon";
  /** Height in pixels — width scales proportionally */
  height?: number;
  className?: string;
};

export const Logo = ({
  variant = "full",
  height = 32,
  className = "",
}: LogoProps) => {
  if (variant === "icon") {
    return (
      <Image
        src="/logo-icon.svg"
        alt="x-com.fun"
        width={Math.round(height * (100 / 52))}
        height={height}
        className={className}
        priority
      />
    );
  }

  return (
    <Image
      src="/logo.svg"
      alt="x-com.fun"
      width={Math.round(height * (320 / 52))}
      height={height}
      className={className}
      priority
    />
  );
};
