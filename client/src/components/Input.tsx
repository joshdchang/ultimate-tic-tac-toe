import { Component, JSX } from "solid-js";
import { accessorOrVal, AccessorOrVal } from "../lib/accessorOrVal";

type Props = JSX.InputHTMLAttributes<HTMLInputElement> & {
  size?: AccessorOrVal<"sm" | "md" | "lg">;
};

const Input: Component<Props> = ({ class: className, size = "md", ...props }) => (
  <input
    style={{
      "box-shadow": "0 0px 3px 0 rgb(0 0 0 / 0.1), 0 -1px 2px -1px rgb(0 0 0 / 0.1)",
    }}
    class={
      "w-full appearance-none leading-tight bg-white border-slate-200/60 outline-slate-300/50 outline-1 shadow-slate-600/20 rounded-lg flex items-center hover:outline-slate-400/40 hover:border-slate-300/50 active:outline-slate-400/60 focus:outline-slate-500/60 active:border-slate-300/80 focus:border-slate-400/30 transition-all placeholder:text-slate-400 " +
      (accessorOrVal(size) === "sm"
        ? "text-sm border-t-[2px] px-2 h-8 pb-0.5 gap-1 "
        : accessorOrVal(size) === "md"
        ? "text-base border-t-[3px] px-3 h-10 pb-1 gap-2 "
        : "text-lg border-t-[5px] px-4 h-12 pb-1.5 gap-3 ") +
      className
    }
    {...props}
  />
);

export default Input;
