- follow base FSD principles:
  1. There are "app", "pages", "widgets", "features", "entities", "shared" folders as layers with descending hierarchy
  2. There are "ui', "model", "lib", "api", "config" as segment names.
  3. Slices can have names related to business modules
  4. Use local first principle. Put all necessary code to one module-slice unless it is reused in another slice
  5. Slices can't have cross imports. Use deeper layers for reusable logic
  6. Slices should have public api with index.tsx that reexport only necessary parts
