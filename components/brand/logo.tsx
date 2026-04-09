import Image from "next/image";

type LogoProps = {
  /** Show full "X-com.fun" or just the X icon */
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
        alt="X-COM"
        width={Math.round(height * (52 / 60))}
        height={height}
        className={className}
        priority
      />
    );
  }

  return (
    <Image
      src="/logo.svg"
      alt="X-COM.fun"
      width={Math.round(height * (280 / 60))}
      height={height}
      className={className}
      priority
    />
  );
};
