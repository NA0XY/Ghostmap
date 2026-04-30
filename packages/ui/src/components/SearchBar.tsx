import React, { useEffect, useRef } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number | null;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  resultCount,
  placeholder = "Search nodes… (/ to focus)",
}: SearchBarProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, [onChange]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        flex: 1,
        maxWidth: 320,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 10,
          color: "var(--gm-text-muted)",
          fontSize: 13,
          pointerEvents: "none",
        }}
      >
        ⌕
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "6px 10px 6px 28px",
          background: "var(--gm-bg-surface-2)",
          border: "1px solid var(--gm-border)",
          borderRadius: "var(--gm-control-radius)",
          color: "var(--gm-text-primary)",
          fontFamily: "var(--gm-font-ui)",
          fontSize: "var(--gm-font-size-sm)",
          outline: "none",
          transition: "border-color var(--gm-transition-fast)",
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = "var(--gm-accent)";
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "var(--gm-border)";
        }}
        aria-label="Search nodes"
        role="searchbox"
      />
      {resultCount !== null && (
        <span
          style={{
            position: "absolute",
            right: 10,
            fontSize: "var(--gm-font-size-xs)",
            color: resultCount === 0 ? "var(--gm-decay-high)" : "var(--gm-text-muted)",
            pointerEvents: "none",
          }}
        >
          {resultCount}
        </span>
      )}
    </div>
  );
}
