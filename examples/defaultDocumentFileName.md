### AI Generated Documentation using DocuGen
----
### File: CatalogItemService.cs
The `CatalogItemService` class in this code file interacts with Amazon’s SP-API (Selling Partner API) to manage catalog items. The class inherits from the `RequestService` class and uses an instance of `AmazonCredential` for authorized requests.

### Constructor
- **`CatalogItemService(AmazonCredential amazonCredential) : base(amazonCredential)`**
  - Initializes the service with the provided Amazon credentials.

### Deprecated Methods
These methods are marked obsolete and advise using newer versions instead:
- **`ListCatalogItems(ParameterListCatalogItems parameterListCatalogItems)`**
- **`ListCatalogItemsAsync(ParameterListCatalogItems parameterListCatalogItems)`**
- **`GetCatalogItem(string asin)`**
- **`GetCatalogItemAsync(string asin)`**

### List Catalog Items
Handles listing catalog items:
- **`ListCatalogItems`** and **`ListCatalogItemsAsync`** 
  - These methods are synchronous and asynchronous versions of listing catalog items with various parameters.

### Get Catalog Item JSON
- **`GetCatalogItemJson(string asin)`**
- **`GetCatalogItemAsyncJson(string asin)`**
  - Retrieves a catalog item in JSON format by its ASIN.

### List Catalog Categories
Handles listing catalog categories:
- **`ListCatalogCategories(string ASIN, string SellerSKU = null, string MarketPlaceID = null)`**
- **`ListCatalogCategoriesAsync(string ASIN, string SellerSKU = null, string MarketPlaceID = null, CancellationToken cancellationToken = default)`**
  - These methods are synchronous and asynchronous versions of listing catalog categories by ASIN.

### API 2022-04-01 Methods
Newer versions compliant with API updates:
- **`GetCatalogItem202204(ParameterGetCatalogItem parameterGetCatalogItem)`**
- **`GetCatalogItem202204Async(ParameterGetCatalogItem parameterGetCatalogItem, CancellationToken cancellationToken = default)`**
  - Retrieves the details for an item in the Amazon catalog using the 2022-04-01 API version.
  
- **`SearchCatalogItems202204(ParameterSearchCatalogItems202204 parameterSearchCatalogItems)`**
- **`SearchCatalogItems202204Async(ParameterSearchCatalogItems202204 parameter, CancellationToken cancellationToken = default)`**
  - Searches catalog items using the 2022-04-01 API version.
  
#### Private Method
- **`SearchCatalogItemsByNextToken202204Async(ParameterSearchCatalogItems202204 parameter, CancellationToken cancellationToken = default)`**
  - Handles paginated searches using next tokens to retrieve further search results.

### Explanation of Helper Methods (Implicit)
- **`CreateAuthorizedRequestAsync`**: Used for setting up authorized API requests.
- **`ExecuteRequestAsync`**: Executes the API request and handles the rate limits.

By keeping methods aligned with their versions and properly deprecating older methods, this service ensures compatibility with Amazon’s evolving API standards.

----
