import { JSX, ParentComponent } from "solid-js";
import { AccessorOrVal, accessorOrVal } from "../lib/accessorOrVal";

type Props = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AccessorOrVal<"light" | "dark">;
  size?: AccessorOrVal<"sm" | "md" | "lg">;
};

const Button: ParentComponent<Props> = ({
  children,
  class: className,
  variant = "light",
  size = "md",
  ...props
}) => (
  <button
    class={
      "shadow-sm outline-1 shadow-slate-600/20 rounded-lg flex items-center gap-2 hover:shadow-md transition-all hover:cursor-pointer " +
      (accessorOrVal(variant) === "light"
        ? "bg-white border-slate-200/60 outline-slate-300/50 hover:outline-slate-400/40 hover:border-slate-300/50 active:outline-slate-400/60 active:border-slate-300/80 "
        : "bg-slate-800 border-slate-900/60 outline-slate-600/50 hover:outline-slate-700/50 hover:border-black/70 active:outline-slate-800/50 active:border-black/80 text-white ") +
      (accessorOrVal(size) === "sm"
        ? "border-b-[2px] text-sm h-8 px-3 "
        : accessorOrVal(size) === "md"
        ? "border-b-[3px] text-base h-10 px-4 "
        : "border-b-[5px] text-lg h-12 px-5 pt-0.5 ") +
      className
    }
    {...props}
  >
    {children}
  </button>
);

export default Button;
