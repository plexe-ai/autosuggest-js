# @plexe/autosuggest

A hotel and destination search box for the [Plexe Autosuggest API](https://suggest.plexe.ai): a web component with no dependencies, and a React wrapper.

As the traveller types, it suggests cities, areas, landmarks, airports, islands, regions, metro areas and hotels in 224 countries. Each suggestion carries its coordinates and hotel count, and its `id` opens the place's hotels in the API.

## Get a key

Sign up at [suggest.plexe.ai/console](https://suggest.plexe.ai/console) (free up to 5,000 requests a day) and create a **website key**. A website key lists the sites it may be used on, for example `www.example.com` or `*.example.com`, and requests from any other site are refused. That makes it safe to put in page code. Do not put a server key in a web page.

## Script tag

```html
<script type="module" src="https://suggest.plexe.ai/widget/v1.js"></script>

<plexe-autosuggest api-key="plx_..." placeholder="Where to?"></plexe-autosuggest>

<script>
  document.querySelector("plexe-autosuggest").addEventListener("plexe-select", (e) => {
    const place = e.detail;          // { id, type, name, label, lat, lon, hotel_count, ... }
    console.log(place.id, place.name);
  });
</script>
```

## npm

```bash
npm install @plexe/autosuggest
```

```js
import "@plexe/autosuggest";
```

### React

```jsx
import { PlexeAutosuggest } from "@plexe/autosuggest/react";

export function Search() {
  return (
    <PlexeAutosuggest
      apiKey="plx_..."
      types={["city", "airport"]}
      onSelect={(place) => console.log(place.id)}
    />
  );
}
```

It is safe to render on the server (Next.js and others): the element is defined only in the browser.

## Attributes

| Attribute | React prop | Default | |
|---|---|---|---|
| `api-key` | `apiKey` | | A website key |
| `placeholder` | `placeholder` | City, area, landmark, airport or hotel | |
| `limit` | `limit` | 8 | 1 to 20 suggestions |
| `types` | `types` | all | Comma-separated: `city`, `neighborhood`, `point_of_interest`, `airport`, `hotel`, `island`, `region`, `country`, `metro_area` |
| `country` | `country` | | Two-letter code of the market to favour |
| `lat`, `lon` | `lat`, `lon` | | A point to favour nearby results |
| `min-chars` | `minChars` | 1 | Characters typed before the first request |
| `debounce` | `debounce` | 120 | Milliseconds to wait between requests while typing |
| `theme` | `theme` | `light` | `light`, `dark` or `auto` (follows the system) |
| `name` | `name` | | Inside a `<form>`, submits the picked suggestion's `id` under this name |
| `disabled` | `disabled` | | |
| `value` | `defaultValue` | | Starting text |
| `endpoint` | `endpoint` | https://suggest.plexe.ai | |
| `no-telemetry` | | | Do not report picks (see below) |

## Events

| Event | `detail` |
|---|---|
| `plexe-select` | The picked suggestion, as `GET /api/suggest` returns it |
| `plexe-error` | `{ status, message }`, for example `403` when the page's site is not on the key |

The element also has `value`, `selected` (the last picked suggestion), `focus()` and `clear()`.

## Styling

Set CSS variables on the element or any parent:

```css
plexe-autosuggest {
  --plexe-font: 15px/1.4 Inter, sans-serif;
  --plexe-accent: #e11d48;
  --plexe-radius: 6px;
  --plexe-height: 48px;
}
```

Variables: `--plexe-font`, `--plexe-bg`, `--plexe-fg`, `--plexe-muted`, `--plexe-border`, `--plexe-accent`, `--plexe-active-bg`, `--plexe-radius`, `--plexe-height`, `--plexe-max-height`, `--plexe-z`. For anything else, the parts `input`, `list`, `option`, `child`, `type` and `match` can be styled with `::part()`.

## What it does for you

- The first keystroke is sent at once and later ones are spaced out, so the list keeps up without a request per key.
- A new request cancels the one in flight, and late answers to old text are dropped.
- Matched letters are bold. When an island, region or country comes first, its main destinations are indented under it.
- Arrow keys, Enter and Escape work, and screen readers hear the list (ARIA combobox).
- Each pick is reported to `POST /api/suggest/select`, which is how ranking is tuned. These reports are not counted towards your plan. Add `no-telemetry` to turn them off.

## Licence

MIT
