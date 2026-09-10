# MapLibre module worker

Worker and shared module copied from the installed maplibre-gl package (6.9.0). These files are served directly so the worker's relative module import resolves consistently in Next.js development and production. The admin public directory shares these assets.

When upgrading maplibre-gl, replace both .mjs files from that version's dist directory and its LICENSE.txt together. Do not edit generated modules manually.
