import * as React from "react";
import { Search, type LucideIcon } from "lucide-react";
import { Input } from "./input";

export function SearchInput({
  icon: Icon = Search,
  ...props
}: React.ComponentProps<"input"> & { icon?: LucideIcon }) {
  return (
    <div className="search-input">
      <Icon className="search-input-icon" aria-hidden="true" size={16} />
      <Input
        aria-label={props["aria-label"] || props.placeholder || "Search"}
        {...props}
      />
    </div>
  );
}
