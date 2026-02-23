# Changelog

## 1.0.0 (2026-02-21)

### Features

- add code formatting and linting with dprint and ESLint ([7b3f9ef](https://github.com/lamngockhuong/grocery-manager/commit/7b3f9ef1a3df36a455956fafaeb5987a0ce03ea5))
- add Google price search button in product detail modal ([a33fe64](https://github.com/lamngockhuong/grocery-manager/commit/a33fe64fdfc18ddcac04b915978e7f7c5c85257a))
- add iCheck API barcode lookup with product preview and autofill ([cc90e28](https://github.com/lamngockhuong/grocery-manager/commit/cc90e28c9527ac6e8ba23ffb9263fe46abf31444))
- add product detail modal and center all modals ([64a855a](https://github.com/lamngockhuong/grocery-manager/commit/64a855ad41dd578ef72628f80ea54190339e36a6))
- add product image support via Google Drive ([33ebf33](https://github.com/lamngockhuong/grocery-manager/commit/33ebf33660f9b6871d0a9568b7c56e8df07b3f39))
- add table sorting, pagination, and restock notes ([b32c603](https://github.com/lamngockhuong/grocery-manager/commit/b32c603e64eedd4de930681472fcdc8164b9d760))
- **auth:** add access control gate in doGet and improve auth error message ([5e03f6d](https://github.com/lamngockhuong/grocery-manager/commit/5e03f6d74986b40f36c62221867dec7753e1ceef))
- extract and display more iCheck fields (manufacturer, origin, description) ([0b59115](https://github.com/lamngockhuong/grocery-manager/commit/0b59115efdc247d73610474ab7178e37e62bcaab))
- implement initial Google Apps Script grocery store price management web app ([71537f6](https://github.com/lamngockhuong/grocery-manager/commit/71537f606d06d9d23d795038ba50622d4c84db60))
- make app name configurable via Script Properties ([f5dd97b](https://github.com/lamngockhuong/grocery-manager/commit/f5dd97b770239a9a6f8a8c5afd8d6a5ff0230a79))
- **products:** add barcode scanner with camera-based scanning ([58e051b](https://github.com/lamngockhuong/grocery-manager/commit/58e051b5574ae3b703a51f6cad2462fc41e536f4))
- **products:** optimize performance and improve save UX ([e6fa943](https://github.com/lamngockhuong/grocery-manager/commit/e6fa94343990701b4ebc8405192feec309be7d76))
- search products by barcode/description and skip unchanged price history ([9fe04b4](https://github.com/lamngockhuong/grocery-manager/commit/9fe04b4b9517a4db2e294e21fac46778b79969e2))
- use PropertiesService for SPREADSHEET_ID instead of hardcode ([b4817df](https://github.com/lamngockhuong/grocery-manager/commit/b4817df4e174ed328bf4c4bf194ce8484da3420e))

### Bug Fixes

- add image capture fallback for barcode scanner on Firefox ([b166342](https://github.com/lamngockhuong/grocery-manager/commit/b1663420e8652e4f1244af7860c0cac84aa562e6))
- adjust label spacing to prevent overlap in product form ([b72fcc7](https://github.com/lamngockhuong/grocery-manager/commit/b72fcc7c27c4da1a0933b638a22027779bc30437))
- convert all Vietnamese text from no-diacritics to proper diacritics ([c6daf43](https://github.com/lamngockhuong/grocery-manager/commit/c6daf43363ea63fbf9420dd01dbb428c942127c0))
- correct typo "con" to "còn" in low stock warning ([a4fb850](https://github.com/lamngockhuong/grocery-manager/commit/a4fb8506c08872adde9ad91e83889ca9be51057d))
- improve product image handling ([959bdd2](https://github.com/lamngockhuong/grocery-manager/commit/959bdd27f31005cd6d838fc3f3636801227c5a19))
- **prices:** sync price updates to Prices sheet and bold changed prices ([0c4e79b](https://github.com/lamngockhuong/grocery-manager/commit/0c4e79bf9002bb49c1da42f32da7a4f4194099ad))
- replace Materialize FormSelect with browser-default to fix mobile select bug ([fdfd32c](https://github.com/lamngockhuong/grocery-manager/commit/fdfd32c0acf4a7eb780bb0aed6fcefb5d4aac462))
- replace QuaggaJS with barcode-detector polyfill ([#4](https://github.com/lamngockhuong/grocery-manager/issues/4)) ([71a0162](https://github.com/lamngockhuong/grocery-manager/commit/71a016286e6291fe08db0c4d8aa2e2f97a5427dc))
- replace QuaggaJS with barcode-detector polyfill for reliable barcode scanning ([71a0162](https://github.com/lamngockhuong/grocery-manager/commit/71a016286e6291fe08db0c4d8aa2e2f97a5427dc))
- show descriptive camera error hints in barcode scanner fallback ([3a44eda](https://github.com/lamngockhuong/grocery-manager/commit/3a44edac8c31d05945d2d614586e6444c7b86c7e))
- **ui:** improve mobile responsiveness across all pages ([b20dab8](https://github.com/lamngockhuong/grocery-manager/commit/b20dab84ec656a50ae77c5785cac16ae299d7cfa))

### Performance Improvements

- cache iCheck anonymous token via CacheService (5-min TTL) ([c9b4dc8](https://github.com/lamngockhuong/grocery-manager/commit/c9b4dc8e5622f0442faa2f6d5db63b67bff3e2bb))
- embed initial data server-side to eliminate first-load RPCs ([42570fa](https://github.com/lamngockhuong/grocery-manager/commit/42570fa468706f5b858f0b12081c8493e0fb3c11))
