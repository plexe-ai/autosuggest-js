// React wrapper for <plexe-autosuggest>.
//
//   import { PlexeAutosuggest } from "@plexe/autosuggest/react";
//   <PlexeAutosuggest apiKey="plx_..." onSelect={(s) => setPlace(s)} />
//
// Works with server rendering: the element is defined only in the browser.
import { createElement, forwardRef, useEffect, useRef } from "react";
import "./plexe-autosuggest.js";

export const PlexeAutosuggest = forwardRef(function PlexeAutosuggest(
  { apiKey, endpoint, placeholder, limit, types, country, lat, lon, minChars, debounce, theme, name,
    disabled, defaultValue, onSelect, onError, className, ...rest },
  ref,
) {
  const el = useRef(null);
  const handlers = useRef({ onSelect, onError });
  handlers.current = { onSelect, onError };

  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    const select = (e) => handlers.current.onSelect?.(e.detail);
    const error = (e) => handlers.current.onError?.(e.detail);
    node.addEventListener("plexe-select", select);
    node.addEventListener("plexe-error", error);
    return () => {
      node.removeEventListener("plexe-select", select);
      node.removeEventListener("plexe-error", error);
    };
  }, []);

  const setRef = (node) => {
    el.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const attr = (v) => (v === undefined || v === null ? undefined : String(v));
  return createElement("plexe-autosuggest", {
    ref: setRef,
    class: className,
    "api-key": attr(apiKey),
    endpoint: attr(endpoint),
    placeholder: attr(placeholder),
    limit: attr(limit),
    types: attr(Array.isArray(types) ? types.join(",") : types),
    country: attr(country),
    lat: attr(lat),
    lon: attr(lon),
    "min-chars": attr(minChars),
    debounce: attr(debounce),
    theme: attr(theme),
    name: attr(name),
    disabled: disabled ? "" : undefined,
    value: attr(defaultValue),
    ...rest,
  });
});

export default PlexeAutosuggest;
