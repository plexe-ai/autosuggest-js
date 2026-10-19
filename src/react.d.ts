import type { ForwardRefExoticComponent, RefAttributes, HTMLAttributes } from "react";
import type { PlexeAutosuggest as Element, Suggestion, PlexeErrorDetail } from "./plexe-autosuggest.js";

export type { Suggestion, PlexeErrorDetail };

export interface PlexeAutosuggestProps extends Omit<HTMLAttributes<HTMLElement>, "onSelect" | "onError" | "defaultValue"> {
  /** A website key from https://suggest.plexe.ai/console */
  apiKey: string;
  /** Default https://suggest.plexe.ai */
  endpoint?: string;
  placeholder?: string;
  /** 1 to 20, default 8 */
  limit?: number;
  /** Place types to suggest, such as ["city", "airport"] */
  types?: string | string[];
  /** Two-letter country code to keep results to */
  country?: string;
  lat?: number;
  lon?: number;
  /** Characters typed before the first request, default 1 */
  minChars?: number;
  /** Milliseconds to wait after a keystroke, default 120 */
  debounce?: number;
  theme?: "light" | "dark" | "auto";
  /** Form field name: the form submits the chosen suggestion's id */
  name?: string;
  disabled?: boolean;
  defaultValue?: string;
  onSelect?: (suggestion: Suggestion) => void;
  onError?: (error: PlexeErrorDetail) => void;
}

export declare const PlexeAutosuggest: ForwardRefExoticComponent<PlexeAutosuggestProps & RefAttributes<Element>>;
export default PlexeAutosuggest;
