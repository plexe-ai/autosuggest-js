/** One suggestion, as GET /api/suggest returns it. See https://suggest.plexe.ai/docs */
export interface Suggestion {
  id: string;
  type: "city" | "neighborhood" | "point_of_interest" | "airport" | "hotel" | "island" | "region" | "country" | "metro_area" | string;
  subtype?: string;
  name: string;
  label: string;
  country_code?: string;
  lat: number;
  lon: number;
  hotel_count: number;
  score: number;
  highlight?: [number, number][];
  region_id?: string;
  hotel_id?: string;
  customer_hotel_id?: string;
  supplier_ids?: Record<string, string[]>;
  [field: string]: unknown;
}

export interface PlexeErrorDetail {
  status: number;
  message: string;
}

export declare class PlexeAutosuggest extends HTMLElement {
  value: string;
  readonly selected: Suggestion | null;
  clear(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    "plexe-autosuggest": PlexeAutosuggest;
  }
  interface HTMLElementEventMap {
    "plexe-select": CustomEvent<Suggestion>;
    "plexe-error": CustomEvent<PlexeErrorDetail>;
  }
}
