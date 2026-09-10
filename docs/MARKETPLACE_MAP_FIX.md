# Marketplace map fix

The isolated runtime intentionally clears NEXT_PUBLIC_MAPBOX_TOKEN. The listing map previously replaced the map with a decorative grid when that value was absent.

The shared listing map now uses MapLibre with OpenStreetMap raster tiles, visible attribution and standard browser caching. No token or database change is required. Existing Mapbox dependencies remain for other map components. References: [MapLibre raster source example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/) and [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

The fix removes invented fallback listings when the result set is empty, preserves geographic marker positioning, adds keyboard-accessible pins, resizes with its container and separates popup selection from the map library's native toggle. Buyer popup links stay in the buyer portal. Blank tar fixture images use the same labeled illustration as the listing cards.

Verified locally at port 20016: real Houston street tiles and attribution loaded, the initial view included both the saved location and listing pins, zoom and expanded-map resizing worked, selecting a pin opened its listing popup, and View details navigated to /buyer/browse/1005. Web and admin type checks passed; focused map ESLint and git whitespace checks passed. Changes are local and uncommitted.

Tiles require network connectivity. The map displays a retry message on tile errors. Public OSM tiles are best-effort infrastructure; a contracted tile provider can be configured in STREET_STYLE if production traffic requires it.

## Listing detail map

The separate SellerLocationMap still depended on a Mapbox token and rendered a decorative grid without one. It now uses the same shared MapLibre street style as Browse, with resize handling, seller/viewer markers, attribution and a retry message on map errors. This also fixes the public product detail caller. Verified on buyer listing 1009: Houston street tiles and both markers rendered; zoom loaded more detailed streets. Web type checking, focused ESLint and whitespace checks passed. Public detail uses the same component but was not separately browser-tested.
