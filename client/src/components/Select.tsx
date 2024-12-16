import { IconChevronDown } from "@tabler/icons-solidjs";
import { Accessor, Component, For, JSX } from "solid-js";

type Props = JSX.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  selected: Accessor<string>;
};

const Select: Component<Props> = ({ children, options, ...props }) => (
  <div class="relative">
    <select
      class="w-full appearance-none pr-10 focus:ring-1 ring-slate-400 leading-tight bg-white border-t border-x border-b-[3px] border-slate-200/60 shadow-sm outline-slate-300/50 outline-1 shadow-slate-600/20 px-4 h-10 rounded-lg flex items-center gap-2 hover:shadow-md hover:outline-slate-400/40 hover:border-slate-300/50 active:outline-slate-400/60 active:border-slate-300/80 transition-all"
      {...props}
    >
      <For each={options}>
        {({ value, label }) => (
          <option value={value} selected={value === props.selected()}>
            {label}
          </option>
        )}
      </For>
    </select>
    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      <IconChevronDown class="text-slate-400" size={20} />
    </div>
  </div>
);

export default Select;
