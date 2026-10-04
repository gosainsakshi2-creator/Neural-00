import type { ButtonHTMLAttributes } from "react";

/** The signature control: [ LABEL ]. The brackets part when hovered or focused. */
export function Bracket({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" data-cursor="hover" className={`bracket t-label ${className}`} {...props}>
      <span aria-hidden className="bracket__edge bracket__edge--l">
        [
      </span>
      <span>{children}</span>
      <span aria-hidden className="bracket__edge bracket__edge--r">
        ]
      </span>
    </button>
  );
}
