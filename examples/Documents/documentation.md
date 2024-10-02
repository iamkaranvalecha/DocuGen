### AI Generated Documentation using DocuGen
----
### File: CatalogItemService.cs
### Summary of Code

The provided code defines the `CatalogItemService` class within the `FikaAmazonAPI.Services` namespace. This class is used to interact with Amazon's Catalog Items API, primarily to retrieve and search for catalog items. It uses various helper methods to create authorized requests and handle API responses.

### Breakdown of Methods

1. **Constructor:**
   - `CatalogItemService(AmazonCredential amazonCredential)`: Initializes the service with Amazon credentials by calling the base constructor.

2. **Deprecated Methods:**
   - `[Obsolete] ListCatalogItems`: Synchronously retrieves a list of catalog items using parameters.
   - `[Obsolete] ListCatalogItemsAsync`: Asynchronously retrieves a list of catalog items using parameters.
   - `[Obsolete] GetCatalogItem`: Synchronously retrieves a catalog item by ASIN.
   - `[Obsolete] GetCatalogItemAsync`: Asynchronously retrieves a catalog item by ASIN.

   > These methods are marked as deprecated since June 2022 and recommend using newer versions.

3. **Current Methods:**
   - `GetCatalogItemJson`: Synchronously retrieves catalog item details by ASIN in JSON format.
   - `GetCatalogItemAsyncJson`: Asynchronously retrieves catalog item details by ASIN in JSON format.
   - `ListCatalogCategories`: Synchronously lists catalog categories for an item.
   - `ListCatalogCategoriesAsync`: Asynchronously lists catalog categories for an item.

4. **2022-04-01 Updated Methods:**
   - `GetCatalogItem202204`: Synchronously retrieves catalog item details for the newer 2022-04-01 version.
   - `GetCatalogItem202204Async`: Asynchronously retrieves catalog item details for the newer 2022-04-01 version.
   - `SearchCatalogItems202204`: Synchronously searches catalog items using the updated 2022-04-01 API parameters.
   - `SearchCatalogItems202204Async`: Asynchronously searches catalog items using the updated 2022-04-01 API parameters.
   - `SearchCatalogItemsByNextToken202204Async`: Helper method to handle pagination and search catalog items using next token for the 2022-04-01 version.

### Explanation of Key Methods

#### `ListCatalogItemsAsync`
- **Purpose**: Retrieves a list of catalog items based on provided parameters.
- **Parameters**: `ParameterListCatalogItems parameterListCatalogItems`
- **Workflow**:
  1. Validates required fields.
  2. Creates authorized API request.
  3. Executes the request and processes the response.
  4. Returns a list of catalog items.

#### `GetCatalogItemAsyncJson`
- **Purpose**: Retrieves catalog item details in JSON format.
- **Parameters**: `string asin`
- **Workflow**:
  1. Validates the ASIN.
  2. Creates authorized API request.
  3. Executes the request and processes the response.
  4. Returns the item details in JSON format.

#### `ListCatalogCategoriesAsync`
- **Purpose**: Lists catalog categories for a specific item.
- **Parameters**: 
  - `string ASIN`
  - `string SellerSKU`
  - `string MarketPlaceID`
- **Workflow**:
  1. Validates the ASIN.
  2. Creates authorized API request.
  3. Executes the request and processes the response.
  4. Returns a list of categories.

#### `GetCatalogItem202204Async`
- **Purpose**: Retrieves detailed information about an item using the 2022-04-01 API version.
- **Parameters**: `ParameterGetCatalogItem parameterGetCatalogItem`
- **Workflow**:
  1. Validates required fields.
  2. Creates authorized API request.
  3. Executes the request and processes the response.
  4. Returns the catalog item details.

#### `SearchCatalogItems202204Async`
- **Purpose**: Searches for catalog items using specified parameters with the 2022-04-01 API version.
- **Parameters**: `ParameterSearchCatalogItems202204 parameter`
- **Workflow**:
  1. Validates input parameters.
  2. Creates authorized API request.
  3. Executes the request and processes the response.
  4. Handles pagination using `SearchCatalogItemsByNextToken202204Async`.
  5. Returns a list of catalog items.

----
